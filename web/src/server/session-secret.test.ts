import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT, jwtVerify } from "jose";

/**
 * Regression test: Next.js loads server modules into several bundles in one
 * process (pages / Server Actions vs Route Handlers). A per-module random
 * fallback secret made cookies signed in one bundle fail in the other, so
 * /api/geocode answered 401 and the CSV export 403 after a normal login.
 */

type SecretModule = typeof import("./session-secret");

async function freshInstance(): Promise<SecretModule> {
  vi.resetModules();
  return import("./session-secret");
}

async function sign(mod: SecretModule) {
  return new SignJWT({ role: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("usr_demo")
    .setExpirationTime("1h")
    .sign(mod.sessionKey());
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("session secret", () => {
  it("lets a token signed by one module instance verify in another (no SESSION_SECRET, next start)", async () => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "production");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const a = await freshInstance();
    const b = await freshInstance();
    expect(a).not.toBe(b);
    const token = await sign(a);
    const { payload } = await jwtVerify(token, b.sessionKey(), { algorithms: ["HS256"] });
    expect(payload.sub).toBe("usr_demo");
    expect(warn).toHaveBeenCalledTimes(1); // warned once per process, not per bundle
    warn.mockRestore();
  });

  it("uses SESSION_SECRET when it is long enough, in every instance", async () => {
    vi.stubEnv("SESSION_SECRET", "s".repeat(40));
    const a = await freshInstance();
    const b = await freshInstance();
    expect(a.resolveSessionSecret()).toBe("s".repeat(40));
    const token = await sign(a);
    await expect(jwtVerify(token, b.sessionKey())).resolves.toBeTruthy();
  });

  it("rejects tokens signed with a different secret", async () => {
    vi.stubEnv("SESSION_SECRET", "x".repeat(40));
    const token = await sign(await freshInstance());
    vi.stubEnv("SESSION_SECRET", "y".repeat(40));
    await expect(jwtVerify(token, (await freshInstance()).sessionKey())).rejects.toThrow();
  });

  it("fails loudly on Vercel when SESSION_SECRET is missing or too short", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("SESSION_SECRET", "too-short");
    const mod = await freshInstance();
    expect(() => mod.sessionKey()).toThrow(mod.MissingSessionSecretError);
  });
});
