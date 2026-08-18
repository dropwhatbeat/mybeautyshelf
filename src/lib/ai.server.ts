const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ProductExtraction = {
  brand: string | null;
  name: string | null;
  category: string | null;
  size_ml: number | null;
  pao_months: number | null;
  ingredients: string[];
  ingredients_readable: boolean;
  notes: string | null;
};

export type ColourAnalysis = {
  season: string;
  undertone: string;
  best_colours: string[];
  avoid_colours: string[];
  rationale: string;
};

export type SkinScores = {
  hydration: number;
  fine_lines: number;
  pores: number;
  redness: number;
  evenness: number;
  under_eye: number;
  oil_tzone: number;
  oil_cheeks: number;
  overall: number;
  notes: {
    hydration: string;
    fine_lines: string;
    pores: string;
    redness: string;
    evenness: string;
    under_eye: string;
    oil: string;
  };
};

export type FaceRead = {
  shape: string;
  confidence: string;
  rationale: string;
  tips: string[];
  fitzpatrick: number | null;
};

export type ShelfieAnalysis = ColourAnalysis & { skin: SkinScores; face: FaceRead };

export type BulkItem = ProductExtraction & { position: string | null };

export type BulkChatTurn = { role: "user" | "assistant"; content: string };

export type BulkChatResult = {
  reply: string;
  updates: { index: number; patch: Partial<BulkItem> }[];
  done: boolean;
};

const CATEGORIES = ["cleanser", "serum", "moisturiser", "spf", "treatment", "makeup", "other"];

async function callGateway(body: unknown): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("Too many requests just now — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted for this project.");
  if (!res.ok) {
    const detail = await res.text();
    console.error("AI gateway error", res.status, detail);
    throw new Error("The vision service could not read that photo. Try again.");
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

function parseJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function extractProductFromPhotos(
  frontImage: string,
  backImage: string | null,
): Promise<ProductExtraction> {
  const content: unknown[] = [
    {
      type: "text",
      text: `You read beauty product packaging from photos. Return ONLY strict JSON with this shape:
{"brand": string|null, "name": string|null, "category": one of ${CATEGORIES.join("|")}|null, "size_ml": number|null, "pao_months": number|null, "ingredients": string[], "ingredients_readable": boolean, "notes": string|null}

Rules:
- Packaging may be in ANY language (Japanese, Korean, Chinese, French and so on). Read it in the original language, then TRANSLATE the output to English: use the official English/Latin-script brand name, and an English product name.
- Translate ingredients into their standard English INCI names (for example the Japanese for water becomes "Water", for glycerin becomes "Glycerin"). Keep the printed order.
- Put the original-language product name in "notes" if you translated it.
- Only report what is legibly visible. If a field is unclear, use null rather than guessing.
- NEVER invent ingredients. If no ingredient list is legible in the photos, return "ingredients": [] and "ingredients_readable": false.
- pao_months comes from the open-jar symbol (e.g. "12M" -> 12).
- size_ml: convert oz to ml if only oz is printed.
- Keep ingredient strings as printed, one per array item, in order.`,
    },
    { type: "image_url", image_url: { url: frontImage } },
  ];
  if (backImage) content.push({ type: "image_url", image_url: { url: backImage } });

  const raw = await callGateway({
    model: "google/gemini-3.6-flash",
    messages: [{ role: "user", content }],
  });
  const parsed = parseJson(raw);
  if (!parsed) {
    return {
      brand: null, name: null, category: null, size_ml: null, pao_months: null,
      ingredients: [], ingredients_readable: false,
      notes: "We couldn't read that photo clearly — fill in what you know or retake it.",
    };
  }
  const category = str(parsed["category"])?.toLowerCase() ?? null;
  const ingredientsRaw = Array.isArray(parsed["ingredients"]) ? parsed["ingredients"] : [];
  const ingredients = ingredientsRaw
    .map((i) => (typeof i === "string" ? i.trim() : ""))
    .filter((i) => i.length > 1)
    .slice(0, 120);
  return {
    brand: str(parsed["brand"]),
    name: str(parsed["name"]),
    category: category && CATEGORIES.includes(category) ? category : null,
    size_ml: num(parsed["size_ml"]),
    pao_months: num(parsed["pao_months"]),
    ingredients,
    ingredients_readable: ingredients.length > 0 && parsed["ingredients_readable"] !== false,
    notes: str(parsed["notes"]),
  };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function hexes(v: unknown, count: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter((c) => HEX.test(c))
    .slice(0, count);
}

export async function analyseColourFromSelfie(selfie: string): Promise<ColourAnalysis> {
  const raw = await callGateway({
    model: "google/gemini-3.6-flash",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are a seasonal colour analyst working purely with clothing and makeup colour aesthetics. Look at the photo and return ONLY strict JSON:
{"season": string, "undertone": "cool"|"neutral"|"warm", "best_colours": [6 hex strings like "#aabbcc"], "avoid_colours": [3 hex strings], "rationale": string}

Rules:
- season is one of the 12 classic seasons, e.g. "Soft Autumn", "Bright Winter".
- rationale is ONE warm, plain-language paragraph about colour harmony (contrast, depth, undertone). Around 60 words.
- Never comment on skin conditions, health, attractiveness or age. Colour only.
- Exactly 6 best colours and exactly 3 colours to avoid, all as 6-digit hex.`,
          },
          { type: "image_url", image_url: { url: selfie } },
        ],
      },
    ],
  });
  const parsed = parseJson(raw);
  const best = hexes(parsed?.["best_colours"], 6);
  const avoid = hexes(parsed?.["avoid_colours"], 3);
  const season = str(parsed?.["season"]);
  if (!parsed || !season || best.length < 6 || avoid.length < 3) {
    throw new Error("We couldn't read that photo well enough. Try again in natural light against a plain wall.");
  }
  const undertoneRaw = (str(parsed["undertone"]) ?? "neutral").toLowerCase();
  return {
    season,
    undertone: ["cool", "neutral", "warm"].includes(undertoneRaw) ? undertoneRaw : "neutral",
    best_colours: best,
    avoid_colours: avoid,
    rationale: str(parsed["rationale"]) ?? "",
  };
}

function coerceItem(raw: Record<string, unknown>): BulkItem {
  return coerceItemInner(raw);
}

function score(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function analyseShelfie(selfie: string): Promise<ShelfieAnalysis> {
  const raw = await callGateway({
    model: "google/gemini-3.6-flash",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are a cosmetic beauty-counter assistant. FIRST check the photo is a usable single-person selfie, THEN give (a) a seasonal colour read, (b) a cosmetic appearance score the way an in-store skin scanner does, and (c) a face shape read for makeup placement. Return ONLY strict JSON:
{"check": {"face_count": integer, "lighting": "good"|"dim"|"harsh"|"colour_cast", "sharpness": "sharp"|"soft"|"blurry", "face_coverage": "full"|"partial"|"tiny", "obstructed": boolean, "usable": boolean, "reason": string|null}, "season": string, "undertone": "cool"|"neutral"|"warm", "best_colours": [6 hex strings like "#aabbcc"], "avoid_colours": [3 hex strings], "rationale": string, "skin": {"hydration": 0-100, "fine_lines": 0-100, "pores": 0-100, "redness": 0-100, "evenness": 0-100, "under_eye": 0-100, "oil_tzone": 0-100, "oil_cheeks": 0-100, "notes": {"hydration": string, "fine_lines": string, "pores": string, "redness": string, "evenness": string, "under_eye": string, "oil": string}}, "face": {"shape": "oval"|"round"|"square"|"heart"|"oblong"|"diamond", "confidence": "low"|"medium"|"high", "rationale": string, "tips": [2-3 short strings], "fitzpatrick": 1-6}}

Rules:
- Do the check FIRST and be strict and honest. face_count = number of human faces visible, however small, partial, blurred or in the background — count them all. If you see more than one person, say so.
- usable is false when: face_count is not exactly 1; the face is blurry or soft; lighting is dim, harsh or strongly colour-cast so tone cannot be judged; the face is partial, tiny in frame or turned far away; or it is obstructed by hand, hair over the face, mask or sunglasses.
- reason is ONE short sentence in plain language telling the person how to retake the photo.
- If usable is false, still fill the other fields with best guesses; they will be discarded.
- season is one of the 12 classic seasons, e.g. "Soft Autumn", "Bright Winter".
- rationale is ONE warm, plain-language paragraph about colour harmony. Around 50 words.
- Scores are cosmetic appearance only, higher is better: hydration = how plump and dewy the skin looks; fine_lines = how smooth the skin looks; pores = how refined the skin texture looks; redness = how calm and even in tone the skin looks (higher = calmer); evenness = how even the tone looks, free of dark spots; under_eye = how bright and rested the under-eye area looks; oil_tzone and oil_cheeks = how balanced (not shiny) those zones look.
- Each note is ONE short, kind sentence (max 18 words) describing what you see and one cosmetic suggestion.
- face.shape is the closest match only, never a verdict; confidence reflects how clearly hair, angle and lighting let you judge it.
- face.rationale is ONE short sentence. face.tips are 2-3 flattering makeup placement ideas (blush, contour, brows) — never "flaws to fix".
- face.fitzpatrick is the closest skin depth 1-6 for shade matching, or null if unclear.
- Never diagnose, never mention medical or health conditions, never comment on age, weight or attractiveness.`,
          },
          { type: "image_url", image_url: { url: selfie } },
        ],
      },
    ],
  });
  const parsed = parseJson(raw);
  const checkRaw = (parsed?.["check"] ?? {}) as Record<string, unknown>;
  const faceCount = num(checkRaw["face_count"]);
  const lighting = (str(checkRaw["lighting"]) ?? "good").toLowerCase();
  const sharpness = (str(checkRaw["sharpness"]) ?? "sharp").toLowerCase();
  const coverage = (str(checkRaw["face_coverage"]) ?? "full").toLowerCase();
  const obstructed = checkRaw["obstructed"] === true;
  const usable = checkRaw["usable"] !== false;
  const rawFaceCount = typeof checkRaw["face_count"] === "number" ? checkRaw["face_count"] : faceCount ?? 0;

  if (rawFaceCount === 0) {
    throw new Error(
      "We couldn't find a face in that photo. Take a clear selfie facing a window, on your own.",
    );
  }
  if (rawFaceCount > 1) {
    throw new Error(
      "We spotted more than one face. A Shelfie only works solo — retake it with just you in frame.",
    );
  }
  if (sharpness === "blurry" || sharpness === "soft") {
    throw new Error("That photo is a little blurry. Hold still and retake it in good light.");
  }
  if (lighting === "dim") {
    throw new Error("It's too dim to read your skin. Face a window in daylight and try again.");
  }
  if (lighting === "harsh") {
    throw new Error(
      "The lighting is too harsh — strong shadows skew the reading. Try soft, indirect daylight.",
    );
  }
  if (lighting === "colour_cast") {
    throw new Error(
      "The light in that photo is strongly tinted, so we can't read your tone. Try natural daylight.",
    );
  }
  if (coverage === "tiny" || coverage === "partial") {
    throw new Error("Bring your face closer and fully into frame, then retake your Shelfie.");
  }
  if (obstructed) {
    throw new Error(
      "Something is covering part of your face. Push hair back, remove glasses, and retake it.",
    );
  }
  if (!usable) {
    throw new Error(
      str(checkRaw["reason"]) ??
        "We couldn't read that photo well enough. Try again in natural light against a plain wall.",
    );
  }

  const best = hexes(parsed?.["best_colours"], 6);
  const avoid = hexes(parsed?.["avoid_colours"], 3);
  const season = str(parsed?.["season"]);
  const skinRaw = (parsed?.["skin"] ?? {}) as Record<string, unknown>;
  const hydration = score(skinRaw["hydration"]);
  const fineLines = score(skinRaw["fine_lines"]);
  const pores = score(skinRaw["pores"]);
  if (!parsed || !season || best.length < 6 || avoid.length < 3 || hydration === null || fineLines === null || pores === null) {
    throw new Error(
      "We couldn't read that photo well enough. Try again in natural light against a plain wall.",
    );
  }
  const notesRaw = (skinRaw["notes"] ?? {}) as Record<string, unknown>;
  const undertoneRaw = (str(parsed["undertone"]) ?? "neutral").toLowerCase();
  const faceRaw = (parsed["face"] ?? {}) as Record<string, unknown>;
  const shapeRaw = (str(faceRaw["shape"]) ?? "").toLowerCase();
  const SHAPES = ["oval", "round", "square", "heart", "oblong", "diamond"];
  const confidenceRaw = (str(faceRaw["confidence"]) ?? "medium").toLowerCase();
  const tipsRaw = Array.isArray(faceRaw["tips"]) ? faceRaw["tips"] : [];
  const fitz = num(faceRaw["fitzpatrick"]);
  const redness = score(skinRaw["redness"]) ?? 70;
  const evenness = score(skinRaw["evenness"]) ?? 70;
  const underEye = score(skinRaw["under_eye"]) ?? 70;
  const oilTzone = score(skinRaw["oil_tzone"]) ?? 70;
  const oilCheeks = score(skinRaw["oil_cheeks"]) ?? 70;
  return {
    season,
    undertone: ["cool", "neutral", "warm"].includes(undertoneRaw) ? undertoneRaw : "neutral",
    best_colours: best,
    avoid_colours: avoid,
    rationale: str(parsed["rationale"]) ?? "",
    face: {
      shape: SHAPES.includes(shapeRaw) ? shapeRaw : "oval",
      confidence: ["low", "medium", "high"].includes(confidenceRaw) ? confidenceRaw : "medium",
      rationale: str(faceRaw["rationale"]) ?? "",
      tips: tipsRaw
        .map((t) => (typeof t === "string" ? t.trim() : ""))
        .filter((t) => t.length > 1)
        .slice(0, 3),
      fitzpatrick: fitz !== null && fitz >= 1 && fitz <= 6 ? Math.round(fitz) : null,
    },
    skin: {
      hydration,
      fine_lines: fineLines,
      pores,
      redness,
      evenness,
      under_eye: underEye,
      oil_tzone: oilTzone,
      oil_cheeks: oilCheeks,
      overall: Math.round((hydration + fineLines + pores) / 3),
      notes: {
        hydration: str(notesRaw["hydration"]) ?? "",
        fine_lines: str(notesRaw["fine_lines"]) ?? "",
        pores: str(notesRaw["pores"]) ?? "",
        redness: str(notesRaw["redness"]) ?? "",
        evenness: str(notesRaw["evenness"]) ?? "",
        under_eye: str(notesRaw["under_eye"]) ?? "",
        oil: str(notesRaw["oil"]) ?? "",
      },
    },
  };
}

function coerceItemInner(raw: Record<string, unknown>): BulkItem {
  const category = str(raw["category"])?.toLowerCase() ?? null;
  const ingredientsRaw = Array.isArray(raw["ingredients"]) ? raw["ingredients"] : [];
  const ingredients = ingredientsRaw
    .map((i) => (typeof i === "string" ? i.trim() : ""))
    .filter((i) => i.length > 1)
    .slice(0, 120);
  return {
    brand: str(raw["brand"]),
    name: str(raw["name"]),
    category: category && CATEGORIES.includes(category) ? category : null,
    size_ml: num(raw["size_ml"]),
    pao_months: num(raw["pao_months"]),
    ingredients,
    ingredients_readable: ingredients.length > 0,
    notes: str(raw["notes"]),
    position: str(raw["position"]),
  };
}

export async function extractProductsFromShelfPhoto(image: string): Promise<BulkItem[]> {
  const raw = await callGateway({
    model: "google/gemini-3.6-flash",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You read a photo containing SEVERAL beauty products lined up together. Identify every distinct product bottle, tube, jar or compact you can see.

Return ONLY strict JSON of this shape:
{"products": [{"brand": string|null, "name": string|null, "category": one of ${CATEGORIES.join("|")}|null, "size_ml": number|null, "pao_months": number|null, "ingredients": string[], "notes": string|null, "position": string|null}]}

Rules:
- One array entry per physical product, ordered left to right as they appear.
- "position" is a short human hint for where it is, e.g. "tall white bottle, second from left".
- Labels may be in any language; translate brand, name and ingredients into English (standard INCI names for ingredients).
- Only report what is legibly visible. Unclear field -> null. NEVER guess or invent a brand, name or ingredient.
- Ingredient lists are rarely legible in a group shot; return [] unless you can genuinely read them.
- Skip objects that are not beauty products.`,
          },
          { type: "image_url", image_url: { url: image } },
        ],
      },
    ],
  });
  const parsed = parseJson(raw);
  const list = Array.isArray(parsed?.["products"]) ? (parsed["products"] as unknown[]) : [];
  return list
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map(coerceItem)
    .filter((p) => p.brand || p.name)
    .slice(0, 20);
}

export async function bulkChatTurn(
  items: BulkItem[],
  history: BulkChatTurn[],
): Promise<BulkChatResult> {
  const inventory = items.map((it, i) => ({
    index: i,
    brand: it.brand,
    name: it.name,
    category: it.category,
    size_ml: it.size_ml,
    pao_months: it.pao_months,
    position: it.position,
  }));

  const raw = await callGateway({
    model: "google/gemini-3.6-flash",
    messages: [
      {
        role: "system",
        content: `You are Shelf's warm, concise assistant. The user photographed several beauty products at once and some details could not be read. Your job is to fill the gaps conversationally.

Current draft inventory (JSON): ${JSON.stringify(inventory)}
Valid categories: ${CATEGORIES.join(", ")}

Rules:
- Ask about ONE product at a time, naming it by brand/name or its "position" hint. Ask for at most two missing fields per message.
- Missing fields that matter: brand, name, category. size_ml and pao_months are nice to have.
- When the user answers, record it as an update. Never invent values the user did not give.
- If the user says they don't know or to skip, move on.
- Keep replies to 1-2 short sentences, British English, no emoji.
- Set "done" to true only when nothing important is missing or the user asks to finish.

Return ONLY strict JSON:
{"reply": string, "updates": [{"index": number, "patch": {"brand"?: string, "name"?: string, "category"?: string, "size_ml"?: number, "pao_months"?: number}}], "done": boolean}`,
      },
      ...history.map((h) => ({ role: h.role, content: h.content })),
    ],
  });

  const parsed = parseJson(raw);
  const updatesRaw = Array.isArray(parsed?.["updates"]) ? (parsed["updates"] as unknown[]) : [];
  const updates: BulkChatResult["updates"] = [];
  for (const u of updatesRaw) {
    if (!u || typeof u !== "object") continue;
    const rec = u as Record<string, unknown>;
    const index = typeof rec["index"] === "number" ? rec["index"] : -1;
    if (index < 0 || index >= items.length) continue;
    const patchRaw = (rec["patch"] ?? {}) as Record<string, unknown>;
    const patch: Partial<BulkItem> = {};
    const brand = str(patchRaw["brand"]);
    const name = str(patchRaw["name"]);
    const cat = str(patchRaw["category"])?.toLowerCase() ?? null;
    if (brand) patch.brand = brand;
    if (name) patch.name = name;
    if (cat && CATEGORIES.includes(cat)) patch.category = cat;
    const size = num(patchRaw["size_ml"]);
    if (size) patch.size_ml = size;
    const pao = num(patchRaw["pao_months"]);
    if (pao) patch.pao_months = pao;
    if (Object.keys(patch).length) updates.push({ index, patch });
  }

  return {
    reply: str(parsed?.["reply"]) ?? "Sorry, could you say that another way?",
    updates,
    done: parsed?.["done"] === true,
  };
}
