import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/AppShell";
import doodleInsights from "@/assets/doodle-insights.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ACTIVES, CONCERN_GUIDES, CONFLICTS, detectActives } from "@/lib/actives";
import { bandText, profileIsEmpty, scoreProduct } from "@/lib/fit";
import { freshnessFor } from "@/lib/freshness";
import { useProducts, useProfile, useUpdateProduct, type Product } from "@/lib/queries";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — My Beauty Shelf" },
      {
        name: "description",
        content: "What's expiring, what's often not layered together, and where your shelf has gaps.",
      },
      { property: "og:title", content: "Insights — My Beauty Shelf" },
      {
        property: "og:description",
        content: "What's expiring, what's often not layered together, and where your shelf has gaps.",
      },
    ],
  }),
  component: Insights,
});

function Insights() {
  const { user } = useAuth();
  const { data: products } = useProducts(user?.id);
  const { data: profile } = useProfile(user?.id);
  const update = useUpdateProduct();

  const active = useMemo(
    () => (products ?? []).filter((p) => p.status === "active"),
    [products],
  );

  const expiring = useMemo(
    () =>
      active
        .map((p) => ({ p, f: freshnessFor(p.date_opened, p.pao_months) }))
        .filter((x) => x.f.status === "soon" || x.f.status === "expired")
        .sort((a, b) => (a.f.daysRemaining ?? 0) - (b.f.daysRemaining ?? 0)),
    [active],
  );

  const conflicts = useMemo(() => {
    const byActive = new Map<string, Product[]>();
    for (const p of active) {
      for (const a of detectActives(p.ingredients)) {
        byActive.set(a, [...(byActive.get(a) ?? []), p]);
      }
    }
    return CONFLICTS.filter((rule) => byActive.has(rule.a) && byActive.has(rule.b)).map((rule) => ({
      rule,
      a: byActive.get(rule.a)!,
      b: byActive.get(rule.b)!,
    }));
  }, [active]);

  const gaps = useMemo(() => {
    const concerns = profile?.concerns ?? [];
    const allIngredients = active.flatMap((p) => p.ingredients.map((i) => i.toLowerCase()));
    return concerns.map((concern) => {
      const guide = CONCERN_GUIDES[concern];
      if (!guide) return { concern, covered: true, suggestion: "" };
      const covered = guide.keywords.some((k) => allIngredients.some((i) => i.includes(k)));
      return { concern, covered, suggestion: guide.suggestion };
    });
  }, [active, profile]);

  return (
    <AppShell>
      <PageHeader
        title="Insights"
        subtitle="A read on the shelf you already own"
        action={
          <img
            src={doodleInsights}
            alt=""
            width={768}
            height={768}
            loading="lazy"
            className="mt-1 w-16 opacity-90"
          />
        }
      />

      <div className="space-y-5 px-5">
        <p className="rounded-2xl bg-secondary px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Beauty Shelf offers general cosmetic-usage guidance, not medical advice. Nothing here diagnoses a
          skin condition — if something feels wrong on your skin, a professional is the right call.
        </p>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-xl">Expiring soon</h2>
          {expiring.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing is close to its date. Products without a date opened show up as grey on your
              shelf.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {expiring.map(({ p, f }) => (
                <li key={p.id} className="rounded-xl border border-border p-3">
                  <Link to="/product/$id" params={{ id: p.id }} className="block">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {p.brand}
                    </p>
                    <p className="font-display text-base">{p.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{f.label}</p>
                  </Link>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      className="h-10 flex-1 text-xs"
                      onClick={() =>
                        update.mutate(
                          { id: p.id, patch: { status: "finished" } },
                          { onSuccess: () => toast.success("Marked finished.") },
                        )
                      }
                    >
                      Mark finished
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-10 flex-1 text-xs"
                      onClick={() =>
                        update.mutate(
                          {
                            id: p.id,
                            patch: { pao_months: (p.pao_months ?? 6) + 3 },
                          },
                          { onSuccess: () => toast.success("Kept on the shelf.") },
                        )
                      }
                    >
                      Still good
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-xl">Routine check</h2>
          {conflicts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No commonly-flagged combinations across your active products.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {conflicts.map(({ rule, a, b }) => (
                <li key={`${rule.a}-${rule.b}`} className="rounded-xl bg-secondary p-3">
                  <p className="font-medium text-sm">
                    {ACTIVES[rule.a].label} + {ACTIVES[rule.b].label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{rule.note}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    On your shelf: {a[0]?.name} · {b[0]?.name}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-xl">Shelf gaps</h2>
          {gaps.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Add your concerns in My skin profile and we'll check your shelf against them.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {gaps.map((g) => (
                <li key={g.concern} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-medium">{g.concern}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {g.covered
                      ? "Your shelf already has something in a relevant ingredient family."
                      : g.suggestion}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
