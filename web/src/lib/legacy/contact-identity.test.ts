import { describe, expect, it } from "vitest";
import { sameIdentity, sameLinkIdentity, syncUpdates } from "./contact-identity";

describe("syncUpdates (synchronizationContactInfo)", () => {
  // Fixture and expected update from
  // coursework/backend/__tests__/contact_controller_tests/synchronizationContactInfo_unit.js
  it("only copies the changed last name, like the original unit test", () => {
    const contact = {
      email: [],
      phone: [],
      lastName: "test",
      firstName: "test",
      occupation: "test",
    };
    const account = {
      email: [],
      phone: [],
      lastName: "Zizizi",
      firstName: "test",
      occupation: "test",
    };
    const update = syncUpdates(
      {
        firstName: contact.firstName,
        lastName: contact.lastName,
        phones: contact.phone,
        emails: contact.email,
        occupation: contact.occupation,
        portrait: null,
      },
      {
        firstName: account.firstName,
        lastName: account.lastName,
        phones: account.phone,
        emails: account.email,
        occupation: account.occupation,
        portrait: null,
      },
    );
    expect(update).toEqual({ lastName: "Zizizi" });
  });

  it("replaces phone / e-mail lists when they differ in content or order", () => {
    const update = syncUpdates(
      {
        firstName: "Mia",
        lastName: "Rossi",
        phones: [],
        emails: ["mia@example.org", "mia.rossi@example.com"],
        occupation: "Student",
        portrait: null,
      },
      {
        firstName: "Mia",
        lastName: "Rossi",
        phones: ["0491570158"],
        emails: ["mia.rossi@example.com", "mia@example.org"],
        occupation: "Software engineer",
        portrait: null,
      },
    );
    expect(update).toEqual({
      phones: ["0491570158"],
      emails: ["mia.rossi@example.com", "mia@example.org"],
      occupation: "Software engineer",
    });
  });

  it("ignores empty account values (the original checked truthiness)", () => {
    const update = syncUpdates(
      {
        firstName: "A",
        lastName: "B",
        phones: ["1"],
        emails: ["a@example.com"],
        occupation: "Chef",
        portrait: null,
      },
      {
        firstName: null,
        lastName: "",
        phones: ["1"],
        emails: ["a@example.com"],
        occupation: null,
        portrait: null,
      },
    );
    expect(update).toEqual({});
  });
});

describe("identity rules (duplicate contact / existing account)", () => {
  const a = {
    firstName: "Ava",
    lastName: "Chen",
    phones: ["0491570006"],
    emails: ["ava.chen@example.com"],
  };
  it("requires names and ordered phone/e-mail lists to match exactly", () => {
    expect(sameIdentity(a, { ...a })).toBe(true);
    expect(sameIdentity(a, { ...a, phones: [] })).toBe(false);
    expect(sameIdentity(a, { ...a, firstName: "ava" })).toBe(false);
    expect(sameIdentity({ ...a, emails: ["x", "y"] }, { ...a, emails: ["y", "x"] })).toBe(false);
  });
  it("linkToAccount also compares occupation", () => {
    expect(sameLinkIdentity({ ...a, occupation: "UX" }, { ...a, occupation: "UX" })).toBe(true);
    expect(sameLinkIdentity({ ...a, occupation: "UX" }, { ...a, occupation: "PM" })).toBe(false);
  });
});
