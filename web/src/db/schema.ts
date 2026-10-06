import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * SQLite port of the original Mongoose models (coursework/backend/models):
 *
 *   User         -> users            (+ contactList -> contact_links)
 *   Contact      -> contacts
 *   ContactList  -> contact_links    (the user's contactList sub-documents)
 *   Record       -> records          (User.recordList is records.owner_id)
 *   EmailAuth    -> email_codes
 *   EmailRegister/FastRegister -> fast_register_codes
 *   (new)        -> email_outbox     (the "Demo inbox" that replaces Gmail SMTP)
 *   (new)        -> activity_log     (append-only access / change log per user)
 *   (new)        -> ai_audit_log     (every bring-your-own-key AI call and the human decision)
 *
 * Mongo arrays (email, phone, customField) are stored as JSON text columns so
 * they keep their order and equality semantics. Portraits were Buffers +
 * contentType; they are now optional, size-limited data URLs.
 */

export type CustomField = { field: string; value: string };

/** An AI meeting summary a person accepted (or edited) - see ai_audit_log. */
export interface AcceptedAiSummary {
  summary: string;
  followUps: { action: string; due: string | null }[];
  auditId: string;
  provider: "anthropic" | "openai";
  model: string;
  decision: "accepted" | "edited";
  decidedAt: number;
}

export const ACTIVITY_ACTIONS = [
  "view",
  "create",
  "update",
  "delete",
  "export",
  "ai-call",
  "ai-decision",
  "account-delete",
  "sign-in",
  "sign-out",
  "password-reset",
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];
export const ACTIVITY_ENTITIES = ["contact", "meeting", "account", "data", "ai", "admin"] as const;
export type ActivityEntity = (typeof ACTIVITY_ENTITIES)[number];

export const AI_DECISION_VALUES = [
  "pending",
  "accepted",
  "edited",
  "rejected",
  "not_applicable",
] as const;

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    userName: text("user_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    occupation: text("occupation"),
    emails: text("emails", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    phones: text("phones", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    portrait: text("portrait"),
    /**
     * The original `User.status` string was overloaded: the profile editor wrote
     * free text into it (e.g. "Single"), while fast-register used it as a
     * pending/active flag. The port splits it into `statusMessage` (profile) and
     * `status` (account state).
     */
    statusMessage: text("status_message"),
    /** Account state: fast-register (invited) accounts stay `pending` until confirmed. */
    status: text("status", { enum: ["active", "pending"] })
      .notNull()
      .default("active"),
    role: text("role", { enum: ["user", "admin"] })
      .notNull()
      .default("user"),
    /** Seeded demo/guest accounts: password reset and change are disabled. */
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    /** Guest sandboxes and pending invitees are purged after this instant. */
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_user_name_unique").on(sql`lower(${t.userName})`)],
);

export const contacts = sqliteTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    linkedUserId: text("linked_user_id").references(() => users.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    occupation: text("occupation").notNull(),
    emails: text("emails", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    phones: text("phones", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    note: text("note").notNull().default(""),
    /** Original boolean `status` (true for manual / by-username contacts). */
    status: integer("status", { mode: "boolean" }).notNull().default(true),
    customFields: text("custom_fields", { mode: "json" })
      .$type<CustomField[]>()
      .notNull()
      .default(sql`'[]'`),
    portrait: text("portrait"),
    addDate: integer("add_date", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("contacts_owner_idx").on(t.ownerId),
    index("contacts_linked_idx").on(t.linkedUserId),
  ],
);

export const contactLinks = sqliteTable(
  "contact_links",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    addSince: integer("add_since", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex("contact_links_user_contact_unique").on(t.userId, t.contactId)],
);

export const records = sqliteTable(
  "records",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** `meetingPerson` in the original schema. */
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    linkedUserId: text("linked_user_id").references(() => users.id, { onDelete: "set null" }),
    dateTime: integer("date_time", { mode: "timestamp_ms" }).notNull(),
    location: text("location").notNull(),
    notes: text("notes").notNull().default(""),
    lat: real("lat"),
    lng: real("lng"),
    customFields: text("custom_fields", { mode: "json" })
      .$type<CustomField[]>()
      .notNull()
      .default(sql`'[]'`),
    /** Accepted (or edited) AI summary; null unless a person kept one. */
    aiSummary: text("ai_summary", { mode: "json" }).$type<AcceptedAiSummary>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("records_owner_idx").on(t.ownerId),
    index("records_contact_idx").on(t.contactId),
    index("records_date_idx").on(t.dateTime),
  ],
);

export const emailCodes = sqliteTable(
  "email_codes",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    authCode: text("auth_code").notNull(),
    purpose: text("purpose", { enum: ["signup", "reset", "change-password"] }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    createdAt: createdAt(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("email_codes_email_idx").on(t.email)],
);

export const fastRegisterCodes = sqliteTable("fast_register_codes", {
  id: text("id").primaryKey(),
  registerAccountId: text("register_account_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fastRegisterCode: text("fast_register_code").notNull(),
  invitedByUserId: text("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
  contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export const emailOutbox = sqliteTable(
  "email_outbox",
  {
    id: text("id").primaryKey(),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    kind: text("kind", {
      enum: ["verification", "password-reset", "change-password", "fast-register"],
    }).notNull(),
    html: text("html").notNull(),
    /** Structured copies of the important bits, for a friendly inbox UI. */
    code: text("code"),
    actionPath: text("action_path"),
    recipientUserId: text("recipient_user_id").references(() => users.id, { onDelete: "cascade" }),
    triggeredByUserId: text("triggered_by_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    /** Random per-browser id so pre-login flows can read their own codes. */
    browserKey: text("browser_key"),
    createdAt: createdAt(),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("email_outbox_to_idx").on(t.toEmail),
    index("email_outbox_browser_idx").on(t.browserKey),
  ],
);

/**
 * Append-only activity log: who viewed, created, changed, deleted or exported
 * what, and every AI action. Rows are never updated; they are deleted only by
 * the retention rule (ACTIVITY_RETENTION_DAYS) or with the account. `detail`
 * holds field names and counts, never the values themselves.
 */
export const activityLog = sqliteTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    /** null only for the anonymous tombstone written when an account is deleted. */
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    action: text("action", { enum: ACTIVITY_ACTIONS }).notNull(),
    entityType: text("entity_type", { enum: ACTIVITY_ENTITIES }).notNull(),
    entityId: text("entity_id"),
    detail: text("detail", { mode: "json" })
      .$type<Record<string, string | number | boolean | string[] | null>>()
      .notNull()
      .default(sql`'{}'`),
    createdAt: createdAt(),
  },
  (t) => [index("activity_log_user_idx").on(t.userId, t.createdAt)],
);

/**
 * One row per AI provider call made with a visitor's own key. The browser
 * posts the entry WITHOUT the key (zod-validated, secret tripwire). `decision`
 * starts as "pending" for assistant drafts and is set exactly once to
 * accepted / edited / rejected; evaluation runs are "not_applicable".
 */
export const aiAuditLog = sqliteTable(
  "ai_audit_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feature: text("feature").notNull(),
    provider: text("provider", { enum: ["anthropic", "openai"] }).notNull(),
    model: text("model").notNull(),
    servedModel: text("served_model"),
    promptVersion: text("prompt_version").notNull(),
    /** The meeting the note came from (no FK: the audit entry outlives it). */
    recordId: text("record_id"),
    /** Exactly what was sent to the provider (after redaction). */
    input: text("input").notNull(),
    redactionCounts: text("redaction_counts", { mode: "json" })
      .$type<Record<string, number>>()
      .notNull(),
    output: text("output"),
    error: text("error"),
    latencyMs: integer("latency_ms").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    decision: text("decision", { enum: AI_DECISION_VALUES }).notNull(),
    finalOutput: text("final_output"),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("ai_audit_log_user_idx").on(t.userId, t.createdAt)],
);

export const usersRelations = relations(users, ({ many }) => ({
  contacts: many(contacts, { relationName: "owner" }),
  contactLinks: many(contactLinks),
  records: many(records, { relationName: "recordOwner" }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  owner: one(users, { fields: [contacts.ownerId], references: [users.id], relationName: "owner" }),
  linkedUser: one(users, { fields: [contacts.linkedUserId], references: [users.id] }),
  records: many(records),
}));

export const contactLinksRelations = relations(contactLinks, ({ one }) => ({
  user: one(users, { fields: [contactLinks.userId], references: [users.id] }),
  contact: one(contacts, { fields: [contactLinks.contactId], references: [contacts.id] }),
}));

export const recordsRelations = relations(records, ({ one }) => ({
  owner: one(users, {
    fields: [records.ownerId],
    references: [users.id],
    relationName: "recordOwner",
  }),
  meetingPerson: one(contacts, { fields: [records.contactId], references: [contacts.id] }),
}));

export type User = typeof users.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type ContactLink = typeof contactLinks.$inferSelect;
export type MeetingRecord = typeof records.$inferSelect;
export type EmailCode = typeof emailCodes.$inferSelect;
export type FastRegisterCode = typeof fastRegisterCodes.$inferSelect;
export type OutboxEmail = typeof emailOutbox.$inferSelect;
export type ActivityEntry = typeof activityLog.$inferSelect;
export type AiAuditEntry = typeof aiAuditLog.$inferSelect;

export const TABLES = {
  users,
  contacts,
  contact_links: contactLinks,
  records,
  email_codes: emailCodes,
  fast_register_codes: fastRegisterCodes,
  email_outbox: emailOutbox,
  activity_log: activityLog,
  ai_audit_log: aiAuditLog,
} as const;
export type TableName = keyof typeof TABLES;
