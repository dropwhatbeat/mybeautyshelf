import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { extractProduct } from "@/lib/ai.functions";
import { dataUrlToBlob, fileToCompressedDataUrl } from "@/lib/image";
import { CATEGORIES, uploadPhoto, type Category } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/add")({
  head: () => ({
    meta: [
      { title: "Add a product — My Beauty Shelf" },
      {
        name: "description",
        content: "Photograph the front and back of a product and we'll fill in the details.",
      },
      { property: "og:title", content: "Add a product — My Beauty Shelf" },
      {
        property: "og:description",
        content: "Photograph the front and back of a product and we'll fill in the details.",
      },
    ],
  }),
  component: AddProduct,
});

const STATUS_LINES = [
  "Reading the label…",
  "Squinting at the tiny print…",
  "Looking for the open-jar symbol…",
  "Copying out the ingredients…",
  "Almost there…",
];

const OPEN_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "month", label: "This month" },
  { key: "few", label: "A few months ago" },
  { key: "unopened", label: "Not yet opened" },
] as const;

type OpenKey = (typeof OPEN_OPTIONS)[number]["key"];

function dateFor(key: OpenKey): string | null {
  const d = new Date();
  if (key === "unopened") return null;
  if (key === "month") d.setDate(1);
  if (key === "few") d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

type Draft = {
  brand: string;
  name: string;
  category: Category;
  size_ml: string;
  pao_months: string;
  ingredients: string[];
};

function AddProduct() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const run = useServerFn(extractProduct);

  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [phase, setPhase] = useState<"capture" | "reading" | "confirm">("capture");
  const [statusIndex, setStatusIndex] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  const [openKey, setOpenKey] = useState<OpenKey>("today");
  const [saving, setSaving] = useState(false);
  const frontInput = useRef<HTMLInputElement>(null);
  const backInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase !== "reading") return;
    const id = setInterval(() => setStatusIndex((i) => (i + 1) % STATUS_LINES.length), 1600);
    return () => clearInterval(id);
  }, [phase]);

  async function pick(file: File | undefined, slot: "front" | "back") {
    if (!file) return;
    try {
      const url = await fileToCompressedDataUrl(file);
      if (slot === "front") setFront(url);
      else setBack(url);
    } catch {
      toast.error("Couldn't read that photo.");
    }
  }

  async function analyse() {
    if (!front) return;
    setPhase("reading");
    try {
      const result = await run({ data: { front, back } });
      setUnreadable(!result.ingredients_readable);
      setDraft({
        brand: result.brand ?? "",
        name: result.name ?? "",
        category: (result.category as Category | null) ?? "other",
        size_ml: result.size_ml ? String(result.size_ml) : "",
        pao_months: result.pao_months ? String(result.pao_months) : "",
        ingredients: result.ingredients,
      });
      setPhase("confirm");
    } catch (err) {
      toast.error(friendlyError(err, "That didn't work — try again."));
      setPhase("capture");
    }
  }

  async function save() {
    if (!user || !draft) return;
    setSaving(true);
    try {
      const frontPath = front ? await uploadPhoto(user.id, dataUrlToBlob(front), "front") : null;
      const backPath = back ? await uploadPhoto(user.id, dataUrlToBlob(back), "back") : null;
      const { data, error } = await supabase
        .from("products")
        .insert({
          user_id: user.id,
          brand: draft.brand,
          name: draft.name,
          category: draft.category,
          image_front_url: frontPath,
          image_back_url: backPath,
          ingredients: draft.ingredients,
          size_ml: draft.size_ml ? Number(draft.size_ml) : null,
          pao_months: draft.pao_months ? Number(draft.pao_months) : null,
          date_opened: dateFor(openKey),
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Added to your shelf.");
      void navigate({ to: "/product/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't save that product."));
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-muted-foreground">Sign in to add products.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Add a product</h1>
        <button
          onClick={() => void navigate({ to: "/" })}
          aria-label="Close"
          className="rounded-full p-2 text-muted-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {phase === "capture" && (
        <div className="mt-6 space-y-4">
          <CaptureTile
            image={front}
            title="Front of the product"
            hint="Brand and product name should be readable."
            onPick={() => frontInput.current?.click()}
            primary
          />
          <CaptureTile
            image={back}
            title="Back of the product"
            hint="Optional — this is where the ingredients live."
            onPick={() => backInput.current?.click()}
          />
          <input
            ref={frontInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => void pick(e.target.files?.[0], "front")}
          />
          <input
            ref={backInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => void pick(e.target.files?.[0], "back")}
          />
          <Button
            className="h-13 w-full py-4 text-base"
            disabled={!front}
            onClick={() => void analyse()}
          >
            {front ? "Read the label" : "Take a photo to start"}
          </Button>
          <button
            type="button"
            onClick={() => void navigate({ to: "/bulk" })}
            className="w-full text-center text-sm text-muted-foreground underline underline-offset-4"
          >
            Got several? Photograph the whole shelf at once
          </button>
        </div>
      )}

      {phase === "reading" && (
        <div className="mt-6 space-y-4">
          <Skeleton className="aspect-4/3 w-full rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <p className="pt-2 text-center font-display text-lg text-muted-foreground">
            {STATUS_LINES[statusIndex]}
          </p>
        </div>
      )}

      {phase === "confirm" && draft && (
        <div className="mt-6 space-y-5">
          {front ? (
            <img
              src={front}
              alt="Product front"
              className="aspect-4/3 w-full rounded-2xl object-cover"
            />
          ) : null}

          {unreadable && (
            <div className="rounded-2xl border border-border bg-secondary p-4 text-sm">
              <p className="font-medium">We couldn't read an ingredient list.</p>
              <p className="mt-1 text-muted-foreground">
                We'd rather leave it empty than guess. Retake the back photo in better light, or
                carry on without it.
              </p>
              <Button
                variant="outline"
                className="mt-3 h-10"
                onClick={() => {
                  setPhase("capture");
                  setBack(null);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Retake back photo
              </Button>
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
            <Field label="Brand">
              <Input
                value={draft.brand}
                onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                className="h-12"
              />
            </Field>
            <Field label="Product name">
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="h-12"
              />
            </Field>
            <Field label="Category">
              <Select
                value={draft.category}
                onValueChange={(v) => setDraft({ ...draft, category: v as Category })}
              >
                <SelectTrigger className="h-12 w-full capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Size (ml)">
                <Input
                  inputMode="decimal"
                  value={draft.size_ml}
                  onChange={(e) => setDraft({ ...draft, size_ml: e.target.value })}
                  className="h-12"
                />
              </Field>
              <Field label="Use within (months)">
                <Input
                  inputMode="numeric"
                  value={draft.pao_months}
                  onChange={(e) => setDraft({ ...draft, pao_months: e.target.value })}
                  className="h-12"
                />
              </Field>
            </div>
            <Field label={`Ingredients (${draft.ingredients.length})`}>
              <Textarea
                rows={4}
                value={draft.ingredients.join(", ")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    ingredients: e.target.value
                      .split(",")
                      .map((i) => i.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          </div>

          <div>
            <h2 className="font-display text-xl">When did you open it?</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {OPEN_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setOpenKey(o.key)}
                  className={cn(
                    "rounded-2xl border px-4 py-3.5 text-sm transition-colors",
                    openKey === o.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <Button className="h-13 w-full py-4 text-base" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save to shelf"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CaptureTile({
  image,
  title,
  hint,
  onPick,
  primary,
}: {
  image: string | null;
  title: string;
  hint: string;
  onPick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onPick}
      className={cn(
        "w-full overflow-hidden rounded-2xl border text-left transition-colors",
        image ? "border-border" : "border-dashed border-border bg-card hover:bg-accent",
      )}
    >
      {image ? (
        <img src={image} alt={title} className="aspect-4/3 w-full object-cover" />
      ) : (
        <div className="flex aspect-4/3 flex-col items-center justify-center gap-2 text-muted-foreground">
          {primary ? <Camera className="h-7 w-7" /> : <ImagePlus className="h-7 w-7" />}
          <span className="font-display text-lg text-foreground">{title}</span>
          <span className="px-8 text-center text-xs">{hint}</span>
        </div>
      )}
    </button>
  );
}
