import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

const CATEGORIES = ["cleanser", "serum", "moisturiser", "spf", "treatment", "makeup", "other"] as const;

export default defineTool({
  name: "add_product",
  title: "Add a product to the shelf",
  description: "Add a beauty product to the signed-in user's shelf.",
  inputSchema: {
    brand: z.string().trim().min(1).describe("Brand name."),
    name: z.string().trim().min(1).describe("Product name."),
    category: z.enum(CATEGORIES).default("other"),
    size_ml: z.number().positive().optional(),
    pao_months: z.number().int().positive().optional().describe("Period-after-opening in months."),
    date_opened: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Date opened, YYYY-MM-DD."),
    ingredients: z.array(z.string()).optional(),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const userId = ctx.getUserId();
    if (!userId) return { content: [{ type: "text", text: "No user in token" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("products")
      .insert({
        user_id: userId,
        brand: input.brand,
        name: input.name,
        category: input.category,
        ...(input.size_ml === undefined ? {} : { size_ml: input.size_ml }),
        ...(input.pao_months === undefined ? {} : { pao_months: input.pao_months }),
        ...(input.date_opened === undefined ? {} : { date_opened: input.date_opened }),
        ...(input.ingredients === undefined ? {} : { ingredients: input.ingredients }),
        ...(input.notes === undefined ? {} : { notes: input.notes }),
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Added ${data.brand} ${data.name}.` }],
      structuredContent: { product: data },
    };
  },
});