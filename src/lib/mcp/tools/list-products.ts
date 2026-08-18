import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { freshnessFor } from "@/lib/freshness";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_products",
  title: "List shelf products",
  description:
    "List the signed-in user's beauty products with freshness status, category and ingredients.",
  inputSchema: {
    status: z.enum(["active", "finished", "all"]).default("active").describe("Which products to return."),
    category: z.string().optional().describe("Optional category filter, e.g. serum or spf."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, category }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase.from("products").select("*").order("date_added", { ascending: false });
    if (status !== "all") query = query.eq("status", status);
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const products = (data ?? []).map((p) => {
      const f = freshnessFor(p.date_opened, p.pao_months, p.expiry_date);
      return {
        id: p.id,
        brand: p.brand,
        name: p.name,
        category: p.category,
        status: p.status,
        date_opened: p.date_opened,
        pao_months: p.pao_months,
        expiry_date: p.expiry_date,
        open_by: f.openBy ? f.openBy.toISOString().slice(0, 10) : null,
        days_to_open_by: f.daysToOpenBy,
        freshness: f.status,
        days_remaining: f.daysRemaining,
        ingredients: p.ingredients,
      };
    });
    return {
      content: [{ type: "text", text: JSON.stringify(products, null, 2) }],
      structuredContent: { products },
    };
  },
});