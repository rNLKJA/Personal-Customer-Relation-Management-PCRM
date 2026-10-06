# DR-006: Redact every full name in the user's address book before a language-model call

- **Status:** Accepted (supersedes the known-names scope of DR-003; the rest of DR-003 stands)
- **Date:** 2026-10-06
- **Author:** Sunchuangyu (Rin) Huang

## Context

DR-003 removes e-mail addresses, phone numbers, street addresses and two sets of names from a meeting note before it is sent to an AI provider: the meeting contact's and the signed-in user's. A review of the upgrade branch found that this missed names the app already holds. On the showcase meeting the preview read "intro [NAME] to Sam Patel", so "Sam Patel" would have gone to the provider, although he is one of the demo user's own contacts and a registered directory account. The committed screenshot of the redaction preview showed the same leak, and a unit test even pinned "Sam Patel" as an expected miss.

The app has every name in the user's address book. Not using them was a gap in the design, not a limit of rule-based redaction.

## Decision

The meeting page passes the full names of everyone in the user's address book to the redactor, which replaces a name with `[NAME]` when the whole "First Last" appears with the same capitalisation. The meeting contact's and the user's own first and last names keep the DR-003 rule (any word on its own, any case). Everything else in DR-003 stands: redaction in the browser, the exact preview, a person pressing send, and the AI log storing only the redacted text.

## Options considered

1. **Keep DR-003 as it was** and rely on the preview. A known leak of names the app already has.
2. **Match every contact's first and last names on their own, ignoring case.** Catches "Sam" alone, but with 25 or more contacts it blanks ordinary words (contacts called May, Will, Grace or Hunter) and makes the note harder for the model to read.
3. **Full names, case-sensitive** (chosen). Precise, and it uses only data the app already has.
4. **An in-browser named-entity model.** Still the right next step for people who are not in the address book (DR-003, option 3), with the same download and evaluation costs.

## Why

- No new data flow: the names are the user's own contacts, already on the page.
- Deterministic and testable, like the other rules, and it cannot misfire on ordinary words.
- It fixes the leak that was actually observed on the showcase meeting.

## What happened

The redaction evaluation was re-run with an address book fixed by a rule rather than chosen note by note: every meeting contact in the corpus plus the four directory accounts (19 people; Ava Chen is both).

| Setting | Names caught | All details caught | Precision | Notes fully cleaned |
| --- | --- | --- | --- | --- |
| DR-003: meeting contact and user only | 12 of 17, 71% (47-87%) | 41 of 49, 84% (71-91%) | 44 of 47, 94% (83-98%) | 20 of 28, 71% (53-85%) |
| DR-006: plus address-book full names | 13 of 17, 76% (53-90%) | 42 of 49, 86% (73-93%) | 45 of 48, 94% (83-98%) | 21 of 28, 75% (57-87%) |

95% Wilson intervals. There were no new false positives. The one extra name is "Sam Patel", and it is caught only because he is a directory account, so the gain is partly by construction and the intervals overlap almost entirely. This is a fix for a known leak, not a measured improvement. Still missed: "Grace Okafor", who is not in the address book, and the lone first names "Leila", "Sienna" and "Oliver", whose full names are in it. On the showcase meeting the preview now reads "intro [NAME] to [NAME]", and the screenshot was retaken.

## What I'd change

- Also match a contact's first name on its own when it is unique in the address book and not an ordinary word, and measure the false positives that adds.
- Add an in-browser name detector for people outside the address book, evaluated on notes written by someone else.
- Let the person click any word in the preview to mask it before sending.
