import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { newId, secureRandom } from "@/db/ids";
import { emailCodes } from "@/db/schema";
import { autoCodeGenerator, EMAIL_CODE_LENGTH, EMAIL_CODE_TTL_MS } from "@/lib/legacy/codes";

/**
 * Port of the EmailAuth flow (`emailAuthSend`, `emailCodeVerify`,
 * `userCodeVerify`): one live 6-digit code per e-mail address, valid for five
 * minutes, deleted once used. The revival scopes codes by purpose and limits
 * wrong guesses to 5 per code.
 */

export type CodePurpose = "signup" | "reset" | "change-password";
const MAX_ATTEMPTS = 5;

const norm = (email: string) => email.trim().toLowerCase();

export async function issueEmailCode(email: string, purpose: CodePurpose): Promise<string> {
  const db = getDb();
  const code = autoCodeGenerator(EMAIL_CODE_LENGTH, secureRandom);
  const now = Date.now();
  await db.batch([
    db.delete(emailCodes).where(lt(emailCodes.expiresAt, new Date(now))),
    db.delete(emailCodes).where(and(eq(emailCodes.email, norm(email)), eq(emailCodes.purpose, purpose))),
    db.insert(emailCodes).values({
      id: newId(),
      email: norm(email),
      authCode: code,
      purpose,
      createdAt: new Date(now),
      expiresAt: new Date(now + EMAIL_CODE_TTL_MS),
    }),
  ]);
  return code;
}

export type VerifyResult = "ok" | "wrong" | "expired";

/** Checks (and on success consumes) the code for `email`. */
export async function verifyEmailCode(
  email: string,
  code: string,
  purpose: CodePurpose,
): Promise<VerifyResult> {
  const db = getDb();
  const row = await db.query.emailCodes.findFirst({
    where: and(eq(emailCodes.email, norm(email)), eq(emailCodes.purpose, purpose)),
  });
  if (!row || row.expiresAt.getTime() < Date.now() || row.attempts >= MAX_ATTEMPTS) {
    return "expired";
  }
  if (row.authCode !== code.trim()) {
    await db
      .update(emailCodes)
      .set({ attempts: sql`${emailCodes.attempts} + 1` })
      .where(eq(emailCodes.id, row.id));
    return "wrong";
  }
  await db.delete(emailCodes).where(and(eq(emailCodes.email, norm(email)), eq(emailCodes.purpose, purpose)));
  return "ok";
}
