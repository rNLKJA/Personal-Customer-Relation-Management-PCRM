import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import { avatarHue, initialsOf, isAllowedPortrait } from "./avatar";
import { generateSampleData, FICTIONAL_MOBILES } from "./sample-data";
import { mulberry32 } from "./random";
import { PLACES } from "./places";
import { contactInputSchema, recordInputSchema } from "./schemas";
import { EMAIL_CODE_LENGTH, EMAIL_CODE_TTL_MS, FAST_REGISTER_CODE_LENGTH, FAST_REGISTER_CODE_TTL_MS, PENDING_ACCOUNT_TTL_MS } from "./legacy/codes";
import { escapeHtml, verificationEmailHtml } from "./email-templates";

describe("CSV export", () => {
  it("quotes, escapes and neutralises formulas", () => {
    expect(toCsv(["a", "b"], [{ a: 'He said "hi"', b: "=SUM(A1)" }, { a: ["x", "y"], b: null }])).toBe(
      'a,b\r\n"He said ""hi""",\'=SUM(A1)\r\n"[""x"",""y""]",\r\n',
    );
  });
});

describe("avatars", () => {
  it("derives initials and stable hues", () => {
    expect(initialsOf("Ava", "Chen")).toBe("AC");
    expect(initialsOf("Sunchuangyu (Rin) Huang")).toBe("SH");
    expect(initialsOf()).toBe("?");
    expect(avatarHue("dir_avachen")).toBe(avatarHue("dir_avachen"));
  });
  it("only accepts small image data URLs", () => {
    expect(isAllowedPortrait("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isAllowedPortrait("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(isAllowedPortrait("data:image/png;base64," + "A".repeat(300_000))).toBe(false);
  });
});

describe("synthetic seed data", () => {
  const make = () =>
    generateSampleData({
      rng: mulberry32(4399),
      anchor: new Date("2026-10-05T00:00:00Z"),
      places: PLACES,
      linkable: [{ userName: "ava.chen", firstName: "Ava", lastName: "Chen", occupation: "UX researcher", emails: ["ava.chen@example.com"], phones: ["0491570006"] }],
    });
  it("is deterministic and sized like the brief (25 contacts, 40 meetings)", () => {
    const a = make();
    const b = make();
    expect(a).toEqual(b);
    expect(a.contacts).toHaveLength(25);
    expect(a.records).toHaveLength(40);
  });
  it("uses only fictional phone numbers and example.* e-mail domains", () => {
    const { contacts } = make();
    for (const c of contacts) {
      for (const p of c.phones) expect(FICTIONAL_MOBILES).toContain(p);
      for (const e of c.emails) expect(e).toMatch(/@example\.(com|org|net)$/);
    }
  });
});

describe("zod schemas", () => {
  it("validates contacts with the original messages", () => {
    const base = { firstName: "Ava", lastName: "Chen", occupation: "UX", phones: ["0491570006"], emails: ["ava@example.com"] };
    expect(contactInputSchema.safeParse(base).success).toBe(true);
    const noPhone = contactInputSchema.safeParse({ ...base, phones: ["  "] });
    expect(noPhone.success || noPhone.error.issues[0].message).toBe("You must provide at least one phone number!");
    const badEmail = contactInputSchema.safeParse({ ...base, emails: ["nope"] });
    expect(badEmail.success || badEmail.error.issues[0].message).toBe("Invalid email format");
  });
  it("rejects impossible coordinates in the revived API", () => {
    const r = recordInputSchema.safeParse({ contactId: "c", location: "UniMelb", dateTime: "2021-10-01T10:28", lat: 122334545, lng: 52123456 });
    expect(r.success).toBe(false);
  });
});

describe("e-mail codes", () => {
  it("keeps the original lengths and lifetimes", () => {
    expect([EMAIL_CODE_LENGTH, EMAIL_CODE_TTL_MS]).toEqual([6, 300_000]);
    expect([FAST_REGISTER_CODE_LENGTH, FAST_REGISTER_CODE_TTL_MS, PENDING_ACCOUNT_TTL_MS]).toEqual([10, 900_000, 960_000]);
  });
  it("renders the team's verification e-mail safely", () => {
    expect(verificationEmailHtml("123456")).toContain("123456");
    expect(verificationEmailHtml("123456")).toContain("5 minutes");
    expect(escapeHtml(`<a href="x">'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&lt;/a&gt;");
  });
});
