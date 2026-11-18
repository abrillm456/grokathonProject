import { activityFeedPhrase } from "@/lib/catalog";
import { DEFAULT_GOALS, scoreWeek } from "@/lib/scoring";
import {
  isInWeek,
  nextWeekStart,
  nyDayKey,
  weekDayKeys,
  weekEndExclusive,
  weekStartISO,
  formatCountdown,
} from "@/lib/week";
import {
  CHALLENGE_BONUS,
  DIMENSIONS,
  MAX_CHALLENGE_XP,
  type AppData,
  type ChallengeState,
  type CollegeStanding,
  type Dimension,
  type LeaderboardRow,
  type Profile,
  type WeekScore,
  type Weights,
  type Challenge,
  type ChallengeParticipant,
} from "@/types";

export function profileById(data: AppData, userId: string): Profile | undefined {
  return data.profiles.find((profile) => profile.id === userId);
}

export function preferenceForWeek(data: AppData, userId: string, weekStart: string) {
  const mine = data.preferences.filter((preference) => preference.userId === userId);
  const exact = mine.find((preference) => preference.effectiveWeekStart === weekStart);
  if (exact) return exact;
  const earlier = mine
    .filter((preference) => preference.effectiveWeekStart <= weekStart)
    .sort((a, b) => b.effectiveWeekStart.localeCompare(a.effectiveWeekStart));
  return earlier[0];
}

export function progressFor(data: AppData, userId: string, weekStart: string): Weights {
  const progress: Weights = {
    academics: 0,
    fitness: 0,
    social: 0,
    exploration: 0,
    recovery: 0,
  };
  for (const activity of data.activities) {
    if (activity.userId !== userId || !isInWeek(activity.activityDate, weekStart)) continue;
    progress[activity.category] += activity.amount;
  }
  return progress;
}

export function challengeXpFor(data: AppData, userId: string, weekStart: string): number {
  let total = 0;
  for (const participant of data.participants) {
    if (participant.userId !== userId || !participant.bonusAwarded) continue;
    const challenge = data.challenges.find((item) => item.id === participant.challengeId);
    if (!challenge) continue;
    const match = data.matches.find((item) => item.id === challenge.matchId);
    if (match?.weekStart !== weekStart) continue;
    total += challenge.bonusXp;
  }
  return Math.min(total, MAX_CHALLENGE_XP);
}

export function scoreFor(data: AppData, userId: string, weekStart: string): WeekScore {
  const preference = preferenceForWeek(data, userId, weekStart);
  const weights = preference?.weights ?? {
    academics: 20,
    fitness: 20,
    social: 20,
    exploration: 20,
    recovery: 20,
  };
  const goals = preference?.goals ?? DEFAULT_GOALS;
  return scoreWeek({
    weights,
    goals,
    progress: progressFor(data, userId, weekStart),
    challengeXp: challengeXpFor(data, userId, weekStart),
  });
}

export function matchFor(data: AppData, userId: string, weekStart: string) {
  return data.matches.find(
    (match) =>
      match.weekStart === weekStart &&
      (match.playerOneId === userId || match.playerTwoId === userId),
  );
}

export function opponentId(match: { playerOneId: string; playerTwoId: string }, userId: string): string {
  return match.playerOneId === userId ? match.playerTwoId : match.playerOneId;
}

export function previousOpponentId(data: AppData, userId: string, beforeWeek: string): string | undefined {
  const past = data.matches
    .filter(
      (match) =>
        match.weekStart < beforeWeek &&
        (match.playerOneId === userId || match.playerTwoId === userId),
    )
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  const match = past[0];
  if (!match) return undefined;
  return opponentId(match, userId);
}

export function displayedLifetime(data: AppData, userId: string, now: Date): number {
  const profile = profileById(data, userId);
  if (!profile) return 0;
  const week = weekStartISO(now);
  const match = matchFor(data, userId, week);
  if (match?.status === "finalized") return profile.lifetimeXp;
  return profile.lifetimeXp + scoreFor(data, userId, week).totalXp;
}

export function challengeState(
  challenge: Challenge,
  participants: ChallengeParticipant[],
  now: Date,
): ChallengeState {
  const recipient = participants.find((participant) => participant.userId === challenge.recipientId);
  const creator = participants.find((participant) => participant.userId === challenge.creatorId);
  const bothDone = Boolean(creator?.completedAt && recipient?.completedAt);
  if (recipient?.declinedAt) return "declined";
  if (bothDone) return "completed";
  if (now.getTime() > new Date(challenge.expiresAt).getTime()) return "expired";
  if (!recipient?.acceptedAt) return "pending";
  if (creator?.completedAt || recipient?.completedAt) return "in_progress";
  return "accepted";
}

export interface DuelView {
  weekStart: string;
  countdown: string;
  weekOver: boolean;
  you: Profile;
  rival: Profile | null;
  youScore: WeekScore;
  rivalScore: WeekScore | null;
  matchId: string | null;
  status: "active" | "finalized" | "unmatched";
  compatibility: number;
  detail: { wellness: number; ranking: number; performance: number } | null;
  isPractice: boolean;
  winnerId: string | null;
  youRank: number | null;
  rivalRank: number | null;
  lead: number;
}

export function duelView(data: AppData, userId: string, now: Date): DuelView | null {
  const you = profileById(data, userId);
  if (!you) return null;
  const weekStart = weekStartISO(now);
  const match = matchFor(data, userId, weekStart);
  const youScore = scoreFor(data, userId, weekStart);
  const rows = leaderboard(data, "streak", now);
  const youRank = rows.find((row) => row.profile.id === userId)?.rank ?? null;
  if (!match) {
    return {
      weekStart,
      countdown: formatCountdown(now, weekStart),
      weekOver: now.getTime() >= weekEndExclusive(weekStart).getTime(),
      you,
      rival: null,
      youScore,
      rivalScore: null,
      matchId: null,
      status: "unmatched",
      compatibility: 0,
      detail: null,
      isPractice: false,
      winnerId: null,
      youRank,
      rivalRank: null,
      lead: 0,
    };
  }
  const rival = profileById(data, opponentId(match, userId)) ?? null;
  const rivalScore = rival ? scoreFor(data, rival.id, weekStart) : null;
  const rivalRank = rival ? rows.find((row) => row.profile.id === rival.id)?.rank ?? null : null;
  const lead = youScore.totalXp - (rivalScore?.totalXp ?? 0);
  return {
    weekStart,
    countdown: formatCountdown(now, weekStart),
    weekOver: now.getTime() >= weekEndExclusive(weekStart).getTime(),
    you,
    rival,
    youScore,
    rivalScore,
    matchId: match.id,
    status: match.status,
    compatibility: match.compatibilityScore,
    detail: match.compatibilityDetail,
    isPractice: match.isPracticeMatch || Boolean(rival?.isDemoRival),
    winnerId: match.winnerId,
    youRank,
    rivalRank,
    lead,
  };
}

export type LeaderboardTab = "streak" | "legends" | "colleges" | "weekly";

export function leaderboard(data: AppData, tab: LeaderboardTab, now: Date): LeaderboardRow[] {
  const week = weekStartISO(now);
  const rows = data.profiles
    .filter((profile) => !profile.isDemoRival && profile.leaderboardVisible)
    .map((profile) => {
      const weeklyXp = scoreFor(data, profile.id, week).totalXp;
      const lifetimeXp = displayedLifetime(data, profile.id, now);
      const decided = profile.totalWins + profile.totalLosses;
      return {
        rank: 0,
        profile,
        currentStreak: profile.currentWinStreak,
        longestStreak: profile.longestWinStreak,
        totalWins: profile.totalWins,
        totalLosses: profile.totalLosses,
        winRate: decided === 0 ? 0 : profile.totalWins / decided,
        rating: profile.matchmakingRating,
        lifetimeXp,
        weeklyXp,
      };
    });

  const compareName = (a: LeaderboardRow, b: LeaderboardRow) =>
    a.profile.displayName.localeCompare(b.profile.displayName);

  rows.sort((a, b) => {
    if (tab === "legends") {
      return (
        b.longestStreak - a.longestStreak ||
        b.totalWins - a.totalWins ||
        b.rating - a.rating ||
        b.lifetimeXp - a.lifetimeXp ||
        compareName(a, b)
      );
    }
    if (tab === "weekly") {
      return b.weeklyXp - a.weeklyXp || b.currentStreak - a.currentStreak || compareName(a, b);
    }
    return (
      b.currentStreak - a.currentStreak ||
      b.totalWins - a.totalWins ||
      b.rating - a.rating ||
      b.lifetimeXp - a.lifetimeXp ||
      compareName(a, b)
    );
  });

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function collegeStandings(data: AppData): CollegeStanding[] {
  const map = new Map<string, CollegeStanding>();
  for (const profile of data.profiles) {
    if (profile.isDemoRival || !profile.residentialCollege) continue;
    const current = map.get(profile.residentialCollege) ?? {
      college: profile.residentialCollege,
      students: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      averageStreak: 0,
    };
    current.students += 1;
    current.wins += profile.totalWins;
    current.losses += profile.totalLosses;
    current.averageStreak += profile.currentWinStreak;
    map.set(profile.residentialCollege, current);
  }
  return [...map.values()]
    .map((standing) => ({
      ...standing,
      averageStreak: standing.students ? standing.averageStreak / standing.students : 0,
      winRate:
        standing.wins + standing.losses === 0
          ? 0
          : standing.wins / (standing.wins + standing.losses),
    }))
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.winRate - a.winRate ||
        b.averageStreak - a.averageStreak ||
        a.college.localeCompare(b.college),
    );
}

export interface FeedItem {
  id: string;
  at: string;
  text: string;
  tone: "you" | "rival" | "challenge";
}

export function duelFeed(data: AppData, userId: string, now: Date): FeedItem[] {
  const week = weekStartISO(now);
  const match = matchFor(data, userId, week);
  if (!match) return [];
  const rival = opponentId(match, userId);
  const you = profileById(data, userId);
  const them = profileById(data, rival);
  const items: FeedItem[] = [];

  for (const activity of data.activities) {
    if (!isInWeek(activity.activityDate, week)) continue;
    if (activity.userId !== userId && activity.userId !== rival) continue;
    const owner = activity.userId === userId ? you : them;
    if (!owner) continue;
    if (activity.userId !== userId && !owner.shareActivitySummaries) continue;
    const name = activity.userId === userId ? "You" : owner.displayName.split(" ")[0];
    const verb = activity.userId === userId ? "logged" : "logged";
    items.push({
      id: activity.id,
      at: activity.activityDate,
      tone: activity.userId === userId ? "you" : "rival",
      text: `${name} ${verb} ${activityFeedPhrase(activity.category, activity.activityType)}.`,
    });
  }

  for (const challenge of data.challenges) {
    if (challenge.matchId !== match.id) continue;
    const participants = data.participants.filter((item) => item.challengeId === challenge.id);
    items.push({
      id: `${challenge.id}-created`,
      at: challenge.createdAt,
      tone: "challenge",
      text: `${nameOf(data, challenge.creatorId, userId)} sent “${challenge.title}.”`,
    });
    for (const participant of participants) {
      if (participant.acceptedAt && participant.userId === challenge.recipientId) {
        items.push({
          id: `${challenge.id}-accepted`,
          at: participant.acceptedAt,
          tone: "challenge",
          text: `${nameOf(data, participant.userId, userId)} accepted the challenge.`,
        });
      }
      if (participant.completedAt) {
        items.push({
          id: `${challenge.id}-done-${participant.userId}`,
          at: participant.completedAt,
          tone: "challenge",
          text: `${nameOf(data, participant.userId, userId)} completed “${challenge.title}.”`,
        });
      }
    }
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function nameOf(data: AppData, userId: string, viewerId: string): string {
  if (userId === viewerId) return "You";
  const profile = profileById(data, userId);
  return profile?.displayName.split(" ")[0] ?? "Your rival";
}

export interface DailyPoint {
  day: string;
  label: string;
  xp: number;
}

export function dailyXp(data: AppData, userId: string, weekStart: string): DailyPoint[] {
  const preference = preferenceForWeek(data, userId, weekStart);
  const weights = preference?.weights ?? {
    academics: 20,
    fitness: 20,
    social: 20,
    exploration: 20,
    recovery: 20,
  };
  const goals = preference?.goals ?? DEFAULT_GOALS;
  const days = weekDayKeys(weekStart);
  let previous: Weights = {
    academics: 0,
    fitness: 0,
    social: 0,
    exploration: 0,
    recovery: 0,
  };
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return days.map((day, index) => {
    const progress: Weights = { ...previous };
    for (const activity of data.activities) {
      if (activity.userId === userId && nyDayKey(activity.activityDate) === day) {
        progress[activity.category] += activity.amount;
      }
    }
    const today = scoreWeek({ weights, goals, progress, challengeXp: 0 }).baseXp;
    const prior = scoreWeek({ weights, goals, progress: previous, challengeXp: 0 }).baseXp;
    let xp = Math.max(0, today - prior);
    for (const participant of data.participants) {
      if (participant.userId !== userId || !participant.bonusAwarded || !participant.completedAt) continue;
      if (nyDayKey(participant.completedAt) !== day) continue;
      const challenge = data.challenges.find((item) => item.id === participant.challengeId);
      const match = challenge ? data.matches.find((item) => item.id === challenge.matchId) : undefined;
      if (match?.weekStart === weekStart && challenge) xp += challenge.bonusXp;
    }
    previous = progress;
    return { day, label: labels[index], xp };
  });
}

export function insightsFor(data: AppData, userId: string, now: Date): string[] {
  const week = weekStartISO(now);
  const score = scoreFor(data, userId, week);
  const ranked = [...DIMENSIONS].sort(
    (a, b) => score.categories[b].completion - score.categories[a].completion,
  );
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const lines = [
    `${label(strongest)} is your strongest category this week at ${Math.round(score.categories[strongest].completion * 100)}% of goal.`,
    `${label(weakest)} is the clearest opening, at ${Math.round(score.categories[weakest].completion * 100)}% of goal.`,
  ];
  const last = data.history
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
  if (last) {
    const socialGoal = preferenceForWeek(data, userId, week)?.goals.social ?? DEFAULT_GOALS.social;
    const lastSocial = last.categoryCompletion.social * socialGoal;
    if (score.categories.social.actual > lastSocial + 0.05) {
      lines.push("You've logged more social events than last week.");
    }
    const academicDelta = Math.round(
      (score.categories.academics.completion - last.categoryCompletion.academics) * 100,
    );
    if (academicDelta >= 5) {
      lines.push(`Your academic goal completion is up ${academicDelta} percentage points from last week.`);
    } else if (academicDelta <= -5) {
      lines.push(`Academic completion is ${Math.abs(academicDelta)} points behind last week. A single library block would close a lot of it.`);
    }
  }
  return lines;
}

function label(dimension: Dimension): string {
  return dimension.charAt(0).toUpperCase() + dimension.slice(1);
}

export interface CoachContext {
  studentName: string;
  college: string;
  rivalName: string | null;
  rivalCollege: string | null;
  practiceMatch: boolean;
  weights: Weights;
  goals: { academics: number; fitness: number; social: number; exploration: number; recovery: number };
  progress: Weights;
  categoryCompletion: Weights;
  categoryXp: Weights;
  weeklyXp: number;
  rivalWeeklyXp: number | null;
  rivalCompletion: Weights | null;
  xpGap: number;
  countdown: string;
  streak: number;
  weakest: Dimension;
  strongest: Dimension;
  activeChallenges: string[];
  recentActivities: string[];
}

export function coachContext(data: AppData, userId: string, now: Date): CoachContext | null {
  const duel = duelView(data, userId, now);
  if (!duel) return null;
  const preference = preferenceForWeek(data, userId, duel.weekStart);
  const score = duel.youScore;
  const ranked = [...DIMENSIONS].sort(
    (a, b) => score.categories[a].completion - score.categories[b].completion,
  );
  const completion = emptyCompletion(score);
  const xp = emptyCompletion(score, "xp");
  const challenges = data.challenges
    .filter((challenge) => challenge.matchId === duel.matchId)
    .map((challenge) => {
      const state = challengeState(
        challenge,
        data.participants.filter((item) => item.challengeId === challenge.id),
        now,
      );
      return `${challenge.title} (${state})`;
    });
  const recent = data.activities
    .filter((activity) => activity.userId === userId && isInWeek(activity.activityDate, duel.weekStart))
    .sort((a, b) => b.activityDate.localeCompare(a.activityDate))
    .slice(0, 6)
    .map((activity) => activityFeedPhrase(activity.category, activity.activityType));

  return {
    studentName: duel.you.displayName,
    college: duel.you.residentialCollege ?? "Yale",
    rivalName: duel.rival?.displayName ?? null,
    rivalCollege: duel.rival?.residentialCollege ?? null,
    practiceMatch: duel.isPractice,
    weights: preference?.weights ?? scoreToWeights(score, "weight"),
    goals: preference?.goals ?? DEFAULT_GOALS,
    progress: progressFor(data, userId, duel.weekStart),
    categoryCompletion: completion,
    categoryXp: xp,
    weeklyXp: score.totalXp,
    rivalWeeklyXp: duel.rivalScore?.totalXp ?? null,
    rivalCompletion: duel.rivalScore ? emptyCompletion(duel.rivalScore) : null,
    xpGap: duel.lead,
    countdown: duel.countdown,
    streak: duel.you.currentWinStreak,
    weakest: ranked[0],
    strongest: ranked[ranked.length - 1],
    activeChallenges: challenges,
    recentActivities: recent,
  };
}

function emptyCompletion(score: WeekScore, field: "completion" | "xp" | "weight" = "completion"): Weights {
  return {
    academics: score.categories.academics[field],
    fitness: score.categories.fitness[field],
    social: score.categories.social[field],
    exploration: score.categories.exploration[field],
    recovery: score.categories.recovery[field],
  };
}

function scoreToWeights(score: WeekScore, field: "weight"): Weights {
  return emptyCompletion(score, field);
}

export function upcomingChallenge(data: AppData, userId: string, now: Date) {
  const week = weekStartISO(now);
  const match = matchFor(data, userId, week);
  if (!match) return null;
  const open = data.challenges
    .filter((challenge) => challenge.matchId === match.id)
    .map((challenge) => ({
      challenge,
      state: challengeState(
        challenge,
        data.participants.filter((item) => item.challengeId === challenge.id),
        now,
      ),
    }))
    .filter((item) => item.state === "pending" || item.state === "accepted" || item.state === "in_progress");
  return open[0] ?? null;
}

export function userChallenges(data: AppData, userId: string, now: Date) {
  const week = weekStartISO(now);
  const match = matchFor(data, userId, week);
  if (!match) return [];
  return data.challenges
    .filter((challenge) => challenge.matchId === match.id)
    .map((challenge) => {
      const participants = data.participants.filter((item) => item.challengeId === challenge.id);
      return {
        challenge,
        participants,
        state: challengeState(challenge, participants, now),
      };
    })
    .sort((a, b) => b.challenge.createdAt.localeCompare(a.challenge.createdAt));
}

export { CHALLENGE_BONUS, nextWeekStart };
