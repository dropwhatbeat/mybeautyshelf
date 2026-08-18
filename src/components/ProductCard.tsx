import { Link } from "@tanstack/react-router";

import { useAuth } from "@/hooks/useAuth";
import { bandDot, profileIsEmpty, scoreProduct } from "@/lib/fit";
import { dotClass, freshnessFor } from "@/lib/freshness";
import { useProfile, useSignedUrl, type Product } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function ProductImage({
  path,
  alt,
  className,
}: {
  path: string | null;
  alt: string;
  className?: string;
}) {
  const { data: url } = useSignedUrl(path);
  if (!url) {
    return (
      <div className={cn("flex items-center justify-center bg-secondary", className)}>
        <span className="font-display text-2xl text-muted-foreground">{alt.slice(0, 1) || "?"}</span>
      </div>
    );
  }
  return <img src={url} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}

export function ProductCard({ product }: { product: Product }) {
  const fresh = freshnessFor(product.date_opened, product.pao_months, product.expiry_date);
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const showFit = !profileIsEmpty(profile) && product.ingredients.length > 0;
  const fit = showFit ? scoreProduct(product, profile) : null;
  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      className="group block overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="relative aspect-4/5 w-full overflow-hidden">
        <ProductImage
          path={product.image_front_url}
          alt={product.name || product.brand || "Product"}
          className="h-full w-full"
        />
        <span
          className={cn(
            "absolute right-2.5 top-2.5 h-3 w-3 rounded-full ring-2 ring-card",
            dotClass[fresh.status],
          )}
          aria-label={fresh.label}
        />
        {fit ? (
          <span
            className={cn(
              "absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-medium text-card ring-2 ring-card",
              bandDot[fit.band],
            )}
            aria-label={`Fit for your skin: ${fit.bandLabel}`}
          >
            {fit.score}
          </span>
        ) : null}
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {product.brand || "Unbranded"}
        </p>
        <p className="truncate font-display text-[15px] leading-snug text-foreground">
          {product.name || "Untitled product"}
        </p>
      </div>
    </Link>
  );
}
