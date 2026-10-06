/**
 * Contact identity rules ported from `controller/contactController.js`.
 *
 * MongoDB compared the `phone` / `email` arrays by exact (ordered) equality in
 * `findOne({ lastName, firstName, phone, email })`; the controller also used a
 * hand-written `listCompare` for synchronisation. Both are reproduced here so the
 * SQLite port makes exactly the same "duplicate contact" / "has an account"
 * decisions.
 */

/**
 * Verbatim port of `listCompare(currentList, targetList)`; returns 1 when the
 * two string arrays are equal (same order), otherwise 0. (The original loop ran
 * to `i <= length`, comparing `undefined` with `undefined` once - harmless.)
 */
export function listCompare(
  currentList: readonly (string | undefined)[],
  targetList: readonly (string | undefined)[],
): 0 | 1 {
  if (currentList.length != targetList.length) {
    return 0;
  } else {
    for (let i = 0; i <= currentList.length; i++) {
      if (currentList[i] != targetList[i]) {
        return 0;
      }
    }
  }
  return 1;
}

export interface Identity {
  firstName: string | null;
  lastName: string | null;
  phones: readonly string[];
  emails: readonly string[];
}

/** `{ lastName, firstName, phone, email }` equality used for duplicates and account matching. */
export function sameIdentity(a: Identity, b: Identity): boolean {
  return (
    (a.lastName ?? "") === (b.lastName ?? "") &&
    (a.firstName ?? "") === (b.firstName ?? "") &&
    listCompare(a.phones, b.phones) === 1 &&
    listCompare(a.emails, b.emails) === 1
  );
}

/** `linkToAccount` additionally required the same occupation. */
export function sameLinkIdentity(
  a: Identity & { occupation: string | null },
  b: Identity & { occupation: string | null },
): boolean {
  return sameIdentity(a, b) && (a.occupation ?? "") === (b.occupation ?? "");
}

export interface SyncableContact {
  firstName: string;
  lastName: string;
  phones: string[];
  emails: string[];
  occupation: string;
  portrait: string | null;
}

export interface SyncSourceAccount {
  firstName: string | null;
  lastName: string | null;
  phones: string[];
  emails: string[];
  occupation: string | null;
  portrait: string | null;
}

/**
 * Port of the update-document builder in `synchronizationContactInfo`: copy each
 * field from the linked account when the account has a (truthy) value that
 * differs from the contact's.
 */
export function syncUpdates(
  contact: SyncableContact,
  account: SyncSourceAccount,
): Partial<SyncableContact> {
  const query: Partial<SyncableContact> = {};
  if (account.lastName && contact.lastName !== account.lastName) {
    query.lastName = account.lastName;
  }
  if (account.firstName && contact.firstName !== account.firstName) {
    query.firstName = account.firstName;
  }
  if (account.phones && !listCompare(contact.phones, account.phones)) {
    query.phones = [...account.phones];
  }
  if (account.emails && !listCompare(contact.emails, account.emails)) {
    query.emails = [...account.emails];
  }
  if (account.occupation && contact.occupation !== account.occupation) {
    query.occupation = account.occupation;
  }
  if (account.portrait && contact.portrait !== account.portrait) {
    query.portrait = account.portrait;
  }
  return query;
}
