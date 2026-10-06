const SYNC_FIELD_LABELS: Record<string, string> = {
  firstName: "first name",
  lastName: "last name",
  phones: "phone numbers",
  emails: "e-mail addresses",
  occupation: "occupation",
  portrait: "photo",
};

/** Human list of the contact fields `synchronizationContactInfo` would update. */
export function syncFieldLabels(keys: readonly string[]): string {
  return keys.map((k) => SYNC_FIELD_LABELS[k] ?? k).join(", ");
}
