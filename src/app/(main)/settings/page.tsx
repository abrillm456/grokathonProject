"use client";

import { useEffect, useState } from "react";
import { WeightDonut } from "@/components/identity";
import { useGame } from "@/components/use-game";
import { ACTIVITY_CATALOG } from "@/lib/catalog";
import { saveNextPreferences, updateCompetitionPrefs, updateProfile } from "@/lib/game";
import { DEFAULT_GOALS, DEFAULT_WEIGHTS, weightTotal } from "@/lib/scoring";
import { preferenceForWeek } from "@/lib/view";
import { formatWeekRange, nextWeekStart, weekStartISO } from "@/lib/week";
import { COLLEGES, DIMENSIONS, type Dimension, type Goals, type ResidentialCollege, type Weights } from "@/types";

export default function SettingsPage() {
  const { data, apply, now, userId, you } = useGame();
  const week = weekStartISO(now);
  const upcoming = nextWeekStart(week);
  const current = you ? preferenceForWeek(data, userId, week) : undefined;
  const queued = data.preferences.find(
    (preference) => preference.userId === userId && preference.effectiveWeekStart === upcoming,
  );
  const [name, setName] = useState(you?.displayName ?? "");
  const [college, setCollege] = useState<ResidentialCollege>(you?.residentialCollege ?? "Berkeley");
  const [year, setYear] = useState(you?.graduationYear ?? 2028);
  const [weights, setWeights] = useState<Weights>(queued?.weights ?? current?.weights ?? DEFAULT_WEIGHTS);
  const [goals, setGoals] = useState<Goals>(queued?.goals ?? current?.goals ?? DEFAULT_GOALS);

  const queuedStamp = queued?.createdAt ?? "";
  useEffect(() => {
    if (!you) return;
    setName(you.displayName);
    setCollege(you.residentialCollege ?? "Berkeley");
    setYear(you.graduationYear);
    const active = preferenceForWeek(data, userId, week);
    const next = data.preferences.find(
      (preference) => preference.userId === userId && preference.effectiveWeekStart === upcoming,
    );
    setWeights(next?.weights ?? active?.weights ?? DEFAULT_WEIGHTS);
    setGoals(next?.goals ?? active?.goals ?? DEFAULT_GOALS);
  }, [userId, week, upcoming, queuedStamp, you, data, data.preferences]);

  if (!you || !current || you.isDemoRival) {
    return <p className="text-muted">Practice rivals don't have settings.</p>;
  }

  const total = weightTotal(weights);

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Your setup</p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </div>
      <section className="panel space-y-3 p-5">
        <h2 className="font-semibold">Profile</h2>
        <label className="block text-sm">
          Name
          <input className="field mt-1" value={name} onChange={(event) => setName(event.target.value)} />
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
        <button className="btn btn-primary" type="button" onClick={() => apply(updateProfile(data, userId, { displayName: name, residentialCollege: college, graduationYear: year }))}>
          Save profile
        </button>
      </section>
      <section className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Wellness preferences</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              This week's duel is locked to the weights below. Your updated preferences will apply to your next weekly duel ({formatWeekRange(upcoming)}).
            </p>
          </div>
          <WeightDonut weights={weights} />
        </div>
        <div className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-muted">
          Active this week: {DIMENSIONS.map((dimension) => `${ACTIVITY_CATALOG[dimension].label} ${current.weights[dimension]}%`).join(" · ")}
        </div>
        <div className="mt-4 space-y-3">
          {DIMENSIONS.map((dimension) => (
            <WeightSlider key={dimension} dimension={dimension} value={weights[dimension]} onChange={(value) => setWeights({ ...weights, [dimension]: value })} />
          ))}
        </div>
        <p className={`mt-3 text-sm ${total === 100 ? "text-success" : "text-warning"}`}>Total {total}%. Save stays locked until this is 100%.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.keys(goals) as Dimension[]).map((dimension) => (
            <label key={dimension} className="text-sm">
              {ACTIVITY_CATALOG[dimension].goalLabel}
              <input
                className="field mt-1"
                type="number"
                value={goals[dimension]}
                onChange={(event) => setGoals({ ...goals, [dimension]: Number(event.target.value) })}
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-ghost" type="button" onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}>
            Reset to balanced
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={total !== 100}
            onClick={() => apply(saveNextPreferences(data, userId, weights, goals))}
          >
            Save for next duel
          </button>
        </div>
      </section>
      <section className="panel space-y-3 p-5">
        <h2 className="font-semibold">Competition</h2>
        <Toggle
          label="Notifications"
          checked={you.notificationsEnabled}
          onChange={(value) => apply(updateCompetitionPrefs(data, userId, { notificationsEnabled: value }))}
        />
        <Toggle
          label="Rival challenge notifications"
          checked={you.challengeNotifications}
          onChange={(value) => apply(updateCompetitionPrefs(data, userId, { challengeNotifications: value }))}
        />
        <Toggle
          label="Show me on the leaderboard"
          checked={you.leaderboardVisible}
          onChange={(value) => apply(updateCompetitionPrefs(data, userId, { leaderboardVisible: value }))}
        />
        <Toggle
          label="Share activity summaries with my rival"
          checked={you.shareActivitySummaries}
          onChange={(value) => apply(updateCompetitionPrefs(data, userId, { shareActivitySummaries: value }))}
        />
      </section>
    </div>
  );
}

function WeightSlider({
  dimension,
  value,
  onChange,
}: {
  dimension: Dimension;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="flex justify-between">
        <span>{ACTIVITY_CATALOG[dimension].label}</span>
        <span>{value}%</span>
      </span>
      <input
        className="mt-1 w-full accent-cyan"
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
