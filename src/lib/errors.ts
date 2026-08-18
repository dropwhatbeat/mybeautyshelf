/** Turns any thrown value into a short, human message.
 *  Network/hosting failures can surface as whole HTML pages — never show those. */
export function friendlyError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const msg = raw.trim();
  if (!msg) return fallback;
  const looksLikeHtml = /<\/?[a-z!][\s\S]*>/i.test(msg);
  if (looksLikeHtml || msg.length > 180 || msg.includes("Failed to fetch")) return fallback;
  return msg;
}
