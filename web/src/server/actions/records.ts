"use server";

import { revalidatePath } from "next/cache";
import { firstIssue, recordInputSchema, type RecordInputValues } from "@/lib/schemas";
import { fromZonedInputValue } from "@/lib/time";
import { getCurrentUser } from "../session";
import { createRecord, deleteRecord, editRecord } from "../records";
import { SESSION_EXPIRED, type ActionResult } from "./types";

function refreshRecords(id?: string, contactId?: string) {
  for (const p of ["/records", "/map", "/calendar", "/home", "/contacts"]) revalidatePath(p);
  if (id) revalidatePath(`/records/${id}`);
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

export async function saveRecordAction(values: RecordInputValues): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const parsed = recordInputSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;
  const when = fromZonedInputValue(v.dateTime);
  if (!when) return { ok: false, error: "Choose a valid date and time" };
  const body = {
    _id: v.id ?? null,
    contact_id: v.contactId,
    location: v.location,
    dateTime: when,
    geoCoords: v.lat != null && v.lng != null ? { lat: v.lat, lng: v.lng } : null,
    notes: v.notes,
    customField: v.customFields,
  };
  const result = v.id ? await editRecord(user.id, body) : await createRecord(user.id, body);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error === "Miss Important Information Input"
          ? "Who and where are required."
          : "Could not save this meeting - check the contact still exists.",
    };
  }
  refreshRecords(result.record.id, result.record.contactId);
  return { ok: true, id: result.record.id };
}

export async function deleteRecordAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const ok = await deleteRecord(user.id, id);
  if (!ok) return { ok: false, error: "Meeting not found." };
  refreshRecords();
  return { ok: true };
}
