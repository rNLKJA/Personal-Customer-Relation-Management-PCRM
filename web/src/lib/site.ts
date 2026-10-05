/** Static facts about the project used across the site. */
export const SITE = {
  name: "4399 CRM",
  tagline: "A personal CRM for the people you meet",
  description:
    "A revived COMP30022 IT Project (University of Melbourne, 2021): a mobile-first personal CRM for contacts, geo-tagged meetings, a map and a calendar.",
  /** Canonical production URL (absolute URLs in metadata / Open Graph). */
  url: "https://comp30022-personal-crm.vercel.app",
  repo: "https://github.com/rNLKJA/Personal-Customer-Relation-Management-PCRM",
  originalRepo: "https://github.com/Harrison-Huang666/COMP30022-49",
  subject: "COMP30022 IT Project",
  university: "The University of Melbourne",
  term: "2021, Semester 2",
  team: "Team 4399 (Group 49)",
} as const;

export const TEAM = [
  { name: "Bin Liang", role: "Back-end lead" },
  { name: "Hongji (Harrison) Huang", role: "Communication lead, original repository owner" },
  { name: "Wei Zhao", role: "Front-end lead" },
  { name: "Yixiao Tian", role: "Communication lead" },
  { name: "Sunchuangyu (Rin) Huang", role: "Scrum Master, front-end (contacts, records, map)" },
] as const;
