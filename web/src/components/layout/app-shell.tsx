"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Inbox, LogOut, Plus, QrCode, UserPlus, NotebookPen } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { PersonAvatar } from "@/components/common/person-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/server/actions/auth";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, MOBILE_TABS, SIDEBAR_NAV, isActive, type NavItem } from "./nav-config";
import { ThemeIconButton, ThemeToggle } from "./theme-toggle";

export interface ShellUser {
  userName: string;
  firstName: string | null;
  lastName: string | null;
  portrait: string | null;
  role: "user" | "admin";
}

export function AppShell({
  user,
  unread,
  notice,
  children,
}: {
  user: ShellUser;
  unread: number;
  notice?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const unreadLive = useUnreadCount(unread);
  const nav = user.role === "admin" ? [...SIDEBAR_NAV, ADMIN_NAV] : SIDEBAR_NAV;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.userName;

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/home" className="rounded-md" aria-label="4399 CRM home">
            <Logo />
          </Link>
        </div>
        <QuickAdd className="mx-3 mb-3" />
        <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {nav.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActive(pathname, item)}
              badge={item.href === "/inbox" ? unreadLive : 0}
            />
          ))}
        </nav>
        <div className="space-y-3 border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <UserMenu user={user} displayName={displayName} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur-xl lg:hidden">
          <Link href="/home" aria-label="4399 CRM home" className="rounded-md">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeIconButton />
            <Link
              href="/inbox"
              aria-label={unreadLive ? `Demo inbox, ${unreadLive} unread` : "Demo inbox"}
              className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Inbox className="size-4" />
              {unreadLive > 0 && (
                <span className="absolute top-1 right-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 font-semibold text-primary-foreground">
                  {unreadLive}
                </span>
              )}
            </Link>
            <QuickAdd compact />
          </div>
        </header>

        {notice}

        <main
          id="main"
          className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16"
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Main"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/90 px-1 pt-1.5 backdrop-blur-xl lg:hidden"
      >
        {MOBILE_TABS.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg py-1 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  active && "bg-accent",
                )}
              >
                <item.icon className="size-[18px]" strokeWidth={active ? 2.25 : 2} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SidebarLink({ item, active, badge }: { item: NavItem; active: boolean; badge: number }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <item.icon
        className={cn(
          "size-4",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className="tabular rounded-full bg-primary px-1.5 text-[11px] leading-5 font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

function QuickAdd({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button size="icon" aria-label="Add" className={className}>
            <Plus />
          </Button>
        ) : (
          <Button className={cn("justify-start", className)}>
            <Plus /> New
            <span className="ml-auto text-xs font-normal text-primary-foreground/70">
              contact · meeting
            </span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/contacts/new">
            <UserPlus /> New contact
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/contacts/add?tab=scan">
            <QrCode /> Add by QR or user name
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/records/new">
            <NotebookPen /> Log a meeting
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ user, displayName }: { user: ShellUser; displayName: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent"
        >
          <PersonAvatar
            firstName={user.firstName ?? user.userName}
            lastName={user.lastName}
            portrait={user.portrait}
            seed={user.userName}
            size="sm"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{displayName}</span>
            <span className="block truncate text-xs text-muted-foreground">@{user.userName}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Signed in as @{user.userName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">Profile &amp; settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/contacts/add?tab=code">My QR code</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
