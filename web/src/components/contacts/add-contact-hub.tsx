"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AtSign, Check, Copy, Loader2, PencilLine, QrCode, ScanLine, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addByUserNameAction } from "@/server/actions/contacts";
import { QrScanner } from "./qr-scanner";

type Tab = "scan" | "username" | "code";

/**
 * "Add contact" hub - port of `addOneContact.js` with its three routes
 * (`/addUser/qr-code`, `/addUser/user-id`, `/setting/qr`), plus a manual link.
 */
export function AddContactHub({
  initialTab,
  prefillUserName,
  myUserName,
  qrSvg,
  qrLink,
}: {
  initialTab: Tab;
  prefillUserName: string | null;
  myUserName: string;
  qrSvg: string;
  qrLink: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [userName, setUserName] = useState(prefillUserName ?? "");
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  function add(name: string) {
    start(async () => {
      const res = await addByUserNameAction(name);
      if (!res.ok) {
        const existingId = "existingId" in res ? res.existingId : undefined;
        toast.error(
          res.error,
          existingId
            ? { action: { label: "Open", onClick: () => router.push(`/contacts/${existingId}`) } }
            : undefined,
        );
        return;
      }
      toast.success(`Successfully added @${name}!`);
      router.push(`/contacts/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {prefillUserName && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/25 bg-accent/60 px-4 py-3">
          <QrCode className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm">
            Add <strong className="font-semibold">@{prefillUserName}</strong> to your contacts?
          </p>
          <Button size="sm" disabled={pending} onClick={() => add(prefillUserName)}>
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}{" "}
            Add contact
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="grid h-10 w-full grid-cols-3 sm:inline-grid sm:w-auto">
          <TabsTrigger value="scan" className="gap-1.5">
            <ScanLine className="size-4" aria-hidden="true" /> Scan
          </TabsTrigger>
          <TabsTrigger value="username" className="gap-1.5">
            <AtSign className="size-4" aria-hidden="true" /> User name
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-1.5">
            <QrCode className="size-4" aria-hidden="true" /> My code
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="scan"
          className="mt-4 rounded-2xl border bg-card p-5 shadow-(--shadow-soft)"
        >
          <QrScanner onUserName={add} busy={pending} />
        </TabsContent>

        <TabsContent
          value="username"
          className="mt-4 rounded-2xl border bg-card p-5 shadow-(--shadow-soft)"
        >
          <form
            className="mx-auto max-w-md space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (userName.trim()) add(userName.trim());
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="add-username">Their user name</Label>
              <div className="relative">
                <AtSign
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="add-username"
                  className="pl-9"
                  autoCapitalize="none"
                  autoComplete="off"
                  placeholder="ava.chen"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Try{" "}
                <button
                  type="button"
                  className="font-medium text-primary"
                  onClick={() => setUserName("ava.chen")}
                >
                  ava.chen
                </button>
                ,{" "}
                <button
                  type="button"
                  className="font-medium text-primary"
                  onClick={() => setUserName("sam.patel")}
                >
                  sam.patel
                </button>{" "}
                or{" "}
                <button
                  type="button"
                  className="font-medium text-primary"
                  onClick={() => setUserName("noah.williams")}
                >
                  noah.williams
                </button>
                . Their own profile details are copied in and kept linked.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={pending || !userName.trim()}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Add contact
            </Button>
          </form>
        </TabsContent>

        <TabsContent
          value="code"
          className="mt-4 rounded-2xl border bg-card p-5 shadow-(--shadow-soft)"
        >
          <div className="mx-auto flex max-w-sm flex-col items-center text-center">
            <div
              className="w-full max-w-[260px] rounded-2xl bg-white p-4 shadow-(--shadow-soft)"
              role="img"
              aria-label={`QR code for @${myUserName}`}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="mt-4 font-medium">@{myUserName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Let someone scan this to add you. Fill in your profile first - they get your name,
              phone and e-mail.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(qrLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{" "}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (navigator.share)
                    await navigator
                      .share({ title: "Add me on 4399 CRM", url: qrLink })
                      .catch(() => {});
                  else await navigator.clipboard.writeText(qrLink);
                }}
              >
                <Share2 aria-hidden="true" /> Share
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile">Edit profile</Link>
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-center text-sm text-muted-foreground">
        Not on 4399 CRM?{" "}
        <Link
          href="/contacts/new"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <PencilLine className="size-3.5" aria-hidden="true" /> Enter their details by hand
        </Link>
      </p>
    </div>
  );
}
