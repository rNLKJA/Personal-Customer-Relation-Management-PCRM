export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export const SESSION_EXPIRED = {
  ok: false,
  error: "Your session has expired - please sign in again.",
} as const satisfies { ok: false; error: string };
