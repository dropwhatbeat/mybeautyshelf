import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyseColourFromSelfie, extractProductFromPhotos } from "./ai.server";

const dataUrl = z.string().min(32).max(12_000_000).startsWith("data:image/");

export const extractProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ front: dataUrl, back: dataUrl.nullable().optional() }).parse(data),
  )
  .handler(async ({ data }) => extractProductFromPhotos(data.front, data.back ?? null));

export const analyseColour = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ selfie: dataUrl }).parse(data))
  .handler(async ({ data }) => analyseColourFromSelfie(data.selfie));
