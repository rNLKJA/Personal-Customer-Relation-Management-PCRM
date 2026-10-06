# Model card: meeting-note assistant and redactor

- **Feature:** optional AI summary and suggested follow-ups for one meeting note, plus the rule-based redactor that runs before it
- **Prompt version:** `meeting-assist/v1`
- **Last updated:** 2026-10-06
- **Owner:** Sunchuangyu (Rin) Huang

This card describes a feature built on third-party language models. No model was trained or fine-tuned for this project. The numbers below were computed from the code at the time of writing; [/methods](https://comp30022-personal-crm.vercel.app/methods#evaluation) recomputes them on every build.

## Model details

| Component | What it is |
| --- | --- |
| Language model | Chosen by the visitor in AI settings: Claude Haiku 4.5 (`claude-haiku-4-5`, the default), Claude Sonnet 5.5 (`claude-sonnet-5-5`), or any OpenAI Chat Completions model id the visitor types (default `gpt-5-mini`). |
| Access | Bring your own key. The browser calls the provider directly (Anthropic Messages API with the `anthropic-dangerous-direct-browser-access` header, or the OpenAI API). The key never reaches this site's server. |
| Output format | JSON constrained by a schema (structured outputs): `summary` (one to three sentences) and `follow_ups` (each an `action` and a `due` phrase or null), validated again in the browser with zod. |
| Instructions | A fixed system prompt, shown in full before every call. It tells the model to keep redaction tokens as they are, use only facts in the note, not invent people, dates or commitments, and treat the note as data rather than instructions. |
| Redactor | Deterministic rules in `web/src/lib/redact/redact.ts`: e-mail addresses, Australian and international phone numbers, street addresses and PO boxes, the meeting contact's and the signed-in user's names, and the full names of everyone in the user's address book (DR-006). |

## Intended use

- Turning one of your own meeting notes into a short summary and a list of next steps for **you**, the note's author.
- The output is a **draft**. It is saved to the meeting only if you accept it or edit it, and it stays labelled "AI-generated" wherever it appears.

## Out of scope

- Any decision about a person: assessing, ranking, profiling or predicting anything about a contact.
- Notes containing sensitive information about health, finances, legal matters or similar. The redactor does not look for these.
- Sending messages or creating meetings automatically. The assistant only suggests; nothing is acted on without a person.
- Use without reading the draft. The tool is designed for a human to review every output.

## Data

**Training data provenance.** The language models are trained by their providers; see the providers' own model cards and data-use terms. This project adds no training data.

**What is sent per call.** The fixed instructions, the meeting date (day only), and the note after redaction. Not sent: the contact's details, the meeting location field, other notes, or anything identifying the account. The visitor sees this exact text before sending.

**What is stored.** One AI-log row per call with the redacted text sent, the answer, the requested and the served model, latency, token counts if the provider returned them, and the human decision. Never the key, never the unredacted note. The server rejects a log entry that contains anything shaped like an API key. "Accepted" always stores the logged answer unchanged (the server ignores any text sent with an accept); any change is stored as "edited".

**What the log can and cannot prove.** Entries are reported by the visitor's browser, because the call goes from the browser to the provider and never through this server. The server cannot verify what the provider actually returned; it can only check the entry's shape and refuse anything that looks like a key.

**Evaluation data.** Two synthetic corpora written for this project, with every detail fictional (reserved `example.*` domains, ACMA's phone ranges for fiction, invented streets): 34 notes with 49 labelled personal details for the redactor, and 32 notes with hand-labelled follow-ups for the assistant, in two splits of 16.

## Evaluation

### Redaction (no key needed, deterministic)

A labelled detail counts as caught only when every character of it is removed. Intervals are 95% Wilson score intervals; they treat details in the same note as independent, so they are somewhat too narrow. The redactor is run as the app runs it (DR-006), with an address book fixed by a rule: every meeting contact in the corpus plus the four directory accounts, 19 people.

| Category | Caught | Recall | Precision |
| --- | --- | --- | --- |
| E-mail addresses | 7 of 8 | 88% (53-98%) | 100% (65-100%) |
| Phone numbers | 14 of 15 | 93% (70-99%) | 93% (70-99%) |
| Street addresses | 8 of 9 | 89% (57-98%) | 89% (57-98%) |
| Names | 13 of 17 | 76% (53-90%) | 94% (73-99%) |
| **All** | **42 of 49** | **86% (73-93%)** | **94% (83-98%)** |

21 of the 28 notes with personal details came out fully clean: 75% (57-87%).

With only the meeting contact's and the user's names (the DR-003 setting) names were 12 of 17, 71% (47-87%), and all details 41 of 49, 84% (71-91%). The one extra name the address book catches is "Sam Patel", and only because he is a directory account, so treat the difference as a fixed leak rather than a measured improvement.

### Follow-up extraction (the evaluation harness)

The harness at `/ai-log/evaluate` runs the same notes through a rule-based baseline and through the language model with the assistant's exact prompt, scores both with the same keyword-group matcher, and compares them note by note on the same notes: mean per-note recall and mean per-note F1 with seeded percentile bootstrap intervals (4,000 resamples, seed 4399), pooled recall and precision with Wilson intervals, suggestions made on notes with nothing to do, and, for recall and for F1, a paired bootstrap interval for the difference, win/tie/loss counts and an exact sign test. F1 is defined on every note (1 for no suggestions on a note with nothing to do, 0 for any), so padding the list does not pay. A model answer that fails validation, is refused or is cut off is scored as an empty answer; only infrastructure failures are excluded, and they are counted in the results and the exports. The matcher reads "e-mail" as "email", and a test checks that every labelled follow-up matches its own keywords.

Baseline results (no key needed):

| Split | Mean recall per note | Mean F1 per note | Pooled recall | Precision | Suggestions on no-action notes |
| --- | --- | --- | --- | --- | --- |
| Development (rules written on it) | 100%, n = 14 (every note scored 100%, so no bootstrap interval) | 99% (96-100%), n = 16 | 24 of 24, 100% (86-100%) | 24 of 25, 96% (80-99%) | 0 |
| Held-out (rules frozen first) | 31% (12-54%), n = 13 | 42% (21-63%), n = 16 | 6 of 23, 26% (13-46%) | 6 of 8, 75% (41-93%) | 1 |

The gap between the splits is the point of having two: rules tuned on the notes they are scored on look perfect and generalise poorly. Quote the held-out row.

**Language-model results are not published here.** The site has no AI budget, so the comparison is run by a visitor with their own key. Each run writes every call to that visitor's AI log and can be exported as JSON or CSV. A fair reading needs the held-out split, the paired intervals rather than the separate ones, recall read next to F1, and the number of failed calls.

## Known failure modes

- **People outside the address book are not redacted.** Only the meeting contact's and the user's names and the full names in the address book are removed; "Grace Okafor", who is not a contact, is sent as written, and so is a contact's first name on its own ("Leila").
- **Disguised details get through.** "0491 five seven zero 313" or "jo at example dot com" are not caught.
- **Over-redaction.** "the 3 Collins Street cafés" is read as an address, and a 1300-prefixed order number as a phone number.
- **Invented follow-ups.** A model can turn a vague remark into a commitment, or attribute the other person's task to you. This is why the output is a draft.
- **Relative dates stay relative.** "by Friday" is kept as written and not turned into a calendar date.
- **Prompt injection.** The note is wrapped and the instructions say to ignore instructions inside it, but no prompt guarantees that.
- **The scorer under-credits paraphrases.** Keyword groups miss a correct follow-up worded unusually, so recall is a lower bound for both methods.

## Ethical considerations

- **People in the notes did not consent.** Redaction before sending, the preview and the option not to use the feature at all are the main protections; they reduce the exposure, they do not remove it.
- **Transparency.** Every AI output carries an "AI-generated" label, including after it is accepted, and links to the AI log.
- **Human in the loop.** Accept, edit or reject is required before anything is saved; the decision is recorded once and cannot be changed later.
- **Accountability.** The AI log shows every call, the activity log shows every AI action, and both can be exported or deleted with the account. The log is reported by the browser, so it records what the visitor's own client saw, not an independent copy of the provider's answer.
- **Cost and control sit with the visitor.** Calls are billed to their key, the default is the cheapest model, and the key can be forgotten at any time (signing out forgets it too).
- **Shared demo account.** Anything run on the shared `demo` account is visible to other visitors. A guest sandbox keeps it private: the public demo admin sees only masked rows for it (DR-005).
- The design is informed by the Australian Government's (DTA) policy for the responsible use of AI in government, the transparency principles of the EU AI Act and the NIST AI Risk Management Framework. It is not a compliance claim.

## Caveats and recommendations

- The evaluation corpora are small (16 notes per split, 34 notes for redaction) and were written by the same person who wrote the rules, so every interval here is wide and the redaction numbers are optimistic.
- Re-run the harness whenever the prompt version, the model or the redaction rules change, and record the prompt version with the results.
- Before using this on real notes, add detection of names outside the address book and test it on notes written by someone else.
