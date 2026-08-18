import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import doodleBottle from "@/assets/doodle-bottle.png";

export function AuthCard() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Check your inbox for your sign-in link.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Google sign-in failed. Try again.");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <img
        src={doodleBottle}
        alt=""
        width={768}
        height={768}
        className="mb-4 w-28"
      />
      <p className="text-[11px] uppercase tracking-[0.3em] text-primary">My Beauty Shelf</p>
      <h1 className="mt-3 font-display text-4xl leading-tight text-foreground">
        Your skincare and makeup shelf.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Track what's fresh, what clashes, and what's actually working — across every brand on your
        shelf.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSent(false);
            }}
            className="h-12"
          />
        </div>
        <Button type="submit" disabled={busy} className="h-12 w-full text-base">
          {busy ? "Sending link…" : sent ? "Resend sign-in link" : "Email me a sign-in link"}
        </Button>
      </form>

      {sent && (
        <p className="mt-3 text-sm text-muted-foreground">
          Link sent to {email}. Open it on this device to finish signing in — no password needed.
        </p>
      )}

      <Button variant="outline" onClick={google} className="mt-3 h-12 w-full text-base">
        Continue with Google
      </Button>

      <p className="mt-6 text-xs text-muted-foreground">
        No passwords here. Your email is your account — new addresses are signed up automatically.
      </p>
    </div>
  );
}
