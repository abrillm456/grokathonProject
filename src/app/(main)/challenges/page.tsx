"use client";

import { useState } from "react";
import { useGame } from "@/components/use-game";
import { ACTIVITY_CATALOG, CHALLENGE_TEMPLATES } from "@/lib/catalog";
import { completeChallenge, createChallenge, respondToChallenge } from "@/lib/game";
import { profileById, userChallenges } from "@/lib/view";
import { DIMENSIONS, type Dimension } from "@/types";

export default function ChallengesPage() {
  const { data, apply, now, userId, you } = useGame();
  const [category, setCategory] = useState<Dimension>("exploration");
  const [title, setTitle] = useState("The Cross Campus Challenge");
  const [description, setDescription] = useState("Spend 30 minutes outside today.");
  const [target, setTarget] = useState(0.5);
  if (!you) return null;
  const cards = userChallenges(data, userId, now);
  const meta = ACTIVITY_CATALOG[category];

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Voluntary</p>
        <h1 className="text-3xl font-semibold tracking-tight">Rival challenges</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Declining is free. Completing an accepted challenge is worth 25 XP once, and the weekly bonus caps at 100 XP. Targets stay inside a safe range.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        <form
          className="panel space-y-3 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            apply(createChallenge(data, { userId, title, description, category, targetAmount: target }));
          }}
        >
          <p className="kicker">Send one</p>
          <div className="flex flex-wrap gap-2">
            {CHALLENGE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className="rounded-full border border-white/10 px-3 py-1 text-xs hover:border-cyan"
                onClick={() => {
                  setCategory(template.category);
                  setTitle(template.title);
                  setDescription(template.description);
                  setTarget(template.targetAmount);
                }}
              >
                {template.title}
              </button>
            ))}
          </div>
          <label className="block text-sm">
            Category
            <select
              className="field mt-1"
              value={category}
              onChange={(event) => setCategory(event.target.value as Dimension)}
            >
              {DIMENSIONS.map((item) => (
                <option key={item} value={item}>
                  {ACTIVITY_CATALOG[item].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Title
            <input className="field mt-1" value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="block text-sm">
            Description
            <textarea className="field mt-1 min-h-20" maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label className="block text-sm">
            Target ({meta.unitLabel})
            <input
              className="field mt-1"
              type="number"
              min={meta.min}
              step={meta.step}
              value={target}
              onChange={(event) => setTarget(Number(event.target.value))}
              required
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Send to rival
          </button>
        </form>
        <div className="space-y-3">
          {cards.length === 0 ? <p className="panel p-5 text-sm text-muted">No challenges on this duel yet.</p> : null}
          {cards.map(({ challenge, participants, state }) => {
            const mine = participants.find((item) => item.userId === userId);
            const theirs = participants.find((item) => item.userId !== userId);
            const rival = profileById(data, challenge.creatorId === userId ? challenge.recipientId : challenge.creatorId);
            const iAmRecipient = challenge.recipientId === userId;
            const canRespond = iAmRecipient && state === "pending";
            const canComplete = Boolean(mine && !mine.completedAt && (state === "accepted" || state === "in_progress"));
            return (
              <article key={challenge.id} className="panel p-5">
                <p className="kicker">{state.replaceAll("_", " ")}</p>
                <h2 className="mt-1 text-2xl font-semibold uppercase tracking-wide">{challenge.title}</h2>
                <p className="mt-2 text-sm text-muted">{challenge.description}</p>
                <p className="mt-3 text-sm text-cyan">Reward +{challenge.bonusXp} XP · {challenge.targetAmount} {challenge.targetUnit}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <ProgressLine name="You" done={Boolean(mine?.completedAt)} awarded={Boolean(mine?.bonusAwarded)} />
                  <ProgressLine name={rival?.displayName.split(" ")[0] ?? "Rival"} done={Boolean(theirs?.completedAt)} awarded={Boolean(theirs?.bonusAwarded)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {canRespond ? (
                    <>
                      <button className="btn btn-primary" type="button" onClick={() => apply(respondToChallenge(data, userId, challenge.id, true))}>
                        Accept challenge
                      </button>
                      <button className="btn btn-ghost" type="button" onClick={() => apply(respondToChallenge(data, userId, challenge.id, false))}>
                        Decline
                      </button>
                    </>
                  ) : null}
                  {canComplete ? (
                    <button className="btn btn-primary" type="button" onClick={() => apply(completeChallenge(data, userId, challenge.id))}>
                      Mark complete
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProgressLine({ name, done, awarded }: { name: string; done: boolean; awarded: boolean }) {
  return (
    <p className="rounded-xl bg-white/5 px-3 py-2 text-sm">
      <span className="font-medium">{name}</span>
      <span className="text-muted"> · {done ? (awarded ? "Completed +25 XP" : "Completed, no bonus") : "Not yet"}</span>
    </p>
  );
}
