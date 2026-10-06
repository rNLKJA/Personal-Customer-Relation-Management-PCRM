import { randomBytes } from "node:crypto";

/** 16-char URL-safe random id (Mongo ObjectIds were 24 hex chars). */
export function newId(): string {
  return randomBytes(12).toString("base64url");
}

/** Cryptographically secure replacement for `Math.random` in code generation. */
export function secureRandom(): number {
  return randomBytes(4).readUInt32BE(0) / 2 ** 32;
}
