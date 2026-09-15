import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ScanFace } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Chip } from "@/components/Chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { CONCERNS } from "@/lib/actives";
import { readDraft, saveDraft } from "@/lib/onboarding-draft";
import {
  AGE_RANGES,
  AVOID_ITEMS,
  PREGNANCY_OPTIONS,
  SENSITIVITY_LEVELS,
  SPF_HABITS,
} from "@/lib/profile-options";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { Database } from "@/integrations/supabase/types";

type SkinType = Database["public"]["Enums"]["skin_type"];
type Undertone = Database["public"]["Enums"]["undertone"];

const SKIN_TYPES: SkinType[] = ["dry", "oily", "combination", "normal", "sensitive"];
const UNDERTONES: Undertone[] = ["cool", "neutral", "warm"];

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your skin profile — My Beauty Shelf" },
      { name: "description", content: "Build your beauty profile in five quick, guided steps." },
      { property: "og:title", content: "Set up your skin profile — My Beauty Shelf" },
      { property: "og:description", content: "Build your beauty profile in five quick, guided steps." },
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
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [spfHabit, setSpfHabit] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState<string | null>(null);
  const [avoidList, setAvoidList] = useState<string[]>([]);
  const [pregnancy, setPregnancy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [manualUndertone, setManualUndertone] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountNext, setAccountNext] = useState<"/add" | "/shelfie">("/add");
  const [email, setEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    const draft = readDraft();
    if (!draft) return;
    setSkinType((v) => v ?? draft.skin_type);
    setConcerns((v) => (v.length ? v : draft.concerns));
    setUndertone((v) => v ?? draft.undertone);
    setAgeRange((v) => v ?? draft.age_range);
    setSpfHabit((v) => v ?? draft.spf_habit);
    setSensitivity((v) => v ?? draft.sensitivity);
    setAvoidList((v) => (v.length ? v : draft.avoid_list));
    setPregnancy((v) => v ?? draft.pregnancy);
  }, []);

  function draftFor(to: "/add" | "/shelfie") {
    return {
      skin_type: skinType,
      concerns,
      undertone,
      age_range: ageRange,
      spf_habit: spfHabit,
      sensitivity,
      avoid_list: avoidList,
      pregnancy,
      next: to,
    };
  }

  async function finish(to: "/add" | "/shelfie" = "/add") {
    if (loading) return;
    if (!user) {
      saveDraft(draftFor(to));
      setAccountNext(to);
      setLinkSent(false);
      setAccountOpen(true);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        skin_type: skinType,
        concerns,
        undertone,
        age_range: ageRange,
        spf_habit: spfHabit,
        sensitivity,
        avoid_list: avoidList,
        pregnancy,
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

  async function emailSignIn(event: React.FormEvent) {
    event.preventDefault();
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
    });
    setAuthBusy(false);
    if (error) {
      toast.error("We couldn't send the link. Try again.");
      return;
    }
    setLinkSent(true);
  }

  async function googleSignIn() {
    setAuthBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setAuthBusy(false);
      toast.error("Google sign-in failed. Try again.");
    }
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
      title: "A little about you",
      hint: "This shapes what we suggest — and what we warn you about.",
      body: (
        <div className="space-y-7">
          <div>
            <p className="text-sm font-medium text-foreground">Age range</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {AGE_RANGES.map((a) => (
                <Chip key={a} label={a} selected={ageRange === a} onClick={() => setAgeRange(a)} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">How often do you wear SPF?</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {SPF_HABITS.map((s) => (
                <Chip key={s} label={s} selected={spfHabit === s} onClick={() => setSpfHabit(s)} />
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "How reactive is your skin?",
      hint: "We'll flag anything on your avoid list before you use it.",
      body: (
        <div className="space-y-7">
          <div className="flex flex-wrap gap-2.5">
            {SENSITIVITY_LEVELS.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={sensitivity === s}
                onClick={() => setSensitivity(s)}
              />
            ))}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Anything you avoid?</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {AVOID_ITEMS.map((a) => (
                <Chip
                  key={a}
                  label={a}
                  selected={avoidList.includes(a)}
                  onClick={() =>
                    setAvoidList((prev) =>
                      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
                    )
                  }
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Pregnant or breastfeeding?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Some actives, like retinoids, are usually avoided then.
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {PREGNANCY_OPTIONS.map((p) => (
                <Chip key={p} label={p} selected={pregnancy === p} onClick={() => setPregnancy(p)} />
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Let's read your skin",
      hint: "One selfie in daylight — we call it a Shelfie — fills in the rest of your profile.",
      body: (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <ScanFace className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
              <p className="text-sm font-medium text-foreground">What your Shelfie gives you</p>
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
              {[
                "Your undertone — cool, neutral or warm",
                "Your colour season, with best shades and colours to skip (beta)",
                "Skin scores: hydration, fine lines, pores, redness, evenness",
                "Oil in your T-zone and cheeks, plus an under-eye read",
                "Skin depth and face shape, with blush and contour placement tips",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Your photo is only used to produce this read, and stays private to your shelf.
            </p>
          </div>

          <Button
            className="h-12 w-full text-base"
            disabled={saving}
            onClick={() => void finish("/shelfie")}
          >
            Take my Shelfie
          </Button>

          {manualUndertone ? (
            <div>
              <p className="text-sm font-medium text-foreground">Your undertone</p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {UNDERTONES.map((u) => (
                  <Chip
                    key={u}
                    label={u}
                    selected={undertone === u}
                    onClick={() => setUndertone(u)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setManualUndertone(true)}
              className="w-full text-sm text-muted-foreground underline underline-offset-4"
            >
              I know my undertone
            </button>
          )}
        </div>
      ),
    },
  ];

  const current = steps[step]!;
  const last = step === steps.length - 1;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-12">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => (step === 0 ? void navigate({ to: "/" }) : setStep(step - 1))}
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div className="flex flex-1 gap-1.5 pl-3">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      </div>

      <h1 className="mt-8 font-display text-3xl leading-tight">{current.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{current.hint}</p>
      <div className="mt-8">{current.body}</div>

      <div className="mt-auto space-y-3 pt-12">
        {last ? (
          <Button
            variant="ghost"
            className="h-11 w-full text-sm text-muted-foreground"
            disabled={saving}
            onClick={() => void finish("/add")}
          >
            Continue without Shelfie
          </Button>
        ) : (
          <Button className="h-12 w-full text-base" onClick={() => setStep(step + 1)}>
            Continue
          </Button>
        )}
      </div>

      <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl px-6 pb-8 pt-7"
        >
          <SheetHeader className="pr-7 text-left">
            <p className="text-[11px] uppercase tracking-[0.3em] text-primary">My Beauty Shelf</p>
            <SheetTitle className="font-display text-2xl leading-tight">
              Your beauty profile is ready
            </SheetTitle>
            <SheetDescription className="leading-relaxed">
              Your answers are saved on this device. Create an account to keep them and {accountNext === "/shelfie" ? "continue to your Shelfie" : "start adding products to your shelf"}.
            </SheetDescription>
          </SheetHeader>

          <Button
            type="button"
            variant="outline"
            className="mt-6 h-12 w-full text-base"
            disabled={authBusy}
            onClick={() => void googleSignIn()}
          >
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or use email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={(event) => void emailSignIn(event)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="onboarding-email">Email</Label>
              <Input
                id="onboarding-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setLinkSent(false);
                }}
                className="h-12"
              />
            </div>
            <Button type="submit" className="h-12 w-full text-base" disabled={authBusy}>
              {authBusy ? "Sending…" : linkSent ? "Resend sign-in link" : "Email me a sign-in link"}
            </Button>
          </form>

          {linkSent ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Link sent to {email}. Open it on this device and your saved profile will be waiting.
            </p>
          ) : (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              No password needed. Close this to review your answers.
            </p>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
