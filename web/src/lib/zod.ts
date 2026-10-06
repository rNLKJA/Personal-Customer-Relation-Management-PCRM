import { z } from "zod";

/**
 * The app's zod import. zod v4 compiles fast object parsers with `new
 * Function` (and probes for it with `Function("")`), which the Content
 * Security Policy does not allow ('unsafe-eval' is not granted; see
 * next.config.ts). Jitless mode keeps the same validation without eval.
 * Import `z` from here, not from "zod", so the setting is applied before any
 * schema is used.
 */
z.config({ jitless: true });

export { z };
