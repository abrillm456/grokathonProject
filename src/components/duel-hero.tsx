"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Avatar, CollegeBadge } from "@/components/identity";
import { useGame } from "@/components/use-game";
import { dimensionLabel, formatXp, percent } from "@/lib/format";
import { sharedPriorities } from "@/lib/matchmaking";
import { duelView, preferenceForWeek } from "@/lib/view";

export function DuelHero({ detailed = false }: { detailed?: boolean }) {
  const { data, now, userId } = useGame();
  const duel = duelView(data, userId, now);
  if (!duel) return null;
  const youPrefs = preferenceForWeek(data, duel.you.id, duel.weekStart);
  const rivalPrefs = duel.rival ? preferenceForWeek(data, duel.rival.id, duel.weekStart) : undefined;
  const priorities =
    youPrefs && rivalPrefs ? sharedPriorities(youPrefs.weights, rivalPrefs.weights) : [];
  const rivalFirst = duel.rival?.displayName.split(" ")[0];
  const youXp = duel.youScore.totalXp;
  const rivalXp = duel.rivalScore?.totalXp ?? 0;
  const share = youXp + rivalXp === 0 ? 50 : (youXp / (youXp + rivalXp)) * 100;
  const lead =
    !duel.rival
      ? "No rival is assigned this week."
      : duel.lead > 0
        ? `You are leading by ${duel.lead} XP.`
        : duel.lead < 0
          ? `${rivalFirst} is leading by ${Math.abs(duel.lead)} XP.`
          : "You are tied.";

  return (
    <section className="panel relative overflow-hidden p-5 sm:p-7">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan to-transparent" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker">Weekly duel</p>
          <h2 className="mt-1 text-lg font-semibold">Yale Campus League</h2>
        </div>
        <div className="text-right">
          <p className="inline-flex items-center gap-2 text-sm text-cyan">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan" />
            {duel.countdown}
          </p>
          {duel.status === "finalized" ? <p className="text-xs text-muted">Final</p> : null}
        </div>
      </div>

      {duel.isPractice ? (
        <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          Practice rival. This matchup is labeled and will not change the real Yale leaderboard.
        </p>
      ) : null}

      <div className="mt-6 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
        <Competitor
          name={duel.you.displayName}
          tag="You"
          initials={duel.you.initials}
          hue={duel.you.avatarHue}
          college={duel.you.residentialCollege}
          xp={youXp}
          streak={duel.you.currentWinStreak}
          rank={duel.youRank}
        />
        <div className="grid justify-items-center gap-2">
          <motion.div
            className="grid h-16 w-16 place-items-center rounded-full border border-cyan/40 bg-cyan/10 text-sm font-bold tracking-[0.2em] text-cyan"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
          >
            VS
          </motion.div>
          <p className="text-center text-sm text-muted">{lead}</p>
        </div>
        {duel.rival ? (
          <Competitor
            name={duel.rival.displayName}
            tag="Rival"
            initials={duel.rival.initials}
            hue={duel.rival.avatarHue}
            college={duel.rival.residentialCollege}
            xp={rivalXp}
            streak={duel.rival.currentWinStreak}
            rank={duel.rivalRank}
            align="right"
          />
        ) : (
          <p className="text-muted">Rival still being matched.</p>
        )}
      </div>

      <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-gradient-to-r from-yale to-cyan" style={{ width: `${share}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>You {formatXp(youXp)}</span>
        <span>{rivalFirst ?? "Rival"} {formatXp(rivalXp)}</span>
      </div>

      {detailed && duel.rival && priorities.length === 2 ? (
        <div className="mt-5 grid gap-3 text-sm text-muted sm:grid-cols-2">
          <p>
            Match compatibility{" "}
            <span className="font-semibold text-cyan">{percent(duel.compatibility)}</span>. Both of you prioritize{" "}
            {dimensionLabel(priorities[0]).toLowerCase()} and {dimensionLabel(priorities[1]).toLowerCase()}.
          </p>
          <p>
            {duel.rivalRank ? `${duel.rival.displayName.split(" ")[0]} is ranked #${duel.rivalRank}. ` : ""}
            {duel.youRank ? `You are ranked #${duel.youRank}.` : ""}
          </p>
          {duel.detail ? (
            <p className="sm:col-span-2">
              Wellness similarity {percent(duel.detail.wellness)} · ranking similarity {percent(duel.detail.ranking)} · recent form {percent(duel.detail.performance)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {detailed ? null : (
          <Link href="/duel" className="btn btn-primary">
            View full duel
          </Link>
        )}
        <Link href="/activities" className="btn btn-ghost">
          Log activity
        </Link>
        {duel.status === "finalized" || duel.weekOver ? (
          <Link href="/results" className="btn btn-ghost">
            Week results
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function Competitor({
  name,
  tag,
  initials,
  hue,
  college,
  xp,
  streak,
  rank,
  align = "left",
}: {
  name: string;
  tag: string;
  initials: string;
  hue: number;
  college: Parameters<typeof CollegeBadge>[0]["college"];
  xp: number;
  streak: number;
  rank: number | null;
  align?: "left" | "right";
}) {
  return (
    <div className={`flex items-center gap-4 ${align === "right" ? "md:flex-row-reverse md:text-right" : ""}`}>
      <Avatar initials={initials} hue={hue} size="lg" />
      <div>
        <p className="kicker">{tag}</p>
        <p className="text-xl font-semibold">{name}</p>
        <div className={`mt-2 flex flex-wrap gap-2 ${align === "right" ? "md:justify-end" : ""}`}>
          <CollegeBadge college={college} />
        </div>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-cyan">{formatXp(xp)} XP</p>
        <p className="text-xs text-muted">
          {rank ? `Rank #${rank}` : "Unranked"} · {streak} win streak
        </p>
      </div>
    </div>
  );
}
