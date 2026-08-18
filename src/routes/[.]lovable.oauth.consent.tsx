import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

type OAuthDetails = {
  client?: { name?: string } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
};

function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "",
  }),
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id");
    if (!authorizationId) throw new Error("Missing authorization_id");
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return { signedIn: false, details: null };
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return { signedIn: true, details: data };
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-2xl">Could not load this request</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function SignIn() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href, shouldCreateUser: true },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <p className="text-[11px] uppercase tracking-[0.3em] text-primary">Shelf</p>
      <h1 className="mt-3 font-display text-3xl leading-tight">Sign in to continue</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in so we can ask whether to connect this assistant to your shelf.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="consent-email">Email</Label>
          <Input
            id="consent-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12"
          />
        </div>
        <Button type="submit" disabled={busy} className="h-12 w-full text-base">
          {busy ? "Sending link…" : sent ? "Resend sign-in link" : "Email me a sign-in link"}
        </Button>
      </form>
      <Button
        variant="outline"
        className="mt-3 h-12 w-full text-base"
        onClick={() =>
          void lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.href })
        }
      >
        Continue with Google
      </Button>
    </main>
  );
}

function Consent() {
  const { signedIn, details } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) return <SignIn />;

  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <p className="text-[11px] uppercase tracking-[0.3em] text-primary">Shelf</p>
      <h1 className="mt-3 font-display text-3xl leading-tight">
        Connect {clientName} to your shelf
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {clientName} will be able to read and update your products, and read your skin profile, as
        you. You can disconnect it at any time.
      </p>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="mt-8 space-y-3">
        <Button disabled={busy} className="h-12 w-full text-base" onClick={() => void decide(true)}>
          Approve
        </Button>
        <Button
          disabled={busy}
          variant="outline"
          className="h-12 w-full text-base"
          onClick={() => void decide(false)}
        >
          Deny
        </Button>
      </div>
    </main>
  );
}