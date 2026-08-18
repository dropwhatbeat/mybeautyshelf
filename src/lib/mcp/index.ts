import { auth, defineMcp, type McpDefinitionInput } from "@lovable.dev/mcp-js";

import addProductTool from "./tools/add-product";
import getSkinProfileTool from "./tools/get-skin-profile";
import listProductsTool from "./tools/list-products";
import routineCheckTool from "./tools/routine-check";
import updateProductTool from "./tools/update-product";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "vanity-shelf",
  title: "Vanity Shelf",
  version: "0.1.0",
  instructions:
    "Tools for Vanity Shelf, a cross-brand beauty shelf tracker. Use `list_products` to see what the user owns with freshness status, `add_product` and `update_product` to maintain the shelf, `get_skin_profile` for skin type/concerns/undertone, and `routine_check` for ingredient conflicts and expiring products.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listProductsTool,
    addProductTool,
    updateProductTool,
    getSkinProfileTool,
    routineCheckTool,
  ] as unknown as McpDefinitionInput["tools"],
});