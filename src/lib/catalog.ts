import type { ActivityUnit, Dimension } from "@/types";

export interface ActivityTypeOption {
  id: string;
  label: string;
  feed: string;
}

export interface ActivityCategoryMeta {
  label: string;
  unit: ActivityUnit;
  unitLabel: string;
  min: number;
  max: number;
  step: number;
  onePerDay: boolean;
  goalLabel: string;
  types: ActivityTypeOption[];
}

export const ACTIVITY_CATALOG: Record<Dimension, ActivityCategoryMeta> = {
  academics: {
    label: "Academics",
    unit: "hours",
    unitLabel: "hours",
    min: 0.25,
    max: 8,
    step: 0.25,
    onePerDay: false,
    goalLabel: "Study hours",
    types: [
      { id: "focused-study", label: "Focused study session", feed: "a focused study session" },
      { id: "library", label: "Library study session", feed: "a library study session" },
      { id: "group-study", label: "Group study", feed: "a group study session" },
    ],
  },
  fitness: {
    label: "Fitness",
    unit: "sessions",
    unitLabel: "sessions",
    min: 1,
    max: 1,
    step: 1,
    onePerDay: false,
    goalLabel: "Workout sessions",
    types: [
      { id: "gym", label: "Gym workout", feed: "a gym workout" },
      { id: "running", label: "Running", feed: "a run" },
      { id: "sports", label: "Sports", feed: "a sports session" },
      { id: "yoga", label: "Yoga or movement", feed: "a movement session" },
    ],
  },
  social: {
    label: "Social",
    unit: "events",
    unitLabel: "events",
    min: 1,
    max: 1,
    step: 1,
    onePerDay: false,
    goalLabel: "Social events",
    types: [
      { id: "club", label: "Club event", feed: "a club event" },
      { id: "coffee", label: "Coffee with friends", feed: "coffee with friends" },
      { id: "org-meeting", label: "Campus organization meeting", feed: "an organization meeting" },
      { id: "gathering", label: "Social gathering", feed: "a social gathering" },
    ],
  },
  exploration: {
    label: "Exploration",
    unit: "hours",
    unitLabel: "hours",
    min: 0.25,
    max: 6,
    step: 0.25,
    onePerDay: false,
    goalLabel: "Outdoor hours",
    types: [
      { id: "walk", label: "Outdoor walk", feed: "an outdoor walk" },
      { id: "campus", label: "Campus exploration", feed: "a campus exploration" },
      { id: "nature", label: "Time in nature", feed: "time in nature" },
      { id: "new-experience", label: "New campus experience", feed: "a new campus experience" },
    ],
  },
  recovery: {
    label: "Recovery",
    unit: "nights",
    unitLabel: "nights",
    min: 1,
    max: 1,
    step: 1,
    onePerDay: true,
    goalLabel: "Recovery nights",
    types: [
      { id: "rest-goal", label: "Rest goal completed", feed: "a recovery night" },
      { id: "recovery-day", label: "Recovery day", feed: "a recovery day" },
      { id: "downtime", label: "Intentional downtime", feed: "intentional downtime" },
    ],
  },
};

export const DIMENSION_BLURB: Record<Dimension, string> = {
  academics: "Focused study, library time, and group work.",
  fitness: "Workouts, runs, sports, and movement.",
  social: "Clubs, coffee, and time with people.",
  exploration: "Walks, new corners of campus, and time outside.",
  recovery: "Nights you actually meet your rest goal.",
};

export function activityTypeLabel(category: Dimension, activityType: string): string {
  return (
    ACTIVITY_CATALOG[category].types.find((type) => type.id === activityType)?.label ??
    activityType
  );
}

export function activityFeedPhrase(category: Dimension, activityType: string): string {
  return (
    ACTIVITY_CATALOG[category].types.find((type) => type.id === activityType)?.feed ??
    activityTypeLabel(category, activityType).toLowerCase()
  );
}

export interface ChallengeTemplate {
  id: string;
  title: string;
  description: string;
  category: Dimension;
  targetAmount: number;
  targetUnit: ActivityUnit;
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: "study-90",
    title: "Library Sprint",
    description: "Study for 90 focused minutes.",
    category: "academics",
    targetAmount: 1.5,
    targetUnit: "hours",
  },
  {
    id: "club",
    title: "New Club Night",
    description: "Attend a club event you've never tried.",
    category: "social",
    targetAmount: 1,
    targetUnit: "events",
  },
  {
    id: "cross-campus",
    title: "The Cross Campus Challenge",
    description: "Spend 30 minutes outside today.",
    category: "exploration",
    targetAmount: 0.5,
    targetUnit: "hours",
  },
  {
    id: "workout",
    title: "Payne Whitney Session",
    description: "Complete one workout.",
    category: "fitness",
    targetAmount: 1,
    targetUnit: "sessions",
  },
  {
    id: "new-spot",
    title: "New Corner of Campus",
    description: "Spend an hour somewhere on campus you don't usually go.",
    category: "exploration",
    targetAmount: 1,
    targetUnit: "hours",
  },
  {
    id: "coffee",
    title: "Screen-free Coffee",
    description: "Have a screen-free coffee with a friend.",
    category: "social",
    targetAmount: 1,
    targetUnit: "events",
  },
  {
    id: "pause",
    title: "Intentional Pause",
    description: "Take an intentional recovery break tonight.",
    category: "recovery",
    targetAmount: 1,
    targetUnit: "nights",
  },
];

/** Challenge targets stay inside a safe single-session range. */
export const CHALLENGE_TARGET_MAX: Record<Dimension, number> = {
  academics: 3,
  fitness: 1,
  social: 1,
  exploration: 2,
  recovery: 1,
};
