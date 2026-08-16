import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ProductImage } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { ACTIVES, ingredientActive } from "@/lib/actives";
import { freshnessFor, freshnessWord, dotClass } from "@/lib/freshness";
import { supabase } from "@/integrations/supabase/client";
import { useProduct, useReviews, useUpdateProduct } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Product details — Shelf" },
      {
        name: "description",
        content: "Ingredients, flagged actives and freshness for a product on your shelf.",
      },
      { property: "og:title", content: "Product details — Shelf" },
      {
        property: "og:description",
        content: "Ingredients, flagged actives and freshness for a product on your shelf.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: product, isLoading } = useProduct(id);
  const { data: reviews } = useReviews(id);
  const update = useUpdateProduct();
  const [rating, setRating] = useState(4);
  const [verdict, setVerdict] = useState<"repurchase" | "undecided" | "never_again">("repurchase");
  const [note, setNote] = useState("");

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-5">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    );
  }
  if (!product) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-muted-foreground">That product isn't on your shelf.</p>
        <Button asChild className="mt-4">
          <Link to="/">Back to shelf</Link>
        </Button>
      </div>
    );
  }

  const fresh = freshnessFor(product.date_opened, product.pao_months);
  const daysOpen = product.date_opened
    ? Math.floor((Date.now() - new Date(product.date_opened + "T00:00:00").getTime()) / 86_400_000)
    : 0;
  const askForReview = daysOpen >= 30 && !(reviews?.length ?? 0);

  async function saveReview() {
    if (!user || !product) return;
    const { error } = await supabase.from("product_reviews").insert({
      product_id: product.id,
      user_id: user.id,
      rating,
      verdict,
      note: note || null,
    });
    if (error) {
      toast.error("Couldn't save that review.");
      return;
    }
    setNote("");
    void qc.invalidateQueries({ queryKey: ["reviews", product.id] });
    toast.success("Noted — thanks.");
  }

  async function remove() {
    if (!product) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      toast.error("Couldn't remove that.");
      return;
    }
    void qc.invalidateQueries({ queryKey: ["products"] });
    void navigate({ to: "/" });
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md pb-16">
      <div className="relative">
        <ProductImage
          path={product.image_front_url}
          alt={product.name}
          className="aspect-square w-full"
        />
        <Link
          to="/"
          aria-label="Back"
          className="absolute left-4 top-4 rounded-full bg-card/90 p-2.5 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="px-5 pt-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {product.brand || "Unbranded"} · {product.category}
        </p>
        <h1 className="mt-1.5 font-display text-3xl leading-tight">{product.name}</h1>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <span className={cn("h-3 w-3 shrink-0 rounded-full", dotClass[fresh.status])} />
          <div>
            <p className="text-sm font-medium">{freshnessWord[fresh.status]}</p>
            <p className="text-xs text-muted-foreground">
              {fresh.status === "unknown"
                ? "Add the date you opened it and the months-after-opening figure."
                : fresh.label}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Date opened
            </Label>
            <Input
              type="date"
              className="h-12"
              value={product.date_opened ?? ""}
              onChange={(e) =>
                update.mutate({ id: product.id, patch: { date_opened: e.target.value || null } })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Use within (months)
            </Label>
            <Input
              inputMode="numeric"
              className="h-12"
              defaultValue={product.pao_months ?? ""}
              onBlur={(e) =>
                update.mutate({
                  id: product.id,
                  patch: { pao_months: e.target.value ? Number(e.target.value) : null },
                })
              }
            />
          </div>
        </div>

        {product.image_back_url ? (
          <ProductImage
            path={product.image_back_url}
            alt="Back of product"
            className="mt-4 aspect-4/3 w-full rounded-2xl"
          />
        ) : null}

        <h2 className="mt-8 font-display text-xl">Ingredients</h2>
        {product.ingredients.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No ingredient list saved. Add the back photo when you next open the app and we'll read
            it.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {product.ingredients.map((ing, i) => {
              const active = ingredientActive(ing);
              return (
                <li
                  key={`${ing}-${i}`}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs",
                    active
                      ? "bg-primary/15 font-medium text-primary ring-1 ring-primary/30"
                      : "bg-secondary text-secondary-foreground",
                  )}
                  title={active ? ACTIVES[active].label : undefined}
                >
                  {ing}
                </li>
              );
            })}
          </ul>
        )}

        {askForReview && (
          <section className="mt-8 rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-xl">Still working for you?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You opened this {daysOpen} days ago.
            </p>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={cn(
                    "h-11 flex-1 rounded-xl border text-sm",
                    rating >= n ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["repurchase", "undecided", "never_again"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVerdict(v)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-xs",
                    verdict === v ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {v === "never_again" ? "Never again" : v === "repurchase" ? "Repurchase" : "Undecided"}
                </button>
              ))}
            </div>
            <Textarea
              className="mt-3"
              rows={2}
              placeholder="Anything you want to remember?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button className="mt-3 h-11 w-full" onClick={() => void saveReview()}>
              Save review
            </Button>
          </section>
        )}

        {reviews?.length ? (
          <section className="mt-8">
            <h2 className="font-display text-xl">Your reviews</h2>
            <ul className="mt-3 space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
                  <p className="font-medium">
                    {r.rating}/5 · {r.verdict.replace("_", " ")}
                  </p>
                  {r.note ? <p className="mt-1 text-muted-foreground">{r.note}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-10 flex gap-2">
          <Button
            variant="outline"
            className="h-12 flex-1"
            onClick={() =>
              update.mutate(
                { id: product.id, patch: { status: "finished" } },
                { onSuccess: () => toast.success("Marked as finished.") },
              )
            }
          >
            Mark finished
          </Button>
          <Button variant="ghost" className="h-12" onClick={() => void remove()} aria-label="Delete">
            <Trash2 className="h-5 w-5 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}
