import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/AppShell";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { CONCERNS } from "@/lib/actives";
import {
  AGE_RANGES,
  AVOID_ITEMS,
  PREGNANCY_OPTIONS,
  SENSITIVITY_LEVELS,
  SPF_HABITS,
} from "@/lib/profile-options";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type SkinType = Database["public"]["Enums"]["skin_type"];
type Undertone = Database["public"]["Enums"]["undertone"];
const SKIN_TYPES: SkinType[] = ["dry", "oily", "combination", "normal", "sensitive"];
const UNDERTONES: Undertone[] = ["cool", "neutral", "warm"];
const FACE_SHAPES = ["oval", "round", "square", "heart", "oblong", "diamond"];

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "My skin profile — My Beauty Shelf" },
      { name: "description", content: "Your skin profile, appearance and account data." },
      { property: "og:title", content: "My skin profile — My Beauty Shelf" },
      { property: "og:description", content: "Your skin profile, appearance and account data." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useProfile(user?.id);

  type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

  async function patch(patchData: ProfileUpdate) {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(patchData).eq("id", user.id);
    if (error) {
      toast.error("Couldn't save that.");
      return;
    }
    void qc.invalidateQueries({ queryKey: ["profile", user.id] });
  }

  const concerns = profile?.concerns ?? [];
  const avoidList = profile?.avoid_list ?? [];

  async function deleteEverything() {
    if (!user) return;
    if (!window.confirm("Delete every product, photo and review? This can't be undone.")) return;
    const { data: files } = await supabase.storage.from("shelf-photos").list(user.id);
    if (files?.length) {
      await supabase.storage
        .from("shelf-photos")
        .remove(files.map((f) => `${user.id}/${f.name}`));
    }
    await supabase.from("products").delete().eq("user_id", user.id);
    await supabase.from("skin_checks").delete().eq("user_id", user.id);
    await patch({ season_result: null, season_payload: null });
    void qc.invalidateQueries();
    toast.success("Your shelf has been cleared.");
    void navigate({ to: "/" });
  }

  return (
    <AppShell>
      <PageHeader title="My skin profile" {...(user?.email ? { subtitle: user.email } : {})} />

      <div className="space-y-5 px-5">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-xl">Skin type</h2>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {SKIN_TYPES.map((t) => (
              <Chip
                key={t}
                label={t}
                selected={profile?.skin_type === t}
                onClick={() => void patch({ skin_type: t })}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-xl">Concerns</h2>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {CONCERNS.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={concerns.includes(c)}
                onClick={() =>
                  void patch({
                    concerns: concerns.includes(c)
                      ? concerns.filter((x) => x !== c)
                      : [...concerns, c],
                  })
                }
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-xl">About you</h2>
          <p className="mt-1 text-sm text-muted-foreground">Age range</p>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {AGE_RANGES.map((a) => (
              <Chip
                key={a}
                label={a}
                selected={profile?.age_range === a}
                onClick={() => void patch({ age_range: a })}
              />
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">SPF habit</p>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {SPF_HABITS.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={profile?.spf_habit === s}
                onClick={() => void patch({ spf_habit: s })}
              />
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Pregnant or breastfeeding</p>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {PREGNANCY_OPTIONS.map((p) => (
              <Chip
                key={p}
                label={p}
                selected={profile?.pregnancy === p}
                onClick={() => void patch({ pregnancy: p })}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-xl">Sensitivity</h2>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {SENSITIVITY_LEVELS.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={profile?.sensitivity === s}
                onClick={() => void patch({ sensitivity: s })}
              />
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Ingredients you avoid</p>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {AVOID_ITEMS.map((a) => (
              <Chip
                key={a}
                label={a}
                selected={avoidList.includes(a)}
                onClick={() =>
                  void patch({
                    avoid_list: avoidList.includes(a)
                      ? avoidList.filter((x) => x !== a)
                      : [...avoidList, a],
                  })
                }
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-xl">Undertone</h2>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {UNDERTONES.map((u) => (
              <Chip
                key={u}
                label={u}
                selected={profile?.undertone === u}
                onClick={() => void patch({ undertone: u })}
              />
            ))}
          </div>
          {profile?.season_result ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Your Shelfie says: <span className="text-foreground">{profile.season_result}</span>
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-xl">Face shape</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Read from your Shelfie — change it if another one fits better.
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {FACE_SHAPES.map((f) => (
              <Chip
                key={f}
                label={f}
                selected={profile?.face_shape === f}
                onClick={() => void patch({ face_shape: f })}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-xl">Your data</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Photos live in private storage only you can read. Shelfies are
            never stored.
          </p>
          <Button
            variant="outline"
            className="mt-4 h-12 w-full text-destructive"
            onClick={() => void deleteEverything()}
          >
            Delete all my products and photos
          </Button>
          <Button
            variant="ghost"
            className="mt-2 h-12 w-full"
            onClick={() => {
              void supabase.auth.signOut();
              void navigate({ to: "/" });
            }}
          >
            Sign out
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
