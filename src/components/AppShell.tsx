import { Link } from "@tanstack/react-router";
import { Grid2x2, Sparkles, ScanFace, UserRound } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Shelf", icon: Grid2x2 },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/shelfie", label: "Shelfie", icon: ScanFace },
  { to: "/settings", label: "My skin", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background pb-28">
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-card/95 backdrop-blur">
        <ul className="flex items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground transition-colors"
                activeProps={{ className: "text-primary" }}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 px-5 pb-5 pt-8">
      <div>
        <h1 className="font-display text-3xl leading-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}
