"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { Avatar, CollegeBadge } from "@/components/identity";
import { useGame } from "@/components/use-game";
import { formatXp, percent } from "@/lib/format";
import { collegeStandings, leaderboard, type LeaderboardTab } from "@/lib/view";

const TABS: { id: LeaderboardTab; label: string }[] = [
  { id: "streak", label: "Current Streaks" },
  { id: "legends", label: "All-Time Legends" },
  { id: "colleges", label: "Residential Colleges" },
  { id: "weekly", label: "Weekly XP" },
];

export default function LeaderboardPage() {
  const { data, now, userId, you } = useGame();
  const [tab, setTab] = useState<LeaderboardTab>("streak");
  if (!you) return null;
  const rows = leaderboard(data, tab === "colleges" ? "streak" : tab, now);
  const colleges = collegeStandings(data);
  const podium = tab === "colleges" ? [] : rows.slice(0, 3);
  const mine = rows.find((row) => row.profile.id === userId);

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Yale Campus League</p>
        <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The campus board ranks consecutive weekly wins. A tie ends a streak. Matches against a practice rival never count.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            className={`btn ${tab === item.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {!you.leaderboardVisible ? (
        <p className="text-sm text-warning">You are hidden from the public board. Turn visibility back on in Settings.</p>
      ) : tab !== "colleges" && mine ? (
        <p className="text-sm text-muted">
          You are <span className="font-semibold text-foreground">#{mine.rank}</span>
          {tab === "streak" ? ` with a ${mine.currentStreak}-win streak.` : " on this board."}
        </p>
      ) : null}
      {podium.length === 3 ? (
        <div className="grid items-end gap-3 sm:grid-cols-3">
          {[podium[1], podium[0], podium[2]].map((row, index) => {
            const place = (index === 1 ? 1 : index === 0 ? 2 : 3) as 1 | 2 | 3;
            const figure = tab === "weekly" ? row.weeklyXp : tab === "legends" ? row.longestStreak : row.currentStreak;
            return (
              <Podium
                key={row.profile.id}
                row={row}
                place={place}
                figure={figure}
                caption={tab === "weekly" ? "XP" : "streak"}
                highlight={row.profile.id === userId}
              />
            );
          })}
        </div>
      ) : null}
      {tab === "colleges" ? (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">College</th>
                <th className="px-4 py-3">Students</th>
                <th className="px-4 py-3">Wins</th>
                <th className="px-4 py-3">Win rate</th>
                <th className="px-4 py-3">Avg streak</th>
              </tr>
            </thead>
            <tbody>
              {colleges.map((college) => (
                <tr key={college.college} className="border-t border-white/10">
                  <td className="px-4 py-3"><CollegeBadge college={college.college} /></td>
                  <td className="px-4 py-3">{college.students}</td>
                  <td className="px-4 py-3">{college.wins}</td>
                  <td className="px-4 py-3">{percent(college.winRate)}</td>
                  <td className="px-4 py-3">{college.averageStreak.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">College</th>
                <th className="px-4 py-3">Streak</th>
                <th className="px-4 py-3">Best</th>
                <th className="px-4 py-3">Wins</th>
                <th className="px-4 py-3">Win %</th>
                <th className="px-4 py-3">{tab === "weekly" ? "Week XP" : "Lifetime XP"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const mineRow = row.profile.id === userId;
                return (
                  <tr key={row.profile.id} className={`border-t border-white/10 ${mineRow ? "bg-cyan/10" : ""}`}>
                    <td className="px-4 py-3 font-semibold">#{row.rank}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <Avatar initials={row.profile.initials} hue={row.profile.avatarHue} size="sm" />
                        {row.profile.displayName}
                        {mineRow ? <span className="text-xs text-cyan">You</span> : null}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.profile.residentialCollege}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        {row.currentStreak > 0 ? <Flame size={14} className="text-warning" /> : null}
                        {row.currentStreak}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.longestStreak}</td>
                    <td className="px-4 py-3">{row.totalWins}</td>
                    <td className="px-4 py-3">{percent(row.winRate)}</td>
                    <td className="px-4 py-3">{formatXp(tab === "weekly" ? row.weeklyXp : row.lifetimeXp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Podium({
  row,
  place,
  figure,
  caption,
  highlight,
}: {
  row: ReturnType<typeof leaderboard>[number];
  place: 1 | 2 | 3;
  figure: number;
  caption: string;
  highlight: boolean;
}) {
  const height = place === 1 ? "h-40" : place === 2 ? "h-32" : "h-28";
  return (
    <article className={`panel p-4 ${highlight ? "ring-1 ring-cyan" : ""} ${place === 1 ? "sm:-translate-y-3" : ""}`}>
      <p className="kicker">{place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}</p>
      <div className="mt-3 flex items-center gap-3">
        <Avatar initials={row.profile.initials} hue={row.profile.avatarHue} />
        <div>
          <p className="font-semibold">{row.profile.displayName}</p>
          <p className="text-xs text-muted">{row.profile.residentialCollege}</p>
        </div>
      </div>
      <p className="mt-4 inline-flex items-center gap-1 text-2xl font-semibold text-warning">
        <Flame size={18} />
        {figure}
        <span className="text-sm font-medium text-muted">{caption}</span>
      </p>
      <div className={`mt-3 rounded-t-xl bg-gradient-to-t from-yale to-cyan/40 ${height}`} />
    </article>
  );
}
