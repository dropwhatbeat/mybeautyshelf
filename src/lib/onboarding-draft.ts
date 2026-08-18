import type { Database } from "@/integrations/supabase/types";

export type SkinType = Database["public"]["Enums"]["skin_type"];
export type Undertone = Database["public"]["Enums"]["undertone"];

export type OnboardingDraft = {
  skin_type: SkinType | null;
  concerns: string[];
  undertone: Undertone | null;
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
