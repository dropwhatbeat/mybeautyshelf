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
