/**
 * Gold-standard corpus for the follow-up evaluation harness: synthetic meeting
 * notes (already redacted, in the style of the app's notes) with the next
 * actions a careful reader would list for the note's author.
 *
 * Each gold item is matched by keyword groups: a suggested follow-up matches
 * when it contains at least one keyword (as a word prefix) from EVERY group.
 * This is a cheap, transparent proxy for "same action", not a semantic judge;
 * it under-credits paraphrases (e.g. "circulate" vs "send"), which is why each
 * group lists common synonyms. Actions that belong to the other person
 * ("she'll intro me") are not gold items.
 *
 * Two splits:
 * - "development" (ids 1-16): the rule-based baseline was written while
 *   looking at these notes, so its score here is optimistic by construction.
 * - "held-out" (ids 101-116): written after the baseline rules were frozen and
 *   never used to change them. This is the split to quote. It was still
 *   written by the same author as the rules, so it is not fully independent.
 */

export interface GoldFollowUp {
  label: string;
  groups: string[][];
}

export type Split = "development" | "held-out";

export interface FollowUpNote {
  id: number;
  split: Split;
  meetingDay: string;
  note: string;
  gold: GoldFollowUp[];
}

export const FOLLOW_UP_CORPUS: FollowUpNote[] = [
  {
    id: 1,
    split: "development",
    meetingDay: "Mon 3 Aug 2026",
    note: "Coffee catch-up with [NAME]. Talked about design systems; promised to send over the slides by Friday. She'll intro me to her manager next week.",
    gold: [
      {
        label: "Send the slides",
        groups: [
          ["send", "share", "email"],
          ["slide", "deck"],
        ],
      },
    ],
  },
  {
    id: 2,
    split: "development",
    meetingDay: "Tue 4 Aug 2026",
    note: "Mentoring session about career moves. Next step: review their portfolio and give written feedback before the 20th.",
    gold: [
      {
        label: "Review the portfolio",
        groups: [["review", "feedback", "look", "read"], ["portfolio"]],
      },
    ],
  },
  {
    id: 3,
    split: "development",
    meetingDay: "Wed 5 Aug 2026",
    note: "Quick lunch - shared notes on open data. Follow up in two weeks about the grant application.",
    gold: [
      {
        label: "Follow up on the grant",
        groups: [
          ["follow", "check", "chase", "catch"],
          ["grant", "application"],
        ],
      },
    ],
  },
  {
    id: 4,
    split: "development",
    meetingDay: "Thu 6 Aug 2026",
    note: "Brainstormed climate tech over a flat white. I need to book a meeting room for the workshop and email the agenda to everyone.",
    gold: [
      { label: "Book a meeting room", groups: [["book", "reserve"], ["room"]] },
      { label: "Email the agenda", groups: [["email", "send", "share", "circulate"], ["agenda"]] },
    ],
  },
  {
    id: 5,
    split: "development",
    meetingDay: "Fri 7 Aug 2026",
    note: "Great chat about photography with [NAME]; no next steps, just keeping in touch.",
    gold: [],
  },
  {
    id: 6,
    split: "development",
    meetingDay: "Mon 10 Aug 2026",
    note: "Walked through the IT project together. Owes me the repo link. I should set up the CI pipeline and add tests for the parser.",
    gold: [
      {
        label: "Set up the CI pipeline",
        groups: [
          ["set", "configure", "create", "build"],
          ["ci", "pipeline"],
        ],
      },
      { label: "Add parser tests", groups: [["test"], ["parser"]] },
    ],
  },
  {
    id: 7,
    split: "development",
    meetingDay: "Tue 11 Aug 2026",
    note: "Met at a meetup on accessibility. Remember to connect on LinkedIn and send the WCAG checklist.",
    gold: [
      { label: "Connect on LinkedIn", groups: [["connect", "add", "follow"], ["linkedin"]] },
      {
        label: "Send the WCAG checklist",
        groups: [
          ["send", "share", "email"],
          ["checklist", "wcag"],
        ],
      },
    ],
  },
  {
    id: 8,
    split: "development",
    meetingDay: "Wed 12 Aug 2026",
    note: "Hiring chat. Action: forward the job ad to [NAME] and ask [NAME] for two referees by Monday.",
    gold: [
      {
        label: "Forward the job ad",
        groups: [
          ["forward", "send", "share"],
          ["job", "ad"],
        ],
      },
      {
        label: "Ask for referees",
        groups: [
          ["ask", "request", "get", "collect"],
          ["referee", "reference"],
        ],
      },
    ],
  },
  {
    id: 9,
    split: "development",
    meetingDay: "Thu 13 Aug 2026",
    note: "Caught up after a long time. Moving teams soon, keen on machine learning. Will recommend a couple of books and check in after their first month.",
    gold: [
      {
        label: "Recommend books",
        groups: [
          ["recommend", "send", "share", "suggest"],
          ["book", "reading"],
        ],
      },
      { label: "Check in after a month", groups: [["check", "catch", "follow"], ["month"]] },
    ],
  },
  {
    id: 10,
    split: "development",
    meetingDay: "Fri 14 Aug 2026",
    note: "Planning session for the board games night; prep the score sheets beforehand and confirm the venue with [NAME].",
    gold: [
      {
        label: "Prepare score sheets",
        groups: [
          ["prep", "print", "make"],
          ["score", "sheet"],
        ],
      },
      { label: "Confirm the venue", groups: [["confirm", "book", "check"], ["venue"]] },
    ],
  },
  {
    id: 11,
    split: "development",
    meetingDay: "Mon 17 Aug 2026",
    note: "Talked about public transport apps. They asked for feedback on the prototype - test it on my commute this week and write up issues.",
    gold: [
      {
        label: "Test the prototype",
        groups: [
          ["test", "try", "use"],
          ["prototype", "app", "commute"],
        ],
      },
      {
        label: "Write up issues",
        groups: [
          ["write", "list", "send", "document", "report", "share"],
          ["issue", "feedback", "bug"],
        ],
      },
    ],
  },
  {
    id: 12,
    split: "development",
    meetingDay: "Tue 18 Aug 2026",
    note: "Intro chat - they want to hear about UX research. Nothing agreed yet.",
    gold: [],
  },
  {
    id: 13,
    split: "development",
    meetingDay: "Wed 19 Aug 2026",
    note: "Lunch with [NAME]. Pay back the $25 for lunch, and send the podcast episode we discussed.",
    gold: [
      {
        label: "Pay back $25",
        groups: [
          ["pay", "repay", "transfer", "reimburse"],
          ["25", "lunch", "back"],
        ],
      },
      {
        label: "Send the podcast episode",
        groups: [
          ["send", "share"],
          ["podcast", "episode"],
        ],
      },
    ],
  },
  {
    id: 14,
    split: "development",
    meetingDay: "Thu 20 Aug 2026",
    note: "Discussed the Melbourne food scene. Try the dumpling place they recommended and report back.",
    gold: [
      { label: "Try the dumpling place", groups: [["try", "visit", "go", "eat"], ["dumpling"]] },
      {
        label: "Report back",
        groups: [
          ["report", "tell", "let", "share", "feedback"],
          ["back", "know", "them", "verdict", "thought"],
        ],
      },
    ],
  },
  {
    id: 15,
    split: "development",
    meetingDay: "Fri 21 Aug 2026",
    note: "Sprint review for the side project. Fix the login bug before Thursday's demo; also renew the domain name.",
    gold: [
      {
        label: "Fix the login bug",
        groups: [
          ["fix", "resolve", "debug"],
          ["login", "bug"],
        ],
      },
      { label: "Renew the domain", groups: [["renew", "extend", "pay"], ["domain"]] },
    ],
  },
  {
    id: 16,
    split: "development",
    meetingDay: "Mon 24 Aug 2026",
    note: "Coffee to talk career moves. I promised to proofread their cover letter tonight.",
    gold: [
      {
        label: "Proofread the cover letter",
        groups: [
          ["proofread", "review", "read", "check", "edit"],
          ["cover", "letter"],
        ],
      },
    ],
  },
  // ---- held-out split: written after the baseline was frozen ----
  {
    id: 101,
    split: "held-out",
    meetingDay: "Mon 7 Sep 2026",
    note: "Bumped into [NAME] at the conference. Owe her an email with the dataset link. Lovely catch-up otherwise.",
    gold: [
      {
        label: "E-mail the dataset link",
        groups: [
          ["email", "send", "share"],
          ["dataset", "link", "data"],
        ],
      },
    ],
  },
  {
    id: 102,
    split: "held-out",
    meetingDay: "Tue 8 Sep 2026",
    note: "Long walk along the Yarra with [NAME]. He's applying for the policy role - I offered to look over his application before it closes on the 30th.",
    gold: [
      {
        label: "Look over the application",
        groups: [["look", "review", "read", "check", "proofread", "feedback"], ["application"]],
      },
    ],
  },
  {
    id: 103,
    split: "held-out",
    meetingDay: "Wed 9 Sep 2026",
    note: "Drinks after work. Organise the team trivia night for next month - get a list of dates out by Wednesday.",
    gold: [
      {
        label: "Organise the trivia night",
        groups: [
          ["organise", "organize", "plan", "book", "arrange"],
          ["trivia", "night"],
        ],
      },
      {
        label: "Send out possible dates",
        groups: [["send", "get", "share", "circulate", "list", "propose"], ["date"]],
      },
    ],
  },
  {
    id: 104,
    split: "held-out",
    meetingDay: "Thu 10 Sep 2026",
    note: "Quick call. [NAME] is going to send me the contract draft; nothing for me to do until it arrives.",
    gold: [],
  },
  {
    id: 105,
    split: "held-out",
    meetingDay: "Fri 11 Sep 2026",
    note: "Lunch at the market. Gave [NAME] my thoughts on the pitch. To do: book a follow-up for early December and introduce her to the angel investor I met in June.",
    gold: [
      {
        label: "Book a follow-up in December",
        groups: [
          ["book", "schedule", "arrange", "set"],
          ["follow", "meeting", "catch", "december"],
        ],
      },
      {
        label: "Introduce her to the investor",
        groups: [
          ["intro", "connect"],
          ["investor", "angel"],
        ],
      },
    ],
  },
  {
    id: 106,
    split: "held-out",
    meetingDay: "Mon 14 Sep 2026",
    note: "Mentor session. My homework: read chapter 3 of the stats book and redo the bootstrap exercise.",
    gold: [
      {
        label: "Read chapter 3",
        groups: [
          ["read", "finish"],
          ["chapter", "book"],
        ],
      },
      {
        label: "Redo the bootstrap exercise",
        groups: [
          ["redo", "do", "complete", "finish", "attempt"],
          ["exercise", "bootstrap"],
        ],
      },
    ],
  },
  {
    id: 107,
    split: "held-out",
    meetingDay: "Tue 15 Sep 2026",
    note: "Coffee with [NAME], who just moved to Melbourne. Could send her the list of climbing gyms. Maybe invite her to Saturday's bouldering session too.",
    gold: [
      {
        label: "Send the climbing gym list",
        groups: [
          ["send", "share", "email"],
          ["gym", "climbing", "list"],
        ],
      },
      {
        label: "Invite her to bouldering",
        groups: [
          ["invite", "ask"],
          ["boulder", "session", "saturday"],
        ],
      },
    ],
  },
  {
    id: 108,
    split: "held-out",
    meetingDay: "Wed 16 Sep 2026",
    note: "Interview debrief with the panel. Feedback forms are due Friday - must submit mine, and chase [NAME] for hers.",
    gold: [
      {
        label: "Submit my feedback form",
        groups: [
          ["submit", "send", "complete", "fill"],
          ["feedback", "form", "mine"],
        ],
      },
      {
        label: "Chase the colleague for hers",
        groups: [
          ["chase", "remind", "ask", "follow"],
          ["name", "her", "form", "feedback"],
        ],
      },
    ],
  },
  {
    id: 109,
    split: "held-out",
    meetingDay: "Thu 17 Sep 2026",
    note: "Caught up with [NAME] about her startup. Didn't agree on anything specific; she'll keep me posted.",
    gold: [],
  },
  {
    id: 110,
    split: "held-out",
    meetingDay: "Fri 18 Sep 2026",
    note: "Dinner. Promised [NAME] I'd water the plants while they're away from the 5th to the 12th, and pick up the spare key on Thursday.",
    gold: [
      { label: "Water the plants", groups: [["water"], ["plant"]] },
      { label: "Pick up the spare key", groups: [["pick", "collect", "get"], ["key"]] },
    ],
  },
  {
    id: 111,
    split: "held-out",
    meetingDay: "Mon 21 Sep 2026",
    note: "Product sync. Next: draft the survey questions, get sign-off from legal, then run a pilot with 20 users.",
    gold: [
      {
        label: "Draft the survey",
        groups: [
          ["draft", "write", "prepare"],
          ["survey", "question"],
        ],
      },
      {
        label: "Get legal sign-off",
        groups: [
          ["get", "seek", "ask", "request", "obtain"],
          ["legal", "sign"],
        ],
      },
      { label: "Run a pilot", groups: [["run", "launch", "start", "conduct"], ["pilot"]] },
    ],
  },
  {
    id: 112,
    split: "held-out",
    meetingDay: "Tue 22 Sep 2026",
    note: "Lunch with [NAME]. Reminder to self - renew my working with children check before it expires in November.",
    gold: [
      {
        label: "Renew the WWC check",
        groups: [
          ["renew", "update", "apply"],
          ["working", "check", "wwc", "children"],
        ],
      },
    ],
  },
  {
    id: 113,
    split: "held-out",
    meetingDay: "Wed 23 Sep 2026",
    note: "Ran into [NAME] on the tram. He recommended a book on causal inference; worth buying.",
    gold: [
      {
        label: "Buy the book",
        groups: [
          ["buy", "get", "order", "read", "purchase"],
          ["book", "causal"],
        ],
      },
    ],
  },
  {
    id: 114,
    split: "held-out",
    meetingDay: "Thu 24 Sep 2026",
    note: "Workshop planning. [NAME] takes care of catering. I'm on slides and the room booking.",
    gold: [
      {
        label: "Make the slides",
        groups: [["make", "prepare", "create", "draft", "do", "write", "prep"], ["slide"]],
      },
      { label: "Book the room", groups: [["book", "reserve", "arrange"], ["room"]] },
    ],
  },
  {
    id: 115,
    split: "held-out",
    meetingDay: "Fri 25 Sep 2026",
    note: "Coffee. Nothing actionable but good to reconnect after so long.",
    gold: [],
  },
  {
    id: 116,
    split: "held-out",
    meetingDay: "Mon 28 Sep 2026",
    note: "Volunteering briefing. Let [NAME] know if I can do the Sunday shift; also need a police check uploaded to the portal.",
    gold: [
      {
        label: "Tell them about the Sunday shift",
        groups: [
          ["let", "tell", "confirm", "reply", "respond", "message"],
          ["sunday", "shift", "know", "availability"],
        ],
      },
      {
        label: "Upload the police check",
        groups: [
          ["upload", "submit", "get", "complete"],
          ["police", "check"],
        ],
      },
    ],
  },
];
