# DR-007: Run the live demo on the hosted Turso database

- **Status:** Accepted, completes DR-004 (its decision stands; this record replaces its "still to be provisioned" status and its account of production running on `/tmp`)
- **Date:** 2026-10-06
- **Author:** Sunchuangyu (Rin) Huang

## Context

DR-004 chose Turso whenever a database URL is configured, with a per-instance `/tmp` copy of the seed database as the fallback. When it was written, production had no database URL, so the live demo ran on the fallback: a write landed in one serverless instance and could be gone on the next request. The methods page and the README said so, and the privacy and AI journeys were recorded on a local production build for that reason. A verification pass of the live site afterwards found that production had since been connected to Turso while those pages still described the fallback. Decision records are not rewritten once accepted (only their status line points to a later record), so the change needs its own record.

## Decision

Production uses the Turso database `comp30022-personal-crm` (libSQL, hosted in AWS `ap-northeast-1`), connected through `DATABASE_URL` and `DATABASE_AUTH_TOKEN` in the Vercel Production environment only. Preview deployments and local development keep the DR-004 fallbacks. No code changed: the resolution order in `src/db/client.ts` already picks the hosted database when those variables are set, and pending migrations run when each instance starts.

## Options considered

1. **Keep production on the `/tmp` fallback** and keep saying so. Honest, but the live demo stays unreliable for anything that writes.
2. **Turso in production, the DR-004 fallbacks elsewhere** (chosen).
3. **Turso for preview deployments too.** Previews would share, and could damage, the production data unless each had its own database, which is not worth the setup for a portfolio demo.

## Why

- It is the outcome DR-004 was waiting for, with the same driver, the same migrations and no code change.
- Every serverless instance now sees the same data, so the activity log, the AI audit log, account deletion and guest sandboxes behave on the live site as they do locally.
- The storage label on `/admin/records` lets anyone check which mode is running.

## What happened

Checked on the live site on 6 October 2026:

- `/admin/records` reports "Turso (libSQL) - persistent", and the "demo storage resets periodically" banner no longer appears.
- A guest sandbox created with "Try as guest" was found on every following request (home, contacts, meetings and insights), and the `users` count seen by the demo admin went from 10 to 11 between two separate sign-ins. On the `/tmp` fallback neither was guaranteed.
- The functions run in Vercel's `iad1` region (US East) while the database is in Tokyo, so every query crosses the Pacific. Signed-in pages took a median of 0.75 s to the first byte from Australia (11 requests, range 0.69-1.35 s). That is acceptable for a demo, but most of it is avoidable.
- Two side effects of persistence: changes visitors make to the shared `demo` account now stay until someone changes them back (the daily date shift is the only automatic change), and the README screenshots of the privacy and AI features are still the ones recorded on the local build.

## What I'd change

- Run the functions in the database's region (Vercel `hnd1`), or move the database next to the functions, and measure the time to first byte again.
- Add the deployment check DR-004 asked for: fail a production deploy that has no `DATABASE_URL`.
- Reset the shared demo account's contacts and meetings to the seed once a day, as guest sandboxes already expire after 24 hours.
