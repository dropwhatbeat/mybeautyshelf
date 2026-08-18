import type { Database } from "@/integrations/supabase/types";

export type SkinType = Database["public"]["Enums"]["skin_type"];
export type Undertone = Database["public"]["Enums"]["undertone"];

export type OnboardingDraft = {
  skin_type: SkinType | null;
  concerns: string[];
  undertone: Undertone | null;
  age_range: string | null;
  spf_habit: string | null;
  sensitivity: string | null;
  avoid_list: string[];
  pregnancy: string | null;
};

const KEY = "shelf-onboarding-draft";

export function saveDraft(draft: OnboardingDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable */
  }
}

export function readDraft(): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    return {
      skin_type: parsed.skin_type ?? null,
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
      undertone: parsed.undertone ?? null,
      age_range: parsed.age_range ?? null,
      spf_habit: parsed.spf_habit ?? null,
      sensitivity: parsed.sensitivity ?? null,
      avoid_list: Array.isArray(parsed.avoid_list) ? parsed.avoid_list : [],
      pregnancy: parsed.pregnancy ?? null,
    };
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
