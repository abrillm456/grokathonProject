"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGame } from "@/components/use-game";
import { ACTIVITY_CATALOG } from "@/lib/catalog";
import { deleteActivity, logActivity } from "@/lib/game";
import { formatXp } from "@/lib/format";
import { scoreFor } from "@/lib/view";
import { formatDateTime, fromDateTimeLocalValue, toDateTimeLocalValue, weekStartISO } from "@/lib/week";
import { DIMENSIONS, type Activity, type Dimension } from "@/types";

export default function ActivitiesPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading the log…</p>}>
      <ActivitiesView />
    </Suspense>
  );
}

function ActivitiesView() {
  const params = useSearchParams();
  const requested = params.get("category");
  const initial = DIMENSIONS.includes(requested as Dimension) ? (requested as Dimension) : "academics";
  const { data, apply, now, userId, you } = useGame();
  const [category, setCategory] = useState<Dimension>(initial);
  const [activityType, setActivityType] = useState(ACTIVITY_CATALOG[initial].types[0].id);
  const [amount, setAmount] = useState(ACTIVITY_CATALOG[initial].min);
  const [when, setWhen] = useState(toDateTimeLocalValue(data.demoNow));
  const [notes, setNotes] = useState("");
  const [proofName, setProofName] = useState<string | null>(null);
  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (DIMENSIONS.includes(requested as Dimension)) chooseCategory(requested as Dimension);
    // The category buttons and the dashboard links share this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);

  const meta = ACTIVITY_CATALOG[category];
  const week = weekStartISO(now);
  const score = you ? scoreFor(data, userId, week) : null;
  const history = useMemo(
    () =>
      data.activities
        .filter((activity) => activity.userId === userId)
        .slice()
        .sort((a, b) => b.activityDate.localeCompare(a.activityDate)),
    [data.activities, userId],
  );

  function chooseCategory(next: Dimension) {
    setCategory(next);
    setActivityType(ACTIVITY_CATALOG[next].types[0].id);
    setAmount(ACTIVITY_CATALOG[next].min);
  }

  function resetForm() {
    setEditing(null);
    setNotes("");
    setProofName(null);
    setProofDataUrl(null);
    setAmount(ACTIVITY_CATALOG[category].min);
    setWhen(toDateTimeLocalValue(data.demoNow));
  }

  function edit(activity: Activity) {
    setEditing(activity.id);
    setCategory(activity.category);
    setActivityType(activity.activityType);
    setAmount(activity.amount);
    setWhen(toDateTimeLocalValue(activity.activityDate));
    setNotes(activity.notes);
    setProofName(activity.proofName);
    setProofDataUrl(activity.proofDataUrl);
  }

  if (!you || !score) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Self-reported</p>
          <h1 className="text-3xl font-semibold tracking-tight">Log activity</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            LIFE//RIVAL does not verify these automatically. Weekly XP updates from the log, capped at your goal.
          </p>
        </div>
        <p className="panel px-4 py-3 text-sm">
          This week <span className="text-lg font-semibold text-cyan">{formatXp(score.totalXp)} XP</span>
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <form
          className="panel space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const ok = apply(
              logActivity(data, {
                id: editing ?? undefined,
                userId,
                category,
                activityType,
                amount: meta.max === 1 ? 1 : amount,
                activityDate: fromDateTimeLocalValue(when),
                notes,
                proofName,
                proofDataUrl,
              }),
            );
            if (ok) resetForm();
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            {DIMENSIONS.map((item) => (
              <button
                key={item}
                type="button"
                className={`rounded-xl border px-3 py-2 text-left text-sm ${item === category ? "border-cyan bg-cyan/10" : "border-white/10"}`}
                onClick={() => chooseCategory(item)}
              >
                {ACTIVITY_CATALOG[item].label}
              </button>
            ))}
          </div>
          <label className="block text-sm">
            Activity type
            <select
              className="field mt-1"
              value={activityType}
              onChange={(event) => setActivityType(event.target.value)}
            >
              {meta.types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          {meta.max === 1 ? (
            <p className="text-sm text-muted">Counts as 1 {meta.unitLabel.replace(/s$/, "")}.</p>
          ) : (
            <label className="block text-sm">
              {meta.unitLabel}
              <input
                className="field mt-1"
                type="number"
                min={meta.min}
                max={meta.max}
                step={meta.step}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                required
              />
            </label>
          )}
          <label className="block text-sm">
            Date and time
            <input className="field mt-1" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} required />
          </label>
          <label className="block text-sm">
            Notes, optional
            <textarea className="field mt-1 min-h-20" maxLength={280} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <label className="block text-sm">
            Proof image, optional
            <input
              className="mt-1 block text-sm text-muted"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setProofName(null);
                  setProofDataUrl(null);
                  return;
                }
                if (file.size > 80_000) {
                  apply({ data, error: "Keep proof images under 80 KB in the demo." });
                  event.target.value = "";
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setProofName(file.name);
                  setProofDataUrl(typeof reader.result === "string" ? reader.result : null);
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {proofName ? <p className="text-xs text-muted">Attached: {proofName}</p> : null}
          <div className="flex gap-2">
            <button className="btn btn-primary" type="submit">
              {editing ? "Save changes" : "Save activity"}
            </button>
            {editing ? (
              <button className="btn btn-ghost" type="button" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
        <section className="panel p-5">
          <h2 className="font-semibold">History</h2>
          <ul className="mt-3 divide-y divide-white/10">
            {history.length === 0 ? <li className="py-3 text-sm text-muted">Nothing logged yet.</li> : null}
            {history.map((activity) => {
              const itemMeta = ACTIVITY_CATALOG[activity.category];
              const label = itemMeta.types.find((type) => type.id === activity.activityType)?.label ?? activity.activityType;
              return (
                <li key={activity.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">
                      {label}{" "}
                      <span className="text-sm font-normal text-muted">
                        · {activity.amount} {activity.amount === 1 ? itemMeta.unitLabel.replace(/s$/, "") : itemMeta.unitLabel}
                      </span>
                    </p>
                    <p className="text-xs text-muted">{formatDateTime(activity.activityDate)} · Self-reported</p>
                    {activity.proofName ? <p className="text-xs text-cyan">Proof: {activity.proofName}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost px-3 py-1.5" type="button" onClick={() => edit(activity)}>
                      Edit
                    </button>
                    {confirmId === activity.id ? (
                      <button
                        className="btn btn-danger px-3 py-1.5"
                        type="button"
                        onClick={() => {
                          apply(deleteActivity(data, userId, activity.id));
                          setConfirmId(null);
                          if (editing === activity.id) resetForm();
                        }}
                      >
                        Confirm delete
                      </button>
                    ) : (
                      <button className="btn btn-ghost px-3 py-1.5" type="button" onClick={() => setConfirmId(activity.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
