import type { RedactionCategory } from "./redact";

/**
 * Labelled evaluation corpus for the redactor: short, synthetic meeting notes
 * written in the style of the app's notes. Every detail is fictional:
 * e-mails use the reserved example.* domains, Australian phone numbers come
 * from ACMA's ranges for fiction (0491 570 xxx - 0491 579 xxx, (03) 5550 xxxx,
 * 1300 975 707 - 1300 975 711), the UK number from Ofcom's drama range, and
 * the streets are invented.
 *
 * `known` lists the names the app would pass to the redactor for that note
 * (the meeting contact). Names of anyone else are labelled too, because they
 * are personal information the redactor is NOT able to find - the evaluation
 * reports that miss rather than hiding it.
 *
 * Bias warning: the rules and this corpus were written by the same person, so
 * the measured recall is optimistic. Notes 8, 9, 13, 17, 23, 30 and 31 are
 * deliberate false-positive traps; 10, 11, 15 and 22 contain formats the
 * rules were not designed for.
 */

export interface LabelledSpan {
  category: RedactionCategory;
  /** Exact substring of the note (each appears once in its note). */
  text: string;
}

export interface LabelledNote {
  id: number;
  text: string;
  known: string[];
  labels: LabelledSpan[];
}

export const REDACTION_CORPUS: LabelledNote[] = [
  {
    id: 1,
    text: "Coffee with Priya Sharma. Her new email is priya.sharma@example.com and she prefers texts to 0491 570 159.",
    known: ["Priya", "Sharma"],
    labels: [
      { category: "name", text: "Priya Sharma" },
      { category: "email", text: "priya.sharma@example.com" },
      { category: "phone", text: "0491 570 159" },
    ],
  },
  {
    id: 2,
    text: "Call Tomas back on (03) 5550 1234 after 3pm about the open data grant.",
    known: ["Tomas", "Novak"],
    labels: [
      { category: "name", text: "Tomas" },
      { category: "phone", text: "(03) 5550 1234" },
    ],
  },
  {
    id: 3,
    text: "Dropped the book at 14 Wattlebird Lane, Northcote VIC 3070. Leila says thanks.",
    known: ["Hamish", "Okafor"],
    labels: [
      { category: "address", text: "14 Wattlebird Lane, Northcote VIC 3070" },
      { category: "name", text: "Leila" },
    ],
  },
  {
    id: 4,
    text: "Mobile is +61 491 570 006, work line +61 3 5550 9876.",
    known: ["Ava", "Chen"],
    labels: [
      { category: "phone", text: "+61 491 570 006" },
      { category: "phone", text: "+61 3 5550 9876" },
    ],
  },
  {
    id: 5,
    text: "Send the slides to hamish@example.org and cc events-team@example.net before Friday.",
    known: ["Hamish", "Okafor"],
    labels: [
      { category: "email", text: "hamish@example.org" },
      { category: "email", text: "events-team@example.net" },
    ],
  },
  {
    id: 6,
    text: "Meeting moved to Level 2, 100 Quandong Court, Carlton because of the renovation.",
    known: ["Harper", "Nguyen"],
    labels: [{ category: "address", text: "Level 2, 100 Quandong Court, Carlton" }],
  },
  {
    id: 7,
    text: "Her office is now Unit 4/27 Banksia Parade, Brunswick East - ring the bell twice.",
    known: ["Sienna", "Walsh"],
    labels: [{ category: "address", text: "Unit 4/27 Banksia Parade, Brunswick East" }],
  },
  {
    id: 8,
    text: "We tried the 3 Collins Street cafes she recommended - all great.",
    known: ["Isla", "Murphy"],
    labels: [],
  },
  {
    id: 9,
    text: "Budget is $1,200,000 over 2024-2026; quote ABN 51 824 753 556 on the invoice.",
    known: ["Arjun", "Mehta"],
    labels: [],
  },
  {
    id: 10,
    text: "Reach Mateo at mateo dot lopez at example dot com - he avoids spam filters.",
    known: ["Mateo", "Lopez"],
    labels: [
      { category: "name", text: "Mateo" },
      { category: "email", text: "mateo dot lopez at example dot com" },
    ],
  },
  {
    id: 11,
    text: "Her number is 0491 five seven zero 313, she spelled it out over the noise.",
    known: ["Charlotte", "Byrne"],
    labels: [{ category: "phone", text: "0491 five seven zero 313" }],
  },
  {
    id: 12,
    text: "Kai's partner Sienna can be reached on 0491-571-266 for the venue booking.",
    known: ["Kai", "Tanaka"],
    labels: [
      { category: "name", text: "Kai" },
      { category: "name", text: "Sienna" },
      { category: "phone", text: "0491-571-266" },
    ],
  },
  {
    id: 13,
    text: "Follow up next Tuesday at 10:30. Room 12 is booked for an hour.",
    known: ["Oliver", "Grant"],
    labels: [],
  },
  {
    id: 14,
    text: "Post the prototype to PO Box 4471, Fitzroy VIC 3065 when it is ready.",
    known: ["Lucas", "Ferreira"],
    labels: [{ category: "address", text: "PO Box 4471, Fitzroy VIC 3065" }],
  },
  {
    id: 15,
    text: "Lives near the corner of Lygon and Elgin streets, number 9, happy to meet there.",
    known: ["Matilda", "Rossi"],
    labels: [{ category: "address", text: "corner of Lygon and Elgin streets, number 9" }],
  },
  {
    id: 16,
    text: "Arjun asked me to update his number to 0491572549 and drop the old 0491 570 737.",
    known: ["Arjun", "Mehta"],
    labels: [
      { category: "name", text: "Arjun" },
      { category: "phone", text: "0491572549" },
      { category: "phone", text: "0491 570 737" },
    ],
  },
  {
    id: 17,
    text: "Order #1300 4471 is still pending; chase the supplier next week.",
    known: ["Amelia", "Watson"],
    labels: [],
  },
  {
    id: 18,
    text: "Their support line is 1300 975 707 if the login breaks again.",
    known: ["Leila", "Haddad"],
    labels: [{ category: "phone", text: "1300 975 707" }],
  },
  {
    id: 19,
    text: "Amelia's work email bounced: amelia.w@example.co - ask for the new one.",
    known: ["Amelia", "Watson"],
    labels: [
      { category: "name", text: "Amelia" },
      { category: "email", text: "amelia.w@example.co" },
    ],
  },
  {
    id: 20,
    text: "Intro to Oliver (oliver_k+crm@example.com) for the hiring panel.",
    known: ["Matilda", "Rossi"],
    labels: [
      { category: "name", text: "Oliver" },
      { category: "email", text: "oliver_k+crm@example.com" },
    ],
  },
  {
    id: 21,
    text: "Visited the studio at 8 Ironbark Road, Coburg North 3058 - bring coins for parking.",
    known: ["Tomas", "Novak"],
    labels: [{ category: "address", text: "8 Ironbark Road, Coburg North 3058" }],
  },
  {
    id: 22,
    text: "Call (+61) 0491 573 770; she is travelling until the 12th.",
    known: ["Harper", "Nguyen"],
    labels: [{ category: "phone", text: "(+61) 0491 573 770" }],
  },
  {
    id: 23,
    text: "Notes from Harper: version 2.3.1 ships on 12.10.2026, demo at 9.30.",
    known: ["Harper", "Nguyen"],
    labels: [{ category: "name", text: "Harper" }],
  },
  {
    id: 24,
    text: "Isla moved to 5/18 Grevillea Crescent, Preston. New landline 03 5550 4410.",
    known: ["Isla", "Murphy"],
    labels: [
      { category: "name", text: "Isla" },
      { category: "address", text: "5/18 Grevillea Crescent, Preston" },
      { category: "phone", text: "03 5550 4410" },
    ],
  },
  {
    id: 25,
    text: "Emailed lucas.n@example.net twice with no reply. Try his mobile 0491 574 118 on Monday.",
    known: ["Lucas", "Ferreira"],
    labels: [
      { category: "email", text: "lucas.n@example.net" },
      { category: "phone", text: "0491 574 118" },
    ],
  },
  {
    id: 26,
    text: "Matilda's flat: Apartment 1203, 45 Kurrajong Street, Southbank. Parking under the building.",
    known: ["Matilda", "Rossi"],
    labels: [
      { category: "name", text: "Matilda" },
      { category: "address", text: "Apartment 1203, 45 Kurrajong Street, Southbank" },
    ],
  },
  {
    id: 27,
    text: "Meet at the Federation Square steps, then walk to 2 Swanston St for lunch.",
    known: ["Kai", "Tanaka"],
    labels: [{ category: "address", text: "2 Swanston St" }],
  },
  {
    id: 28,
    text: "Charlotte said to text 04 9157 0156 rather than call during work hours.",
    known: ["Charlotte", "Byrne"],
    labels: [
      { category: "name", text: "Charlotte" },
      { category: "phone", text: "04 9157 0156" },
    ],
  },
  {
    id: 29,
    text: "Use WhatsApp on +44 7700 900123 while she is in London for the conference.",
    known: ["Sienna", "Walsh"],
    labels: [{ category: "phone", text: "+44 7700 900123" }],
  },
  {
    id: 30,
    text: "No contact details exchanged; just a great chat about climate tech and 2 Way radios.",
    known: ["Oliver", "Grant"],
    labels: [],
  },
  {
    id: 31,
    text: "Her handle is @priya_designs on most platforms; the 4 Lanes Festival is in March.",
    known: ["Priya", "Sharma"],
    labels: [],
  },
  {
    id: 32,
    text: "Sent the invoice to accounts@example.com.au; phone queries go to 0491 575 254 ext. 12.",
    known: ["Leila", "Haddad"],
    labels: [
      { category: "email", text: "accounts@example.com.au" },
      { category: "phone", text: "0491 575 254" },
    ],
  },
  {
    id: 33,
    text: "Dinner with Hamish Okafor and his sister Grace Okafor at their place on Saturday.",
    known: ["Hamish", "Okafor"],
    labels: [
      { category: "name", text: "Hamish Okafor" },
      { category: "name", text: "Grace Okafor" },
    ],
  },
  {
    id: 34,
    text: "Leila Haddad wants the reading list; her partner Sam Patel is starting a PhD.",
    known: ["Leila", "Haddad"],
    labels: [
      { category: "name", text: "Leila Haddad" },
      { category: "name", text: "Sam Patel" },
    ],
  },
];
