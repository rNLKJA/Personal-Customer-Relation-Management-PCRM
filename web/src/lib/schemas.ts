import { z } from "zod";
import { isAllowedPortrait } from "./avatar";
import {
  EMAIL_PATTERN,
  PASSWORD_HINT,
  PASSWORD_PATTERN,
  USERNAME_PATTERN,
} from "./legacy/validation";

/** zod schemas shared by forms (client) and Server Actions (server). */

const trimmed = (max: number) => z.string().trim().max(max);

export const customFieldSchema = z.object({
  field: trimmed(40).min(1, "Field name cannot be empty"),
  value: trimmed(200).min(1, "Field value cannot be empty"),
});

export const portraitSchema = z
  .string()
  .refine(isAllowedPortrait, "Images must be PNG, JPEG or WebP and at most 180 KB")
  .nullable()
  .optional();

const phoneList = z
  .array(trimmed(32))
  .transform((l) => l.filter(Boolean))
  .pipe(z.array(z.string()).max(6, "At most 6 phone numbers"));

const emailList = z
  .array(trimmed(120))
  .transform((l) => l.filter(Boolean))
  .pipe(
    z
      .array(z.string().regex(EMAIL_PATTERN, "Invalid email format"))
      .max(6, "At most 6 e-mail addresses"),
  );

export const contactInputSchema = z.object({
  firstName: trimmed(60).min(1, "Invalid firstName input, input cannot be empty"),
  lastName: trimmed(60).min(1, "Invalid lastName input, input cannot be empty"),
  occupation: trimmed(80).min(1, "Invalid occupation input, input cannot be empty"),
  phones: phoneList.pipe(z.array(z.string()).min(1, "You must provide at least one phone number!")),
  emails: emailList.pipe(z.array(z.string()).min(1, "You must have at least one email!")),
  note: trimmed(1000).default(""),
  customFields: z.array(customFieldSchema).max(12).default([]),
  portrait: portraitSchema,
});
export type ContactInputValues = z.input<typeof contactInputSchema>;

export const recordInputSchema = z.object({
  id: z.string().min(1).optional(),
  contactId: z.string().min(1, "Choose who you met"),
  location: trimmed(240).min(1, "Pick a location on the map or type one"),
  dateTime: z.string().min(1, "Choose a date and time"),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  notes: trimmed(2000).default(""),
  customFields: z.array(customFieldSchema).max(12).default([]),
});
export type RecordInputValues = z.input<typeof recordInputSchema>;

export const profileSchema = z.object({
  firstName: trimmed(60).min(1, "First name cannot be empty"),
  lastName: trimmed(60).min(1, "Last name cannot be empty"),
  occupation: trimmed(80).default(""),
  statusMessage: trimmed(80).default(""),
  phones: phoneList,
  emails: emailList.pipe(z.array(z.string()).min(1, "Keep at least one e-mail address")),
});
export type ProfileValues = z.input<typeof profileSchema>;

export const userNameSchema = trimmed(32).regex(
  USERNAME_PATTERN,
  "Use 3-32 letters, numbers, dots, dashes or underscores",
);

export const passwordSchema = z
  .string()
  .min(8, "The minimum length of password is 8")
  .max(72, "Passwords are limited to 72 characters")
  .regex(PASSWORD_PATTERN, PASSWORD_HINT);

export const emailSchema = trimmed(120).regex(EMAIL_PATTERN, "Invalid email format");

export const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code");

/** First error message of a failed parse, for compact form feedback. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
