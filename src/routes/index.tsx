import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { AppShell, PageHeader } from "@/components/AppShell";
import { LandingPage } from "@/components/LandingPage";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { freshnessFor } from "@/lib/freshness";
import { useProducts, useProfile } from "@/lib/queries";
import { cn } from "@/lib/utils";
import doodleShelf from "@/assets/doodle-shelf.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Beauty Shelf — your skincare and makeup shelf" },
      {
        name: "description",
        content: "Every skincare and makeup product you own, with freshness at a glance.",
      },
      { property: "og:title", content: "My Beauty Shelf — your skincare and makeup shelf" },
      {
        property: "og:description",
        content: "Every skincare and makeup product you own, with freshness at a glance.",
      },
    ],
  }),
  component: ShelfPage,
});

type Sort = "expiring" | "recent" | "category";

const SORTS: { key: Sort; label: string }[] = [
  { key: "expiring", label: "Expiring soonest" },
  { key: "recent", label: "Recently added" },
  { key: "category", label: "Category" },
];

function ShelfPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useProfile(user?.id);
  const { data: products, isLoading } = useProducts(user?.id);
  const [sort, setSort] = useState<Sort>("expiring");

  useEffect(() => {
    if (profile && !profile.onboarded) void navigate({ to: "/onboarding" });
  }, [profile, navigate]);

  const sorted = useMemo(() => {
    const list = (products ?? []).filter((p) => p.status === "active");
    if (sort === "recent") return list;
    if (sort === "category")
      return [...list].sort((a, b) => a.category.localeCompare(b.category));
    return [...list].sort((a, b) => {
      const av = freshnessFor(a.date_opened, a.pao_months).daysRemaining ?? 99_999;
      const bv = freshnessFor(b.date_opened, b.pao_months).daysRemaining ?? 99_999;
      return av - bv;
    });
  }, [products, sort]);

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <LandingPage />;

  return (
    <AppShell>
      <PageHeader
        title="My Beauty Shelf"
        subtitle={
          sorted.length ? `${sorted.length} products in rotation` : "Nothing here yet"
        }
        action={
          <Button asChild size="icon" className="mt-1 h-11 w-11 rounded-full">
            <Link to="/add" aria-label="Add product">
              <Plus className="h-5 w-5" />
            </Link>
          </Button>
        }
      />

      <div className="flex gap-2 overflow-x-auto px-5 pb-4">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs transition-colors",
              sort === s.key
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 px-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-4/5 rounded-2xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="mx-5 rounded-2xl border border-dashed border-border p-8 text-center">
          <img
            src={doodleShelf}
            alt=""
            width={1024}
            height={768}
            loading="lazy"
            className="mx-auto -mt-2 mb-2 w-48 opacity-90"
          />
          <h2 className="font-display text-xl">Start your shelf</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Photograph a product and we'll fill in the details for you.
          </p>
          <Button asChild className="mt-5 h-12 w-full text-base">
            <Link to="/add">Add your first product</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-5">
          {sorted.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
