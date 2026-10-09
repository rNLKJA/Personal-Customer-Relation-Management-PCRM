# DR-002: Deliver e-mail to an on-screen demo inbox instead of sending real e-mail

- **Status:** Partly superseded by DR-005, and by DR-007 for the live site (the hosted database now exists, so codes no longer go missing between instances)
- **Date:** 2026-10-06 (records the choice made during the 2026 revival)
- **Author:** Sunchuangyu (Rin) Huang

## Context

Four flows in the original app depend on e-mail: the sign-up verification code, the password-reset code, the code needed to change a password while signed in, and the "fast register" invitation a user can send to a contact who has no account yet. The 2021 back-end sent these through Gmail SMTP with nodemailer, and the Gmail address and password were hard-coded in the repository (they are redacted in `coursework/`).

A public portfolio demo cannot responsibly send real e-mail. It would need a domain with SPF and DKIM, a provider account, and protection against abuse, because a public form that e-mails arbitrary addresses is a spam relay. It would also mean collecting visitors' real e-mail addresses, which the demo does not need.

## Decision

Store every e-mail the app would send in an `email_outbox` table and show it in an on-screen **demo inbox**, with the code or link pulled out so the flow can be completed in a click. A message is visible to the account it is addressed to, to the user who triggered it (for example the person who sent an invitation), and to the browser that requested it before signing in (a random per-browser cookie). A password-reset code is only shown to a browser that has signed in to that account before.

## Options considered

1. **A transactional e-mail provider** (for example a free tier of Resend or Amazon SES). Real delivery, but it needs a domain, credentials in the deployment and abuse controls, and it collects real addresses.
2. **Print codes to the server log.** Simple, but visitors cannot see them, so the flows would not be usable on the live demo.
3. **Skip verification entirely.** Removes four original features.
4. **A demo inbox in the database** (chosen).

## Why

- All four original flows stay intact and can be tried end to end without anyone's real mailbox.
- Nothing is sent to third parties, nothing is collected that the demo does not need, and there is no spam vector.
- It costs nothing and is easy to test: the integration tests read the outbox to complete sign-up and an invitation.
- The outbox doubles as an audit trail an admin can browse in `/admin/records`.

## What happened

The sign-up, reset, change-password and invitation flows work end to end in a local production build, and the integration tests complete sign-up and an invitation through the outbox. On the live site they can fail intermittently for now: until the hosted database exists, a code written by one serverless instance may not be visible to the next (DR-004).

The honest cost is that "verification" is now a simulation. In 2021 a code proved that the person could read that mailbox; here it only proves they can read this browser's demo inbox, so any address can be "verified". The known-browser rule for reset codes stops one visitor resetting another visitor's password, but it also means a reset only works in a browser that has signed in to the account before. On the shared `demo` account every visitor sees the same inbox.

## What I'd change

- For a real deployment, put a provider behind the existing `sendEmail` interface, keep the outbox as the audit record, and rate-limit by destination address as well as by IP.
- Expire demo-inbox messages after a fixed period instead of keeping them until the account is deleted.
- Label the verification step in the UI as simulated, so nobody mistakes it for proof of address ownership.
