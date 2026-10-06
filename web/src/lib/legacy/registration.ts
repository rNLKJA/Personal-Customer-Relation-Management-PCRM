import { PASSWORD_HINT, PASSWORD_PATTERN } from "./validation";

/**
 * Registration / password rules ported from the 2021 code:
 *
 * - `passwordValidation(password, password1)` in `fastRegister.jsx` (the same
 *   checks were inlined in `Registration.js`, `Reset.js`, `UpdatePassword.js`);
 * - the server-side messages of `register`, `emailFastRegisterConfirm` and
 *   `resetPassword` in `controller/userController.js`.
 */

export const MESSAGES = {
  passwordsDiffer: "The passwords is different from you typed before",
  userNameUsed: "userName has been used for someone else",
  passwordsNotSame: "Error, two passwords need to be the same",
  passwordTooShort: "The minimum length of password is 8",
  samePassword: "You new password is the same as the old one X_X Reset Fail",
  fastRegisterActive: "your account is active now!",
  fastRegisterAuthFail: "auth fail!",
  resetUnknownUser: "User doesn't exist",
  wrongCode: "Wrong Code, please try again",
} as const;

/** Client-side check, in the original order: pattern, equality, length. */
export function passwordValidation(password: string, password1: string): string | null {
  if (!PASSWORD_PATTERN.test(password)) return PASSWORD_HINT;
  if (password1 !== password) return MESSAGES.passwordsNotSame;
  if (password.length < 8) return MESSAGES.passwordTooShort;
  return null;
}
