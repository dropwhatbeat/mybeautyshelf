import { createFileRoute } from "@tanstack/react-router";

import { AuthCard } from "@/components/AuthCard";

const TITLE = "Sign in — My Beauty Shelf";
const DESCRIPTION =
  "Sign in with a magic link or Google to save products, track expiry dates and check routine conflicts.";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  return <AuthCard />;
}
