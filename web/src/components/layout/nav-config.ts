import {
  CalendarDays,
  CircleUser,
  Database,
  House,
  Inbox,
  Map as MapIcon,
  NotebookPen,
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
  { href: "/inbox", label: "Demo inbox", icon: Inbox },
  { href: "/profile", label: "Profile", icon: CircleUser },
];

export const ADMIN_NAV: NavItem = { href: "/admin/records", label: "Records admin", icon: Database };

export const MOBILE_TABS: NavItem[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/records", label: "Meetings", icon: NotebookPen, match: ["/calendar"] },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/profile", label: "Me", icon: CircleUser, match: ["/inbox", "/admin"] },
];

export function isActive(pathname: string, item: NavItem): boolean {
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
