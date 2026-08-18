export type Freshness =
  | "fresh"
  | "soon"
  | "expired"
  | "sealed"
  | "open-soon"
  | "open-overdue"
  | "unknown";

export type FreshnessInfo = {
  status: Freshness;
  /** Days until the effective expiry (opened + PAO, capped by printed expiry). */
  daysRemaining: number | null;
  /** For sealed products: last sensible day to open it and still finish it. */
  openBy: Date | null;
  daysToOpenBy: number | null;
  expiresOn: Date | null;
  label: string;
  opened: boolean;
};

const DAY = 86_400_000;
const SOON_DAYS = 60;
const OPEN_SOON_DAYS = 30;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysBetween(target: Date, now: Date): number {
  return Math.round((target.getTime() - now.getTime()) / DAY);
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function plural(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

export function freshnessFor(
  dateOpened: string | null | undefined,
  paoMonths: number | null | undefined,
  expiryDate?: string | null,
  now: Date = new Date(),
): FreshnessInfo {
  const opened = parseDate(dateOpened);
  const printed = parseDate(expiryDate);
  const pao = paoMonths && paoMonths > 0 ? paoMonths : null;

  const base: FreshnessInfo = {
    status: "unknown",
    daysRemaining: null,
    openBy: null,
    daysToOpenBy: null,
    expiresOn: null,
    label: "Add an expiry or opened date",
    opened: !!opened,
  };

  // --- Opened product: PAO clock, capped by the printed expiry.
  if (opened) {
    const paoExpiry = pao ? addMonths(opened, pao) : null;
    const effective =
      paoExpiry && printed ? (paoExpiry < printed ? paoExpiry : printed) : (paoExpiry ?? printed);
    if (!effective) {
      return { ...base, label: "Add how long to use it after opening" };
    }
    const days = daysBetween(effective, now);
    const cappedByPrinted = !!(printed && paoExpiry && printed < paoExpiry);
    if (days < 0) {
      return {
        ...base,
        status: "expired",
        daysRemaining: days,
        expiresOn: effective,
        label: `Expired ${plural(Math.abs(days))} ago`,
      };
    }
    return {
      ...base,
      status: days <= SOON_DAYS ? "soon" : "fresh",
      daysRemaining: days,
      expiresOn: effective,
      label: cappedByPrinted
        ? `${plural(days)} left (printed expiry)`
        : `${plural(days)} left`,
    };
  }

  // --- Sealed product: count down to the printed expiry, warn on the open-by date.
  if (printed) {
    const daysToExpiry = daysBetween(printed, now);
    const openBy = pao ? addMonths(printed, -pao) : printed;
    const daysToOpen = daysBetween(openBy, now);
    if (daysToExpiry < 0) {
      return {
        ...base,
        status: "expired",
        daysRemaining: daysToExpiry,
        expiresOn: printed,
        openBy,
        daysToOpenBy: daysToOpen,
        label: `Expired ${plural(Math.abs(daysToExpiry))} ago, unopened`,
      };
    }
    if (daysToOpen < 0) {
      return {
        ...base,
        status: "open-overdue",
        daysRemaining: daysToExpiry,
        expiresOn: printed,
        openBy,
        daysToOpenBy: daysToOpen,
        label: `Open-by date passed — use it up within ${plural(daysToExpiry)}`,
      };
    }
    if (daysToOpen <= OPEN_SOON_DAYS) {
      return {
        ...base,
        status: "open-soon",
        daysRemaining: daysToExpiry,
        expiresOn: printed,
        openBy,
        daysToOpenBy: daysToOpen,
        label: `Open it within ${plural(daysToOpen)} to finish in time`,
      };
    }
    return {
      ...base,
      status: "sealed",
      daysRemaining: daysToExpiry,
      expiresOn: printed,
      openBy,
      daysToOpenBy: daysToOpen,
      label: pao ? `Sealed · open by ${formatDate(openBy)}` : `Sealed · expires ${formatDate(printed)}`,
    };
  }

  return { ...base, label: "Set date opened or printed expiry" };
}

export const dotClass: Record<Freshness, string> = {
  fresh: "bg-fresh",
  soon: "bg-soon",
  expired: "bg-expired",
  sealed: "bg-fresh",
  "open-soon": "bg-soon",
  "open-overdue": "bg-expired",
  unknown: "bg-unknown",
};

export const freshnessWord: Record<Freshness, string> = {
  fresh: "Fresh",
  soon: "Expiring soon",
  expired: "Past its date",
  sealed: "Sealed and fine",
  "open-soon": "Open it soon",
  "open-overdue": "Open-by date passed",
  unknown: "Unknown",
};
