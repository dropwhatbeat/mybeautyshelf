export type ActiveKey =
  | "retinoid"
  | "aha_bha"
  | "vitamin_c"
  | "benzoyl_peroxide"
  | "niacinamide";

export const ACTIVES: Record<ActiveKey, { label: string; matches: string[] }> = {
  retinoid: {
    label: "Retinoid",
    matches: ["retinol", "retinal", "retinaldehyde", "retinyl", "tretinoin", "adapalene", "granactive retinoid", "hydroxypinacolone retinoate"],
  },
  aha_bha: {
    label: "AHA / BHA",
    matches: ["glycolic acid", "lactic acid", "mandelic acid", "salicylic acid", "malic acid", "tartaric acid", "citric acid", "azelaic acid"],
  },
  vitamin_c: {
    label: "Vitamin C",
    matches: ["ascorbic acid", "l-ascorbic", "sodium ascorbyl phosphate", "magnesium ascorbyl phosphate", "ascorbyl glucoside", "ethyl ascorbic acid", "tetrahexyldecyl ascorbate"],
  },
  benzoyl_peroxide: { label: "Benzoyl peroxide", matches: ["benzoyl peroxide"] },
  niacinamide: { label: "Niacinamide", matches: ["niacinamide", "nicotinamide"] },
};

export function detectActives(ingredients: string[] | null | undefined): ActiveKey[] {
  if (!ingredients?.length) return [];
  const hay = ingredients.map((i) => i.toLowerCase());
  const found = new Set<ActiveKey>();
  for (const [key, def] of Object.entries(ACTIVES) as [ActiveKey, { matches: string[] }][]) {
    if (hay.some((ing) => def.matches.some((m) => ing.includes(m)))) found.add(key);
  }
  return [...found];
}

export function ingredientActive(ingredient: string): ActiveKey | null {
  const low = ingredient.toLowerCase();
  for (const [key, def] of Object.entries(ACTIVES) as [ActiveKey, { matches: string[] }][]) {
    if (def.matches.some((m) => low.includes(m))) return key;
  }
  return null;
}

export type ConflictRule = { a: ActiveKey; b: ActiveKey; note: string };

export const CONFLICTS: ConflictRule[] = [
  {
    a: "retinoid",
    b: "aha_bha",
    note: "Retinoids and exfoliating acids are often advised not to be layered in the same routine — many people find the combination drying.",
  },
  {
    a: "retinoid",
    b: "benzoyl_peroxide",
    note: "Benzoyl peroxide and retinoids are commonly used at different times of day, as they can reduce each other's stability.",
  },
  {
    a: "vitamin_c",
    b: "aha_bha",
    note: "Vitamin C and exfoliating acids are frequently spaced apart, since together they can feel harsh on the skin.",
  },
  {
    a: "vitamin_c",
    b: "benzoyl_peroxide",
    note: "Vitamin C and benzoyl peroxide are often used in separate routines, as they're not considered a stable pairing.",
  },
  {
    a: "vitamin_c",
    b: "retinoid",
    note: "Vitamin C in the morning and a retinoid at night is the usual way people split these two.",
  },
];

export const CONCERNS = [
  "Acne",
  "Dryness",
  "Dullness",
  "Fine lines",
  "Hyperpigmentation",
  "Oiliness",
  "Redness",
  "Large pores",
  "Sun protection",
  "Texture",
] as const;

export type Concern = (typeof CONCERNS)[number];

export const CONCERN_GUIDES: Record<string, { keywords: string[]; suggestion: string }> = {
  Acne: {
    keywords: ["salicylic acid", "benzoyl peroxide", "azelaic acid", "adapalene", "niacinamide"],
    suggestion: "Shelves aimed at breakouts usually include a BHA, benzoyl peroxide or azelaic acid somewhere in the routine.",
  },
  Dryness: {
    keywords: ["hyaluronic", "glycerin", "ceramide", "squalane", "shea butter", "urea", "panthenol"],
    suggestion: "Humectants like glycerin or hyaluronic acid, plus ceramides, are the usual building blocks for dry skin.",
  },
  Dullness: {
    keywords: ["ascorbic", "glycolic acid", "lactic acid", "niacinamide"],
    suggestion: "Vitamin C or a gentle AHA is the category most often used for a brighter finish.",
  },
  "Fine lines": {
    keywords: ["retinol", "retinal", "retinyl", "peptide", "bakuchiol", "ascorbic"],
    suggestion: "Retinoids and peptides are the categories usually associated with fine lines.",
  },
  Hyperpigmentation: {
    keywords: ["niacinamide", "ascorbic", "tranexamic", "azelaic acid", "alpha arbutin", "kojic"],
    suggestion: "Niacinamide, vitamin C, tranexamic or azelaic acid are the usual pigment-focused categories.",
  },
  Oiliness: {
    keywords: ["niacinamide", "salicylic acid", "zinc", "clay", "kaolin"],
    suggestion: "Niacinamide and BHA are the ingredient families most often used when skin feels oily.",
  },
  Redness: {
    keywords: ["centella", "madecassoside", "panthenol", "allantoin", "azelaic acid", "oat", "bisabolol"],
    suggestion: "Soothing ingredients such as centella, panthenol or oat are the common choice for reactive skin.",
  },
  "Large pores": {
    keywords: ["niacinamide", "salicylic acid", "retinol", "clay"],
    suggestion: "Niacinamide and BHA are the categories usually mentioned for the look of pores.",
  },
  "Sun protection": {
    keywords: ["zinc oxide", "titanium dioxide", "avobenzone", "tinosorb", "octocrylene", "homosalate", "uvinul"],
    suggestion: "A daily broad-spectrum SPF is the missing category here.",
  },
  Texture: {
    keywords: ["lactic acid", "glycolic acid", "mandelic acid", "retinol", "urea", "pha", "gluconolactone"],
    suggestion: "Gentle AHAs, PHAs or a retinoid are the usual categories for smoothing texture.",
  },
};
