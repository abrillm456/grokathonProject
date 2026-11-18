"use client";

import Link from "next/link";
import { CompareRadar } from "@/components/charts";
import { DuelHero } from "@/components/duel-hero";
import { DIMENSION_COLOR } from "@/components/identity";
import { useGame } from "@/components/use-game";
import { ACTIVITY_CATALOG } from "@/lib/catalog";
import { formatXp } from "@/lib/format";
import { duelFeed, duelView, profileById, userChallenges } from "@/lib/view";
import { formatDateTime, formatPrettyDate } from "@/lib/week";
import { DIMENSIONS } from "@/types";

export default function DuelPage() {
  const { data, now, userId } = useGame();
  const duel = duelView(data, userId, now);
  if (!duel) return null;
  const feed = duelFeed(data, userId, now).slice(0, 8);
  const challenges = userChallenges(data, userId, now);
  const radar =
    duel.rivalScore === null
      ? []
      : DIMENSIONS.map((dimension) => ({
          dimension: ACTIVITY_CATALOG[dimension].label,
          you: Math.round(duel.youScore.categories[dimension].completion * 100),
          rival: Math.round(duel.rivalScore!.categories[dimension].completion * 100),
        }));
  const past = data.matches
    .filter(
      (match) =>
        match.status === "finalized" &&
        match.weekStart < duel.weekStart &&
        (match.playerOneId === userId || match.playerTwoId === userId),
    )
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Matchup</p>
        <h1 className="text-3xl font-semibold tracking-tight">Weekly duel</h1>
      </div>
      <DuelHero detailed />
      <section className="panel p-5">
        <p className="kicker">Dimension comparison</p>
        <p className="mt-1 text-sm text-muted">Bars show goal completion. XP underneath is the weighted score.</p>
        <div className="mt-4 space-y-4">
          {DIMENSIONS.map((dimension) => {
            const you = duel.youScore.categories[dimension];
            const rival = duel.rivalScore?.categories[dimension];
            return (
              <div key={dimension}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{ACTIVITY_CATALOG[dimension].label}</span>
                  <span className="text-muted">
                    You {Math.round(you.completion * 100)}%
                    {rival ? ` / Rival ${Math.round(rival.completion * 100)}%` : ""}
                  </span>
                </div>
                <div className="grid gap-1">
                  <Meter value={you.completion} color={DIMENSION_COLOR[dimension]} />
                  {rival ? <Meter value={rival.completion} color="#f5b942" /> : null}
                </div>
                <p className="mt-1 text-xs text-muted">
                  You {Math.round(you.xp)} XP · Rival {rival ? Math.round(rival.xp) : "—"} XP
                </p>
              </div>
            );
          })}
        </div>
      </section>
      {radar.length > 0 ? (
        <section className="panel p-5">
          <p className="kicker">Balance map</p>
          <CompareRadar data={radar} />
        </section>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <p className="kicker">Challenges</p>
            <Link href="/challenges" className="text-sm text-cyan">
              Open
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {challenges.length === 0 ? <li className="text-sm text-muted">No challenges this week.</li> : null}
            {challenges.map(({ challenge, state }) => (
              <li key={challenge.id} className="rounded-xl bg-white/5 px-3 py-2">
                <p className="font-medium">{challenge.title}</p>
                <p className="text-xs text-muted">
                  {state.replaceAll("_", " ")} · +{challenge.bonusXp} XP
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel p-5">
          <p className="kicker">Shared feed</p>
          <p className="mt-1 text-xs text-muted">Notes, exact places, and recovery details stay private.</p>
          <ul className="mt-3 space-y-2">
            {feed.map((item) => (
              <li key={item.id} className="text-sm">
                <span className="text-muted">{formatDateTime(item.at)} · </span>
                {item.text}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="panel p-5">
        <p className="kicker">Previous duels</p>
        <ul className="mt-3 divide-y divide-white/10">
          {past.length === 0 ? <li className="text-sm text-muted">No finished duels yet.</li> : null}
          {past.map((match) => {
            const rivalId = match.playerOneId === userId ? match.playerTwoId : match.playerOneId;
            const rival = profileById(data, rivalId);
            const yours = match.playerOneId === userId ? match.playerOneXp : match.playerTwoXp;
            const theirs = match.playerOneId === userId ? match.playerTwoXp : match.playerOneXp;
            const won = match.winnerId === userId;
            return (
              <li key={match.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  Week of {formatPrettyDate(match.weekStart)} vs {rival?.displayName ?? "rival"}
                </span>
                <span className={won ? "text-success" : "text-muted"}>
                  {won ? "Win" : match.winnerId ? "Loss" : "Tie"} · {formatXp(yours ?? 0)}–{formatXp(theirs ?? 0)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Meter({ value, color }: { value: number; color: string }) {
  return (
    <div className="bar">
      <span style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  );
}
