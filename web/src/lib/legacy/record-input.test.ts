import { describe, expect, it } from "vitest";
import { MISSING_INFO, QUERY_FAILED, normaliseRecordRequest } from "./record-input";

/**
 * Expectations taken from the original integration tests
 * (coursework/backend/__tests__/record_integration_test/createRecordTest.js and
 * editRecordTest.js), which posted these bodies to /record/createRecord and
 * /record/editRecord.
 */
const body = {
  contact_id: "618503c2ad6a53001643245e",
  location: "University of Melbourne",
  geoCoords: { lat: "122334545", lng: "52123456" },
  notes: "account",
  customField: [{ field: "testCustomField", value: "x" }],
};
const now = () => new Date("2021-10-20T00:00:00.000Z");

describe("normaliseRecordRequest (createRecord / editRecord)", () => {
  it("Test 2: a record without contact_id -> Miss Important Information Input", () => {
    expect(normaliseRecordRequest({ ...body, contact_id: undefined }, { editing: false })).toEqual({
      ok: false,
      error: MISSING_INFO,
    });
  });

  it("Test 3: without dateTime -> stored with a non-null time", () => {
    const r = normaliseRecordRequest(body, { editing: false, now });
    expect(r.ok && r.value.dateTime.toISOString()).toBe("2021-10-20T00:00:00.000Z");
    expect(r.ok && r.value.contactId).toBe("618503c2ad6a53001643245e");
    expect(r.ok && r.value.location).toBe("University of Melbourne");
    expect(r.ok && r.value.lat).toBe(122334545);
    expect(r.ok && r.value.lng).toBe(52123456);
    expect(r.ok && r.value.notes).toBe("account");
  });

  it("Test 4: with dateTime -> exactly that instant", () => {
    const r = normaliseRecordRequest(
      { ...body, dateTime: "2021-10-01T10:28:10.018Z" },
      { editing: false },
    );
    expect(r.ok && r.value.dateTime.toISOString()).toBe("2021-10-01T10:28:10.018Z");
  });

  it("Test 7: without geoCoords -> lat/lng null", () => {
    const r = normaliseRecordRequest({ ...body, geoCoords: null }, { editing: false });
    expect(r.ok && [r.value.lat, r.value.lng]).toEqual([null, null]);
  });

  it("Test 8: without location -> Miss Important Information Input", () => {
    expect(normaliseRecordRequest({ ...body, location: undefined }, { editing: false })).toEqual({
      ok: false,
      error: MISSING_INFO,
    });
  });

  it("editing requires _id", () => {
    expect(normaliseRecordRequest(body, { editing: true })).toEqual({
      ok: false,
      error: MISSING_INFO,
    });
    const r = normaliseRecordRequest(
      { ...body, _id: "61695204687a7c05e401666e" },
      { editing: true },
    );
    expect(r.ok && r.value.id).toBe("61695204687a7c05e401666e");
  });

  it("an empty location failed Mongoose's required validator -> Database query failed", () => {
    expect(normaliseRecordRequest({ ...body, location: "" }, { editing: false })).toEqual({
      ok: false,
      error: QUERY_FAILED,
    });
  });
});
