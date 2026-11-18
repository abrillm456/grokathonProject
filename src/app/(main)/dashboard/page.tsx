"use client";

import Link from "next/link";
import { Flame, Trophy } from "lucide-react";
import { DailyChart } from "@/components/charts";
import { DuelHero } from "@/components/duel-hero";
import { DIMENSION_COLOR } from "@/components/identity";
import { useGame } from "@/components/use-game";
import { ACTIVITY_CATALOG } from "@/lib/catalog";
import { demoCoachReply } from "@/lib/coach";
import { dimensionLabel, formatAmount, formatXp } from "@/lib/format";
import { coachContext, dailyXp, displayedLifetime, duelFeed, duelView, leaderboard, upcomingChallenge } from "@/lib/view";
import { DIMENSIONS, type Dimension } from "@/types";

export default function DashboardPage() {
  const { data, now, userId, you } = useGame();
  if (!you) return null;
  const duel = duelView(data, userId, now);
  const rows = leaderboard(data, "streak", now);
  const rank = rows.find((row) => row.profile.id === userId)?.rank;
  const context = coachContext(data, userId, now);
  const preview = context ? demoCoachReply(context, "How do I beat my rival this week?") : "";
  const challenge = upcomingChallenge(data, userId, now);
  const feed = duel ? duelFeed(data, userId, now).slice(0, 5) : [];
  const days = duel ? dailyXp(data, userId, duel.weekStart) : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Good to see you, {you.displayName.split(" ")[0]}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your week is live.</h1>
      </div>
      <DuelHero />
      {duel ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {DIMENSIONS.map((dimension) => (
            <DimensionCard key={dimension} dimension={dimension} duelScore={duel.youScore.categories[dimension]} />
          ))}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        <Mini label="Win streak" value={`${you.currentWinStreak}`} hint={`Longest ${you.longestWinStreak}`} icon={<Flame className="text-warning" size={18} />} />
        <Mini label="Campus rank" value={rank ? `#${rank}` : "—"} hint="Sorted by current streak" icon={<Trophy className="text-cyan" size={18} />} />
        <Mini label="Lifetime XP" value={formatXp(displayedLifetime(data, userId, now))} hint="Finalized weeks plus this week" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="panel p-5 xl:col-span-2">
          <p className="kicker">This week</p>
          <h2 className="mt-1 font-semibold">Daily XP</h2>
          <DailyChart data={days} />
        </section>
        <section className="panel p-5">
          <p className="kicker">Up next</p>
          <h2 className="mt-1 font-semibold">{challenge ? challenge.challenge.title : "No open challenge"}</h2>
          <p className="mt-2 text-sm text-muted">
            {challenge
              ? `${challenge.challenge.description} Reward +${challenge.challenge.bonusXp} XP. Status: ${challenge.state.replaceAll("_", " ")}.`
              : "Send your rival something worth doing outside."}
          </p>
          <Link href="/challenges" className="btn btn-ghost mt-4">
            Rival challenges
          </Link>
        </section>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <p className="kicker">Coach</p>
          <p className="mt-2 text-sm leading-6 text-foreground/90">{preview}</p>
          <Link href="/coach" className="btn btn-primary mt-4">
            Ask my coach
          </Link>
        </section>
        <section className="panel p-5">
          <p className="kicker">Recent activity</p>
          <ul className="mt-3 space-y-2">
            {feed.length === 0 ? <li className="text-sm text-muted">Nothing shared yet this week.</li> : null}
            {feed.map((item) => (
              <li key={item.id} className="rounded-xl bg-white/5 px-3 py-2 text-sm">
                {item.text}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function DimensionCard({
  dimension,
  duelScore,
}: {
  dimension: Dimension;
  duelScore: { actual: number; goal: number; completion: number; xp: number; weight: number };
}) {
  const meta = ACTIVITY_CATALOG[dimension];
  return (
    <article className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{meta.label}</h3>
        <span className="text-xs font-semibold" style={{ color: DIMENSION_COLOR[dimension] }}>
          {Math.round(duelScore.xp)} XP
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">
        {formatAmount(duelScore.actual, meta.unitLabel).replace(` ${meta.unitLabel}`, "")}
        <span className="ml-1 text-sm font-normal text-muted">/ {duelScore.goal}</span>
      </p>
      <p className="text-xs text-muted">{meta.unitLabel}</p>
      <div className="bar mt-3" aria-hidden>
        <span style={{ width: `${Math.round(duelScore.completion * 100)}%`, background: DIMENSION_COLOR[dimension] }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {Math.round(duelScore.completion * 100)}% of goal · weight {duelScore.weight}%
      </p>
      <Link href={`/activities?category=${dimension}`} className="mt-3 inline-block text-xs font-semibold text-cyan">
        Log {dimensionLabel(dimension).toLowerCase()}
      </Link>
    </article>
  );
}

function Mini({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: React.ReactNode;
}) {
  return (
    <article className="panel flex items-center justify-between p-4">
      <div>
        <p className="kicker">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {icon}
    </article>
  );
}
