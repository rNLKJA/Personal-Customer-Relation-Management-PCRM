# DR-001: Merge the React front-end and the Express back-end into one Next.js app

- **Status:** Accepted; its closing note that the hosted database is still not provisioned is superseded by DR-007
- **Date:** 2026-10-06 (records the choice made during the 2026 revival)
- **Author:** Sunchuangyu (Rin) Huang

## Context

In 2021 Team 4399 shipped two applications. The client was a React 16 single-page app built with Create React App and hosted on Heroku and Netlify. The server was an Express 4 and Mongoose 5 REST API on Heroku with MongoDB Atlas behind it: 40 endpoints across `/contact`, `/profile`, `/record` and `/user`, Passport for login, a JWT kept in `localStorage`, a CORS allow-list and several Heroku URLs hard-coded in the client.

By 2026 none of that infrastructure existed. The Atlas cluster, the Heroku apps and the Gmail account were gone, the code targeted Node 16, and the repository had leaked credentials that had to be redacted. Reviving the project meant choosing a stack that could run for free, deploy in one step and be tested properly.

## Decision

Port both halves into a single Next.js App Router application in TypeScript (strict), with Server Components for reads, Server Actions for writes, a handful of Route Handlers for the demo inbox, geocoding and exports, and SQLite through libSQL and Drizzle. It deploys as one Vercel project from `web/`. The original code stays untouched in `coursework/`.

## Options considered

1. **Revive both apps as they were** on Node 16 with a free MongoDB tier and a free Node host. Least porting work, but it keeps an end-of-life runtime, two deployments, CORS and a token in `localStorage`.
2. **Keep two apps but modernise each** (a Vite SPA plus Express on a free host). Better tooling, still two deployments and a public JSON API to secure.
3. **One Next.js app** (chosen).
4. **A static SPA plus serverless functions.** One deployment, but every endpoint stays a public JSON API and the session problem remains.

## Why

- One origin means the session can be a signed, httpOnly cookie instead of a JWT that any script on the page can read, and there is no CORS configuration to get wrong.
- Every query runs on the server, so scoping each read and write to the signed-in owner is enforced in one place. The original trusted whatever `_id` the client sent.
- Types flow from the database schema to the forms, and the same zod schemas validate input in the browser and on the server.
- The parity tests can import the original 2021 JavaScript functions next to their TypeScript ports and compare results, which keeps the port honest.
- It runs on free tiers with no servers to look after.

## What happened

The parity map on [/methods](https://comp30022-personal-crm.vercel.app/methods#parity) accounts for all 40 original endpoints: 15 are implemented with the same behaviour, 24 are changed (mostly because a JSON endpoint became a Server Component read or a Server Action), and 1 is dropped (`/profile/displayImage`, because portraits are now small inline data URLs). A test checks that list against the original router files and checks that every named replacement is really exported.

Porting surfaced real defects that the 2021 tests never caught: records and contacts could be read or deleted by anyone who knew an id, `/record/deleteOneRecord` deleted any record id it was sent, the password-reset endpoint accepted a constant string (`codeVerified: "4399CRMVerified"`) in place of a verified code, deleting a contact was a `GET`, `/record/searchRecord` threw on every call because `expressValidator` was never imported, and the fast-register verifier had an inverted check. Each one is fixed and documented as a deliberate deviation.

The weaker side is honest too. Parity was checked by unit and integration tests plus a manual pass through every screen, not by the original team or the original client. The single app couples the UI to the data layer, so a future mobile client would need an API added back. And the serverless runtime cannot keep a SQLite file, which pushed persistence to a hosted database (DR-004) that is still not provisioned for the live demo.

## What I'd change

- Add browser end-to-end tests (Playwright) of the main journeys to CI, so parity is checked continuously rather than once.
- Provision the hosted database before building features on top of it.
- If a second client ever appears, put a small typed API in front of the server modules rather than reopening the old REST surface.
