import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Camera, Share2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { analyseColour } from "@/lib/ai.functions";
import { fileToCompressedDataUrl } from "@/lib/image";
import { supabase } from "@/integrations/supabase/client";

type ColourAnalysis = {
  season: string;
  undertone: string;
  best_colours: string[];
  avoid_colours: string[];
  rationale: string;
};

export const Route = createFileRoute("/colour")({
  head: () => ({
    meta: [
      { title: "Colour analysis — Shelf" },
      {
        name: "description",
        content: "A seasonal colour read from one selfie, with shades that suit your undertone.",
      },
      { property: "og:title", content: "Colour analysis — Shelf" },
      {
        property: "og:description",
        content: "A seasonal colour read from one selfie, with shades that suit your undertone.",
      },
    ],
  }),
  component: Colour,
});

function Colour() {
  const { user } = useAuth();
  const run = useServerFn(analyseColour);
  const fileInput = useRef<HTMLInputElement>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ColourAnalysis | null>(null);

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
      const res = await run({ data: { selfie } });
      setResult(res);
      await supabase
        .from("profiles")
        .update({ season_result: res.season, season_payload: JSON.parse(JSON.stringify(res)) })
        .eq("id", user.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't work — try again.");
    } finally {
      setLoading(false);
    }
  }

  async function share() {
    if (!result) return;
    const text = `My colour season is ${result.season} — best shades: ${result.best_colours.join(", ")}. Found with Shelf.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My colour season", text });
        return;
      } catch {
        /* dismissed */
      }
    }
    await navigator.clipboard.writeText(text);
    toast.success("Copied — paste it anywhere.");
  }

  return (
    <AppShell>
      <PageHeader title="Colour analysis" subtitle="One selfie, in daylight, no filter" />

      <div className="space-y-5 px-5">
        <button
          onClick={() => fileInput.current?.click()}
          className="w-full overflow-hidden rounded-2xl border border-dashed border-border bg-card"
        >
          {selfie ? (
            <img src={selfie} alt="Your selfie" className="aspect-4/5 w-full object-cover" />
          ) : (
            <div className="flex aspect-4/5 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Camera className="h-7 w-7" />
              <span className="font-display text-lg text-foreground">Take a selfie</span>
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
          Your selfie is sent for analysis and is never stored by Shelf. Only the resulting season
          and undertone are saved to your profile.
        </p>

        <Button
          className="h-13 w-full py-4 text-base"
          disabled={!selfie || loading}
          onClick={() => void analyse()}
        >
          {loading ? "Reading your colouring…" : "Analyse my colouring"}
        </Button>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        )}

        {result && (
          <section className="rounded-3xl border border-border bg-card p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {result.undertone} undertone
            </p>
            <h2 className="mt-1 font-display text-3xl">{result.season}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{result.rationale}</p>

            <h3 className="mt-6 font-display text-lg">Shades that suit you</h3>
            <Swatches colours={result.best_colours} />

            <h3 className="mt-5 font-display text-lg">Harder to wear</h3>
            <Swatches colours={result.avoid_colours} muted />

            <Button variant="outline" className="mt-6 h-12 w-full" onClick={() => void share()}>
              <Share2 className="mr-2 h-4 w-4" /> Share my season
            </Button>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function Swatches({ colours, muted }: { colours: string[]; muted?: boolean }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {colours.map((c) => (
        <li
          key={c}
          className={
            muted
              ? "rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground line-through"
              : "rounded-full bg-primary/12 px-3 py-1.5 text-xs text-primary ring-1 ring-primary/25"
          }
        >
          {c}
        </li>
      ))}
    </ul>
  );
}
