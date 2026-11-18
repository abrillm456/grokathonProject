"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Flag,
  Flame,
  LayoutDashboard,
  LineChart,
  PlusCircle,
  Settings,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";
import { DemoControls } from "@/components/demo-controls";
import { Avatar, CollegeBadge } from "@/components/identity";
import { useGame } from "@/components/use-game";
import { markNotificationsRead } from "@/lib/game";
import { formatXp } from "@/lib/format";
import { displayedLifetime, duelView, scoreFor } from "@/lib/view";
import { formatWeekRange, weekStartISO } from "@/lib/week";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/duel", label: "Weekly Duel", icon: Swords },
  { href: "/activities", label: "Log Activity", icon: PlusCircle },
  { href: "/coach", label: "AI Coach", icon: Sparkles },
  { href: "/challenges", label: "Rival Challenges", icon: Flag },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/stats", label: "My Stats", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen lg:pl-[260px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-white/10 bg-[#0b1628]/95 px-4 py-5 lg:flex">
        <Link href="/dashboard" className="px-2">
          <p className="wordmark text-2xl">
            LIFE<span>//</span>RIVAL
          </p>
          <p className="kicker mt-1">Yale Campus League</p>
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} active={pathname === item.href} />
          ))}
        </nav>
        <p className="rounded-2xl border border-cyan/20 bg-cyan/5 px-3 py-3 text-xs leading-5 text-muted">
          Demo Mode. Scores are calculated from what you log. Activities are self-reported.
        </p>
      </aside>
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#07111f]/90 backdrop-blur lg:hidden">
        <div className="flex gap-2 overflow-x-auto px-3 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${pathname === item.href ? "bg-cyan text-[#062033]" : "bg-white/5 text-muted"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <TopBar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      <DemoControls />
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-white/10 text-white shadow-[inset_3px_0_0_#42d9f5]" : "text-muted hover:bg-white/5 hover:text-white"}`}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

function TopBar() {
  const { data, apply, now, userId, you } = useGame();
  const router = useRouter();
  const [open, setOpen] = useState<"bell" | "profile" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const week = weekStartISO(now);
  const score = you ? scoreFor(data, userId, week).totalXp : 0;
  const lifetime = you ? displayedLifetime(data, userId, now) : 0;
  const notes = data.notifications.filter((item) => item.userId === userId);
  const unread = notes.filter((item) => !item.read).length;

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, []);

  if (!you) return null;

  return (
    <header ref={root} className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#07111f]/75 px-4 py-3 backdrop-blur lg:top-0 lg:px-8">
      <div>
        <p className="kicker">Competition week</p>
        <p className="text-sm font-medium">{formatWeekRange(week)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Stat label="Life XP" value={formatXp(score)} />
        <Stat label="Lifetime" value={formatXp(lifetime)} />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-sm font-semibold text-warning">
          <Flame size={15} />
          {you.currentWinStreak} streak
        </span>
        <div className="relative">
          <button
            className="btn btn-ghost relative h-10 w-10 rounded-full p-0"
            aria-label={unread ? `${unread} unread notifications` : "Notifications"}
            onClick={() => {
              setOpen(open === "bell" ? null : "bell");
              if (unread) apply(markNotificationsRead(data, userId));
            }}
          >
            <Bell size={16} />
            {unread > 0 ? (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-cyan" />
            ) : null}
          </button>
          {open === "bell" ? (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10 bg-surface p-3 shadow-2xl">
              <p className="kicker mb-2">Notifications</p>
              {notes.length === 0 ? (
                <p className="text-sm text-muted">You're clear. Challenges and results will land here.</p>
              ) : (
                <ul className="space-y-2">
                  {notes
                    .slice()
                    .reverse()
                    .slice(0, 6)
                    .map((note) => (
                      <li key={note.id} className="rounded-xl bg-white/5 px-3 py-2">
                        <p className="text-sm font-medium">{note.title}</p>
                        <p className="text-xs text-muted">{note.body}</p>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
        <div className="relative">
          <button
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3"
            aria-haspopup="menu"
            aria-expanded={open === "profile"}
            onClick={() => setOpen(open === "profile" ? null : "profile")}
          >
            <Avatar initials={you.initials} hue={you.avatarHue} size="sm" />
            <span className="text-sm font-medium">{you.displayName.split(" ")[0]}</span>
          </button>
          {open === "profile" ? (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-surface p-3 shadow-2xl" role="menu">
              <p className="font-medium">{you.displayName}</p>
              <div className="mt-2">
                <CollegeBadge college={you.residentialCollege} />
              </div>
              <p className="mt-2 text-xs text-muted">{you.email}</p>
              <div className="mt-3 grid gap-2">
                <button className="btn btn-ghost" onClick={() => router.push("/settings")}>
                  Settings
                </button>
                <button className="btn btn-ghost" onClick={() => router.push("/")}>
                  Leave league
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
      <span className="mr-2 text-[10px] uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </span>
  );
}
