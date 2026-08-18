import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  analyseShelfie as analyseShelfieServer,
  bulkChatTurn,
  extractProductFromPhotos,
  extractProductsFromShelfPhoto,
} from "./ai.server";

const dataUrl = z.string().min(32).max(12_000_000).startsWith("data:image/");

export const extractProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ front: dataUrl, back: dataUrl.nullable().optional() }).parse(data),
  )
  .handler(async ({ data }) => extractProductFromPhotos(data.front, data.back ?? null));

export const analyseShelfie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ selfie: dataUrl }).parse(data))
  .handler(async ({ data }) => analyseShelfieServer(data.selfie));

export const extractProductsBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ image: dataUrl }).parse(data))
  .handler(async ({ data }) => extractProductsFromShelfPhoto(data.image));

const bulkItemSchema = z.object({
  brand: z.string().nullable(),
  name: z.string().nullable(),
  category: z.string().nullable(),
  size_ml: z.number().nullable(),
  pao_months: z.number().nullable(),
  ingredients: z.array(z.string()),
  ingredients_readable: z.boolean(),
  notes: z.string().nullable(),
  position: z.string().nullable(),
});

export const bulkChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        items: z.array(bulkItemSchema).max(20),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(2000),
            }),
          )
          .max(40),
      })
      .parse(data),
  )
  .handler(async ({ data }) => bulkChatTurn(data.items, data.history));
