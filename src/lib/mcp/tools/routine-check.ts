import { defineTool } from "@lovable.dev/mcp-js";

import { ACTIVES, CONFLICTS, detectActives, type ActiveKey } from "@/lib/actives";
import { freshnessFor } from "@/lib/freshness";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "routine_check",
  title: "Check routine conflicts and expiries",
  description:
    "Analyse the signed-in user's active shelf for ingredient conflicts and products expiring soon or already expired.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("products").select("*").eq("status", "active");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const products = data ?? [];

    const owned = new Map<ActiveKey, string[]>();
    for (const p of products) {
      for (const group of detectActives(p.ingredients ?? [])) {
        owned.set(group, [...(owned.get(group) ?? []), `${p.brand} ${p.name}`]);
      }
    }

    const conflicts = CONFLICTS.filter((c) => owned.has(c.a) && owned.has(c.b)).map((c) => ({
      between: [ACTIVES[c.a].label, ACTIVES[c.b].label],
      note: c.note,
      products: [...(owned.get(c.a) ?? []), ...(owned.get(c.b) ?? [])],
    }));

    const expiring = products
      .map((p) => ({
        product: `${p.brand} ${p.name}`,
        ...freshnessFor(p.date_opened, p.pao_months, p.expiry_date),
      }))
      .filter((f) => f.status === "soon" || f.status === "expired")
      .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));

    const summary = { active_products: products.length, conflicts, expiring };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});