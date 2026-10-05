/**
 * Functional-parity map: every REST endpoint of the 2021 Express back-end
 * (coursework/backend/routes) and what replaced it in the Next.js app.
 * `parity.test.ts` checks this list against the original router files and
 * checks that every named replacement is really exported from its file.
 *
 * Status:
 *  - implemented: same behaviour, now a Server Action (or a Server Component read)
 *  - changed:     same user-facing capability, different mechanism - reason given
 *  - dropped:     no longer needed - reason given
 */

export type ParityStatus = "implemented" | "changed" | "dropped";

export interface ParityTarget {
  /** File under web/ that exports the replacement. */
  file: string;
  symbol: string;
}

export interface ParityRow {
  method: "GET" | "POST";
  path: string;
  original: string;
  targets: ParityTarget[];
  status: ParityStatus;
  note: string;
}

const A = {
  auth: "src/server/actions/auth.ts",
  contacts: "src/server/actions/contacts.ts",
  records: "src/server/actions/records.ts",
  profile: "src/server/actions/profile.ts",
  contactsSvc: "src/server/contacts.ts",
  recordsSvc: "src/server/records.ts",
  session: "src/server/session.ts",
  search: "src/lib/legacy/search.ts",
};

const t = (file: string, symbol: string): ParityTarget => ({ file, symbol });

export const PARITY: ParityRow[] = [
  // ---------------------------------------------------------------- /contact
  {
    method: "POST",
    path: "/contact/createContact",
    original: "createNewContact",
    targets: [t(A.contacts, "createContactAction")],
    status: "implemented",
    note: "Duplicate check and account linking ported; scoped to the signed-in owner.",
  },
  {
    method: "POST",
    path: "/contact/createContactByUserName",
    original: "createContactbyUserName",
    targets: [t(A.contacts, "addByUserNameAction")],
    status: "implemented",
    note: "Also the target of the QR scanner and /contacts/add?u= links.",
  },
  {
    method: "GET",
    path: "/contact/showContact",
    original: "showAllContact",
    targets: [t(A.contactsSvc, "listContacts")],
    status: "changed",
    note: "Read inside the /contacts Server Component instead of a JSON endpoint.",
  },
  {
    method: "POST",
    path: "/contact/showOneContact",
    original: "showOneContact",
    targets: [t(A.contactsSvc, "getContact")],
    status: "changed",
    note: "Read inside /contacts/[id]; the original returned any contact whose id the client sent.",
  },
  {
    method: "GET",
    path: "/contact/deleteOneContact/:userName/:contact_id",
    original: "deleteOneContact",
    targets: [t(A.contacts, "deleteContactAction")],
    status: "changed",
    note: "A POST Server Action with confirmation; a GET that deletes data can be triggered by a link or prefetch.",
  },
  {
    method: "POST",
    path: "/contact/uploadContactImage",
    original: "contactPhotoUpload",
    targets: [t(A.contacts, "createContactAction"), t(A.contacts, "updateContactAction")],
    status: "changed",
    note: "Photos are a validated field of the contact form (PNG/JPEG/WebP data URL, at most 180 KB), not a multer upload to disk.",
  },
  {
    method: "POST",
    path: "/contact/updateContactInfo",
    original: "updateContactInfo",
    targets: [t(A.contacts, "updateContactAction")],
    status: "implemented",
    note: "Same validation rules (zod schema shared by form and server).",
  },
  {
    method: "POST",
    path: "/contact/searchContact",
    original: "searchContact",
    targets: [t(A.search, "searchContacts")],
    status: "changed",
    note: "The 2021 client never called this endpoint; it filtered the loaded list. That client-side filter is ported 1:1 and parity-tested.",
  },
  {
    method: "POST",
    path: "/contact/synchronizationContactInfo",
    original: "synchronizationContactInfo",
    targets: [t(A.contacts, "syncContactAction")],
    status: "implemented",
    note: "Replays the team's Jest fixture; only the changed fields are copied.",
  },
  {
    method: "POST",
    path: "/contact/connectContactToAccount",
    original: "linkToAccount",
    targets: [t(A.auth, "confirmInviteAction")],
    status: "changed",
    note: "No public endpoint: linking happens on the server when an invitee confirms. The original let any signed-in user link any contact to any account.",
  },
  {
    method: "POST",
    path: "/contact/createContactOneStep",
    original: "createContactOneStep",
    targets: [t(A.contacts, "createContactAction")],
    status: "implemented",
    note: "Create-with-photo in one step is now the only create path.",
  },
  // ---------------------------------------------------------------- /profile
  ...(
    [
      ["/profile/addPhone", "addPhone"],
      ["/profile/delPhone", "delPhone"],
      ["/profile/addEmail", "addEmail"],
      ["/profile/delEmail", "delEmail"],
      ["/profile/editFirstName", "editFirstName"],
      ["/profile/editLastName", "editLastName"],
      ["/profile/editOccupation", "editOccupation"],
      ["/profile/editStatus", "editStatus"],
    ] as const
  ).map(([path, original]): ParityRow => ({
    method: "POST",
    path,
    original,
    targets: [t(A.profile, "updateProfileAction")],
    status: "changed",
    note: "Folded into one validated profile update (the 2021 UI saved the whole form anyway).",
  })),
  {
    method: "POST",
    path: "/profile/editProfile",
    original: "editProfile",
    targets: [t(A.profile, "updateProfileAction")],
    status: "implemented",
    note: "Free-text status is stored separately from the account state it used to overload.",
  },
  {
    method: "GET",
    path: "/profile/showProfile",
    original: "showProfile",
    targets: [t(A.session, "requireUser")],
    status: "changed",
    note: "The /profile Server Component reads the signed-in user directly.",
  },
  {
    method: "POST",
    path: "/profile/uploadUserImage",
    original: "uploadPhoto",
    targets: [t(A.profile, "setPortraitAction")],
    status: "implemented",
    note: "Size- and type-checked data URL instead of a file on the server's disk.",
  },
  {
    method: "GET",
    path: "/profile/displayImage",
    original: "displayImage",
    targets: [],
    status: "dropped",
    note: "Portraits are stored as small data URLs and rendered inline, so no image-serving endpoint is needed.",
  },
  // ----------------------------------------------------------------- /record
  {
    method: "POST",
    path: "/record/createRecord",
    original: "createRecord",
    targets: [t(A.records, "saveRecordAction")],
    status: "implemented",
    note: "Who, when, where (with map coordinates), notes and custom fields; contact must be the owner's.",
  },
  {
    method: "GET",
    path: "/record/showRecord",
    original: "showAllRecords",
    targets: [t(A.recordsSvc, "listRecords")],
    status: "changed",
    note: "Read inside /records, /map, /calendar and /home Server Components.",
  },
  {
    method: "GET",
    path: "/record/searchRecord",
    original: "searchRecord",
    targets: [t(A.search, "searchRecords")],
    status: "changed",
    note: "The original handler used an undefined expressValidator (it threw on every call) and the client never called it; the client-side record search is ported instead.",
  },
  {
    method: "POST",
    path: "/record/deleteOneRecord",
    original: "deleteOneRecord",
    targets: [t(A.records, "deleteRecordAction")],
    status: "implemented",
    note: "Owner-scoped: you can only delete your own meetings (the original deleted any id it was sent).",
  },
  {
    method: "POST",
    path: "/record/editRecord",
    original: "editRecord",
    targets: [t(A.records, "saveRecordAction")],
    status: "implemented",
    note: "Same action as create, with the record id.",
  },
  // ------------------------------------------------------------------- /user
  {
    method: "GET",
    path: "/user/jwtTest",
    original: "isAuth",
    targets: [t(A.session, "getCurrentUser")],
    status: "changed",
    note: "Signed httpOnly session cookie verified on every request (proxy.ts redirect + requireUser), not a JWT in localStorage.",
  },
  {
    method: "POST",
    path: "/user/login",
    original: "handleLogin",
    targets: [t(A.auth, "loginAction")],
    status: "implemented",
    note: "bcrypt cost 10 as before; case-insensitive user name.",
  },
  {
    method: "POST",
    path: "/user/signup",
    original: "emailCodeVerify + register",
    targets: [t(A.auth, "registerAction")],
    status: "implemented",
    note: "The e-mailed code is verified on the server (single use, 5 attempts).",
  },
  {
    method: "POST",
    path: "/user/sendEmailcode",
    original: "emailAuthSend",
    targets: [t(A.auth, "sendSignupCodeAction")],
    status: "changed",
    note: "The code goes to the on-screen demo inbox instead of Gmail SMTP (DR-002).",
  },
  {
    method: "POST",
    path: "/user/emailVerify",
    original: "emailCodeVerify",
    targets: [t(A.auth, "registerAction")],
    status: "changed",
    note: "No separate verify call: the code is checked when the account is created, so it cannot be verified once and reused.",
  },
  {
    method: "POST",
    path: "/user/fastRegisterPrepare",
    original: "emailFastRegister + emailRegisterCodeSend",
    targets: [t(A.contacts, "inviteContactAction")],
    status: "changed",
    note: "Invitation e-mail with the 10-digit link lands in the inviter's demo inbox (DR-002).",
  },
  {
    method: "POST",
    path: "/user/fastRegisterConfirm",
    original: "emailRegisterVerify + emailFastRegisterConfirm",
    targets: [t(A.auth, "confirmInviteAction")],
    status: "implemented",
    note: "Fixes the inverted check in the original verifier.",
  },
  {
    method: "POST",
    path: "/user/changePassword",
    original: "emailCodeVerify + updatePassword",
    targets: [t(A.profile, "sendChangePasswordCodeAction"), t(A.profile, "changePasswordAction")],
    status: "implemented",
    note: "Code from the demo inbox; the 'new password must differ' rule now actually works.",
  },
  {
    method: "POST",
    path: "/user/sendResetCode",
    original: "sendResetCode",
    targets: [t(A.auth, "sendResetCodeAction")],
    status: "changed",
    note: "The code is only shown in the demo inbox of a browser that has signed in to that account before.",
  },
  {
    method: "POST",
    path: "/user/codeValidation",
    original: "userCodeVerify",
    targets: [t(A.auth, "verifyResetCodeAction")],
    status: "changed",
    note: "A valid code issues a signed, 10-minute reset ticket (httpOnly cookie).",
  },
  {
    method: "POST",
    path: "/user/resetPassword",
    original: "resetPassword",
    targets: [t(A.auth, "resetPasswordAction")],
    status: "changed",
    note: 'Requires the reset ticket; the original accepted a constant codeVerified: "4399CRMVerified" from any client.',
  },
  {
    method: "POST",
    path: "/user/checkUserName",
    original: "checkUserDuplicate",
    targets: [t(A.auth, "checkUserNameAction")],
    status: "implemented",
    note: "Same messages, plus a user-name format rule.",
  },
];

export const NOT_API = [
  {
    path: "/api/*",
    note: "Served the generated JSDoc HTML pages - not part of the API; not ported.",
  },
  {
    path: "/test/*",
    note: "Served a generated test report - not ported (CI runs the tests instead).",
  },
];

export function paritySummary() {
  const count = (s: ParityStatus) => PARITY.filter((r) => r.status === s).length;
  return {
    total: PARITY.length,
    implemented: count("implemented"),
    changed: count("changed"),
    dropped: count("dropped"),
  };
}
