import { afterEach, describe, expect, it, vi } from "vitest";
import { loadOriginal, withTimeZone } from "@/test/original";
import { convert } from "./convert";
import { listCompare } from "./contact-identity";
import { autoCodeGenerator } from "./codes";
import { passwordValidation } from "./registration";
import { dataValidator, type ValidatorType } from "./validation";
import { searchContacts, searchRecords, sortContacts, type ContactSearchOption, type RecordSearchOption } from "./search";
import { mulberry32 } from "../random";

/**
 * Parity tests: the ORIGINAL 2021 functions are loaded from coursework/ and run
 * next to the TypeScript ports on the same inputs.
 */

const MEL = "Australia/Melbourne";
const RECORD_JS = "frontend/src/API/record/Record.js";
const CONTACT_JS = "frontend/src/API/contact/Contact.js";

afterEach(() => vi.restoreAllMocks());

describe("convert() - Record.js", () => {
  const original = loadOriginal<(s: string | number | Date) => string>(RECORD_JS, "convert");
  const instants = [
    "2021-11-05T18:19:00.000Z", // recordDetail.test.js fixture
    "2021-10-01T10:28:10.018Z", // createRecordTest.js fixture
    "2021-11-03T04:13:59.620Z",
    "2021-04-03T15:59:00.000Z", // AEDT -> AEST change night
    "2021-10-02T16:30:00.000Z", // AEST -> AEDT change night
    "2026-01-01T13:00:00.000Z", // local midnight
    "2026-06-30T02:00:00.000Z", // local noon
    "2026-12-31T22:05:00.000Z", // single-digit hour
  ];

  it("matches the original in the browser's (Melbourne) time zone", () => {
    for (const iso of instants) {
      const expected = withTimeZone(MEL, () => original(iso));
      expect(convert(iso, MEL)).toBe(expected);
    }
  });

  it("matches the original when using local time (no zone given)", () => {
    for (const tz of ["UTC", "Asia/Shanghai", "America/New_York"]) {
      for (const iso of instants) {
        expect(withTimeZone(tz, () => convert(iso))).toBe(withTimeZone(tz, () => original(iso)));
      }
    }
  });

  it("formats the recordDetail.test.js fixture as the team saw it", () => {
    expect(convert("2021-11-05T18:19:00.000Z", MEL)).toBe("2021-11-06 05:19 am");
    expect(convert("2026-06-30T02:00:00.000Z", MEL)).toBe("2026-06-30 12:00 pm");
    expect(convert("2026-01-01T13:00:00.000Z", MEL)).toBe("2026-01-02 12:00 am");
  });
});

describe("listCompare() - contactController.js", () => {
  const original = loadOriginal<(a: unknown[], b: unknown[]) => number>(
    "backend/controller/contactController.js",
    "listCompare",
  );
  const cases: [string[], string[]][] = [
    [[], []],
    [["a"], ["a"]],
    [["a", "b"], ["b", "a"]],
    [["0491570006"], ["0491570006", "0491570156"]],
    [["x@example.com", "y@example.com"], ["x@example.com", "y@example.com"]],
    [["x"], ["X"]],
  ];
  it.each(cases)("%j vs %j", (a, b) => {
    expect(listCompare(a, b)).toBe(original(a, b));
  });
});

describe("autoCodeGenerator() - config/emailAuth.js", () => {
  it("produces the same digits from the same random stream", () => {
    const original = loadOriginal<(n: number) => string>("backend/config/emailAuth.js", "autoCodeGenerator");
    for (const length of [6, 10]) {
      const a = mulberry32(42 + length);
      const b = mulberry32(42 + length);
      vi.spyOn(Math, "random").mockImplementation(() => a());
      const expected = original(length);
      vi.restoreAllMocks();
      expect(autoCodeGenerator(length, b)).toBe(expected);
      expect(expected).toMatch(new RegExp(`^\\d{${length}}$`));
    }
  });
});

describe("passwordValidation() - fastRegister.jsx", () => {
  const alerts: string[] = [];
  const original = loadOriginal<(p: string, p1: string) => void>(
    "frontend/src/API/fastRegister/fastRegister.jsx",
    "passwordValidation",
    { alert: (msg: string) => void alerts.push(msg) },
  );
  const cases: [string, string][] = [
    ["abc", "abc"],
    ["password", "password"],
    ["12345678", "12345678"],
    ["passw0rd", "passw0rd"],
    ["passw0rd", "passw0rd!"],
    ["p4ss", "p4ss"],
    ["Correct-Horse-9", "Correct-Horse-9"],
    ["中文密码123abc", "中文密码123abc"],
  ];
  it.each(cases)("%s / %s", (p, p1) => {
    alerts.length = 0;
    original(p, p1);
    expect(passwordValidation(p, p1)).toBe(alerts[0] ?? null);
  });
});

describe("dataValidator() - manual-input.js", () => {
  const cases: [unknown, ValidatorType][] = [
    ["", "firstName"],
    ["Ava", "firstName"],
    ["", "lastName"],
    ["", "occupation"],
    [[], "phone"],
    [["   "], "phone"],
    [["0491570006"], "phone"],
    [["abc"], "phone"],
    [[], "email"],
    [[" "], "email"],
    [["not-an-email"], "email"],
    [["ava@example.com"], "email"],
    [[{ field: "", value: "x" }], "field"],
    [[{ field: "Birthday", value: "" }], "field"],
    [[{ field: "Birthday", value: "14 March" }], "field"],
  ];
  it.each(cases)("%j as %s", (items, type) => {
    let error: string | null = null;
    const original = loadOriginal<(i: unknown, t: string, sv: (v: boolean) => void, v: boolean, se: (e: string) => void) => void>(
      "frontend/src/API/contact/manual-input.js",
      "dataValidator",
      { console: { log: () => {} } },
    );
    original(items, type, () => {}, true, (e) => (error = e));
    expect(dataValidator(items as never, type)).toBe(error);
  });
});

// --- client-side search ------------------------------------------------------

const contacts = [
  { firstName: "Ava", lastName: "Chen", occupation: "UX researcher", note: "Met at the IT Project expo", addDate: "2021-10-21T02:30:00.000Z" },
  { firstName: "Bin", lastName: "Liang", occupation: "Back-end lead", note: "Knows MongoDB", addDate: "2021-09-02T09:05:00.000Z" },
  { firstName: "Wei", lastName: "Zhao", occupation: "Front-end lead", note: "", addDate: "2021-11-03T04:13:59.620Z" },
  { firstName: "avery", lastName: "Brooks", occupation: "Designer", note: "Coffee on Lygon St", addDate: "2021-08-15T23:45:00.000Z" },
];

describe("searchContacts() - People in Contact.js", () => {
  const options: [ContactSearchOption, string | null][] = [
    ["all", null],
    ["firstName", "firstName"],
    ["lastName", "lastName"],
    ["occupation", "occupation"],
    ["notes", "notes"],
    ["addDate", "addDate"],
  ];
  const keys = ["av", "LEAD", "2021-10", "pm", "mongo", "zzz", ""];

  it("returns the same contacts as the original for every option and key", () => {
    withTimeZone(MEL, () => {
      const originalConvert = loadOriginal<(s: string) => string>(CONTACT_JS, "convert");
      for (const [port, legacy] of options) {
        for (const key of keys) {
          const prop = { contacts: contacts.map((c) => ({ contact: c })), options: legacy, search_key: key };
          const run = loadOriginal<() => { contact: (typeof contacts)[number] }[]>(CONTACT_JS, "searchContacts", {
            prop,
            convert: originalConvert,
          });
          const expected = run().map((x) => x.contact.firstName);
          expect(searchContacts(contacts, key, port, MEL).map((c) => c.firstName), `${port}/${key}`).toEqual(expected);
        }
      }
    });
  });
});

describe("sortContact() - Contact.js", () => {
  it("orders text fields like the original", () => {
    const original = loadOriginal<(c: unknown[], set: unknown, type: string) => void>(CONTACT_JS, "sortContact", {
      convert: () => "",
      console: { log: () => {} },
    });
    for (const type of ["firstName", "lastName", "occupation", "notes"] as const) {
      const legacy = contacts.map((c) => ({ contact: c }));
      original(legacy, null, type);
      expect(sortContacts(contacts, type).map((c) => c.firstName)).toEqual(legacy.map((x) => x.contact.firstName));
    }
  });
});

describe("searchRecords() - RecordList in Record.js", () => {
  const records = [
    { meetingPerson: { firstName: "W", lastName: "Z" }, location: "The University of Melbourne", notes: "This is a note", dateTime: "2021-11-05T18:19:00.000Z" },
    { meetingPerson: { firstName: "Ava", lastName: "Chen" }, location: "State Library Victoria, 328 Swanston Street, Melbourne VIC 3000", notes: "Talked UX", dateTime: "2021-10-01T10:28:10.018Z" },
    { meetingPerson: { firstName: "Bin", lastName: "Liang" }, location: "Carlton Gardens", notes: "Sprint review", dateTime: "2021-10-14T01:00:00.000Z" },
  ];
  const options: [RecordSearchOption, string | null][] = [
    ["all", null],
    ["firstName", "firstName"],
    ["lastName", "lastName"],
    ["location", "location"],
    ["notes", "notes"],
    ["time", "time"],
  ];
  const keys = ["melbourne", "a", "2021-11-06", "05:19 am", "review", "nope"];

  it("returns the same meetings as the original for every option and key", () => {
    withTimeZone(MEL, () => {
      const originalConvert = loadOriginal<(s: string) => string>(RECORD_JS, "convert");
      for (const [port, legacy] of options) {
        for (const key of keys) {
          const prop = { records, options: legacy, search_key: key };
          const run = loadOriginal<() => typeof records>(RECORD_JS, "searchRecords", { prop, convert: originalConvert });
          expect(searchRecords(records, key, port, MEL), `${port}/${key}`).toEqual(run());
        }
      }
    });
  });
});
