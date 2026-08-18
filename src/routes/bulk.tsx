import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Camera, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { bulkChat, extractProductsBulk } from "@/lib/ai.functions";
import { dataUrlToBlob, fileToCompressedDataUrl } from "@/lib/image";
import { CATEGORIES, uploadPhoto, type Category } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bulk")({
  head: () => ({
    meta: [
      { title: "Add several products at once — My Beauty Shelf" },
      {
        name: "description",
        content:
          "Photograph your whole shelf in one go. Beauty Shelf reads every product it can and chats with you to fill the gaps.",
      },
      { property: "og:title", content: "Add several products at once — My Beauty Shelf" },
      {
        property: "og:description",
        content: "One photo, many products. We'll ask about anything we couldn't read.",
      },
    ],
  }),
  component: BulkAdd,
});

type Item = {
  brand: string | null;
  name: string | null;
  category: string | null;
  size_ml: number | null;
  pao_months: number | null;
  ingredients: string[];
  ingredients_readable: boolean;
  notes: string | null;
  position: string | null;
};

type Turn = { role: "user" | "assistant"; content: string };

const STATUS_LINES = [
  "Counting the bottles…",
  "Reading each label…",
  "Working left to right…",
  "Almost there…",
];

function missingFields(item: Item): string[] {
  const gaps: string[] = [];
  if (!item.brand) gaps.push("brand");
  if (!item.name) gaps.push("name");
  if (!item.category) gaps.push("category");
  return gaps;
}

function BulkAdd() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const runExtract = useServerFn(extractProductsBulk);
  const runChat = useServerFn(bulkChat);

  const [photo, setPhoto] = useState<string | null>(null);
  const [phase, setPhase] = useState<"capture" | "reading" | "review">("capture");
  const [statusIndex, setStatusIndex] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "reading") return;
    const id = setInterval(() => setStatusIndex((i) => (i + 1) % STATUS_LINES.length), 1600);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, thinking]);

  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await fileToCompressedDataUrl(file, 1600, 0.82));
    } catch {
      toast.error("Couldn't read that photo.");
    }
  }

  async function analyse() {
    if (!photo) return;
    setPhase("reading");
    try {
      const found = (await runExtract({ data: { image: photo } })) as Item[];
      if (found.length === 0) {
        toast.error("We couldn't make out any products. Try a closer, brighter photo.");
        setPhase("capture");
        return;
      }
      setItems(found);
      setPhase("review");
      const gaps = found.filter((i) => missingFields(i).length > 0);
      if (gaps.length > 0) void ask(found, []);
      else
        setTurns([
          {
            role: "assistant",
            content: `I read ${found.length} products and got everything I needed. Tweak anything below, then save.`,
          },
        ]);
    } catch (err) {
      toast.error(friendlyError(err, "That didn't work — try again."));
      setPhase("capture");
    }
  }

  async function ask(currentItems: Item[], history: Turn[]) {
    setThinking(true);
    try {
      const res = await runChat({ data: { items: currentItems, history } });
      if (res.updates.length > 0) {
        setItems((prev) => {
          const next = [...prev];
          for (const u of res.updates) {
            const target = next[u.index];
            if (target) next[u.index] = { ...target, ...u.patch };
          }
          return next;
        });
      }
      setTurns([...history, { role: "assistant", content: res.reply }]);
    } catch (err) {
      toast.error(friendlyError(err, "The assistant is unavailable right now."));
    } finally {
      setThinking(false);
    }
  }

  function send() {
    const text = input.trim();
    if (!text || thinking) return;
    const history: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(history);
    setInput("");
    void ask(items, history);
  }

  function patch(index: number, next: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...next } : it)));
  }

  async function save() {
    if (!user || items.length === 0) return;
    setSaving(true);
    try {
      const path = photo ? await uploadPhoto(user.id, dataUrlToBlob(photo), "shelf") : null;
      const today = new Date().toISOString().slice(0, 10);
      const rows = items.map((it) => ({
        user_id: user.id,
        brand: it.brand ?? "",
        name: it.name ?? "Unnamed product",
        category: (it.category as Category | null) ?? "other",
        image_front_url: path,
        ingredients: it.ingredients,
        size_ml: it.size_ml,
        pao_months: it.pao_months,
        date_opened: today,
      }));
      const { error } = await supabase.from("products").insert(rows);
      if (error) throw error;
      toast.success(`Added ${rows.length} products to your shelf.`);
      void navigate({ to: "/" });
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't save those products."));
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

  const remaining = items.filter((i) => missingFields(i).length > 0).length;

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Add several at once</h1>
        <button
          onClick={() => void navigate({ to: "/add" })}
          aria-label="Close"
          className="rounded-full p-2 text-muted-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {phase === "capture" && (
        <div className="mt-6 space-y-4">
          <button
            onClick={() => fileInput.current?.click()}
            className={cn(
              "w-full overflow-hidden rounded-2xl border text-left transition-colors",
              photo ? "border-border" : "border-dashed border-border bg-card hover:bg-accent",
            )}
          >
            {photo ? (
              <img src={photo} alt="Your shelf" className="aspect-4/3 w-full object-cover" />
            ) : (
              <div className="flex aspect-4/3 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Camera className="h-7 w-7" />
                <span className="font-display text-lg text-foreground">Line them up</span>
                <span className="px-8 text-center text-xs">
                  Labels facing you, good light. We'll read as many as we can.
                </span>
              </div>
            )}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          <Button className="h-13 w-full py-4 text-base" disabled={!photo} onClick={() => void analyse()}>
            {photo ? "Read the shelf" : "Take a photo to start"}
          </Button>
        </div>
      )}

      {phase === "reading" && (
        <div className="mt-6 space-y-4">
          <Skeleton className="aspect-4/3 w-full rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
          <p className="pt-2 text-center font-display text-lg text-muted-foreground">
            {STATUS_LINES[statusIndex]}
          </p>
        </div>
      )}

      {phase === "review" && (
        <div className="mt-6 space-y-6">
          {photo ? (
            <img src={photo} alt="Your shelf" className="aspect-4/3 w-full rounded-2xl object-cover" />
          ) : null}

          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl">{items.length} products found</h2>
              <span className="text-xs text-muted-foreground">
                {remaining > 0 ? `${remaining} need details` : "All set"}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {items.map((it, i) => {
                const gaps = missingFields(it);
                return (
                  <div
                    key={i}
                    className={cn(
                      "space-y-3 rounded-2xl border bg-card p-4",
                      gaps.length ? "border-primary/40" : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        {it.position ?? `Product ${i + 1}`}
                      </p>
                      <button
                        aria-label="Remove product"
                        onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Brand</Label>
                      <Input
                        className="h-11"
                        placeholder="Not readable"
                        value={it.brand ?? ""}
                        onChange={(e) => patch(i, { brand: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Product name</Label>
                      <Input
                        className="h-11"
                        placeholder="Not readable"
                        value={it.name ?? ""}
                        onChange={(e) => patch(i, { name: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Category</Label>
                      <Select
                        {...(it.category ? { value: it.category } : {})}
                        onValueChange={(v) => patch(i, { category: v })}
                      >
                        <SelectTrigger className="h-11 w-full capitalize">
                          <SelectValue placeholder="Choose one" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c} className="capitalize">
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-display text-lg">Fill in the gaps</h2>
              <p className="text-xs text-muted-foreground">
                Tell me what I couldn't read and I'll update the list.
              </p>
            </div>
            <div className="max-h-80 space-y-3 overflow-y-auto p-4">
              {turns.map((t, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                    t.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground",
                  )}
                >
                  {t.content}
                </div>
              ))}
              {thinking && (
                <div className="max-w-[60%] rounded-2xl bg-secondary px-3.5 py-2.5">
                  <Skeleton className="h-3 w-24" />
                </div>
              )}
              <div ref={chatEnd} />
            </div>
            <div className="flex items-center gap-2 border-t border-border p-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="e.g. the tall one is CeraVe cleanser"
                className="h-11"
              />
              <Button
                size="icon"
                className="h-11 w-11 shrink-0"
                aria-label="Send"
                disabled={thinking || !input.trim()}
                onClick={send}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            className="h-13 w-full py-4 text-base"
            disabled={saving || items.length === 0}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : `Save ${items.length} to shelf`}
          </Button>
        </div>
      )}
    </div>
  );
}
