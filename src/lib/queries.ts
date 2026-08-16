import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Review = Database["public"]["Tables"]["product_reviews"]["Row"];
export type Category = Database["public"]["Enums"]["product_category"];

export const CATEGORIES: Category[] = [
  "cleanser",
  "serum",
  "moisturiser",
  "spf",
  "treatment",
  "makeup",
  "other",
];

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useProducts(userId: string | undefined) {
  return useQuery({
    queryKey: ["products", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("date_added", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Product | null;
    },
  });
}

export function useReviews(productId: string) {
  return useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });
}

export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed", path],
    enabled: !!path,
    staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("shelf-photos")
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Product> }) => {
      const { error } = await supabase.from("products").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["product", vars.id] });
    },
  });
}

export async function uploadPhoto(userId: string, blob: Blob, slot: string) {
  const path = `${userId}/${crypto.randomUUID()}-${slot}.jpg`;
  const { error } = await supabase.storage
    .from("shelf-photos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}
