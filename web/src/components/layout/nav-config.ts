import {
  CalendarDays,
  ChartColumn,
  CircleUser,
  Database,
  FolderLock,
  History,
  House,
  Inbox,
  Map as MapIcon,
  NotebookPen,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that count as "active" for this item. */
  match?: string[];
}

export const SIDEBAR_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/records", label: "Meetings", icon: NotebookPen },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/insights", label: "Insights", icon: ChartColumn },
  { href: "/inbox", label: "Demo inbox", icon: Inbox },
  { href: "/profile", label: "Profile", icon: CircleUser },
];

/** "Privacy & AI" group: data rights, the access log and the AI audit trail. */
export const PRIVACY_NAV: NavItem[] = [
  { href: "/your-data", label: "Your data", icon: FolderLock },
  { href: "/activity", label: "Activity log", icon: History },
  { href: "/ai-log", label: "AI log", icon: Sparkles },
];

export const ADMIN_NAV: NavItem = {
  href: "/admin/records",
  label: "Records admin",
  icon: Database,
};

export const MOBILE_TABS: NavItem[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/records", label: "Meetings", icon: NotebookPen, match: ["/calendar", "/insights"] },
  { href: "/map", label: "Map", icon: MapIcon },
  {
    href: "/profile",
    label: "Me",
    icon: CircleUser,
    match: ["/inbox", "/admin", "/your-data", "/activity", "/ai-log"],
  },
];

export function isActive(pathname: string, item: NavItem): boolean {
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
