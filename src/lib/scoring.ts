import {
  CHALLENGE_BONUS,
  DIMENSIONS,
  MAX_CHALLENGE_XP,
  type CategoryScore,
  type Dimension,
  type Goals,
  type WeekScore,
  type Weights,
} from "@/types";

export const DEFAULT_WEIGHTS: Weights = {
  academics: 20,
  fitness: 20,
  social: 20,
  exploration: 20,
  recovery: 20,
};

export const DEFAULT_GOALS: Goals = {
  academics: 12,
  fitness: 4,
  social: 3,
  exploration: 5,
  recovery: 7,
};

export function emptyWeights(): Weights {
  return { academics: 0, fitness: 0, social: 0, exploration: 0, recovery: 0 };
}

export function weightTotal(weights: Weights): number {
  return DIMENSIONS.reduce((sum, dimension) => sum + weights[dimension], 0);
}

export function completionRatio(actual: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(Math.max(actual, 0) / goal, 1);
}

export function scoreWeek(input: {
  weights: Weights;
  goals: Goals;
  progress: Weights;
  challengeXp: number;
}): WeekScore {
  const categories = {} as Record<Dimension, CategoryScore>;
  let balanceScore = 0;

  for (const dimension of DIMENSIONS) {
    const completion = completionRatio(input.progress[dimension], input.goals[dimension]);
    const weight = input.weights[dimension];
    const xp = completion * weight * 10;
    categories[dimension] = {
      actual: input.progress[dimension],
      goal: input.goals[dimension],
      completion,
      weight,
      xp,
    };
    balanceScore += completion * weight;
  }

  const baseXp = Math.round(balanceScore * 10);
  const challengeXp = Math.min(Math.max(Math.round(input.challengeXp), 0), MAX_CHALLENGE_XP);

  return {
    categories,
    balanceScore,
    baseXp,
    challengeXp,
    totalXp: baseXp + challengeXp,
  };
}

export function marginalDailyXp(
  weights: Weights,
  goals: Goals,
  progressThroughDay: Weights,
  progressThroughPrevious: Weights,
): number {
  const today = scoreWeek({
    weights,
    goals,
    progress: progressThroughDay,
    challengeXp: 0,
  }).baseXp;
  const previous = scoreWeek({
    weights,
    goals,
    progress: progressThroughPrevious,
    challengeXp: 0,
  }).baseXp;
  return Math.max(0, today - previous);
}

export { CHALLENGE_BONUS };
