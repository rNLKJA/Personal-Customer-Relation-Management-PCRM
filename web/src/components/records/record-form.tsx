"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonAvatar } from "@/components/common/person-avatar";
import { CustomFieldsEditor } from "@/components/common/custom-fields-editor";
import type { LocationValue } from "@/components/maps/location-picker";
import { saveRecordAction } from "@/server/actions/records";
import { dataValidator, type CustomField } from "@/lib/legacy/validation";
import { cn } from "@/lib/utils";

const LocationPicker = dynamic(() => import("@/components/maps/location-picker").then((m) => m.LocationPicker), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      <Skeleton className="h-10 rounded-lg" />
      <Skeleton className="h-64 rounded-2xl sm:h-80" />
    </div>
  ),
});

export interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
  occupation: string;
  portrait: string | null;
}

export interface RecordFormValues {
  contactId: string;
  dateTime: string; // YYYY-MM-DDTHH:mm, Melbourne time
  location: string;
  lat: number | null;
  lng: number | null;
  notes: string;
  customFields: CustomField[];
}

/** Port of `AddRecord.js` / `editRecord.js` (`/record/createRecord`, `/record/editRecord`). */
export function RecordForm({
  id,
  initial,
  contacts,
}: {
  id?: string;
  initial: RecordFormValues;
  contacts: ContactOption[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, start] = useTransition();
  const selected = contacts.find((c) => c.id === values.contactId);
  const set = <K extends keyof RecordFormValues>(key: K, v: RecordFormValues[K]) => setValues((s) => ({ ...s, [key]: v }));

  if (contacts.length === 0) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground text-sm">You need at least one contact before logging a meeting.</p>
        <Button asChild className="mt-4">
          <Link href="/contacts/new">Add a contact</Link>
        </Button>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.contactId) return setError("Choose who you met");
    if (!values.location.trim()) return setError("Pick a location on the map or type one");
    const fieldError = dataValidator(values.customFields, "field");
    if (fieldError) return setError("please fill the customField");
    setError(null);
    start(async () => {
      const res = await saveRecordAction({ ...values, id });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(id ? "Meeting updated" : "Meeting logged");
      router.push(`/records/${res.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label id="who-label">Who did you meet?</Label>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={pickerOpen}
                aria-labelledby="who-label"
                className="bg-card h-10 w-full justify-between px-3 font-normal"
              >
                {selected ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <PersonAvatar firstName={selected.firstName} lastName={selected.lastName} portrait={selected.portrait} seed={selected.id} size="xs" />
                    <span className="truncate">
                      {selected.firstName} {selected.lastName}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Choose a contact</span>
                )}
                <ChevronsUpDown className="text-muted-foreground" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
              <Command>
                <CommandInput placeholder="Search contacts…" />
                <CommandList>
                  <CommandEmpty>No contact found.</CommandEmpty>
                  {contacts.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.firstName} ${c.lastName} ${c.occupation} ${c.id}`}
                      onSelect={() => {
                        set("contactId", c.id);
                        setPickerOpen(false);
                      }}
                    >
                      <PersonAvatar firstName={c.firstName} lastName={c.lastName} portrait={c.portrait} seed={c.id} size="xs" />
                      <span className="min-w-0 flex-1 truncate">
                        {c.firstName} {c.lastName}
                        <span className="text-muted-foreground ml-1.5 text-xs">{c.occupation}</span>
                      </span>
                      <Check className={cn("size-4", c.id === values.contactId ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dateTime">When</Label>
          <Input
            id="dateTime"
            type="datetime-local"
            value={values.dateTime}
            onChange={(e) => set("dateTime", e.target.value)}
            required
          />
          <p className="text-muted-foreground text-xs">Melbourne time</p>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Where</span>
        <LocationPicker
          value={{ location: values.location, lat: values.lat, lng: values.lng }}
          onChange={(v: LocationValue) => setValues((s) => ({ ...s, ...v }))}
        />
        <div className="space-y-1.5 pt-1">
          <Label htmlFor="location">Location name</Label>
          <Input
            id="location"
            value={values.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. State Library Victoria"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={4} value={values.notes} onChange={(e) => set("notes", e.target.value)} placeholder="What did you talk about? Any follow-ups?" />
      </div>
      <CustomFieldsEditor fields={values.customFields} onChange={(f) => set("customFields", f)} />

      {error && (
        <p role="alert" className="text-destructive flex items-center gap-1.5 text-sm">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
      <div className="bg-background/90 sticky bottom-20 flex justify-end gap-2 border-t py-3 backdrop-blur lg:bottom-0">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {id ? "Save changes" : "Log meeting"}
        </Button>
      </div>
    </form>
  );
}
