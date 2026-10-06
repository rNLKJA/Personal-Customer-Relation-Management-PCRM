/**
 * Port of `autoCodeGenerator(length)` from `config/emailAuth.js`: a string of
 * `length` random decimal digits. The original drew from `Math.random()`; the
 * revival injects a cryptographically secure source on the server (the
 * algorithm - one `parseInt(random * 10)` digit per position - is unchanged).
 */
export function autoCodeGenerator(length: number, random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += Math.floor(random() * 10);
  }
  return code;
}

/** E-mail verification / reset codes were 6 digits and valid for 5 minutes. */
export const EMAIL_CODE_LENGTH = 6;
export const EMAIL_CODE_TTL_MS = 1000 * 60 * 5;

/** Fast-register (invite) codes were 10 digits and valid for 15 minutes. */
export const FAST_REGISTER_CODE_LENGTH = 10;
export const FAST_REGISTER_CODE_TTL_MS = 1000 * 60 * 15;

/** The temporary (pending) invitee account was deleted after 16 minutes. */
export const PENDING_ACCOUNT_TTL_MS = 1000 * 60 * 16;
