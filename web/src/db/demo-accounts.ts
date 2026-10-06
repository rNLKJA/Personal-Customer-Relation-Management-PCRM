/**
 * Public demo credentials. These accounts exist only in the seeded demo
 * database (web/data/seed.db) and are shown on the login page on purpose.
 * Password change / reset is disabled for them so the credentials keep working.
 */
export const DEMO_ACCOUNTS = {
  demo: {
    userName: "demo",
    password: "demo4399crm",
    label: "Demo user",
    description: "25 contacts and 40 meetings around Melbourne (shared with other visitors).",
  },
  admin: {
    userName: "admin",
    password: "admin4399crm",
    label: "Demo admin",
    description: "Can browse every table in /admin/records and export CSV.",
  },
} as const;

/** Registered (fictional) people you can add by user name or QR code. */
export const DIRECTORY_USERS = [
  {
    userName: "ava.chen",
    firstName: "Ava",
    lastName: "Chen",
    occupation: "UX researcher",
    emails: ["ava.chen@example.com"],
    phones: ["0491570006"],
    statusMessage: "Open to coffee chats",
  },
  {
    userName: "sam.patel",
    firstName: "Sam",
    lastName: "Patel",
    occupation: "Data scientist",
    emails: ["sam.patel@example.org"],
    phones: ["0491570156"],
    statusMessage: "Heads-down on a thesis",
  },
  {
    userName: "noah.williams",
    firstName: "Noah",
    lastName: "Williams",
    occupation: "Café owner",
    emails: ["noah@example.net"],
    phones: ["0491570157"],
    statusMessage: "Ask me about single origins",
  },
  {
    userName: "mia.rossi",
    firstName: "Mia",
    lastName: "Rossi",
    occupation: "Software engineer",
    emails: ["mia.rossi@example.com", "mia@example.org"],
    phones: ["0491570158"],
    statusMessage: "Building things on weekends",
  },
] as const;
