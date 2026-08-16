import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip } from "@/components/Chip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { CONCERNS } from "@/lib/actives";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SkinType = Database["public"]["Enums"]["skin_type"];
type Undertone = Database["public"]["Enums"]["undertone"];

const SKIN_TYPES: SkinType[] = ["dry", "oily", "combination", "normal", "sensitive"];
const UNDERTONES: Undertone[] = ["cool", "neutral", "warm"];

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your skin profile — Shelf" },
      { name: "description", content: "Three quick taps: skin type, concerns and undertone." },
      { property: "og:title", content: "Set up your skin profile — Shelf" },
      { property: "og:description", content: "Three quick taps: skin type, concerns and undertone." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [undertone, setUndertone] = useState<Undertone | null>(null);
  const [saving, setSaving] = useState(false);

  async function finish() {
    if (!user) return;
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
    void navigate({ to: "/add" });
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
      hint: "Not sure? Skip it — the colour analysis can tell you later.",
      body: (
        <div className="flex flex-wrap gap-2.5">
          {UNDERTONES.map((u) => (
            <Chip key={u} label={u} selected={undertone === u} onClick={() => setUndertone(u)} />
          ))}
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
          onClick={() => (last ? void finish() : setStep(step + 1))}
        >
          {last ? "Add your first product" : "Continue"}
        </Button>
        <button
          type="button"
          onClick={() => (last ? void finish() : setStep(step + 1))}
          className="w-full text-sm text-muted-foreground underline underline-offset-4"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
