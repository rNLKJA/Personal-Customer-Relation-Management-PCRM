"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { KeyRound, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAiSettings } from "@/hooks/use-ai-settings";
import {
  ANTHROPIC_MODELS,
  DEFAULT_OPENAI_MODEL,
  PROVIDER_LABELS,
  type AiProvider,
} from "@/lib/ai/models";
import { activeKey, maskKey, type AiSettings } from "@/lib/ai/settings";
import { cn } from "@/lib/utils";

/**
 * "AI settings": choose a provider and model and paste your own API key. The
 * key is kept in this browser only - sessionStorage unless "remember on this
 * device" is ticked - and is sent only to the chosen provider.
 */
export function AiSettingsDialog({ trigger }: { trigger?: ReactNode }) {
  const { settings, save, forget, hasKey } = useAiSettings();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AiSettings>(settings);

  function onOpenChange(next: boolean) {
    if (next) setDraft(settings);
    setOpen(next);
  }

  const set = (patch: Partial<AiSettings>) => setDraft((d) => ({ ...d, ...patch }));
  const setKey = (value: string) =>
    setDraft((d) => ({ ...d, keys: { ...d.keys, [d.provider]: value } }));
  const storedKey = activeKey({ ...settings, provider: draft.provider });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <KeyRound /> AI settings
            <span
              className={cn(
                "size-1.5 rounded-full",
                hasKey ? "bg-success" : "bg-muted-foreground/40",
              )}
              aria-hidden="true"
            />
            <span className="sr-only">{hasKey ? "(key added)" : "(no key)"}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" /> AI settings
          </DialogTitle>
          <DialogDescription>
            AI features are optional - everything else works without a key. Bring your own key: it
            stays in this browser and is sent only to the provider you choose, never to 4399 CRM.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save(draft);
            setOpen(false);
            toast.success(
              activeKey(draft) ? "AI settings saved in this browser" : "AI settings saved",
            );
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Provider</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["anthropic", "openai"] as AiProvider[]).map((p) => (
                <label
                  key={p}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                    draft.provider === p
                      ? "border-primary/40 bg-accent text-accent-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p}
                    checked={draft.provider === p}
                    onChange={() => set({ provider: p })}
                    className="accent-primary"
                  />
                  {PROVIDER_LABELS[p]}
                  {p === "anthropic" && (
                    <span className="ml-auto text-[11px] text-muted-foreground">default</span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>

          {draft.provider === "anthropic" ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Model</legend>
              {ANTHROPIC_MODELS.map((m) => (
                <label
                  key={m.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                    draft.anthropicModel === m.id
                      ? "border-primary/40 bg-accent/60"
                      : "hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="anthropic-model"
                    value={m.id}
                    checked={draft.anthropicModel === m.id}
                    onChange={() => set({ anthropicModel: m.id })}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="font-medium">{m.label}</span>{" "}
                    <code className="font-mono text-[11px] text-muted-foreground">{m.id}</code>
                    <span className="block text-xs text-muted-foreground">{m.note}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="openai-model">Model id</Label>
              <Input
                id="openai-model"
                value={draft.openaiModel}
                onChange={(e) => set({ openaiModel: e.target.value })}
                placeholder={DEFAULT_OPENAI_MODEL}
                spellCheck={false}
                autoComplete="off"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Any Chat Completions model that supports structured outputs (JSON schema).
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ai-key">
              {draft.provider === "anthropic" ? "Anthropic" : "OpenAI"} API key
            </Label>
            <Input
              id="ai-key"
              type="password"
              value={draft.keys[draft.provider]}
              onChange={(e) => setKey(e.target.value)}
              placeholder={draft.provider === "anthropic" ? "sk-ant-..." : "sk-..."}
              autoComplete="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {storedKey ? (
                <>
                  Saved key: <code className="font-mono">{maskKey(storedKey)}</code>.{" "}
                </>
              ) : null}
              Calls are billed to your provider account; one meeting summary is roughly 1-2 thousand
              tokens.
            </p>
          </div>

          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={draft.remember}
              onChange={(e) => set({ remember: e.target.checked })}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              Remember on this device
              <span className="block text-xs text-muted-foreground">
                Off: the key is in sessionStorage and disappears when you close the tab. On: it is
                kept in localStorage, readable by anyone using this browser profile. Signing out
                forgets saved keys either way.
              </span>
            </span>
          </label>

          <div className="flex items-start gap-2 rounded-lg bg-surface p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <p>
              Before anything is sent you see the exact text, with e-mails, phone numbers, addresses
              and the contact&apos;s name removed. Every call is listed in your{" "}
              <Link
                href="/ai-log"
                className="font-medium text-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                AI log
              </Link>{" "}
              (without the key).
            </p>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              disabled={!settings.keys.anthropic && !settings.keys.openai}
              onClick={() => {
                forget();
                setDraft((d) => ({ ...d, keys: { anthropic: "", openai: "" } }));
                toast.success("Keys removed from this browser");
              }}
            >
              <Trash2 /> Forget keys
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
