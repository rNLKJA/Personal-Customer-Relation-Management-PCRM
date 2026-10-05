import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NOT_API, PARITY, paritySummary, type ParityStatus } from "@/lib/methods/parity";
import { evaluateRedaction } from "@/lib/redact/evaluate";
import { REDACTION_LABELS } from "@/lib/redact/redact";
import { CORPUS_ADDRESS_BOOK, REDACTION_CORPUS } from "@/lib/redact/corpus";
import {
  EVAL_RESAMPLES,
  EVAL_SEED,
  baselineScores,
  notesInSplit,
  summarise,
  type MethodSummary,
} from "@/lib/eval/followups";
import { WEEKLY_RESAMPLES, WEEKLY_SEED, WEEKLY_WINDOW } from "@/lib/analytics";
import { DATA_INVENTORY, NOT_COLLECTED } from "@/lib/retention";
import { ANTHROPIC_MODELS, DEFAULT_OPENAI_MODEL } from "@/lib/ai/models";
import { MEETING_ASSIST_PROMPT_VERSION } from "@/lib/ai/meeting-assist";
import { listDecisionRecords } from "@/lib/docs";
import type { BootstrapResult, Interval } from "@/lib/stats";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Methods",
  description:
    "Data provenance, functional parity with the 2021 app, statistics, evaluation design and results, the AI use statement, privacy design and decision records for 4399 CRM.",
};

const TOC = [
  { id: "provenance", label: "Data provenance" },
  { id: "parity", label: "Functional parity" },
  { id: "insights", label: "Statistics on /insights" },
  { id: "evaluation", label: "Evaluation" },
  { id: "ai-use", label: "AI use statement" },
  { id: "privacy", label: "Privacy by design" },
  { id: "limitations", label: "Assumptions and limitations" },
  { id: "decisions", label: "Decision records" },
  { id: "change", label: "What I'd change" },
];

const pct = (x: number) => `${Math.round(x * 100)}%`;
const ci = (i: Interval | BootstrapResult | null) =>
  !i
    ? "-"
    : "degenerate" in i && i.degenerate
      ? `${pct(i.estimate)} (no interval)`
      : `${pct(i.estimate)} (${pct(i.lower)}-${pct(i.upper)})`;

/** Let long endpoint paths wrap only after a slash. */
function slashBreaks(path: string) {
  return path.split("/").map((part, i) => (
    <span key={i}>
      {i > 0 && (
        <>
          /<wbr />
        </>
      )}
      {part}
    </span>
  ));
}

const STATUS_STYLE: Record<ParityStatus, string> = {
  implemented: "border-success/30 bg-success/10",
  changed: "border-primary/25 bg-accent",
  dropped: "bg-muted",
};

export default function MethodsPage() {
  const parity = paritySummary();
  const redaction = evaluateRedaction();
  const contactOnly = evaluateRedaction(REDACTION_CORPUS, { addressBook: [] });
  const dev = summarise(baselineScores(notesInSplit("development")));
  const held = summarise(baselineScores(notesInSplit("held-out")));
  const decisions = listDecisionRecords();

  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 pb-20 sm:px-8 lg:pt-14">
      <header className="max-w-3xl animate-fade-up">
        <p className="text-sm font-medium text-primary">Methods and decisions</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          How the revived 4399 CRM works, and how well
        </h1>
        <p className="mt-4 text-muted-foreground">
          Where the data comes from, how the 2021 back-end maps onto the 2026 app, how the numbers
          on the Insights page are calculated, how the AI assistant and its redaction step were
          evaluated (including the weak results), what AI is and is not used for, and the decisions
          behind it all.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            On this page
          </p>
          <ul className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
            {TOC.map((t) => (
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  className="block rounded-full border px-3 py-1 text-sm text-muted-foreground hover:text-foreground lg:rounded-md lg:border-0 lg:px-2 lg:py-1"
                >
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-14">
          <Section id="provenance" title="Data provenance">
            <ul>
              <li>
                <strong>Original code:</strong> the 2021 submission is preserved in{" "}
                <code>coursework/</code>; its results and behaviour are not altered. Ports live in{" "}
                <code>web/src/lib/legacy</code> and are parity-tested against the original
                functions.
              </li>
              <li>
                <strong>Demo and guest data:</strong> generated deterministically by{" "}
                <code>web/src/lib/sample-data.ts</code>. Names are invented, e-mails use the
                reserved <code>example.*</code> domains and phone numbers come from ACMA&apos;s
                ranges reserved for fiction. Meeting places are about 100 Melbourne suburbs and
                landmarks looked up once through Photon (data © OpenStreetMap contributors, ODbL);
                the offline basemap is Natural Earth (public domain).
              </li>
              <li>
                <strong>Evaluation corpora:</strong> {REDACTION_CORPUS.length} notes with labelled
                personal details for the redactor, and 32 notes with labelled follow-ups for the
                assistant. All synthetic and written for this project.
              </li>
              <li>
                <strong>Visitor data:</strong> whatever visitors type into the shared demo account
                or their own guest sandbox. No course-provided data, real people&apos;s details or
                employer data are used anywhere.
              </li>
            </ul>
          </Section>

          <Section
            id="parity"
            title="Functional parity with the 2021 back-end"
            lead={`All ${parity.total} REST endpoints of the original Express API, and what replaced each one: ${parity.implemented} implemented with the same behaviour, ${parity.changed} changed (same capability, different mechanism), ${parity.dropped} dropped. A unit test checks this table against the original router files and checks that every replacement it names is really exported.`}
          >
            <div
              className="not-prose hidden max-h-[34rem] overflow-auto rounded-xl border sm:block"
              tabIndex={0}
              role="region"
              aria-label="Endpoint parity table (scrolls)"
            >
              <table className="w-full min-w-[760px] text-left text-[13px] [&_td]:px-3 [&_th]:px-3">
                <thead className="sticky top-0 z-10 bg-surface text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      2021 endpoint
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      2026 replacement
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Why
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y align-top">
                  {PARITY.map((row) => (
                    <tr key={`${row.method} ${row.path}`}>
                      <td className="py-2 pr-3">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {row.method}
                        </span>{" "}
                        <code className="font-mono text-[12px]">{slashBreaks(row.path)}</code>
                        <span className="block text-[11px] text-muted-foreground">
                          {row.original}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {row.targets.length ? (
                          row.targets.map((t) => (
                            <span key={t.symbol + t.file} className="block">
                              <code className="font-mono text-[12px]">{t.symbol}</code>
                              <span className="block text-[11px] text-muted-foreground">
                                {t.file.replace("src/", "")}
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={cn(
                            "inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            STATUS_STYLE[row.status],
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ol
              className="not-prose max-h-[34rem] divide-y overflow-auto rounded-xl border sm:hidden"
              tabIndex={0}
              aria-label="Endpoint parity (scrolls)"
            >
              {PARITY.map((row) => (
                <li key={`${row.method} ${row.path}`} className="space-y-1.5 p-3 text-[13px]">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {row.method}
                      </span>{" "}
                      <code className="font-mono text-[12px]">{slashBreaks(row.path)}</code>
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        STATUS_STYLE[row.status],
                      )}
                    >
                      {row.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{row.original}</p>
                  {row.targets.length > 0 && (
                    <p>
                      <span className="text-muted-foreground">Now: </span>
                      {row.targets.map((t, i) => (
                        <span key={t.symbol + t.file}>
                          {i > 0 && ", "}
                          <code className="font-mono text-[12px]">{t.symbol}</code>
                        </span>
                      ))}
                    </p>
                  )}
                  <p className="text-muted-foreground">{row.note}</p>
                </li>
              ))}
            </ol>
            <p className="text-sm text-muted-foreground">
              Not counted as API endpoints:{" "}
              {NOT_API.map((n) => (
                <span key={n.path}>
                  <code>{n.path}</code> ({n.note.replace(/\.$/, "")}){" "}
                </span>
              ))}
            </p>
          </Section>

          <Section id="insights" title="Statistics on the Insights page">
            <ul>
              <li>
                <strong>Meetings per week.</strong> Meetings that already happened, counted per
                complete Monday-Sunday week in Melbourne time, from the first week with a meeting
                (at most 26 weeks back). The current week is left out because it is unfinished. The
                line is the mean of the last {WEEKLY_WINDOW} weeks; the band is a 95% percentile
                bootstrap interval from {WEEKLY_RESAMPLES.toLocaleString("en-AU")} resamples of
                those weeks with the fixed seed {WEEKLY_SEED}. The headline rate uses the same
                method over all weeks shown, and states the number of weeks.
              </li>
              <li>
                <strong>Assumption:</strong> the weeks in a window are treated as exchangeable (no
                trend, no week-to-week correlation). Real meeting habits have both, so the band
                describes variability rather than forecasting it, and with only {WEEKLY_WINDOW}{" "}
                weeks a percentile interval runs a little too narrow.
              </li>
              <li>
                <strong>When you meet.</strong> A plain count of every meeting by weekday and
                starting hour. One hue, darker means more, with a table view for screen readers.
              </li>
              <li>
                <strong>Contacts by recency.</strong> Days since the last meeting that already
                happened. This is a census of the whole address book, not a sample, so it is shown
                without confidence intervals on purpose.
              </li>
              <li>
                <strong>Verified helpers.</strong> The statistics code in{" "}
                <code>web/src/lib/stats</code> (normal quantile, Wilson interval, exact sign test,
                type-7 quantiles, percentile and paired bootstrap) is unit-tested against values
                from scipy and R, produced by <code>scripts/stats_reference.py</code>.
              </li>
            </ul>
          </Section>

          <Section
            id="evaluation"
            title="Evaluation design and results"
            lead="Two things are evaluated: the redaction step that runs before any AI call, and the follow-up suggestions the assistant makes, against a rule-based baseline. Everything below is recomputed from the code on every build."
          >
            <h3>Redaction</h3>
            <p>
              {redaction.notes} synthetic notes with {redaction.overall.labelled} labelled personal
              details. A detail counts as caught only if every character of it is removed (any
              category); a redaction counts as correct if it overlaps a labelled detail. 95% Wilson
              intervals, which treat details in the same note as independent and so run a little
              narrow. The redactor runs as the app runs it since{" "}
              <Link href="/methods/decisions/DR-006-redact-address-book-names">DR-006</Link>: the
              meeting contact&apos;s and the user&apos;s names, plus the full names in the
              user&apos;s address book. For the evaluation that address book is fixed by a rule:
              every meeting contact in the corpus plus the four directory accounts (
              {CORPUS_ADDRESS_BOOK.length} people).
            </p>
            <Table
              label="Redaction results"
              head={["Category", "Caught", "Recall (95% CI)", "Precision (95% CI)"]}
              rows={[
                ...redaction.categories.map((c) => [
                  REDACTION_LABELS[c.category],
                  `${c.caught} of ${c.labelled}${c.partial ? ` (${c.partial} partly)` : ""}`,
                  ci(c.recall),
                  ci(c.precision),
                ]),
                [
                  "All",
                  `${redaction.overall.caught} of ${redaction.overall.labelled}`,
                  ci(redaction.overall.recall),
                  ci(redaction.overall.precision),
                ],
              ]}
            />
            <p>
              Notes fully cleaned: {redaction.cleanNotes.clean} of {redaction.cleanNotes.withLabels}
              , {ci(redaction.cleanNotes.rate)}. Missed or partly missed:{" "}
              {redaction.outcomes
                .filter((o) => o.outcome !== "caught")
                .map((o) => `"${o.text}"`)
                .join(", ")}
              . False positives: {redaction.falsePositives.map((f) => `"${f.text}"`).join(", ")}.
            </p>
            <p>
              With only the meeting contact&apos;s and the user&apos;s names (the{" "}
              <Link href="/methods/decisions/DR-003-redact-before-llm">DR-003</Link> setting), names
              were {contactOnly.categories.find((c) => c.category === "name")!.caught} of{" "}
              {contactOnly.categories.find((c) => c.category === "name")!.labelled} and all details{" "}
              {contactOnly.overall.caught} of {contactOnly.overall.labelled},{" "}
              {ci(contactOnly.overall.recall)}. The address book adds one name, &ldquo;Sam
              Patel&rdquo;, and only because he is one of the directory accounts; the intervals
              overlap almost entirely, so this is a fix for a known leak, not a measured
              improvement. People outside the address book and lone first names are still missed.
              These numbers are optimistic because the same person wrote the rules and the corpus.
            </p>

            <h3>Follow-up suggestions: LLM against a rule-based baseline</h3>
            <p>
              32 synthetic notes with hand-labelled follow-ups, in two splits of 16. A suggestion
              matches a labelled follow-up when it contains a keyword from each of its keyword
              groups (&ldquo;e-mail&rdquo; is read as &ldquo;email&rdquo;; a test checks that every
              labelled follow-up matches its own keywords). Metrics: mean recall per note and mean
              F1 per note with seeded percentile bootstrap intervals (
              {EVAL_RESAMPLES.toLocaleString("en-AU")} resamples, seed {EVAL_SEED}), pooled recall
              and precision with Wilson intervals, and suggestions made on notes with nothing to do.
              F1 is defined on every note (on a note with nothing to do it is 1 for no suggestions
              and 0 for any), so padding the list with guesses does not pay. The two methods are
              compared note by note on the same notes, for recall and for F1: paired bootstrap
              interval of the difference, win / tie / loss counts and an exact sign test. A model
              answer that is invalid, refused or cut off is scored as an empty answer; only
              infrastructure failures (network, rate limits, provider errors) are left out, and they
              are counted in the results and the exports.
            </p>
            <Table
              label="Baseline follow-up results"
              head={[
                "Rule-based baseline",
                "Mean recall per note",
                "Mean F1 per note",
                "Pooled recall",
                "Precision",
                "On no-action notes",
              ]}
              rows={[
                summaryRow("Development split (rules written on it)", dev),
                summaryRow("Held-out split (rules frozen first)", held),
              ]}
            />
            <p>
              The baseline is perfect on the notes it was written against and finds roughly a third
              of the follow-ups in notes it has not seen. That gap is the reason for the split, and
              the held-out row is the one to quote. On the development split every note scored 100%,
              so the bootstrap has no spread and no interval is shown for it; the pooled Wilson
              interval next to it is the honest range.
            </p>
            <p>
              <strong>The LLM side is not published.</strong> The site has no AI budget, so the
              comparison runs in a signed-in visitor&apos;s browser with their own key, in the{" "}
              <Link href="/ai-log/evaluate">evaluation harness</Link>. It uses the assistant&apos;s
              exact prompt ({MEETING_ASSIST_PROMPT_VERSION}), logs every call to the visitor&apos;s
              AI log and exports results as JSON or CSV. Keyword matching under-credits paraphrases,
              so recall is a lower bound for both methods.
            </p>
            <p>
              Parity of the ported 2021 logic is checked separately: the tests load the original
              functions from <code>coursework/</code> and compare outputs, and replay fixtures from
              the team&apos;s Jest suites.
            </p>
          </Section>

          <Section id="ai-use" title="AI use statement">
            <p>
              The app works fully without AI. One optional feature uses a language model: the
              meeting-note assistant on a meeting page, plus the evaluation harness that tests it.
            </p>
            <h3>What AI does</h3>
            <ul>
              <li>Summarises one meeting note in one to three sentences.</li>
              <li>
                Suggests follow-up actions for the note&apos;s author, with timing as written.
              </li>
            </ul>
            <h3>What AI never does</h3>
            <ul>
              <li>
                Make or influence any decision about a person, rank contacts or infer anything
                sensitive.
              </li>
              <li>
                Save anything by itself: every answer is a draft until a person accepts, edits or
                rejects it.
              </li>
              <li>Send messages, create meetings or change contacts.</li>
              <li>Run without a visitor choosing to use it with their own key.</li>
            </ul>
            <h3>Data sent to the provider</h3>
            <ul>
              <li>
                Fixed instructions, the meeting date and the note after redaction (e-mails, phone
                numbers, addresses, the contact&apos;s and user&apos;s names, and the full names of
                everyone in the user&apos;s contacts removed). The visitor sees the exact text
                before sending.
              </li>
              <li>
                Sent from the visitor&apos;s browser straight to the provider they chose: Anthropic
                ({ANTHROPIC_MODELS.map((m) => m.label).join(" by default, or ")}) or OpenAI (model
                id of their choice, default {DEFAULT_OPENAI_MODEL}). The API key stays in the
                browser (sessionStorage unless they opt in to remembering it) and never reaches this
                site.
              </li>
              <li>
                A Content Security Policy (report-only for now) lists the only places the browser
                may connect to: this site, the two AI providers and the map tiles. Violations are
                reported back, so a script sending the key anywhere else would show up.
              </li>
            </ul>
            <h3>Human in the loop and audit trail</h3>
            <ul>
              <li>
                Every output is labelled &ldquo;AI-generated&rdquo;, including after it is accepted.
              </li>
              <li>
                Every call is written to the AI log: the redacted text sent, the answer, the
                requested and served model, latency, token counts and the human decision, which can
                be recorded once. The log is viewable and exportable at <code>/ai-log</code>. The
                administrator sees these rows in <code>/admin/records</code> with the text masked,
                except on the shared demo account.
              </li>
              <li>
                &ldquo;Accepted&rdquo; means the model&apos;s logged answer, unchanged: the server
                saves the answer already in the log and ignores any text sent with an accept. Any
                change is recorded as &ldquo;edited&rdquo;, together with the final text.
              </li>
              <li>
                Limit: entries are reported by the visitor&apos;s browser, because the call never
                passes through this server. The server cannot verify what the provider actually
                returned; it can only check the shape of the entry and refuse anything that looks
                like an API key.
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">
              This design is informed by the Australian Government&apos;s (DTA) policy for the
              responsible use of AI in government, the transparency principles of the EU AI Act and
              the NIST AI Risk Management Framework. It is not a claim of compliance with any of
              them.
            </p>
            <div className="not-prose flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/methods/model-card">
                  <FileText /> Model card
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/methods/decisions/DR-003-redact-before-llm">
                  <ScrollText /> DR-003: redaction before LLM calls
                </Link>
              </Button>
            </div>
          </Section>

          <Section id="privacy" title="Privacy by design">
            <ul>
              <li>
                <strong>Your data page.</strong> Signed-in users can download everything stored
                about them (JSON, plus CSV per table) and hard-delete their account. Deletion
                removes the account and every contact, meeting, link, invitation, demo-inbox e-mail,
                pending code, activity entry and AI-log entry that belongs to it, in one database
                transaction (all of it or none of it). Other people&apos;s contacts that were linked
                to the account keep their own copy, unlinked. One anonymous row (counts only)
                records that a deletion happened.
              </li>
              <li>
                <strong>Activity log.</strong> Append-only: views of contact and meeting pages;
                creates, changes, deletes and exports; sign-ins, sign-outs, sign-ups and password
                resets; profile changes and AI actions. List, search, map and Insights pages are not
                logged as views. It stores ids, field names and counts, never the contents. Entries
                past the retention period are never shown or exported, and are deleted at server
                start and on routine clean-ups.
              </li>
              <li>
                <strong>Ownership.</strong> Every read and write is scoped to the signed-in owner on
                the server.
              </li>
              <li>
                <strong>The public demo admin is untrusted</strong> (
                <Link href="/methods/decisions/DR-005-mask-the-public-demo-admin">DR-005</Link>).
                Anyone can sign in as it, so <code>/admin/records</code> always masks password
                hashes, e-mail codes, invitation links and the inbox browser key, and shows names,
                contact details, notes and AI text only for the seeded demo accounts. Guest and
                registered visitors&apos; rows show ids, timestamps and counts only, and search does
                not look inside them. Every admin view and export is written to the admin
                account&apos;s activity log.
              </li>
            </ul>
            <Table
              label="Data inventory"
              head={["What", "Why", "Kept for"]}
              rows={DATA_INVENTORY.map((d) => [d.what, d.why, d.kept])}
            />
            <ul>
              {NOT_COLLECTED.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Section>

          <Section id="limitations" title="Assumptions and limitations">
            <ul>
              <li>
                <strong>The hosted database was attached late</strong> (
                <Link href="/methods/decisions/DR-007-turso-in-production">DR-007</Link>). The
                live demo now runs on Turso, so writes persist and every serverless instance sees
                them, but the privacy and AI features were built and demonstrated on a local
                production build while production still used a per-instance copy (
                <Link href="/methods/decisions/DR-004-turso-vs-tmp-fallback">DR-004</Link>). The
                functions run in the US and the database in Tokyo, which adds latency to every
                page.
              </li>
              <li>
                The shared <code>demo</code> account is shared: other visitors see its activity log,
                AI log and inbox. Guest sandboxes are private (the demo admin sees only masked rows
                for them) and deleted after 24 hours.
              </li>
              <li>
                Until DR-005, the demo admin could read live password-reset codes and every
                visitor&apos;s notes. That was found in review before this upgrade was merged and
                fixed by masking; it is recorded rather than quietly removed.
              </li>
              <li>
                E-mail verification is simulated by the demo inbox (DR-002); it does not prove that
                anyone owns an address.
              </li>
              <li>
                Evaluation corpora are small, synthetic and written by one person; intervals are
                wide and the redaction results are optimistic.
              </li>
              <li>
                Insights treat weeks as exchangeable and the seed data is synthetic, so the demo
                charts show the method, not real behaviour.
              </li>
            </ul>
          </Section>

          <Section id="decisions" title="Decision records">
            <p>
              Each record follows the same shape: context, the decision (stated first), the options
              considered, why, what happened (including the weak numbers) and what I would change.
              Past records are never edited; a new record supersedes an old one.
            </p>
            <ul className="not-prose grid gap-3 sm:grid-cols-2">
              {decisions.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/methods/decisions/${d.slug}`}
                    className="group block h-full rounded-2xl border bg-card p-4 shadow-(--shadow-soft) transition-shadow hover:shadow-(--shadow-lifted)"
                  >
                    <p className="font-mono text-xs text-muted-foreground">
                      {d.id} · {d.status?.split(",")[0]}
                    </p>
                    <p className="mt-1 font-medium group-hover:text-primary">{d.title}</p>
                    <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{d.summary}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      Read <ArrowRight className="size-3" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/methods/model-card"
                  className="group block h-full rounded-2xl border border-dashed bg-surface p-4 transition-colors hover:bg-card"
                >
                  <p className="font-mono text-xs text-muted-foreground">Model card</p>
                  <p className="mt-1 font-medium group-hover:text-primary">
                    Meeting-note assistant and redactor
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Intended use, data, evaluation with intervals, failure modes and ethical
                    considerations.
                  </p>
                </Link>
              </li>
            </ul>
          </Section>

          <Section id="change" title="What I'd change">
            <ul>
              <li>
                Provision the hosted database first, fail a production deployment that has none,
                and run the functions in the database&apos;s region.
              </li>
              <li>
                Detect names of people outside the address book in the browser before sending, and
                have someone else write a held-out set of notes to evaluate it.
              </li>
              <li>
                Replace the keyword matcher with a pre-registered rubric scored by two people, so
                the follow-up evaluation credits paraphrases fairly.
              </li>
              <li>Add browser end-to-end tests of the main journeys to CI.</li>
              <li>Expire demo-inbox e-mails after a fixed period, like the activity log.</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

function summaryRow(name: string, s: MethodSummary): string[] {
  return [
    name,
    `${ci(s.meanRecall)}, n = ${s.meanRecall?.n ?? 0}`,
    `${ci(s.meanF1)}, n = ${s.meanF1?.n ?? 0}`,
    `${s.pooledRecall ? Math.round(s.pooledRecall.estimate * s.goldItems) : 0} of ${s.goldItems}, ${ci(s.pooledRecall)}`,
    `${ci(s.pooledPrecision)} of ${s.predictions}`,
    String(s.spuriousOnEmptyNotes),
  ];
}

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24">
      <h2 id={`${id}-h`} className="text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {lead && <p className="mt-2 text-muted-foreground">{lead}</p>}
      <div className="doc-prose mt-5 space-y-4 [&_h3]:mt-6">{children}</div>
    </section>
  );
}

function Table({ label, head, rows }: { label: string; head: string[]; rows: string[][] }) {
  return (
    <div
      className="not-prose -mx-1 overflow-x-auto px-1"
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b">
            {head.map((h) => (
              <th key={h} scope="col" className="py-2 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular divide-y align-top">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td
                  key={j}
                  className={cn("py-2 pr-4", j === 0 ? "font-medium" : "text-muted-foreground")}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
