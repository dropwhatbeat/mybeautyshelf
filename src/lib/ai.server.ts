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
