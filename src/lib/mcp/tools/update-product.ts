import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_product",
  title: "Update a shelf product",
  description:
    "Update a product on the signed-in user's shelf: open date, period-after-opening, notes or status.",
  inputSchema: {
    id: z.string().uuid().describe("Product id from list_products."),
    date_opened: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    pao_months: z.number().int().positive().nullable().optional(),
    notes: z.string().nullable().optional(),
    status: z.enum(["active", "finished"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ id, ...patch }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const fields = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (Object.keys(fields).length === 0)
      return { content: [{ type: "text", text: "Nothing to update." }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("products")
      .update(fields)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "No product found with that id." }], isError: true };
    return {
      content: [{ type: "text", text: `Updated ${data.brand} ${data.name}.` }],
      structuredContent: { product: data },
    };
  },
});