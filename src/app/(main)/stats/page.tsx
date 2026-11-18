"use client";

import { CategoryPie, DailyChart, HistoryChart, StreakChart } from "@/components/charts";
import { useGame } from "@/components/use-game";
import { ACTIVITY_CATALOG } from "@/lib/catalog";
import { formatAmount, formatXp } from "@/lib/format";
import { dailyXp, displayedLifetime, insightsFor, leaderboard, scoreFor } from "@/lib/view";
import { formatPrettyDate, weekStartISO } from "@/lib/week";
import { DIMENSIONS, type Dimension } from "@/types";

export default function StatsPage() {
  const { data, now, userId, you } = useGame();
  if (!you) return null;
  const week = weekStartISO(now);
  const score = scoreFor(data, userId, week);
  const days = dailyXp(data, userId, week);
  const history = data.history
    .filter((item) => item.userId === userId)
    .slice()
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const weekly = history.map((item) => ({ week: formatPrettyDate(item.weekStart), xp: item.totalXp }));
  if (!history.some((item) => item.weekStart === week)) {
    weekly.push({ week: "This week", xp: score.totalXp });
  }
  let streak = 0;
  const streakSeries = history.map((item) => {
    streak = item.result === "win" ? streak + 1 : 0;
    return { week: formatPrettyDate(item.weekStart), streak };
  });
  const logged = DIMENSIONS.reduce(
    (totals, dimension) => {
      totals[dimension] = data.activities
        .filter((activity) => activity.userId === userId && activity.category === dimension)
        .reduce((sum, activity) => sum + activity.amount, 0);
      return totals;
    },
    {} as Record<Dimension, number>,
  );
  const rank = leaderboard(data, "streak", now).find((row) => row.profile.id === userId)?.rank;
  const decided = you.totalWins + you.totalLosses;
  const wins = history.filter((item) => item.result === "win").length;
  const losses = history.filter((item) => item.result === "loss").length;
  const average = weekly.length ? Math.round(weekly.reduce((sum, item) => sum + item.xp, 0) / weekly.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Your record</p>
        <h1 className="text-3xl font-semibold tracking-tight">My stats</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Lifetime XP" value={formatXp(displayedLifetime(data, userId, now))} />
        <Stat label="Weekly average" value={formatXp(average)} />
        <Stat label="Current streak" value={String(you.currentWinStreak)} />
        <Stat label="Longest streak" value={String(you.longestWinStreak)} />
        <Stat label="Campus rank" value={rank ? `#${rank}` : "Hidden"} />
        <Stat label="Win rate" value={decided ? `${Math.round((you.totalWins / decided) * 100)}%` : "—"} />
        <Stat label="Rivals defeated" value={String(you.totalWins)} />
        <Stat label="Recorded weeks" value={`${wins}W · ${losses}L`} />
      </div>
      <section className="panel p-5">
        <h2 className="font-semibold">Logged totals</h2>
        <p className="mt-1 text-xs text-muted">These come from activities you actually entered. Past weeks on the chart use saved scores.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {DIMENSIONS.map((dimension) => (
            <div key={dimension} className="rounded-xl bg-white/5 p-3">
              <p className="text-xs text-muted">{ACTIVITY_CATALOG[dimension].label}</p>
              <p className="mt-1 font-semibold">{formatAmount(logged[dimension], ACTIVITY_CATALOG[dimension].unitLabel)}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-semibold">Daily XP this week</h2>
          <DailyChart data={days} />
        </section>
        <section className="panel p-5">
          <h2 className="font-semibold">Weekly XP</h2>
          <HistoryChart data={weekly} />
        </section>
        <section className="panel p-5">
          <h2 className="font-semibold">Category XP this week</h2>
          <CategoryPie
            data={DIMENSIONS.map((dimension) => ({
              key: dimension,
              name: ACTIVITY_CATALOG[dimension].label,
              value: Math.round(score.categories[dimension].xp),
            }))}
          />
        </section>
        <section className="panel p-5">
          <h2 className="font-semibold">Streak history</h2>
          {streakSeries.length === 0 ? <p className="mt-3 text-sm text-muted">Finish a week to start the streak chart.</p> : <StreakChart data={streakSeries} />}
        </section>
      </div>
      <section className="panel p-5">
        <h2 className="font-semibold">Insights</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6">
          {insightsFor(data, userId, now).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="panel p-4">
      <p className="kicker">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
