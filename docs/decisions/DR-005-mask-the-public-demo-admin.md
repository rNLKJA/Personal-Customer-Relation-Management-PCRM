# DR-005: Treat the public demo admin as untrusted: mask secrets and visitors' data, and log every admin read

- **Status:** Accepted (supersedes the reset-code claim in DR-002)
- **Date:** 2026-10-06
- **Author:** Sunchuangyu (Rin) Huang

## Context

The live demo has a one-click "Demo admin" button, and its credentials are printed on the login page, so that any visitor can open `/admin/records` and see the database working (DR-004 relies on it to check persistence). Until this record, that page showed every row of every table and hid only password hashes, photos and e-mail HTML.

An independent review of the upgrade branch, before it was merged, showed what that meant. Anyone could take over any account: ask for a password reset for a user name (DR-002 shows the code only to a browser that has signed in to that account before), open `email_codes` in the admin view, read the code and enter it. The same page showed every guest's and every registered visitor's contact details, meeting notes and AI log. Admin reads were not written to any log, while the activity log was described as showing "every access". The review reproduced the takeover in a test, so this was a real hole, not a theoretical one.

## Decision

The admin view masks secrets in every row and shows personal details and free text only for rows that belong to the seeded demo accounts, and every admin view and export is logged. Concretely:

- **Always masked, never searchable:** password hashes, e-mail verification and reset codes, invitation codes and links, and the per-browser demo-inbox key.
- **Shown only for the seeded demo accounts** (`is_demo`: the shared demo user, the admin and the four directory people): names, user names, e-mail addresses, phone numbers, notes, locations, custom fields, accepted AI summaries and the AI log's input and output. Rows of guests and registered visitors show ids, states, counts and timestamps only.
- **Search** matches masked columns only on demo-account rows, so a query cannot be used to test what a visitor wrote.
- **Every admin page view and CSV export** is written to the admin account's activity log (table, search text, page or row count).
- A test pins which columns of every table are shown, so a new column fails the build until someone classifies it.

## Options considered

1. **Remove the public admin.** Safest, but visitors could no longer see that the data persists, which is the point of the page in a portfolio demo.
2. **Hide only the code columns.** Closes the takeover, but still shows every visitor's notes and AI text to anyone who clicks a button.
3. **Show only rows owned by the demo accounts.** Very safe, but a visitor's own writes would vanish from the admin view, so persistence could not be checked there.
4. **Mask secrets everywhere and visitors' content by owner** (chosen).
5. **A private admin behind a credential set in the environment.** Right for a real deployment, but it needs a secret store and adds nothing a visitor can try.

## Why

- It closes the takeover path. A reset code is again visible only in the demo inbox of a browser that has signed in to the account, which is what DR-002 described.
- Guest sandboxes become private in fact, not only in the copy: the admin sees that a guest exists and when things happened, not what they wrote.
- Rows stay listed with their ids and timestamps, so the persistence check from DR-004 still works.
- Logging admin reads makes the activity log's account of "who looked at what" true for the admin as well.
- Pinning the column policy in a test turns "remember to hide new personal columns" into something the build enforces.

## What happened

The fix was verified with integration tests: a reset code issued with no browser key does not appear in any admin table view, CSV export or search result, and still works for its owner; a guest's note text, e-mail address and user name are not visible or searchable; the shared demo account stays readable. Admin views and exports now produce activity entries under the admin account.

The limits are real. The shared `demo` account is fully visible to the admin and to every visitor, by design. Masked rows still show that a visitor exists, how many contacts and meetings they have, and when they acted. The admin's reads appear in the admin's log, not in the visitor's own activity log, so a visitor cannot see that the admin listed their (masked) rows. And this was caught by review rather than by me: the original design trusted a button that anyone can press.

## What I'd change

- For a real deployment, put the admin behind an environment-configured credential with no public button, and show admin reads of a person's rows in that person's own activity log.
- Make the classification default-deny in code as well as in the test: an unclassified column would be masked rather than shown.
- Threat-model every "demo convenience" feature before it ships, starting with anything that shows other people's data.
