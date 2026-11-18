import { ACTIVITY_CATALOG, CHALLENGE_TARGET_MAX } from "@/lib/catalog";
import { nyDayKey } from "@/lib/week";
import { weightTotal } from "@/lib/scoring";
import type { Activity, ActivityDraft, Dimension, Goals, Weights } from "@/types";

export function validateWeights(weights: Weights): string | null {
  for (const value of Object.values(weights)) {
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      return "Each dimension must be a whole number from 0 to 100.";
    }
  }
  if (weightTotal(weights) !== 100) {
    return "Dimension weights must total 100%.";
  }
  return null;
}

export function validateGoals(goals: Goals): string | null {
  const rules: { key: keyof Goals; min: number; max: number; label: string }[] = [
    { key: "academics", min: 1, max: 40, label: "Study hours" },
    { key: "fitness", min: 1, max: 14, label: "Workout sessions" },
    { key: "social", min: 1, max: 14, label: "Social events" },
    { key: "exploration", min: 1, max: 30, label: "Outdoor hours" },
    { key: "recovery", min: 1, max: 7, label: "Recovery nights" },
  ];
  for (const rule of rules) {
    const value = goals[rule.key];
    if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
      return `${rule.label} must be between ${rule.min} and ${rule.max}.`;
    }
  }
  return null;
}

export function validateActivity(draft: ActivityDraft, existing: Activity[], nowIso: string): string | null {
  const meta = ACTIVITY_CATALOG[draft.category];
  if (!meta.types.some((type) => type.id === draft.activityType)) {
    return "Choose an activity type.";
  }
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) {
    return "Amount must be greater than zero.";
  }
  if (draft.amount < meta.min) {
    return `Minimum for ${meta.label.toLowerCase()} is ${meta.min} ${meta.unitLabel}.`;
  }
  if (draft.amount > meta.max) {
    return `A single ${meta.label.toLowerCase()} entry can't exceed ${meta.max} ${meta.unitLabel}.`;
  }
  const steps = Math.round(draft.amount / meta.step);
  if (Math.abs(steps * meta.step - draft.amount) > 0.001) {
    return `Use increments of ${meta.step} ${meta.unitLabel}.`;
  }
  if (Number.isNaN(new Date(draft.activityDate).getTime())) {
    return "Choose a valid date and time.";
  }
  if (new Date(draft.activityDate).getTime() > new Date(nowIso).getTime() + 60_000) {
    return "Activities can't be logged in the future.";
  }
  const minute = draft.activityDate.slice(0, 16);
  const duplicate = existing.some(
    (activity) =>
      activity.id !== draft.id &&
      activity.userId === draft.userId &&
      activity.activityType === draft.activityType &&
      activity.activityDate.slice(0, 16) === minute,
  );
  if (duplicate) {
    return "You already logged this activity at that minute.";
  }
  if (meta.onePerDay) {
    const day = nyDayKey(draft.activityDate);
    const sameDay = existing.some(
      (activity) =>
        activity.id !== draft.id &&
        activity.userId === draft.userId &&
        activity.category === draft.category &&
        nyDayKey(activity.activityDate) === day,
    );
    if (sameDay) {
      return "You can log only one recovery night per day.";
    }
  }
  if (draft.notes.length > 280) {
    return "Notes must be 280 characters or fewer.";
  }
  return null;
}

export function validateChallengeTarget(category: Dimension, amount: number): string | null {
  const meta = ACTIVITY_CATALOG[category];
  const max = CHALLENGE_TARGET_MAX[category];
  if (!Number.isFinite(amount) || amount <= 0) return "Set a target greater than zero.";
  if (amount > max) {
    return `Keep this ${meta.label.toLowerCase()} challenge at or below ${max} ${meta.unitLabel}.`;
  }
  return null;
}

export function validateYaleEmail(email: string): string | null {
  if (!/^[^\s@]+@yale\.edu$/i.test(email.trim())) {
    return "Use a Yale email address ending in @yale.edu.";
  }
  return null;
}
