# Original coursework (COMP30022 IT Project, 2021 S2)

This folder preserves the **original 2021 submission** of Team 4399 (Group 49) for
COMP30022 IT Project at the University of Melbourne. It is kept for reference and
academic-integrity purposes; the revived, deployable app lives in [`../web`](../web).

| Folder | What it is |
| --- | --- |
| [`frontend/`](frontend) | The React 16 (Create React App) client: `src/API/*` feature components (auth, contact, record, map, person, calendar, fastRegister, ...), `src/BackEndAPI/*` fetch hooks, `src/hooks/*` auth helpers, Taiko/Jest tests and the JSDoc output in `out/`. Moved here with `git mv`, so its history is intact. `package.json`, `package-lock.json`, `public/manifest.json` and `public/robots.txt` were restored from the team's `COMP30022-49-Front-End.zip` (the old `.gitignore` excluded `*.json`). |
| [`backend/`](backend) | The Express 4 + Mongoose 5 REST API (40 endpoints: 11 under `/contact`, 12 `/profile`, 5 `/record`, 12 `/user`), Passport local + JWT auth, multer uploads, nodemailer e-mail codes and 21 Jest test files. Copied from the team repository [Harrison-Huang666/COMP30022-49](https://github.com/Harrison-Huang666/COMP30022-49/tree/Back-End) (branch `Back-End`, commit `22d0675`). Its original `README.md` is included too; the back-end's own `.gitignore` ignores `README.md`, so it is force-added. |
| [`_archive/`](_archive) | The original README of this repository. |

## What was changed on import (and why)

The source code is otherwise unchanged. The following were deliberately **not**
copied or were **redacted**, because the team repository leaked credentials and
personal photos:

- `backend/.env` – not copied (contained database credentials and the JWT secret).
- `backend/models/database.js` – the hard-coded MongoDB Atlas URIs (with
  credentials) were replaced by `process.env.MONGODB_URI`.
- `backend/config/emailAuth.js` – the hard-coded Gmail address and password were
  replaced by `process.env.GMAIL_USER` / `process.env.GMAIL_APP_PASSWORD`.
- `backend/uploadedImage/` – not copied (users' uploaded photos).
- `backend/out/`, `backend/public/API documents/` – generated JSDoc HTML; not copied
  because it embeds the same secrets in rendered source listings. Regenerate with
  `npx jsdoc controller config -d out`.
- `backend/test-report.html`, `backend/public/Test documents/`, `backend/testReport/`
  – generated test reports / scratch tests.
- `frontend/.env` – removed from the tree (it held a Google Maps key). See
  `frontend/.env.example` for the variable names.

## How the revival uses this folder

The revived app in [`../web`](../web) ports this code to TypeScript (Next.js + SQLite). Its parity tests
(`web/src/lib/legacy/parity.test.ts`) load functions directly from these files - for example `convert()` from
`frontend/src/API/record/Record.js` and `listCompare()` from `backend/controller/contactController.js` - and
check that the ports behave identically, so please keep the contents unchanged.

## Running the original code (optional)

Both apps target Node 16 / npm 6 (2021 toolchain). They are **not** needed for the
revived app and the original deployments (Heroku, MongoDB Atlas, Gmail SMTP,
Google Maps) no longer exist.

```bash
# back-end (needs a MongoDB you control)
cd coursework/backend
cp .env.example .env      # fill in MONGODB_URI and PASSPORT_KEY
npm ci && npm start       # http://localhost:5000

# front-end (needs your own Google Maps JS API key)
cd coursework/frontend
cp .env.example .env
npm ci && npm start       # http://localhost:3000
```

Note that the front-end hard-codes the old Heroku API URL in a few places (for
example `src/API/axiosClient/axiosClient.js`); point them at your local back-end.

## Team 4399 / Group 49

| Name | Role |
| --- | --- |
| Bin Liang | Back-end lead |
| Hongji (Harrison) Huang | Communication lead, original repository owner |
| Wei Zhao | Front-end lead |
| Yixiao Tian | Communication lead |
| Sunchuangyu (Rin) Huang | Scrum Master, front-end (contacts, records, map) |
