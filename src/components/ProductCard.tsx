import { Link } from "@tanstack/react-router";

import { dotClass, freshnessFor } from "@/lib/freshness";
import { useSignedUrl, type Product } from "@/lib/queries";
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
  const fresh = freshnessFor(product.date_opened, product.pao_months);
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
