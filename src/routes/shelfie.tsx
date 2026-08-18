import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Camera, Share2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { analyseShelfie } from "@/lib/ai.functions";
import { fileToCompressedDataUrl } from "@/lib/image";
import { supabase } from "@/integrations/supabase/client";

type ShelfieResult = {
  season: string;
  undertone: string;
  best_colours: string[];
  avoid_colours: string[];
  rationale: string;
  skin: {
    hydration: number;
    fine_lines: number;
    pores: number;
    overall: number;
    notes: { hydration: string; fine_lines: string; pores: string };
  };
};

const TITLE = "Shelfie — My Beauty Shelf";
const DESCRIPTION =
  "One selfie gives you a skin score for hydration, fine lines and pores, plus your colour season.";

export const Route = createFileRoute("/shelfie")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shelfie,
});

function Shelfie() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const run = useServerFn(analyseShelfie);
  const fileInput = useRef<HTMLInputElement>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShelfieResult | null>(null);

  const history = useQuery({
    queryKey: ["skin-checks", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skin_checks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  async function pick(file: File | undefined) {
    if (!file) return;
    const url = await fileToCompressedDataUrl(file, 1024);
    setSelfie(url);
    setResult(null);
  }

  async function analyse() {
    if (!selfie || !user) return;
    setLoading(true);
    try {
      const res = (await run({ data: { selfie } })) as ShelfieResult;
      setResult(res);
      await supabase.from("skin_checks").insert({
        user_id: user.id,
        hydration: res.skin.hydration,
        fine_lines: res.skin.fine_lines,
        pores: res.skin.pores,
        overall: res.skin.overall,
        notes: res.skin.notes,
        season: res.season,
        undertone: res.undertone,
      });
      await supabase
        .from("profiles")
        .update({ season_result: res.season, season_payload: JSON.parse(JSON.stringify(res)) })
        .eq("id", user.id);
      void qc.invalidateQueries({ queryKey: ["skin-checks", user.id] });
      void qc.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't work — try again.");
    } finally {
      setLoading(false);
    }
  }

  async function share() {
    if (!result) return;
    const text = `My Shelfie score: ${result.skin.overall}/100 — hydration ${result.skin.hydration}, fine lines ${result.skin.fine_lines}, pores ${result.skin.pores}. Colour season: ${result.season}. From My Beauty Shelf.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Shelfie", text });
        return;
      } catch {
        /* dismissed */
      }
    }
    await navigator.clipboard.writeText(text);
    toast.success("Copied — paste it anywhere.");
  }

  const previous = history.data ?? [];

  return (
    <AppShell>
      <PageHeader title="Shelfie" subtitle="One selfie, in daylight, no filter" />

      <div className="space-y-5 px-5">
        <button
          onClick={() => fileInput.current?.click()}
          className="w-full overflow-hidden rounded-2xl border border-dashed border-border bg-card"
        >
          {selfie ? (
            <img src={selfie} alt="Your shelfie" className="aspect-4/5 w-full object-cover" />
          ) : (
            <div className="flex aspect-4/5 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Camera className="h-7 w-7" />
              <span className="font-display text-lg text-foreground">Take a shelfie</span>
              <span className="px-10 text-center text-xs">
                Face a window, keep your hair off your face, and skip the filters.
              </span>
            </div>
          )}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={(e) => void pick(e.target.files?.[0])}
        />

        <p className="rounded-2xl bg-secondary px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Your shelfie is sent for analysis and is never stored by My Beauty Shelf. Only the scores,
          season and undertone are saved. Scores describe how skin looks in cosmetic terms — they
          are not a medical assessment.
        </p>

        <Button
          className="h-13 w-full py-4 text-base"
          disabled={!selfie || loading}
          onClick={() => void analyse()}
        >
          {loading ? "Reading your shelfie…" : "Score my shelfie"}
        </Button>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        )}

        {result && (
          <>
            <section className="rounded-3xl border border-border bg-card p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Skin score
              </p>
              <p className="mt-1 font-display text-5xl leading-none">
                {result.skin.overall}
                <span className="ml-1 font-sans text-base text-muted-foreground">/100</span>
              </p>
              <div className="mt-5 space-y-4">
                <ScoreBar label="Hydration" value={result.skin.hydration} note={result.skin.notes.hydration} />
                <ScoreBar label="Fine lines" value={result.skin.fine_lines} note={result.skin.notes.fine_lines} />
                <ScoreBar label="Pores" value={result.skin.pores} note={result.skin.notes.pores} />
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {result.undertone} undertone
              </p>
              <h2 className="mt-1 font-display text-3xl">{result.season}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {result.rationale}
              </p>

              <h3 className="mt-6 font-display text-lg">Shades that suit you</h3>
              <Swatches colours={result.best_colours} />

              <h3 className="mt-5 font-display text-lg">Harder to wear</h3>
              <Swatches colours={result.avoid_colours} muted />

              <Button variant="outline" className="mt-6 h-12 w-full" onClick={() => void share()}>
                <Share2 className="mr-2 h-4 w-4" /> Share my shelfie
              </Button>
            </section>
          </>
        )}

        {previous.length > 0 && (
          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="font-display text-xl">Your progress</h2>
            <ul className="mt-3 divide-y divide-border">
              {previous.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>H {c.hydration}</span>
                    <span>L {c.fine_lines}</span>
                    <span>P {c.pores}</span>
                    <span className="font-display text-base text-foreground">{c.overall}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function ScoreBar({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <span className="font-display text-lg">{value}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      {note ? <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function Swatches({ colours, muted }: { colours: string[]; muted?: boolean }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {colours.map((c) => (
        <li key={c} className="flex flex-col items-center gap-1">
          <span
            className={
              muted
                ? "block h-10 w-10 rounded-full opacity-50 ring-1 ring-border"
                : "block h-10 w-10 rounded-full ring-1 ring-border"
            }
            style={{ backgroundColor: c }}
          />
          <span className="text-[10px] text-muted-foreground">{c}</span>
        </li>
      ))}
    </ul>
  );
}