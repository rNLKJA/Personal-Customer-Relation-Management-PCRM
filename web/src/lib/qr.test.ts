import { describe, expect, it } from "vitest";
import { parseQrPayload, qrPayloadFor } from "./qr";

describe("QR payloads", () => {
  it("encodes a link that round-trips to the user name", () => {
    const link = qrPayloadFor("ava.chen", "https://example.vercel.app");
    expect(link).toBe("https://example.vercel.app/contacts/add?u=ava.chen");
    expect(parseQrPayload(link)).toBe("ava.chen");
  });
  it("accepts the original format (bare user name)", () => {
    expect(parseQrPayload("  TestDontDelete ")).toBe("TestDontDelete");
  });
  it("rejects foreign codes", () => {
    expect(parseQrPayload("https://example.com/somewhere?u=ava")).toBeNull();
    expect(parseQrPayload("WIFI:S:home;T:WPA;P:secret;;")).toBeNull();
    expect(parseQrPayload("")).toBeNull();
    expect(parseQrPayload("https://x.test/contacts/add?u=<script>")).toBeNull();
  });
});
