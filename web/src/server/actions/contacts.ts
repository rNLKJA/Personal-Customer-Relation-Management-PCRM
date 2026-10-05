"use server";

import { revalidatePath } from "next/cache";
import { contactInputSchema, firstIssue, type ContactInputValues } from "@/lib/schemas";
import { parseQrPayload } from "@/lib/qr";
import { getCurrentUser } from "../session";
import {
  createContact,
  createContactByUserName,
  deleteContact,
  syncContact,
  updateContact,
} from "../contacts";
import { prepareFastRegister } from "../users";
import { getOrigin } from "../origin";
import { SESSION_EXPIRED, type ActionResult } from "./types";

function refreshContacts(id?: string) {
  revalidatePath("/contacts");
  revalidatePath("/home");
  if (id) revalidatePath(`/contacts/${id}`);
}

export async function createContactAction(
  values: ContactInputValues,
): Promise<ActionResult<{ id: string; linked: boolean }>> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const parsed = contactInputSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const result = await createContact(user.id, parsed.data);
  if (!result.status) {
    return { ok: false, error: "You already have this contact in your list." };
  }
  refreshContacts();
  return { ok: true, id: result.contact.id, linked: result.linked };
}

export async function updateContactAction(
  id: string,
  values: ContactInputValues,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const parsed = contactInputSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const row = await updateContact(user.id, id, parsed.data);
  if (!row) return { ok: false, error: "Contact not found." };
  refreshContacts(id);
  return { ok: true, id };
}

export async function deleteContactAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const ok = await deleteContact(user.id, id);
  if (!ok) return { ok: false, error: "Contact not found." };
  refreshContacts();
  revalidatePath("/records");
  revalidatePath("/map");
  revalidatePath("/calendar");
  return { ok: true };
}

/** Add by user name - also the target of the QR scanner (raw user name or our link). */
export async function addByUserNameAction(
  raw: string,
): Promise<ActionResult<{ id: string }> | { ok: false; error: string; existingId?: string }> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const userName = parseQrPayload(raw) ?? raw.trim();
  if (!userName) return { ok: false, error: "Enter a user name." };
  const result = await createContactByUserName(user, userName);
  if (!result.status) return { ok: false, error: result.msg, existingId: result.contactId };
  refreshContacts();
  return { ok: true, id: result.contact.id };
}

export async function syncContactAction(id: string): Promise<ActionResult<{ changed: string[] }>> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const result = await syncContact(user.id, id);
  if (!result.ok) return result;
  refreshContacts(id);
  return { ok: true, changed: result.changed };
}

export async function inviteContactAction(id: string): Promise<ActionResult<{ email: string }>> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const result = await prepareFastRegister(user, id, await getOrigin());
  if (!result.ok) return result;
  revalidatePath("/inbox");
  return { ok: true, email: result.email };
}
