import { Link } from "@tanstack/react-router";
import { CalendarClock, ScanFace, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import doodleBottle from "@/assets/doodle-bottle.png";
import doodleShelf from "@/assets/doodle-shelf.png";

const FEATURES = [
  {
    icon: CalendarClock,
    title: "Never waste a good product",
    body: "Opened date, period-after-opening and the printed expiry in one clock — we nudge you to open the sealed ones in time to actually finish them.",
  },
  {
    icon: Sparkles,
    title: "Routine conflict check",
    body: "Spot clashes like retinol with acids or vitamin C before they show up on your face.",
  },
  {
    icon: ScanFace,
    title: "Shelfie skin score",
    body: "One selfie scores hydration, fine lines and pores, and reads your colour season.",
  },
];

export function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-md px-6 pb-16 pt-10">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.3em] text-primary">My Beauty Shelf</p>
        <Link to="/auth" className="text-sm text-muted-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>

      <img src={doodleBottle} alt="" width={768} height={768} className="mt-6 w-28" />

      <h1 className="mt-3 font-display text-4xl leading-tight text-foreground">
        Your skincare and makeup shelf.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Track what's fresh, what clashes, and what's actually working — across every brand on your
        shelf.
      </p>

      <Button asChild className="mt-7 h-12 w-full text-base">
        <Link to="/onboarding">Build my beauty profile</Link>
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Five guided steps. No account needed to start.
      </p>

      <ul className="mt-10 space-y-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="rounded-2xl border border-border bg-card p-4">
            <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
            <h2 className="mt-3 font-display text-lg leading-snug text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>

      <img
        src={doodleShelf}
        alt=""
        width={1024}
        height={768}
        loading="lazy"
        className="mx-auto mt-10 w-56 opacity-90"
      />
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Already have a shelf here?{" "}
        <Link to="/auth" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
