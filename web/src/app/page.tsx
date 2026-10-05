import Link from "next/link";
import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  CalendarDays,
  ChartColumn,
  FolderLock,
  Inbox,
  MapPinned,
  NotebookPen,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { GithubIcon } from "@/components/brand/github-icon";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/common/submit-button";
import { PersonAvatar } from "@/components/common/person-avatar";
import { ThemeIconButton } from "@/components/layout/theme-toggle";
import { MelbourneSketch } from "@/components/landing/melbourne-sketch";
import { guestLoginAction } from "@/server/actions/auth";
import { SITE, TEAM } from "@/lib/site";

const FEATURES = [
  {
    icon: Users,
    title: "A proper address book",
    body: "Multiple phones and e-mails per person, notes, custom fields and an optional photo. Search any field and sort the list, exactly as the 2021 app did.",
  },
  {
    icon: QrCode,
    title: "Swap details with a QR code",
    body: "Every account has its own code. Scan someone else's (camera or photo) or type their user name, and their own profile becomes a linked contact.",
  },
  {
    icon: NotebookPen,
    title: "Meeting records",
    body: "Log who you met, when, and exactly where - pick the spot on a map or search for the venue - plus notes and follow-ups.",
  },
  {
    icon: MapPinned,
    title: "Map and calendar views",
    body: "See every meeting as a pin with a date-range filter, or browse them month by month on a calendar.",
  },
  {
    icon: BadgeCheck,
    title: "Linked contacts stay fresh",
    body: "When a contact has an account, one tap syncs their latest name, phones, e-mails and occupation. Invite the rest by e-mail.",
  },
  {
    icon: ShieldCheck,
    title: "Verified sign-up",
    body: "E-mail verification codes, password reset and invitations - delivered to an on-screen demo inbox instead of a real mailbox.",
  },
  {
    icon: ChartColumn,
    title: "Insights with honest error bars",
    body: "Meetings per week with a seeded bootstrap interval, a weekday-by-hour heatmap, and the people you have not seen in a while.",
  },
  {
    icon: FolderLock,
    title: "Your data, your call",
    body: "Download everything as JSON or CSV, see what was done through your account in an append-only activity log, or delete the account and all of it for good.",
  },
  {
    icon: Sparkles,
    title: "Optional AI, your own key",
    body: "Summarise a meeting note with Claude or OpenAI using your own key. Personal details are removed in your browser first, and nothing is added to the meeting until you accept it.",
  },
];

const NUMBERS = [
  { value: "40", label: "REST endpoints in the Express back-end, ported to Server Actions" },
  { value: "6 → 7", label: "Mongoose models re-modelled as SQLite tables" },
  { value: "21", label: "Jest test files in the original back-end" },
  { value: "375 px", label: "the iPhone X viewport the team designed for" },
];

const STACKS = [
  {
    title: "2021 submission",
    items: [
      "React 16 (Create React App), Material UI, React Router",
      "Express 4 + Mongoose 5 on MongoDB Atlas",
      "Passport local + JWT in localStorage",
      "Google Maps + Places autocomplete",
      "Gmail SMTP via nodemailer",
      "Heroku (API) and Heroku / Netlify (client)",
    ],
  },
  {
    title: "2026 revival",
    items: [
      "Next.js 16 App Router, React 19, Tailwind CSS 4",
      "SQLite via libSQL + Drizzle ORM (Turso in production)",
      "Signed httpOnly session cookies (jose), bcrypt",
      "MapLibre GL + OpenFreeMap tiles, Photon geocoding",
      "Demo inbox stored in the database",
      "Optional bring-your-own-key AI with redaction and an audit log",
      "Vercel, with an offline basemap fallback",
    ],
  },
];

const PREVIEW_PEOPLE = [
  { first: "Ava", last: "Chen", role: "UX researcher", linked: true, seed: "dir_avachen" },
  { first: "Hamish", last: "Okafor", role: "Startup founder", linked: false, seed: "hamish" },
  { first: "Priya", last: "Singh", role: "Physiotherapist", linked: false, seed: "priya" },
  { first: "Sam", last: "Patel", role: "Data scientist", linked: true, seed: "dir_sampatel" },
  { first: "Matilda", last: "Rossi", role: "Architect", linked: false, seed: "matilda" },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="rounded-md" aria-label="4399 CRM home">
            <Logo />
          </Link>
          <nav aria-label="Site" className="flex items-center gap-1 sm:gap-2">
            <a
              href="#features"
              className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Features
            </a>
            <a
              href="#about"
              className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              About
            </a>
            <Link
              href="/methods"
              className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Methods
            </Link>
            <ThemeIconButton />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
            aria-hidden="true"
          />
          <div
            className="absolute top-[-200px] left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
            style={{
              background: "radial-gradient(closest-side, oklch(0.78 0.12 285 / 0.45), transparent)",
            }}
            aria-hidden="true"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-14 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
            <div className="animate-fade-up">
              <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-(--shadow-soft)">
                <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                {SITE.subject} · {SITE.university} · 2021 → revived 2026
              </p>
              <h1 className="mt-6 text-[44px] leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl">
                Remember the people you meet,{" "}
                <span className="font-display font-normal text-primary italic">
                  and where you met them.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
                4399 CRM is a mobile-first personal CRM: an address book, a log of every meeting
                with a place on the map, and QR codes for swapping details in person. Built by Team
                4399 for the University of Melbourne&apos;s IT Project, now running again on a
                modern, free stack.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <form action={guestLoginAction}>
                  <SubmitButton
                    size="lg"
                    className="h-11 px-5 text-[15px]"
                    pendingLabel="Preparing your sandbox…"
                  >
                    <Sparkles aria-hidden="true" /> Try it as a guest
                  </SubmitButton>
                </form>
                <Button asChild size="lg" variant="outline" className="h-11 px-5 text-[15px]">
                  <Link href="/login">
                    Sign in or use the demo <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                No sign-up needed: the guest sandbox is a private copy of 25 contacts and 40
                Melbourne meetings, deleted after 24 hours.
              </p>
            </div>

            <HeroPreview />
          </div>
        </section>

        {/* Brief */}
        <section className="border-y bg-surface/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-primary">The brief</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                What the coursework asked for
              </h2>
            </div>
            <div className="space-y-4 text-muted-foreground lg:col-span-2">
              <p>
                COMP30022 is the University of Melbourne&apos;s capstone IT Project. In Semester 2,
                2021, teams of five worked with a client to design, build, test and deploy a{" "}
                <em>personal customer relationship manager</em>: a web app where someone can keep
                track of the people in their network and their interactions with them, with secure
                accounts, search, and a deployment the client can actually use. Teams ran the
                project in Scrum sprints and handed in the code, tests and documentation.
              </p>
              <p>
                Team 4399 built a phone-first single-page app (designed at 375 × 812, iPhone X)
                backed by a REST API: contacts with any number of phones and e-mails, meeting
                records pinned on Google Maps, QR-code contact exchange, e-mail verification and
                &ldquo;fast register&rdquo; invitations for contacts who weren&apos;t users yet.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">What you can do</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Everything from the original, working again, plus three additions
            </h2>
            <p className="mt-3 text-muted-foreground">
              The search, sorting, validation, duplicate detection and contact-sync rules are ported
              from the 2021 code and covered by parity tests. The 2026 additions (insights, data
              rights and an optional AI assistant) are explained, with their weak spots, on the{" "}
              <Link href="/methods" className="font-medium text-primary hover:underline">
                methods page
              </Link>
              .
            </p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-2xl border bg-card p-5 shadow-(--shadow-soft)">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <f.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Numbers */}
        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <div className="grid overflow-hidden rounded-3xl border bg-card shadow-(--shadow-soft) sm:grid-cols-2 lg:grid-cols-4">
            {NUMBERS.map((n, i) => (
              <div
                key={n.label}
                className={`p-6 ${i > 0 ? "border-t sm:border-t-0 sm:border-l" : ""} ${i === 2 ? "sm:border-t sm:border-l-0 lg:border-t-0 lg:border-l" : ""} ${i === 3 ? "sm:border-t lg:border-t-0" : ""}`}
              >
                <p className="tabular text-4xl font-semibold tracking-tight">{n.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{n.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl border bg-[linear-gradient(135deg,oklch(0.5_0.2_278),oklch(0.42_0.2_290))] px-6 py-12 text-white shadow-(--shadow-lifted) sm:px-12">
            <div className="bg-dots absolute inset-0 opacity-30" aria-hidden="true" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">Take it for a spin</h2>
                <p className="mt-3 max-w-xl text-white/80">
                  Open your own guest sandbox, add someone by scanning a QR code, log a meeting on
                  the map, then check the demo inbox when you sign up or invite a contact.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <form action={guestLoginAction}>
                  <SubmitButton
                    size="lg"
                    variant="secondary"
                    className="h-11 px-5"
                    pendingLabel="Preparing…"
                  >
                    <Sparkles aria-hidden="true" /> Try as guest
                  </SubmitButton>
                </form>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="h-11 px-5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/signup">Create an account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="scroll-mt-20 border-t">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-sm font-medium text-primary">About this project</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{SITE.subject}</h2>
              <dl className="mt-6 space-y-3 text-sm">
                <AboutRow label="University">{SITE.university}</AboutRow>
                <AboutRow label="Offering">{SITE.term}</AboutRow>
                <AboutRow label="Team">{SITE.team}</AboutRow>
                <AboutRow label="Source">
                  <a
                    href={SITE.repo}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <GithubIcon className="size-3.5" />{" "}
                    rNLKJA/Personal-Customer-Relation-Management-PCRM
                  </a>
                </AboutRow>
              </dl>
              <h3 className="mt-10 text-sm font-semibold">Team 4399</h3>
              <ul className="mt-3 space-y-2.5">
                {TEAM.map((m) => (
                  <li key={m.name} className="flex items-center gap-3">
                    <PersonAvatar
                      firstName={m.name.split(" ")[0]}
                      lastName={m.name.split(" ").at(-1)}
                      seed={m.name}
                      size="sm"
                    />
                    <span className="text-sm">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-muted-foreground"> · {m.role}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
                Academic integrity: the original 2021 submission is preserved unchanged (apart from
                removed credentials) in the repository&apos;s{" "}
                <code className="font-mono">coursework/</code> folder for reference. This revival is
                a portfolio piece, not a resubmission.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {STACKS.map((s, i) => (
                <div
                  key={s.title}
                  className={`rounded-2xl border p-5 ${i === 1 ? "bg-card shadow-(--shadow-soft)" : "bg-surface"}`}
                >
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    {i === 1 ? (
                      <Sparkles className="size-4 text-primary" aria-hidden="true" />
                    ) : (
                      <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    {s.title}
                  </h3>
                  <ul className="mt-4 space-y-2.5">
                    {s.items.map((item) => (
                      <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                        <span
                          className={`mt-2 size-1.5 shrink-0 rounded-full ${i === 1 ? "bg-primary" : "bg-muted-foreground/50"}`}
                          aria-hidden="true"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="rounded-2xl border bg-card p-5 shadow-(--shadow-soft) sm:col-span-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Inbox className="size-4 text-primary" aria-hidden="true" /> What changed on the
                  way back
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  The MongoDB Atlas cluster, Gmail account and Google Maps key are gone (and their
                  old credentials are never used). Data now lives in SQLite, e-mails go to a demo
                  inbox, maps use free OpenStreetMap-based services, and avatars are generated
                  initials instead of uploaded photos.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground sm:px-8">
          <span>
            {SITE.name} · {SITE.team} · {SITE.university}
          </span>
          <span className="flex items-center gap-4">
            <Link href="/methods" className="hover:text-foreground">
              Methods and decisions
            </Link>
            <a href={SITE.repo} className="inline-flex items-center gap-1 hover:text-foreground">
              <GithubIcon className="size-3.5" /> GitHub
            </a>
            <span>Map data © OpenStreetMap contributors</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

function AboutRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[520px] lg:mx-0" aria-hidden="true">
      <div className="absolute top-6 right-0 left-10 overflow-hidden rounded-3xl border bg-card shadow-(--shadow-soft)">
        <MelbourneSketch className="h-auto w-full text-foreground" />
      </div>
      <div className="relative z-10 mt-24 ml-0 w-[250px] overflow-hidden rounded-[34px] border-[6px] border-[oklch(0.25_0.02_275)] bg-background shadow-(--shadow-lifted) sm:w-[270px]">
        <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[10px] font-semibold">
          <span>9:41</span>
          <span className="h-1.5 w-14 rounded-full bg-foreground/80" />
          <span>5G</span>
        </div>
        <div className="px-4 pt-2 pb-3">
          <p className="text-[15px] font-semibold tracking-tight">Contacts</p>
          <div className="mt-2 rounded-lg bg-muted px-2.5 py-1.5 text-[11px] text-muted-foreground">
            Search contacts
          </div>
          <ul className="mt-2">
            {PREVIEW_PEOPLE.map((p) => (
              <li key={p.first} className="flex items-center gap-2.5 py-1.5">
                <PersonAvatar firstName={p.first} lastName={p.last} seed={p.seed} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[12px] font-medium">
                    {p.first} {p.last}
                    {p.linked && <BadgeCheck className="size-3 text-primary" />}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">{p.role}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-5 border-t bg-background px-1 py-2">
          {[Users, NotebookPen, MapPinned, CalendarDays, AtSign].map((Icon, i) => (
            <span
              key={i}
              className={`flex justify-center ${i === 0 ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="size-4" />
            </span>
          ))}
        </div>
      </div>
      <div className="absolute right-6 bottom-10 z-20 hidden w-[230px] rounded-2xl border bg-card p-3 shadow-(--shadow-lifted) sm:block">
        <div className="flex items-center gap-2">
          <PersonAvatar firstName="Ava" lastName="Chen" seed="dir_avachen" size="sm" />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold">Coffee with Ava</p>
            <p className="text-[10px] text-muted-foreground">Thu 14:30 · State Library Victoria</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
          Talked UX research methods - send the slides by Friday.
        </p>
      </div>
    </div>
  );
}
