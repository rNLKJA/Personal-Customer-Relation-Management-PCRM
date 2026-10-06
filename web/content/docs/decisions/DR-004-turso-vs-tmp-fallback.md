# DR-004: Use Turso when configured, and fall back to a /tmp copy of the seed database

- **Status:** Partly superseded by DR-007, which records the hosted database being provisioned; the decision stands
- **Date:** 2026-10-06
- **Author:** Sunchuangyu (Rin) Huang

## Context

The revived app uses SQLite through libSQL and Drizzle (DR-001). On Vercel the function file system is read-only except `/tmp`, and every serverless instance has its own `/tmp`, so a SQLite file cannot hold shared, lasting data there. Turso is a hosted libSQL service with a free tier, so the same driver and the same SQL work locally and in production.

Creating a Turso database needs an interactive sign-in, or installing a Vercel Marketplace integration, which means accepting terms on the owner's account. That is an owner action, not something a build script should do.

## Decision

Use Turso (hosted libSQL) whenever a database URL is configured, and otherwise fall back to a per-instance copy of the committed seed database in `/tmp`, with a visible notice that demo storage resets. The database is resolved at start-up in this order:

1. `DATABASE_URL` (and `DATABASE_AUTH_TOKEN`), for example a Turso database. Data is shared and persistent.
2. On Vercel without those variables: copy the committed `data/seed.db` snapshot to `/tmp/app.db` on a cold start and use it, and show a "demo storage resets periodically" banner.
3. Locally: `data/app.db`, created from the snapshot on first run.

Pending migrations are applied when each server instance starts (`src/instrumentation.ts`), so a fresh `/tmp` copy, an old local file or a newly attached Turso database all pick up new tables without a manual step.

## Options considered

1. **Turso only**, failing without it. Honest, but the demo would be down until the database exists.
2. **Vercel Postgres or Neon.** Persistent, but it means a second SQL dialect, rewritten migrations and a different local setup.
3. **The `/tmp` copy only.** Always available, never persistent.
4. **Turso when configured, the `/tmp` copy otherwise** (chosen).

## Why

- The demo works with zero accounts set up, which matters for a portfolio piece someone opens once.
- Local development, tests, the `/tmp` fallback and Turso run the same code and the same migrations.
- The banner and the storage label on `/admin/records` make the mode visible instead of pretending the data is durable.

## What happened

As of 6 October 2026 production still runs in the `/tmp` mode. The Vercel project has only `SESSION_SECRET` set, there is no database integration, and the Turso CLI on the build machine is not signed in. A write lands in whichever instance served it and is lost when that instance is recycled, so a contact created on the live site may not appear on the next request.

That is why the baseline merge gate failed: a contact and a meeting created on the live site did not reliably show up in `/admin/records`. It also limits the 2026 privacy features on the live demo: the activity log, the AI audit log and account deletion all work, but their records are only as durable as the instance. The showcase journeys for those features were therefore recorded against a **local production build** (`pnpm build && pnpm start`), and the README says so.

## What I'd change

- Provision the database first. The steps are: `turso auth login`, `turso db create comp30022-personal-crm`, load the schema and seed (`pnpm db:migrate && pnpm db:seed` with the new `DATABASE_URL`), add `DATABASE_URL` and `DATABASE_AUTH_TOKEN` to Vercel Production, and redeploy.
- Add a small health endpoint that reports the storage mode, and a deployment check that fails if production has no `DATABASE_URL`.
- Keep the `/tmp` fallback for preview deployments only.
