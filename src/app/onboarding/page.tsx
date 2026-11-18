"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WeightDonut } from "@/components/identity";
import { useGame } from "@/components/use-game";
import { ACTIVITY_CATALOG } from "@/lib/catalog";
import { PRACTICE_RIVAL_ID } from "@/lib/demo-data";
import { setCurrentUser, onboardStudent } from "@/lib/game";
import { sharedPriorities } from "@/lib/matchmaking";
import { DEFAULT_GOALS, DEFAULT_WEIGHTS, weightTotal } from "@/lib/scoring";
import { duelView, preferenceForWeek, profileById } from "@/lib/view";
import { COLLEGES, DIMENSIONS, type Dimension, type Goals, type ResidentialCollege, type Weights } from "@/types";

export default function OnboardingPage() {
  const router = useRouter();
  const { data, apply, now } = useGame();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [college, setCollege] = useState<ResidentialCollege>("Berkeley");
  const [year, setYear] = useState(2028);
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS });
  const [goals, setGoals] = useState<Goals>({ ...DEFAULT_GOALS });
  const [searching, setSearching] = useState(false);
  const total = weightTotal(weights);

  function enterDemo() {
    apply(setCurrentUser(data, "jamie"));
    router.push("/dashboard");
  }

  function finish() {
    const ok = apply(
      onboardStudent(
        data,
        { displayName: name, email, residentialCollege: college, graduationYear: year, weights, goals },
        PRACTICE_RIVAL_ID,
      ),
    );
    if (!ok) return;
    setSearching(true);
    window.setTimeout(() => {
      setSearching(false);
      setStep(4);
    }, 1400);
  }

  const created = step >= 4 ? profileById(data, data.currentUserId) : null;
  const duel = created ? duelView(data, created.id, now) : null;
  const mine = created && duel ? preferenceForWeek(data, created.id, duel.weekStart) : undefined;
  const theirs = duel?.rival ? preferenceForWeek(data, duel.rival.id, duel.weekStart) : undefined;
  const priorities = mine && theirs ? sharedPriorities(mine.weights, theirs.weights) : [];

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-12">
      <p className="kicker">Step {Math.min(step + 1, 4)} of 4</p>
      <h1 className="wordmark mt-2 text-4xl">
        LIFE<span>//</span>RIVAL
      </h1>
      {step === 0 ? (
        <section className="panel mt-6 space-y-3 p-5">
          <h2 className="text-xl font-semibold">Who's competing?</h2>
          <button className="btn btn-primary" type="button" onClick={enterDemo}>
            Enter demo as Yale student
          </button>
          <label className="block text-sm">
            Display name
            <input className="field mt-1" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="block text-sm">
            Yale email
            <input className="field mt-1" type="email" value={email} placeholder="you@yale.edu" onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm">
            Residential college
            <select className="field mt-1" value={college} onChange={(event) => setCollege(event.target.value as ResidentialCollege)}>
              {COLLEGES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Graduation year
            <input className="field mt-1" type="number" min={2024} max={2032} value={year} onChange={(event) => setYear(Number(event.target.value))} />
          </label>
          <button className="btn btn-ghost" type="button" onClick={() => setStep(1)} disabled={name.trim().length < 2}>
            Continue
          </button>
        </section>
      ) : null}
      {step === 1 ? (
        <section className="panel mt-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">How should the week count?</h2>
              <p className="mt-1 text-sm text-muted">Weights have to total 100%.</p>
            </div>
            <WeightDonut weights={weights} />
          </div>
          <div className="mt-4 space-y-3">
            {DIMENSIONS.map((dimension) => (
              <label key={dimension} className="block text-sm">
                <span className="flex justify-between">
                  {ACTIVITY_CATALOG[dimension].label}
                  <span>{weights[dimension]}%</span>
                </span>
                <input
                  className="mt-1 w-full accent-cyan"
                  type="range"
                  min={0}
                  max={100}
                  value={weights[dimension]}
                  onChange={(event) => setWeights({ ...weights, [dimension]: Number(event.target.value) })}
                />
              </label>
            ))}
          </div>
          <p className={`mt-3 text-sm ${total === 100 ? "text-success" : "text-warning"}`}>Total {total}%.</p>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-ghost" type="button" onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}>
              Reset to balanced
            </button>
            <button className="btn btn-primary" type="button" disabled={total !== 100} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        </section>
      ) : null}
      {step === 2 ? (
        <section className="panel mt-6 space-y-3 p-5">
          <h2 className="text-xl font-semibold">Weekly goals</h2>
          {(Object.keys(goals) as Dimension[]).map((dimension) => (
            <label key={dimension} className="block text-sm">
              {ACTIVITY_CATALOG[dimension].goalLabel}
              <input
                className="field mt-1"
                type="number"
                value={goals[dimension]}
                onChange={(event) => setGoals({ ...goals, [dimension]: Number(event.target.value) })}
              />
            </label>
          ))}
          <button className="btn btn-primary" type="button" onClick={() => setStep(3)}>
            Find my rival
          </button>
        </section>
      ) : null}
      {step === 3 ? (
        <section className="panel mt-6 p-8 text-center">
          <h2 className="text-2xl font-semibold">{searching ? "Finding your next Yale rival…" : "Ready when you are."}</h2>
          <ul className="mx-auto mt-4 max-w-md space-y-2 text-left text-sm text-muted">
            <li>Similar wellness dimension percentages</li>
            <li>Similar competitive rating</li>
            <li>Comparable recent weekly performance</li>
            <li>Only unmatched students in the Yale pool</li>
          </ul>
          <button className="btn btn-primary mt-6" type="button" onClick={finish} disabled={searching}>
            {searching ? "Matching" : "Match me"}
          </button>
        </section>
      ) : null}
      {step === 4 && duel?.rival ? (
        <section className="panel mt-6 p-6 text-center">
          <p className="kicker">Versus</p>
          <h2 className="mt-2 text-3xl font-semibold">
            {duel.isPractice ? "Practice Rival" : duel.rival.displayName}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {duel.rival.residentialCollege ?? "Not a Yale student"} · compatibility {Math.round(duel.compatibility * 100)}%
          </p>
          {duel.isPractice ? (
            <p className="mt-3 text-sm text-warning">
              No unmatched Yale student was free. This practice rival is labeled and will not count on the leaderboard.
            </p>
          ) : priorities.length === 2 ? (
            <p className="mt-3 text-sm text-muted">
              Both of you prioritize {ACTIVITY_CATALOG[priorities[0]].label.toLowerCase()} and {ACTIVITY_CATALOG[priorities[1]].label.toLowerCase()}.
            </p>
          ) : null}
          <button className="btn btn-primary mt-6" type="button" onClick={() => router.push("/dashboard")}>
            Enter the league
          </button>
        </section>
      ) : null}
    </div>
  );
}
