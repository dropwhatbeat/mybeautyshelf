import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock, ScanFace } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Chip } from "@/components/Chip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { CONCERNS } from "@/lib/actives";
import { saveDraft } from "@/lib/onboarding-draft";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import doodleFace from "@/assets/doodle-face.png";

type SkinType = Database["public"]["Enums"]["skin_type"];
type Undertone = Database["public"]["Enums"]["undertone"];

const SKIN_TYPES: SkinType[] = ["dry", "oily", "combination", "normal", "sensitive"];
const UNDERTONES: Undertone[] = ["cool", "neutral", "warm"];

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your skin profile — My Beauty Shelf" },
      { name: "description", content: "Three quick taps: skin type, concerns and undertone." },
      { property: "og:title", content: "Set up your skin profile — My Beauty Shelf" },
      { property: "og:description", content: "Three quick taps: skin type, concerns and undertone." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [undertone, setUndertone] = useState<Undertone | null>(null);
  const [saving, setSaving] = useState(false);
  const [teaser, setTeaser] = useState(false);

  async function finish(to: "/add" | "/shelfie" = "/add") {
    if (loading) return;
    if (!user) {
      saveDraft({ skin_type: skinType, concerns, undertone });
      setTeaser(true);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        skin_type: skinType,
        concerns,
        undertone,
        onboarded: true,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save that — try again.");
      return;
    }
    void navigate({ to });
  }

  if (teaser) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-12">
        <p className="text-[11px] uppercase tracking-[0.3em] text-primary">My Beauty Shelf</p>
        <h1 className="mt-3 font-display text-3xl leading-tight">Your skin profile is ready.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {skinType ? `${skinType} skin` : "Skin profile"}
          {concerns.length ? ` · ${concerns.slice(0, 3).join(", ")}` : ""}
          {undertone ? ` · ${undertone} undertone` : ""}
        </p>

        <div className="relative mt-8 overflow-hidden rounded-2xl border border-border bg-card p-6">
          <div className="pointer-events-none select-none blur-[6px]" aria-hidden="true">
            <img src={doodleFace} alt="" width={768} height={768} className="mx-auto w-24" />
            <div className="mt-4 space-y-3">
              {["Hydration", "Fine lines", "Pores"].map((label) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{label}</span>
                    <span>__ / 100</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div className="h-2 w-2/3 rounded-full bg-primary" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/60 px-6 text-center">
            <Lock className="h-5 w-5 text-primary" strokeWidth={1.75} />
            <p className="font-display text-lg leading-snug">
              Create an account to unlock your scores
            </p>
            <p className="text-xs text-muted-foreground">
              Then one Shelfie scores hydration, fine lines and pores, and reads your colour season.
            </p>
          </div>
        </div>

        <div className="mt-auto space-y-3 pt-10">
          <Button asChild className="h-12 w-full text-base">
            <Link to="/auth">Create account to unlock</Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            No password — a magic link or Google. Your answers are saved to your shelf as soon as
            you sign in.
          </p>
        </div>
      </div>
    );
  }

  const steps = [
    {
      title: "How does your skin usually behave?",
      hint: "Pick the one that fits most days.",
      body: (
        <div className="flex flex-wrap gap-2.5">
          {SKIN_TYPES.map((t) => (
            <Chip key={t} label={t} selected={skinType === t} onClick={() => setSkinType(t)} />
          ))}
        </div>
      ),
    },
    {
      title: "What are you working on?",
      hint: "Choose as many as you like.",
      body: (
        <div className="flex flex-wrap gap-2.5">
          {CONCERNS.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={concerns.includes(c)}
              onClick={() =>
                setConcerns((prev) =>
                  prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                )
              }
            />
          ))}
        </div>
      ),
    },
    {
      title: "Your undertone",
      hint: "Not sure? Take a Shelfie and we'll read it from your photo.",
      body: (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2.5">
            {UNDERTONES.map((u) => (
              <Chip key={u} label={u} selected={undertone === u} onClick={() => setUndertone(u)} />
            ))}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void finish("/shelfie")}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary"
          >
            <ScanFace className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Not sure? Take a Shelfie
              </span>
              <span className="block text-xs text-muted-foreground">
                One selfie reads your undertone, colour season and skin scores.
              </span>
            </span>
          </button>
        </div>
      ),
    },
  ];

  const current = steps[step]!;
  const last = step === steps.length - 1;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-12">
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>

      <h1 className="mt-10 font-display text-3xl leading-tight">{current.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{current.hint}</p>
      <div className="mt-8">{current.body}</div>

      <div className="mt-auto space-y-3 pt-12">
        <Button
          className="h-12 w-full text-base"
          disabled={saving}
          onClick={() => (last ? void finish("/add") : setStep(step + 1))}
        >
          {last ? "Add your first product" : "Continue"}
        </Button>
        <button
          type="button"
          onClick={() => (last ? void finish("/add") : setStep(step + 1))}
          className="w-full text-sm text-muted-foreground underline underline-offset-4"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
