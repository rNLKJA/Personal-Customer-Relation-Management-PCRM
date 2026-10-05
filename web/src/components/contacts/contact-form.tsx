"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ListEditor } from "@/components/common/list-editor";
import { CustomFieldsEditor } from "@/components/common/custom-fields-editor";
import { PortraitPicker } from "@/components/common/portrait-picker";
import { createContactAction, updateContactAction } from "@/server/actions/contacts";
import { validateContactForm, type CustomField } from "@/lib/legacy/validation";

export interface ContactFormValues {
  firstName: string;
  lastName: string;
  occupation: string;
  phones: string[];
  emails: string[];
  note: string;
  customFields: CustomField[];
  portrait: string | null;
}

const EMPTY: ContactFormValues = {
  firstName: "",
  lastName: "",
  occupation: "",
  phones: [""],
  emails: [""],
  note: "",
  customFields: [],
  portrait: null,
};

/**
 * Manual contact entry / edit - port of `manual-input.js` and the edit mode of
 * `SelectedContact.jsx`, including the original `dataValidator` checks.
 */
export function ContactForm({ id, initial }: { id?: string; initial?: ContactFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<ContactFormValues>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = {
      ...values,
      phones: values.phones.map((p) => p.trim()).filter(Boolean),
      emails: values.emails.map((m) => m.trim()).filter(Boolean),
    };
    const legacyError = validateContactForm(cleaned);
    if (legacyError) {
      setError(legacyError);
      return;
    }
    setError(null);
    start(async () => {
      const res = id ? await updateContactAction(id, cleaned) : await createContactAction(cleaned);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (!id && "linked" in res && res.linked) {
        toast.success("Contact added and linked", {
          description: "They already have a 4399 CRM account, so we used their own details.",
        });
      } else {
        toast.success(id ? "Contact updated" : "Contact added");
      }
      router.push(`/contacts/${res.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <PortraitPicker
        firstName={values.firstName}
        lastName={values.lastName}
        seed={id ?? `${values.firstName} ${values.lastName}`}
        value={values.portrait}
        onChange={(v) => set("portrait", v)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            autoComplete="off"
            value={values.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            autoComplete="off"
            value={values.lastName}
            onChange={(e) => set("lastName", e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="occupation">Occupation</Label>
        <Input
          id="occupation"
          value={values.occupation}
          onChange={(e) => set("occupation", e.target.value)}
          placeholder="e.g. UX researcher"
        />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <ListEditor
          id="phone"
          label="Phone"
          type="tel"
          inputMode="tel"
          placeholder="0491 570 006"
          values={values.phones}
          onChange={(v) => set("phones", v)}
          addLabel="Add another phone"
        />
        <ListEditor
          id="email"
          label="E-mail"
          type="email"
          inputMode="email"
          placeholder="name@example.com"
          values={values.emails}
          onChange={(v) => set("emails", v)}
          addLabel="Add another e-mail"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">Notes</Label>
        <Textarea
          id="note"
          rows={3}
          value={values.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="How you met, what they care about…"
        />
      </div>
      <CustomFieldsEditor fields={values.customFields} onChange={(f) => set("customFields", f)} />

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
      <div className="sticky bottom-20 flex justify-end gap-2 border-t bg-background/90 py-3 backdrop-blur lg:bottom-0">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {id ? "Save changes" : "Add contact"}
        </Button>
      </div>
    </form>
  );
}
