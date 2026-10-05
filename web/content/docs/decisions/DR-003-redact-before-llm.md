# DR-003: Redact meeting notes in the browser before any language-model call

- **Status:** Partly superseded by DR-006
- **Date:** 2026-10-06
- **Author:** Sunchuangyu (Rin) Huang

## Context

The 2026 upgrade adds an optional meeting-note assistant: it summarises one meeting note and suggests follow-ups, using the visitor's own API key for Anthropic or OpenAI. The key and the request go straight from the browser to the provider; this site has no AI budget and never proxies the call.

Meeting notes are about other people. A note can hold a contact's e-mail address, phone number or home address, and the names of people who never agreed to be sent to an AI provider. The provider's data-handling terms are not something this app controls, so the safest data is data that is never sent. The design is informed by the Australian Government's (DTA) policy for the responsible use of AI in government, the transparency principles of the EU AI Act and the NIST AI Risk Management Framework. It does not claim compliance with any of them.

## Decision

Before any call, the browser removes e-mail addresses, phone numbers, street addresses and PO boxes, and the names the app already knows (the meeting contact and the signed-in user), replacing each with a token such as `[EMAIL]`. The visitor then sees the exact text that will be sent, with the fixed instructions and counts of what was removed, and has to press send. The AI log stores that redacted text, never the original note and never the key.

## Options considered

1. **Send the note as written, with a warning.** Simplest, and it puts all of the third parties' details in a provider's logs.
2. **Redact on this site's server.** The raw note would travel to the server first, and the call would need a server-side proxy holding the visitor's key. More data movement, not less.
3. **A named-entity model in the browser** (for example a small transformer). Better at names, but tens of megabytes to download, slower, and harder to explain and evaluate.
4. **Ask the language model to redact.** It would have to receive the personal data in order to remove it, which defeats the purpose.
5. **Deterministic rules in the browser, plus a preview the person must approve** (chosen).

## Why

- Rules are transparent: anyone can read them, and the same input always gives the same output.
- They are fast, run offline and add no new data flow.
- They are easy to evaluate with a labelled corpus and confidence intervals, and those numbers are published.
- The preview covers what the rules miss: the person sees the text and decides. Nothing leaves the browser without that step.

## What happened

The redactor was evaluated on 34 synthetic notes with 49 labelled personal details (all fictional: reserved `example.*` domains, ACMA's phone ranges for fiction, invented streets). A detail counts as caught only if every character of it was removed.

| Category | Caught | Recall (95% Wilson CI) | Precision (95% Wilson CI) |
| --- | --- | --- | --- |
| E-mail addresses | 7 of 8 | 88% (53-98%) | 100% (65-100%) |
| Phone numbers | 14 of 15 | 93% (70-99%) | 93% (70-99%) |
| Street addresses | 8 of 9 | 89% (57-98%) | 89% (57-98%) |
| Names | 12 of 17 | 71% (47-87%) | 94% (72-99%) |
| **All** | **41 of 49** | **84% (71-91%)** | **94% (83-98%)** |

Only 20 of the 28 notes that contained personal details came out fully clean (71%, 95% CI 53-85%). The misses are the expected ones: names of third parties ("Sam Patel", "Grace Okafor") are not detected at all, and neither are details written out to dodge filters ("0491 five seven zero 313", "mateo dot lopez at example dot com") or a location described in words. The three false positives were "3 Collins Street" used to mean three cafés, an order number that starts with 1300, and a name inside a social-media handle.

These numbers are optimistic. I wrote the rules and the corpus, so the corpus reflects what I thought to test. The intervals also treat details in the same note as independent, which makes them somewhat too narrow. The live numbers are recomputed from the code on [/methods](https://comp30022-personal-crm.vercel.app/methods#evaluation).

## What I'd change

- Add an in-browser name detector for third-party names, and measure whether it helps more than it costs.
- Have someone else write a held-out set of notes, so the evaluation is not graded on my own homework.
- Let the person click any word in the preview to mask it before sending.
