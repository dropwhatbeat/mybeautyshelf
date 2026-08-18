import { CONCERN_GUIDES, detectActives } from "@/lib/actives";
import type { Product, Profile } from "@/lib/queries";

export type FitBand = "great" | "good" | "care" | "avoid";

export type FitResult = {
  score: number;
  band: FitBand;
  bandLabel: string;
  helps: string[];
  cautions: string[];
  verdict: string | null;
};

export const bandLabel: Record<FitBand, string> = {
  great: "Great match",
  good: "Works for you",
  care: "Use with care",
  avoid: "Not recommended",
};

export const bandDot: Record<FitBand, string> = {
  great: "bg-fresh",
  good: "bg-fresh/70",
  care: "bg-soon",
  avoid: "bg-expired",
};

export const bandText: Record<FitBand, string> = {
  great: "text-fresh",
  good: "text-fresh",
  care: "text-soon",
  avoid: "text-expired",
};

const AVOID_KEYWORDS: Record<string, string[]> = {
  fragrance: ["fragrance", "parfum", "perfume", "linalool", "limonene", "geraniol", "citronellol"],
  "essential oils": [
    "essential oil",
    "lavandula",
    "citrus oil",
    "mentha",
    "eucalyptus",
    "rosmarinus",
    "melaleuca",
    "tea tree oil",
    "ylang",
  ],
  "drying alcohol": ["alcohol denat", "sd alcohol", "isopropyl alcohol", "ethanol"],
  nuts: ["almond", "argania", "macadamia", "hazelnut", "walnut", "cashew", "prunus amygdalus"],
  silicones: ["dimethicone", "cyclopentasiloxane", "siloxane", "silicone"],
  sulfates: ["sodium lauryl sulfate", "sodium laureth sulfate", "ammonium lauryl sulfate"],
  retinoids: ["retinol", "retinal", "retinyl", "tretinoin", "adapalene", "retinoate"],
};

const PREGNANCY_AVOID = [
  { keys: ["retinol", "retinal", "retinyl", "tretinoin", "adapalene", "retinoate"], label: "a retinoid" },
  { keys: ["hydroquinone"], label: "hydroquinone" },
  { keys: ["salicylic acid"], label: "a high-strength salicylic acid" },
];

const HARSH = ["glycolic acid", "salicylic acid", "benzoyl peroxide", "alcohol denat", "menthol", "witch hazel"];
const OCCLUSIVE = ["petrolatum", "mineral oil", "coconut oil", "cocos nucifera oil", "isopropyl myristate", "shea butter"];
const SOOTHING = ["centella", "madecassoside", "panthenol", "allantoin", "oat", "bisabolol", "ceramide"];
const HUMECTANT = ["glycerin", "hyaluronic", "sodium pha", "betaine", "squalane", "ceramide"];

function has(hay: string[], needles: string[]) {
  return hay.some((i) => needles.some((n) => i.includes(n)));
}

function found(hay: string[], needles: string[]) {
  return hay.find((i) => needles.some((n) => i.includes(n)));
}

export function profileIsEmpty(profile: Profile | null | undefined) {
  if (!profile) return true;
  return (
    !profile.skin_type &&
    !(profile.concerns?.length) &&
    !profile.sensitivity &&
    !(profile.avoid_list?.length) &&
    !profile.pregnancy
  );
}

export function scoreProduct(product: Product, profile: Profile | null | undefined): FitResult {
  const ing = (product.ingredients ?? []).map((i) => i.toLowerCase());
  const helps: string[] = [];
  const cautions: string[] = [];
  let score = 62;
  let verdict: string | null = null;

  const concerns = profile?.concerns ?? [];
  for (const concern of concerns) {
    const guide = CONCERN_GUIDES[concern];
    if (!guide) continue;
    const hit = found(ing, guide.keywords);
    if (hit) {
      helps.push(`${hit.replace(/\b\w/g, (c) => c.toUpperCase())} — targets your ${concern.toLowerCase()} goal.`);
      score += 11;
    }
  }

  if (product.category === "spf") {
    helps.push("Daily SPF is the single biggest thing for keeping skin even and firm.");
    score += profile?.spf_habit && profile.spf_habit !== "daily" ? 14 : 8;
  }

  const skin = profile?.skin_type;
  if (skin === "dry" && has(ing, HUMECTANT)) {
    helps.push("Humectants and lipids here suit dry skin.");
    score += 7;
  }
  if (skin === "sensitive" && has(ing, SOOTHING)) {
    helps.push("Soothing ingredients here suit reactive skin.");
    score += 7;
  }
  if (skin === "oily" && has(ing, OCCLUSIVE)) {
    cautions.push("Heavy occlusives like petrolatum or coconut oil can feel greasy on oily skin.");
    score -= 12;
  }
  if (skin === "dry" && has(ing, ["alcohol denat", "sd alcohol"])) {
    cautions.push("Drying alcohol high in the list can strip dry skin further.");
    score -= 12;
  }

  const sensitivity = profile?.sensitivity;
  if (sensitivity === "very reactive") {
    const harsh = found(ing, HARSH);
    if (harsh) {
      cautions.push(`${harsh} is a stronger active — introduce it slowly on very reactive skin.`);
      score -= 14;
    }
    if (has(ing, AVOID_KEYWORDS['fragrance']!)) {
      cautions.push("Contains fragrance, a common trigger for reactive skin.");
      score -= 10;
    }
  }

  for (const item of profile?.avoid_list ?? []) {
    const keys = AVOID_KEYWORDS[item];
    if (!keys) continue;
    const hit = found(ing, keys);
    if (hit) {
      cautions.push(`Contains ${hit} — you asked to avoid ${item}.`);
      score -= 26;
      verdict = `This one is on your avoid-list (${item}), so it isn't a match for your profile.`;
    }
  }

  const pregnancy = profile?.pregnancy;
  if (pregnancy === "pregnant" || pregnancy === "breastfeeding") {
    for (const rule of PREGNANCY_AVOID) {
      if (has(ing, rule.keys)) {
        cautions.push(`Contains ${rule.label}, which is usually paused while ${pregnancy}.`);
        score -= 30;
        verdict = `Usually set aside while ${pregnancy} — worth checking with your doctor before using.`;
      }
    }
  }

  const actives = detectActives(product.ingredients);
  if (actives.length >= 3) {
    cautions.push("Three or more strong actives in one product stacks up quickly — space out usage.");
    score -= 8;
  }

  if (ing.length === 0) {
    return {
      score: 0,
      band: "care",
      bandLabel: "No ingredients yet",
      helps: [],
      cautions: [],
      verdict: "Add the back-of-pack photo and we'll score how this fits your skin.",
    };
  }

  score = Math.max(5, Math.min(98, score));
  const band: FitBand = verdict ? "avoid" : score >= 82 ? "great" : score >= 62 ? "good" : "care";
  if (band === "care" && !verdict && cautions.length) verdict = null;

  return {
    score,
    band,
    bandLabel: bandLabel[band],
    helps: helps.slice(0, 3),
    cautions: cautions.slice(0, 3),
    verdict,
  };
}
