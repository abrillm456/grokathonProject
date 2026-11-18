import { DIMENSIONS, type CompatibilityDetail, type Dimension, type Weights } from "@/types";

export interface MatchCandidate {
  id: string;
  weights: Weights;
  rating: number;
  recentXp: number;
  isDemoRival: boolean;
}

export interface CompatibilityResult {
  score: number;
  detail: CompatibilityDetail;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function wellnessSimilarity(a: Weights, b: Weights): number {
  let sum = 0;
  for (const dimension of DIMENSIONS) {
    const diff = a[dimension] - b[dimension];
    sum += diff * diff;
  }
  return clamp(1 - Math.sqrt(sum) / (Math.SQRT2 * 100), 0, 1);
}

export function rankingSimilarity(a: number, b: number, scale = 400): number {
  return clamp(1 - Math.abs(a - b) / scale, 0, 1);
}

export function performanceSimilarity(a: number, b: number): number {
  return clamp(1 - Math.abs(a - b) / 1100, 0, 1);
}

export function compatibility(
  a: MatchCandidate,
  b: MatchCandidate,
  rankingScale = 400,
): CompatibilityResult {
  const wellness = wellnessSimilarity(a.weights, b.weights);
  const ranking = rankingSimilarity(a.rating, b.rating, rankingScale);
  const performance = performanceSimilarity(a.recentXp, b.recentXp);
  const score = 0.5 * wellness + 0.35 * ranking + 0.15 * performance;
  return { score, detail: { wellness, ranking, performance } };
}

export function ratingGapForCompatibility(
  a: Omit<MatchCandidate, "rating">,
  b: Omit<MatchCandidate, "rating">,
  target: number,
  rankingScale = 400,
): number {
  const wellness = wellnessSimilarity(a.weights, b.weights);
  const performance = performanceSimilarity(a.recentXp, b.recentXp);
  const ranking = clamp((target - 0.5 * wellness - 0.15 * performance) / 0.35, 0, 1);
  return (1 - ranking) * rankingScale;
}

export interface Pairing {
  playerOneId: string;
  playerTwoId: string;
  compatibility: CompatibilityResult;
  isPracticeMatch: boolean;
}

/**
 * Greedy mutual pairing. Each student appears in at most one pair.
 * A previous rival is skipped when another candidate is within 0.2.
 * A small pool widens the ranking scale from 400 to 800.
 * Anyone left over is paired with the practice rival.
 */
export function pairWeek(
  players: MatchCandidate[],
  previousOpponent: Map<string, string>,
  practiceRivalId: string,
): Pairing[] {
  const eligible = players.filter((player) => !player.isDemoRival);
  const unmatched = new Set(eligible.map((player) => player.id));
  const byId = new Map(players.map((player) => [player.id, player]));
  const ordered = [...eligible].sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id));
  const pairs: Pairing[] = [];

  for (const player of ordered) {
    if (!unmatched.has(player.id)) continue;
    const options = eligible.filter((option) => unmatched.has(option.id) && option.id !== player.id);
    if (options.length === 0) break;
    const scale = options.length < 4 ? 800 : 400;
    let best: MatchCandidate | null = null;
    let bestScore = -1;
    let alternate: MatchCandidate | null = null;
    let alternateScore = -1;
    const previous = previousOpponent.get(player.id);

    for (const option of options) {
      const result = compatibility(player, option, scale);
      if (
        result.score > bestScore ||
        (result.score === bestScore && (best === null || option.id < best.id))
      ) {
        best = option;
        bestScore = result.score;
      }
      if (option.id !== previous && result.score > alternateScore) {
        alternate = option;
        alternateScore = result.score;
      }
    }

    const chosen =
      best &&
      alternate &&
      best.id === previous &&
      bestScore - alternateScore < 0.2
        ? alternate
        : best;

    if (!chosen) continue;
    const result = compatibility(player, chosen, scale);
    pairs.push({
      playerOneId: player.id,
      playerTwoId: chosen.id,
      compatibility: result,
      isPracticeMatch: false,
    });
    unmatched.delete(player.id);
    unmatched.delete(chosen.id);
  }

  for (const leftover of unmatched) {
    const player = byId.get(leftover);
    if (!player) continue;
    pairs.push({
      playerOneId: leftover,
      playerTwoId: practiceRivalId,
      compatibility: {
        score: 0,
        detail: { wellness: 0, ranking: 0, performance: 0 },
      },
      isPracticeMatch: true,
    });
  }

  return pairs;
}

export function sharedPriorities(a: Weights, b: Weights): Dimension[] {
  return [...DIMENSIONS]
    .map((dimension) => ({
      dimension,
      average: (a[dimension] + b[dimension]) / 2,
    }))
    .sort((left, right) => right.average - left.average)
    .slice(0, 2)
    .map((item) => item.dimension);
}
