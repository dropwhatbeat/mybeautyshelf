export type Freshness = "fresh" | "soon" | "expired" | "unknown";

export type FreshnessInfo = {
  status: Freshness;
  daysRemaining: number | null;
  label: string;
};

export function freshnessFor(
  dateOpened: string | null | undefined,
  paoMonths: number | null | undefined,
  now: Date = new Date(),
): FreshnessInfo {
  if (!dateOpened || !paoMonths) {
    return { status: "unknown", daysRemaining: null, label: "Set date opened" };
  }
  const opened = new Date(dateOpened + "T00:00:00");
  const expires = new Date(opened);
  expires.setMonth(expires.getMonth() + paoMonths);
  const days = Math.round((expires.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return { status: "expired", daysRemaining: days, label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 60) return { status: "soon", daysRemaining: days, label: `${days} days left` };
  return { status: "fresh", daysRemaining: days, label: `${days} days left` };
}

export const dotClass: Record<Freshness, string> = {
  fresh: "bg-fresh",
  soon: "bg-soon",
  expired: "bg-expired",
  unknown: "bg-unknown",
};

export const freshnessWord: Record<Freshness, string> = {
  fresh: "Fresh",
  soon: "Expiring soon",
  expired: "Past its date",
  unknown: "Unknown",
};
