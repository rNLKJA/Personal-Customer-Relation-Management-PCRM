"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListEditor } from "@/components/common/list-editor";
import { PortraitPicker } from "@/components/common/portrait-picker";
import { setPortraitAction, updateProfileAction } from "@/server/actions/profile";
import type { ProfileValues } from "@/lib/schemas";

type Values = Required<Omit<ProfileValues, "phones" | "emails">> & { phones: string[]; emails: string[] };

/** Port of `person/Person1.js` (`/profile/editProfile`, add/del phone & e-mail, photo upload). */
export function ProfileForm({ initial, userName, portrait }: { initial: Values; userName: string; portrait: string | null }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [photo, setPhoto] = useState(portrait);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((s) => ({ ...s, [k]: v }));

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await updateProfileAction({
            ...values,
            phones: values.phones.filter((p) => p.trim()),
            emails: values.emails.filter((m) => m.trim()),
          });
          if (!res.ok) return setError(res.error);
          toast.success("Profile saved");
          router.refresh();
        });
      }}
    >
      <PortraitPicker
        firstName={values.firstName || userName}
        lastName={values.lastName}
        seed={userName}
        value={photo}
        onChange={(v) => {
          setPhoto(v);
          start(async () => {
            const res = await setPortraitAction(v);
            if (!res.ok) toast.error(res.error);
            else {
              toast.success(v ? "Photo updated" : "Photo removed");
              router.refresh();
            }
          });
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="p-first">First name</Label>
          <Input id="p-first" value={values.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-last">Last name</Label>
          <Input id="p-last" value={values.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-occupation">Occupation</Label>
          <Input id="p-occupation" value={values.occupation} onChange={(e) => set("occupation", e.target.value)} autoComplete="organization-title" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-status">Status</Label>
          <Input id="p-status" value={values.statusMessage} onChange={(e) => set("statusMessage", e.target.value)} placeholder="e.g. Open to coffee chats" />
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <ListEditor id="p-phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel" values={values.phones} onChange={(v) => set("phones", v)} addLabel="Add phone" />
        <ListEditor id="p-email" label="E-mail" type="email" inputMode="email" autoComplete="email" values={values.emails} onChange={(v) => set("emails", v)} addLabel="Add e-mail" />
      </div>
      <p className="text-muted-foreground text-xs">
        People who add you by user name or QR code get these details, and can sync them later.
      </p>
      {error && (
        <p role="alert" className="text-destructive flex items-center gap-1.5 text-sm">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Save profile
        </Button>
      </div>
    </form>
  );
}
