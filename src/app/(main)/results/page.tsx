"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRACTICE_RIVAL_ID } from "@/lib/demo-data";
import { finalizeWeek, startNextWeek } from "@/lib/game";
import { formatXp } from "@/lib/format";
import { duelView, leaderboard } from "@/lib/view";
import { useGame } from "@/components/use-game";
import { Avatar } from "@/components/identity";

export default function ResultsPage() {
  const { data, apply, now, userId, you } = useGame();
  const router = useRouter();
  const duel = you ? duelView(data, userId, now) : null;
  if (!you || !duel) return null;
  const won = duel.winnerId === userId;
  const tied = duel.status === "finalized" && !duel.winnerId;
  const rank = leaderboard(data, "streak", now).find((row) => row.profile.id === userId)?.rank;
  const rivalName = duel.rival?.displayName ?? "your rival";

  return (
    <div className="relative space-y-6 overflow-hidden">
      {duel.status === "finalized" && won && !duel.isPractice ? <Confetti /> : null}
      <div>
        <p className="kicker">Week closed</p>
        <h1 className="text-4xl font-semibold tracking-tight">
          {duel.status !== "finalized"
            ? "The week is still open"
            : won
              ? "Victory"
              : tied
                ? "It's a tie"
                : "Your rival won this round"}
        </h1>
      </div>
      {duel.status !== "finalized" ? (
        <section className="panel p-6">
          <p className="text-sm leading-6 text-muted">
            {duel.weekOver
              ? "Sunday night has arrived on the demo clock. Finalize to lock XP, update streaks, and refresh the leaderboard."
              : `${duel.countdown} left. You can jump the demo clock from Demo Controls, or keep logging.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {duel.weekOver ? (
              <button
                className="btn btn-primary"
                onClick={() => {
                  apply(finalizeWeek(data));
                }}
              >
                Finalize the week
              </button>
            ) : (
              <Link href="/dashboard" className="btn btn-primary">
                Back to the duel
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className="panel p-6">
          {duel.isPractice ? (
            <p className="mb-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              Practice match. Your streak and campus rank stay where they were.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-6">
            <Score name="You" initials={you.initials} hue={you.avatarHue} xp={duel.youScore.totalXp} />
            <Score
              name={rivalName}
              initials={duel.rival?.initials ?? "?"}
              hue={duel.rival?.avatarHue ?? 200}
              xp={duel.rivalScore?.totalXp ?? 0}
            />
          </div>
          <p className="mt-6 text-lg">
            {won
              ? `You defeated ${rivalName}.`
              : tied
                ? "Nobody takes the week. Your streak resets, and the progress still counts."
                : "Your streak has reset, but your progress remains."}
          </p>
          <p className="mt-2 text-sm text-muted">
            Win streak: {you.currentWinStreak}. {rank ? `You're ranked #${rank} at Yale.` : "Rank updates for visible students."}
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-5">
            {Object.entries(duel.youScore.categories).map(([key, category]) => (
              <li key={key} className="rounded-xl bg-white/5 px-3 py-2 text-sm">
                <p className="capitalize text-muted">{key}</p>
                <p className="font-semibold">{Math.round(category.xp)} XP</p>
              </li>
            ))}
          </ul>
          <button
            className="btn btn-primary mt-6"
            onClick={() => {
              const ok = apply(startNextWeek(data, PRACTICE_RIVAL_ID));
              if (ok) router.push("/duel");
            }}
          >
            Find my next rival
          </button>
        </section>
      )}
    </div>
  );
}

function Score({ name, initials, hue, xp }: { name: string; initials: string; hue: number; xp: number }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar initials={initials} hue={hue} size="lg" />
      <div>
        <p className="text-sm text-muted">{name}</p>
        <p className="text-3xl font-semibold text-cyan">{formatXp(xp)} XP</p>
      </div>
    </div>
  );
}

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 18 }, (_, index) => (
        <span
          key={index}
          className="absolute top-0 h-2 w-2 rounded-sm"
          style={{
            left: `${(index * 53) % 100}%`,
            background: index % 2 ? "#42d9f5" : "#f5b942",
            animation: `confetti ${2.4 + (index % 5) * 0.2}s ease-in ${index * 0.08}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
