import { ACTIVITY_CATALOG } from "@/lib/catalog";
import {
  compatibility,
  pairWeek,
  type MatchCandidate,
} from "@/lib/matchmaking";
import { validateActivity, validateChallengeTarget, validateGoals, validateWeights, validateYaleEmail } from "@/lib/validation";
import {
  challengeXpFor,
  matchFor,
  opponentId,
  preferenceForWeek,
  previousOpponentId,
  profileById,
  scoreFor,
} from "@/lib/view";
import {
  fromZonedTime,
} from "date-fns-tz";
import { TIME_ZONE, nextWeekStart, weekEndInclusive, weekStartISO } from "@/lib/week";
import {
  CHALLENGE_BONUS,
  ELO_K,
  MAX_CHALLENGE_XP,
  type Activity,
  type ActivityDraft,
  type AppData,
  type Dimension,
  type Goals,
  type PreferenceSet,
  type Profile,
  type ResidentialCollege,
  type Weights,
} from "@/types";
import { hueFromName, initialsFromName } from "@/lib/format";

export interface ActionResult {
  data: AppData;
  error?: string;
  info?: string;
}

function clone(data: AppData): AppData {
  return structuredClone(data);
}

function id(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}_${random}`;
}

export function logActivity(data: AppData, draft: ActivityDraft): ActionResult {
  const error = validateActivity(draft, data.activities, data.demoNow);
  if (error) return { data, error };
  const week = weekStartISO(new Date(draft.activityDate));
  const match = matchFor(data, draft.userId, week);
  if (match?.status === "finalized") {
    return { data, error: "That week is already finalized." };
  }
  const meta = ACTIVITY_CATALOG[draft.category];
  const next = clone(data);
  const activity: Activity = {
    id: draft.id ?? id("act"),
    userId: draft.userId,
    category: draft.category,
    activityType: draft.activityType,
    amount: draft.amount,
    unit: meta.unit,
    activityDate: new Date(draft.activityDate).toISOString(),
    notes: draft.notes.trim(),
    proofName: draft.proofName,
    proofDataUrl: draft.proofDataUrl,
    selfReported: true,
    createdAt: data.demoNow,
  };
  if (draft.id) {
    const index = next.activities.findIndex((item) => item.id === draft.id && item.userId === draft.userId);
    if (index < 0) return { data, error: "Activity not found." };
    next.activities[index] = { ...activity, createdAt: next.activities[index].createdAt };
  } else {
    next.activities.push(activity);
  }
  return { data: next, info: "Activity saved. Weekly XP was recalculated." };
}

export function deleteActivity(data: AppData, userId: string, activityId: string): ActionResult {
  const activity = data.activities.find((item) => item.id === activityId && item.userId === userId);
  if (!activity) return { data, error: "Activity not found." };
  const week = weekStartISO(new Date(activity.activityDate));
  if (matchFor(data, userId, week)?.status === "finalized") {
    return { data, error: "That week is already finalized." };
  }
  const next = clone(data);
  next.activities = next.activities.filter((item) => item.id !== activityId);
  return { data: next, info: "Activity deleted. Weekly XP was recalculated." };
}

export function saveNextPreferences(
  data: AppData,
  userId: string,
  weights: Weights,
  goals: Goals,
): ActionResult {
  const weightError = validateWeights(weights);
  if (weightError) return { data, error: weightError };
  const goalError = validateGoals(goals);
  if (goalError) return { data, error: goalError };
  const week = weekStartISO(new Date(data.demoNow));
  const effectiveWeekStart = nextWeekStart(week);
  const next = clone(data);
  const existing = next.preferences.find(
    (preference) => preference.userId === userId && preference.effectiveWeekStart === effectiveWeekStart,
  );
  const record: PreferenceSet = {
    id: existing?.id ?? id("pref"),
    userId,
    weights,
    goals,
    effectiveWeekStart,
    createdAt: data.demoNow,
  };
  if (existing) {
    next.preferences = next.preferences.map((preference) =>
      preference.id === existing.id ? record : preference,
    );
  } else {
    next.preferences.push(record);
  }
  return {
    data: next,
    info: "Your updated preferences will apply to your next weekly duel.",
  };
}

export function updateProfile(
  data: AppData,
  userId: string,
  patch: { displayName: string; residentialCollege: ResidentialCollege; graduationYear: number },
): ActionResult {
  const name = patch.displayName.trim();
  if (name.length < 2 || name.length > 40) return { data, error: "Name must be 2–40 characters." };
  if (patch.graduationYear < 2024 || patch.graduationYear > 2032) {
    return { data, error: "Choose a graduation year between 2024 and 2032." };
  }
  const next = clone(data);
  const profile = next.profiles.find((item) => item.id === userId);
  if (!profile || profile.isDemoRival) return { data, error: "Profile not found." };
  profile.displayName = name;
  profile.residentialCollege = patch.residentialCollege;
  profile.graduationYear = patch.graduationYear;
  profile.initials = initialsFromName(name);
  profile.avatarHue = hueFromName(name);
  return { data: next, info: "Profile updated." };
}

export function updateCompetitionPrefs(
  data: AppData,
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      "notificationsEnabled" | "challengeNotifications" | "leaderboardVisible" | "shareActivitySummaries"
    >
  >,
): ActionResult {
  const next = clone(data);
  const profile = next.profiles.find((item) => item.id === userId);
  if (!profile) return { data, error: "Profile not found." };
  Object.assign(profile, patch);
  return { data: next, info: "Competition preferences saved." };
}

export function createChallenge(
  data: AppData,
  input: {
    userId: string;
    title: string;
    description: string;
    category: Dimension;
    targetAmount: number;
  },
): ActionResult {
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 3 || title.length > 60) return { data, error: "Give the challenge a title (3–60 characters)." };
  if (description.length > 200) return { data, error: "Description must be 200 characters or fewer." };
  const targetError = validateChallengeTarget(input.category, input.targetAmount);
  if (targetError) return { data, error: targetError };
  const week = weekStartISO(new Date(data.demoNow));
  const match = matchFor(data, input.userId, week);
  if (!match || match.status !== "active") {
    return { data, error: "You can only challenge your rival during an active week." };
  }
  const sent = data.challenges.filter(
    (challenge) => challenge.creatorId === input.userId && challenge.matchId === match.id,
  );
  if (sent.length >= 4) {
    return { data, error: "You can send up to 4 challenges in a week." };
  }
  const rivalId = opponentId(match, input.userId);
  const next = clone(data);
  const challengeId = id("ch");
  next.challenges.push({
    id: challengeId,
    matchId: match.id,
    creatorId: input.userId,
    recipientId: rivalId,
    title,
    description,
    category: input.category,
    targetAmount: input.targetAmount,
    targetUnit: ACTIVITY_CATALOG[input.category].unit,
    bonusXp: CHALLENGE_BONUS,
    createdAt: data.demoNow,
    expiresAt: weekEndInclusive(week).toISOString(),
  });
  next.participants.push(
    {
      id: id("cp"),
      challengeId,
      userId: input.userId,
      acceptedAt: data.demoNow,
      declinedAt: null,
      completedAt: null,
      progressAmount: 0,
      bonusAwarded: false,
    },
    {
      id: id("cp"),
      challengeId,
      userId: rivalId,
      acceptedAt: null,
      declinedAt: null,
      completedAt: null,
      progressAmount: 0,
      bonusAwarded: false,
    },
  );
  const creator = profileById(data, input.userId);
  next.notifications.push({
    id: id("nt"),
    userId: rivalId,
    title: "New rival challenge",
    body: `${creator?.displayName ?? "Your rival"} sent you “${title}.”`,
    createdAt: data.demoNow,
    read: false,
  });
  return { data: next, info: "Challenge sent. Bonus XP is awarded only after your rival accepts and you mark it complete." };
}

export function respondToChallenge(
  data: AppData,
  userId: string,
  challengeId: string,
  accept: boolean,
): ActionResult {
  const challenge = data.challenges.find((item) => item.id === challengeId);
  if (!challenge) return { data, error: "Challenge not found." };
  if (challenge.recipientId !== userId) return { data, error: "Only the rival who received this can respond." };
  if (new Date(data.demoNow).getTime() > new Date(challenge.expiresAt).getTime()) {
    return { data, error: "This challenge has expired." };
  }
  const participant = data.participants.find(
    (item) => item.challengeId === challengeId && item.userId === userId,
  );
  if (!participant) return { data, error: "Challenge not found." };
  if (participant.acceptedAt || participant.declinedAt) {
    return { data, error: "You already responded to this challenge." };
  }
  const next = clone(data);
  const row = next.participants.find((item) => item.id === participant.id);
  if (!row) return { data, error: "Challenge not found." };
  if (accept) row.acceptedAt = data.demoNow;
  else row.declinedAt = data.demoNow;
  const actor = profileById(data, userId);
  next.notifications.push({
    id: id("nt"),
    userId: challenge.creatorId,
    title: accept ? "Challenge accepted" : "Challenge declined",
    body: `${actor?.displayName.split(" ")[0] ?? "Your rival"} ${accept ? "accepted" : "declined"} “${challenge.title}.”`,
    createdAt: data.demoNow,
    read: false,
  });
  return { data: next, info: accept ? "Challenge accepted. Either of you can mark your side complete." : "Challenge declined. No penalty." };
}

export function completeChallenge(data: AppData, userId: string, challengeId: string): ActionResult {
  const challenge = data.challenges.find((item) => item.id === challengeId);
  if (!challenge) return { data, error: "Challenge not found." };
  if (new Date(data.demoNow).getTime() > new Date(challenge.expiresAt).getTime()) {
    return { data, error: "This challenge has expired." };
  }
  const recipient = data.participants.find(
    (item) => item.challengeId === challengeId && item.userId === challenge.recipientId,
  );
  if (!recipient?.acceptedAt) {
    return { data, error: "Bonus XP is available only after your rival accepts." };
  }
  const participant = data.participants.find(
    (item) => item.challengeId === challengeId && item.userId === userId,
  );
  if (!participant) return { data, error: "You aren't part of this challenge." };
  if (participant.completedAt) return { data, error: "You already completed this challenge." };
  const match = data.matches.find((item) => item.id === challenge.matchId);
  if (!match || match.status !== "active") return { data, error: "This week's duel is already finalized." };
  const next = clone(data);
  const row = next.participants.find((item) => item.id === participant.id);
  if (!row) return { data, error: "Challenge not found." };
  row.completedAt = data.demoNow;
  row.progressAmount = challenge.targetAmount;
  const already = challengeXpFor(data, userId, match.weekStart);
  if (already + challenge.bonusXp > MAX_CHALLENGE_XP) {
    row.bonusAwarded = false;
    return {
      data: next,
      info: "Marked complete. The weekly challenge bonus is capped at 100 XP, so this one didn't add more.",
    };
  }
  row.bonusAwarded = true;
  return { data: next, info: `Challenge complete. +${challenge.bonusXp} XP added once.` };
}

function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

function finalizeMatch(data: AppData, matchId: string): void {
  const match = data.matches.find((item) => item.id === matchId);
  if (!match || match.status === "finalized") return;
  const one = profileById(data, match.playerOneId);
  const two = profileById(data, match.playerTwoId);
  if (!one || !two) return;
  const scoreOne = scoreFor(data, one.id, match.weekStart);
  const scoreTwo = scoreFor(data, two.id, match.weekStart);
  const practice = match.isPracticeMatch || one.isDemoRival || two.isDemoRival;
  let winnerId: string | null = null;
  if (scoreOne.totalXp > scoreTwo.totalXp) winnerId = one.id;
  else if (scoreTwo.totalXp > scoreOne.totalXp) winnerId = two.id;

  match.playerOneXp = scoreOne.totalXp;
  match.playerTwoXp = scoreTwo.totalXp;
  match.winnerId = winnerId;
  match.status = "finalized";
  match.finalizedAt = data.demoNow;

  const ratingOne = one.matchmakingRating;
  const ratingTwo = two.matchmakingRating;
  const settle = (
    profile: Profile,
    xp: number,
    opponent: Profile,
    opponentRating: number,
    score: typeof scoreOne,
  ) => {
    const result = winnerId === null ? "tie" : winnerId === profile.id ? "win" : "loss";
    const ratingBefore = profile.matchmakingRating;
    let ratingAfter = ratingBefore;
    let streakAfter = profile.currentWinStreak;
    if (!practice && !profile.isDemoRival) {
      const outcome = result === "win" ? 1 : result === "tie" ? 0.5 : 0;
      ratingAfter = Math.max(
        100,
        Math.round(ratingBefore + ELO_K * (outcome - expectedScore(ratingBefore, opponentRating))),
      );
      if (result === "win") {
        profile.currentWinStreak += 1;
        profile.longestWinStreak = Math.max(profile.longestWinStreak, profile.currentWinStreak);
        profile.totalWins += 1;
      } else if (result === "loss") {
        profile.currentWinStreak = 0;
        profile.totalLosses += 1;
      } else {
        profile.currentWinStreak = 0;
      }
      profile.matchmakingRating = ratingAfter;
      streakAfter = profile.currentWinStreak;
    }
    profile.lifetimeXp += xp;
    data.results.push({
      id: id("mr"),
      matchId: match.id,
      userId: profile.id,
      opponentId: opponent.id,
      weekStart: match.weekStart,
      result,
      xpEarned: xp,
      ratingBefore,
      ratingAfter,
      streakAfter,
      countsForLeaderboard: !practice && !profile.isDemoRival,
      createdAt: data.demoNow,
    });
    data.history.push({
      id: id("wh"),
      userId: profile.id,
      weekStart: match.weekStart,
      totalXp: xp,
      result,
      categoryCompletion: {
        academics: score.categories.academics.completion,
        fitness: score.categories.fitness.completion,
        social: score.categories.social.completion,
        exploration: score.categories.exploration.completion,
        recovery: score.categories.recovery.completion,
      },
      opponentId: opponent.id,
    });
  };

  settle(one, scoreOne.totalXp, two, ratingTwo, scoreOne);
  settle(two, scoreTwo.totalXp, one, ratingOne, scoreTwo);
}

export function finalizeWeek(data: AppData): ActionResult {
  const week = weekStartISO(new Date(data.demoNow));
  const next = clone(data);
  const end = weekEndInclusive(week);
  if (new Date(next.demoNow).getTime() < end.getTime()) {
    next.demoNow = end.toISOString();
  }
  const active = next.matches.filter((match) => match.weekStart === week && match.status === "active");
  if (active.length === 0) return { data: next, error: "This week is already finalized." };
  for (const match of active) finalizeMatch(next, match.id);
  return { data: next, info: "The week is closed. Streaks, ratings, and the leaderboard are updated." };
}

export function advanceToWeekEnd(data: AppData): ActionResult {
  const week = weekStartISO(new Date(data.demoNow));
  const next = clone(data);
  next.demoNow = weekEndInclusive(week).toISOString();
  return { data: next, info: "Demo clock moved to Sunday night. Finalize to lock the results." };
}

function candidatesFor(data: AppData, weekStart: string): MatchCandidate[] {
  const recentWeek = nextWeekStart(weekStart) === weekStart ? weekStart : weekStart;
  void recentWeek;
  const prior = data.matches
    .map((match) => match.weekStart)
    .filter((start) => start < weekStart)
    .sort()
    .at(-1);
  return data.profiles.map((profile) => {
    const preference = preferenceForWeek(data, profile.id, weekStart);
    const recentXp = prior
      ? scoreFor(data, profile.id, prior).totalXp
      : scoreFor(data, profile.id, weekStart).totalXp;
    return {
      id: profile.id,
      weights: preference?.weights ?? {
        academics: 20,
        fitness: 20,
        social: 20,
        exploration: 20,
        recovery: 20,
      },
      rating: profile.matchmakingRating,
      recentXp,
      isDemoRival: profile.isDemoRival,
    };
  });
}

export function startNextWeek(data: AppData, practiceRivalId: string): ActionResult {
  const week = weekStartISO(new Date(data.demoNow));
  const mine = matchFor(data, data.currentUserId, week);
  if (mine && mine.status !== "finalized") {
    return { data, error: "Finalize this week before finding the next rival." };
  }
  const upcoming = nextWeekStart(week);
  if (data.matches.some((match) => match.weekStart === upcoming && (match.playerOneId === data.currentUserId || match.playerTwoId === data.currentUserId))) {
    const next = clone(data);
    next.demoNow = fromZonedTime(`${upcoming}T00:05:00`, TIME_ZONE).toISOString();
    return { data: next, info: "Next week's rival is ready." };
  }
  const next = clone(data);
  next.demoNow = fromZonedTime(`${upcoming}T00:05:00`, TIME_ZONE).toISOString();
  const pool = candidatesFor(next, upcoming);
  const previous = new Map<string, string>();
  for (const profile of next.profiles) {
    const prior = previousOpponentId(next, profile.id, upcoming);
    if (prior) previous.set(profile.id, prior);
  }
  const already = new Set(
    next.matches
      .filter((match) => match.weekStart === upcoming)
      .flatMap((match) => [match.playerOneId, match.playerTwoId]),
  );
  const available = pool.filter((candidate) => !already.has(candidate.id));
  const pairs = pairWeek(available, previous, practiceRivalId);
  for (const pair of pairs) {
    next.matches.push({
      id: id("match"),
      weekStart: upcoming,
      playerOneId: pair.playerOneId,
      playerTwoId: pair.playerTwoId,
      status: "active",
      compatibilityScore: pair.compatibility.score,
      compatibilityDetail: pair.compatibility.detail,
      winnerId: null,
      playerOneXp: null,
      playerTwoXp: null,
      isPracticeMatch: pair.isPracticeMatch,
      finalizedAt: null,
      createdAt: next.demoNow,
    });
  }
  const created = next.matches.find(
    (match) =>
      match.weekStart === upcoming &&
      (match.playerOneId === data.currentUserId || match.playerTwoId === data.currentUserId),
  );
  const rival = created ? profileById(next, opponentId(created, data.currentUserId)) : undefined;
  const practice = created?.isPracticeMatch || rival?.isDemoRival;
  return {
    data: next,
    info: rival
      ? practice
        ? `No unmatched Yale student was free. You're paired with ${rival.displayName}, a practice rival. This match will not count on the leaderboard.`
        : `Your next rival is ${rival.displayName}.`
      : "Next week is set.",
  };
}

export function onboardStudent(
  data: AppData,
  input: {
    displayName: string;
    email: string;
    residentialCollege: ResidentialCollege;
    graduationYear: number;
    weights: Weights;
    goals: Goals;
  },
  practiceRivalId: string,
): ActionResult {
  const emailError = validateYaleEmail(input.email);
  if (emailError) return { data, error: emailError };
  const weightError = validateWeights(input.weights);
  if (weightError) return { data, error: weightError };
  const goalError = validateGoals(input.goals);
  if (goalError) return { data, error: goalError };
  const name = input.displayName.trim();
  if (name.length < 2) return { data, error: "Add your name." };
  const email = input.email.trim().toLowerCase();
  if (data.profiles.some((profile) => profile.email.toLowerCase() === email)) {
    return { data, error: "That Yale email is already in the league." };
  }
  const next = clone(data);
  const userId = id("student");
  const week = weekStartISO(new Date(data.demoNow));
  next.profiles.push({
    id: userId,
    displayName: name,
    email,
    residentialCollege: input.residentialCollege,
    graduationYear: input.graduationYear,
    initials: initialsFromName(name),
    avatarHue: hueFromName(name),
    matchmakingRating: 1000,
    lifetimeXp: 0,
    currentWinStreak: 0,
    longestWinStreak: 0,
    totalWins: 0,
    totalLosses: 0,
    isDemoRival: false,
    shareActivitySummaries: true,
    notificationsEnabled: true,
    challengeNotifications: true,
    leaderboardVisible: true,
    createdAt: data.demoNow,
  });
  next.preferences.push({
    id: id("pref"),
    userId,
    weights: input.weights,
    goals: input.goals,
    effectiveWeekStart: week,
    createdAt: data.demoNow,
  });
  next.currentUserId = userId;
  const taken = new Set(
    next.matches
      .filter((match) => match.weekStart === week)
      .flatMap((match) => [match.playerOneId, match.playerTwoId]),
  );
  const me: MatchCandidate = {
    id: userId,
    weights: input.weights,
    rating: 1000,
    recentXp: 0,
    isDemoRival: false,
  };
  const options = next.profiles
    .filter((profile) => !profile.isDemoRival && profile.id !== userId && !taken.has(profile.id))
    .map((profile) => {
      const preference = preferenceForWeek(next, profile.id, week);
      return {
        id: profile.id,
        weights: preference?.weights ?? input.weights,
        rating: profile.matchmakingRating,
        recentXp: scoreFor(next, profile.id, week).totalXp,
        isDemoRival: false,
      } satisfies MatchCandidate;
    });
  let rivalId = practiceRivalId;
  let result = { score: 0, detail: { wellness: 0, ranking: 0, performance: 0 } };
  let practice = true;
  if (options.length > 0) {
    const best = options
      .map((option) => ({ option, result: compatibility(me, option) }))
      .sort((a, b) => b.result.score - a.result.score)[0];
    rivalId = best.option.id;
    result = best.result;
    practice = false;
  }
  next.matches.push({
    id: id("match"),
    weekStart: week,
    playerOneId: userId,
    playerTwoId: rivalId,
    status: "active",
    compatibilityScore: result.score,
    compatibilityDetail: result.detail,
    winnerId: null,
    playerOneXp: null,
    playerTwoXp: null,
    isPracticeMatch: practice,
    finalizedAt: null,
    createdAt: data.demoNow,
  });
  return {
    data: next,
    info: practice
      ? "The Yale pool is already paired this week. You have a clearly labeled practice rival. That match will not count on the leaderboard."
      : "You're in. Your rival is set for this week.",
  };
}

export function markNotificationsRead(data: AppData, userId: string): ActionResult {
  const next = clone(data);
  for (const notification of next.notifications) {
    if (notification.userId === userId) notification.read = true;
  }
  return { data: next };
}

export function appendCoachMessage(
  data: AppData,
  userId: string,
  role: "user" | "assistant",
  content: string,
  source: "demo" | "grok",
): ActionResult {
  const next = clone(data);
  next.messages.push({
    id: id("msg"),
    userId,
    role,
    content,
    source,
    createdAt: data.demoNow,
  });
  return { data: next };
}

export function setCurrentUser(data: AppData, userId: string): ActionResult {
  if (!data.profiles.some((profile) => profile.id === userId)) {
    return { data, error: "That student isn't in the demo pool." };
  }
  const next = clone(data);
  next.currentUserId = userId;
  return { data: next };
}
