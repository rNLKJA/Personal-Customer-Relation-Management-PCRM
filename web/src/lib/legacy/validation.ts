/**
 * Validation rules ported from the 2021 front-end.
 *
 * - Password rule: `Registration.js`, `Reset.js`, `UpdatePassword.js` and
 *   `fastRegister.jsx` all used the same regular expression.
 * - `dataValidator` was copied into `manual-input.js`, `SelectedContact.jsx`,
 *   `Person1.js` and `AddRecord.js`. The original reported errors through React
 *   state; the port returns the first error message (same wording) or `null`.
 */

export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z'";\-^%$#@!+=_<>,\\.:~`\d]{8,}$/;
export const PASSWORD_HINT =
  "Password need to contain at lest one digit or character, please try again.";

export const EMAIL_PATTERN = /^([A-Za-z0-9_\-.])+@([A-Za-z0-9_\-.])+\.([A-Za-z]{2,4})$/;
export const PHONE_PATTERN = /\d{10}/;
const NOT_EMPTY = /\S/;

export function isValidPassword(password: string): boolean {
  return PASSWORD_PATTERN.test(password);
}

export interface CustomField {
  field: string;
  value: string;
}

export type ValidatorType =
  | "firstName"
  | "lastName"
  | "occupation"
  | "phone"
  | "email"
  | "field";

/**
 * Faithful port of `dataValidator(items, type, ...)`. Note the original phone
 * and e-mail checks only fail when an entry matches *neither* the format
 * pattern nor `/\S/`, i.e. when it is blank. That permissive behaviour is kept.
 */
export function dataValidator(
  items: string | readonly string[] | readonly CustomField[],
  type: ValidatorType,
): string | null {
  switch (type) {
    case "firstName":
    case "lastName":
    case "occupation":
      if ((items as string).length === 0) {
        return `Invalid ${type} input, input cannot be empty`;
      }
      return null;
    case "phone": {
      const list = items as readonly string[];
      if (list.length < 1) return "You must provide at least one phone number!";
      for (const value of list) {
        if (!PHONE_PATTERN.test(value) && !NOT_EMPTY.test(value)) {
          return "Invalid phone format";
        }
      }
      return null;
    }
    case "email": {
      const list = items as readonly string[];
      if (list.length < 1) return "You must have at least one email!";
      for (const value of list) {
        if (!EMAIL_PATTERN.test(value) && !NOT_EMPTY.test(value)) {
          return "Invalid email format";
        }
      }
      return null;
    }
    case "field": {
      for (const f of items as readonly CustomField[]) {
        if (f.field === "") return "Field name cannot be empty";
        if (f.value === "") return "Field value cannot be empty";
      }
      return null;
    }
    default:
      return "Invalid Input";
  }
}

export interface ContactFormValues {
  firstName: string;
  lastName: string;
  occupation: string;
  phones: string[];
  emails: string[];
  customFields: CustomField[];
}

/** The order the original forms ran the validators in. */
export function validateContactForm(v: ContactFormValues): string | null {
  return (
    dataValidator(v.phones, "phone") ??
    dataValidator(v.emails, "email") ??
    dataValidator(v.firstName, "firstName") ??
    dataValidator(v.lastName, "lastName") ??
    dataValidator(v.occupation, "occupation") ??
    dataValidator(v.customFields, "field")
  );
}

/** Messages of `checkUserDuplicate` in `userController.js`. */
export const USERNAME_MESSAGES = {
  empty: "userName is empty",
  taken: "userName has been taken by someone else",
  available: "userName is able to use",
} as const;

/** Added in the revival: user names appear in URLs and QR codes. */
export const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/;
