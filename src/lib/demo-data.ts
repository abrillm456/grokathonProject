import { fromZonedTime } from "date-fns-tz";
import { ACTIVITY_CATALOG } from "@/lib/catalog";
import { compatibility, pairWeek, ratingGapForCompatibility, type MatchCandidate } from "@/lib/matchmaking";
import { hashString, mulberry32 } from "@/lib/rng";
import { DEFAULT_GOALS, emptyWeights } from "@/lib/scoring";
import { hueFromName, initialsFromName } from "@/lib/format";
import { scoreFor } from "@/lib/view";
import { addCalendarDays, DEMO_NOW, TIME_ZONE } from "@/lib/week";
import {
  DIMENSIONS,
  type Activity,
  type AppData,
  type Dimension,
  type DuelResult,
  type Goals,
  type Profile,
  type ResidentialCollege,
  type WeekHistory,
  type Weights,
} from "@/types";

export const DEMO_USER_ID = "jamie";
export const SHOWCASE_RIVAL_ID = "alex";
export const PRACTICE_RIVAL_ID = "practice-rival";
export const CURRENT_WEEK = "2026-11-16";

const WEEK_DAYS = [
  "2026-11-16",
  "2026-11-17",
  "2026-11-18",
  "2026-11-19",
  "2026-11-20",
  "2026-11-21",
];

interface SeedStudent {
  id: string;
  name: string;
  college: ResidentialCollege;
  year: number;
  streak: number;
  longest: number;
  wins: number;
  losses: number;
  rating: number;
}

const CAST: SeedStudent[] = [
  { id: "jamie", name: "Jamie Rivera", college: "Berkeley", year: 2028, streak: 6, longest: 6, wins: 9, losses: 4, rating: 1176 },
  { id: "alex", name: "Alex Chen", college: "Branford", year: 2027, streak: 4, longest: 5, wins: 7, losses: 5, rating: 1130 },
  { id: "sophia", name: "Sophia Martinez", college: "Davenport", year: 2026, streak: 12, longest: 12, wins: 18, losses: 4, rating: 1420 },
  { id: "chloe", name: "Chloe Kim", college: "Ezra Stiles", year: 2028, streak: 11, longest: 11, wins: 16, losses: 3, rating: 1390 },
  { id: "ethan", name: "Ethan Park", college: "Silliman", year: 2027, streak: 10, longest: 10, wins: 15, losses: 5, rating: 1360 },
  { id: "zoe", name: "Zoe Adeyemi", college: "Benjamin Franklin", year: 2026, streak: 10, longest: 13, wins: 14, losses: 6, rating: 1344 },
  { id: "maya", name: "Maya Patel", college: "Branford", year: 2028, streak: 9, longest: 9, wins: 14, losses: 4, rating: 1320 },
  { id: "mateo", name: "Mateo Alvarez", college: "Saybrook", year: 2026, streak: 9, longest: 9, wins: 13, losses: 5, rating: 1302 },
  { id: "priya", name: "Priya Shah", college: "Grace Hopper", year: 2027, streak: 8, longest: 8, wins: 13, losses: 4, rating: 1288 },
  { id: "noah", name: "Noah Williams", college: "Pierson", year: 2028, streak: 8, longest: 8, wins: 12, losses: 6, rating: 1275 },
  { id: "hannah", name: "Hannah Brooks", college: "Pauli Murray", year: 2027, streak: 8, longest: 9, wins: 12, losses: 5, rating: 1264 },
  { id: "jordan", name: "Jordan Lee", college: "Morse", year: 2026, streak: 7, longest: 7, wins: 12, losses: 6, rating: 1250 },
  { id: "aisha", name: "Aisha Rahman", college: "Timothy Dwight", year: 2026, streak: 7, longest: 7, wins: 11, losses: 5, rating: 1238 },
  { id: "liam", name: "Liam O'Connor", college: "Trumbull", year: 2027, streak: 7, longest: 7, wins: 11, losses: 4, rating: 1226 },
  { id: "caleb", name: "Caleb Nguyen", college: "Jonathan Edwards", year: 2028, streak: 7, longest: 7, wins: 10, losses: 5, rating: 1214 },
  { id: "owen", name: "Owen Brooks", college: "Davenport", year: 2027, streak: 7, longest: 8, wins: 10, losses: 6, rating: 1202 },
  { id: "fatima", name: "Fatima Hassan", college: "Berkeley", year: 2028, streak: 6, longest: 6, wins: 15, losses: 7, rating: 1198 },
  { id: "grace", name: "Grace Liu", college: "Silliman", year: 2026, streak: 6, longest: 6, wins: 14, losses: 6, rating: 1190 },
  { id: "julian", name: "Julian Rossi", college: "Morse", year: 2027, streak: 6, longest: 6, wins: 13, losses: 5, rating: 1182 },
  { id: "naomi", name: "Naomi Cohen", college: "Pierson", year: 2028, streak: 6, longest: 6, wins: 12, losses: 6, rating: 1170 },
  { id: "isaac", name: "Isaac Thompson", college: "Trumbull", year: 2026, streak: 6, longest: 6, wins: 11, losses: 5, rating: 1162 },
  { id: "elena", name: "Elena Vasquez", college: "Saybrook", year: 2028, streak: 6, longest: 6, wins: 10, losses: 4, rating: 1155 },
  { id: "chris", name: "Chris Dalton", college: "Grace Hopper", year: 2027, streak: 6, longest: 6, wins: 8, losses: 5, rating: 1148 },
  { id: "riley", name: "Riley Morgan", college: "Morse", year: 2028, streak: 5, longest: 5, wins: 8, losses: 4, rating: 1122 },
  { id: "samira", name: "Samira Okonkwo", college: "Pauli Murray", year: 2026, streak: 5, longest: 5, wins: 7, losses: 4, rating: 1110 },
  { id: "ben", name: "Ben Carter", college: "Jonathan Edwards", year: 2027, streak: 3, longest: 4, wins: 6, losses: 5, rating: 1095 },
  { id: "lauren", name: "Lauren Weiss", college: "Timothy Dwight", year: 2028, streak: 3, longest: 3, wins: 5, losses: 4, rating: 1084 },
  { id: "diego", name: "Diego Morales", college: "Trumbull", year: 2026, streak: 2, longest: 2, wins: 5, losses: 6, rating: 1070 },
  { id: "harper", name: "Harper Singh", college: "Ezra Stiles", year: 2027, streak: 2, longest: 4, wins: 4, losses: 5, rating: 1055 },
  { id: "quinn", name: "Quinn Adler", college: "Pierson", year: 2028, streak: 1, longest: 1, wins: 3, losses: 4, rating: 1040 },
  { id: "tyler", name: "Tyler Brooks", college: "Silliman", year: 2026, streak: 1, longest: 1, wins: 2, losses: 5, rating: 1024 },
  { id: "nina", name: "Nina Volkov", college: "Berkeley", year: 2028, streak: 0, longest: 9, wins: 4, losses: 8, rating: 1010 },
  { id: "omar", name: "Omar Farouk", college: "Branford", year: 2027, streak: 0, longest: 2, wins: 2, losses: 6, rating: 990 },
  { id: "ella", name: "Ella Fontaine", college: "Davenport", year: 2026, streak: 0, longest: 8, wins: 1, losses: 7, rating: 970 },
];

const SHOWCASE_WEIGHTS: Record<string, Weights> = {
  jamie: { academics: 28, fitness: 24, social: 18, exploration: 16, recovery: 14 },
  alex: { academics: 26, fitness: 25, social: 18, exploration: 16, recovery: 15 },
};

function at(day: string, time: string): string {
  return fromZonedTime(`${day}T${time}:00`, TIME_ZONE).toISOString();
}

function emailFor(name: string): string {
  const [first, ...rest] = name.toLowerCase().replace(/'/g, "").split(/\s+/);
  return `${first}.${rest.join("")}@yale.edu`;
}

function weightsFor(id: string): Weights {
  const fixed = SHOWCASE_WEIGHTS[id];
  if (fixed) return fixed;
  const random = mulberry32(hashString(id));
  const raw = DIMENSIONS.map(() => 8 + random() * 18);
  const sum = raw.reduce((total, value) => total + value, 0);
  const rounded = raw.map((value) => Math.max(5, Math.round((value / sum) * 100)));
  const drift = 100 - rounded.reduce((total, value) => total + value, 0);
  const index = rounded.indexOf(Math.max(...rounded));
  rounded[index] += drift;
  if (rounded[index] < 5) {
    rounded[index] = 5;
  }
  const again = 100 - rounded.reduce((total, value) => total + value, 0);
  rounded[0] += again;
  return {
    academics: rounded[0],
    fitness: rounded[1],
    social: rounded[2],
    exploration: rounded[3],
    recovery: rounded[4],
  };
}

function profileFrom(student: SeedStudent, lifetimeXp: number): Profile {
  return {
    id: student.id,
    displayName: student.name,
    email: emailFor(student.name),
    residentialCollege: student.college,
    graduationYear: student.year,
    initials: initialsFromName(student.name),
    avatarHue: hueFromName(student.name),
    matchmakingRating: student.rating,
    lifetimeXp,
    currentWinStreak: student.streak,
    longestWinStreak: Math.max(student.longest, student.streak),
    totalWins: student.wins,
    totalLosses: student.losses,
    isDemoRival: false,
    shareActivitySummaries: true,
    notificationsEnabled: true,
    challengeNotifications: true,
    leaderboardVisible: true,
    createdAt: "2026-08-20T14:00:00.000Z",
  };
}

function pushActivity(
  activities: Activity[],
  input: {
    id: string;
    userId: string;
    category: Dimension;
    activityType: string;
    amount: number;
    day: string;
    time: string;
    notes?: string;
  },
) {
  const meta = ACTIVITY_CATALOG[input.category];
  activities.push({
    id: input.id,
    userId: input.userId,
    category: input.category,
    activityType: input.activityType,
    amount: input.amount,
    unit: meta.unit,
    activityDate: at(input.day, input.time),
    notes: input.notes ?? "",
    proofName: null,
    proofDataUrl: null,
    selfReported: true,
    createdAt: at(input.day, input.time),
  });
}

function showcaseActivities(): Activity[] {
  const activities: Activity[] = [];
  const jamieNotes = "Problem set 4 — keep this note private.";
  pushActivity(activities, { id: "act_j_a1", userId: "jamie", category: "academics", activityType: "library", amount: 4, day: "2026-11-16", time: "10:00", notes: jamieNotes });
  pushActivity(activities, { id: "act_j_a2", userId: "jamie", category: "academics", activityType: "focused-study", amount: 4, day: "2026-11-17", time: "14:00" });
  pushActivity(activities, { id: "act_j_a3", userId: "jamie", category: "academics", activityType: "group-study", amount: 4, day: "2026-11-19", time: "11:00" });
  pushActivity(activities, { id: "act_j_f1", userId: "jamie", category: "fitness", activityType: "gym", amount: 1, day: "2026-11-16", time: "17:00" });
  pushActivity(activities, { id: "act_j_f2", userId: "jamie", category: "fitness", activityType: "running", amount: 1, day: "2026-11-18", time: "07:30" });
  pushActivity(activities, { id: "act_j_f3", userId: "jamie", category: "fitness", activityType: "sports", amount: 1, day: "2026-11-20", time: "16:00" });
  pushActivity(activities, { id: "act_j_s1", userId: "jamie", category: "social", activityType: "club", amount: 1, day: "2026-11-17", time: "19:00" });
  pushActivity(activities, { id: "act_j_s2", userId: "jamie", category: "social", activityType: "coffee", amount: 1, day: "2026-11-19", time: "15:30" });
  pushActivity(activities, { id: "act_j_e1", userId: "jamie", category: "exploration", activityType: "walk", amount: 1, day: "2026-11-18", time: "16:00" });
  pushActivity(activities, { id: "act_j_e2", userId: "jamie", category: "exploration", activityType: "campus", amount: 0.875, day: "2026-11-21", time: "11:00" });
  for (let index = 0; index < 5; index += 1) {
    pushActivity(activities, {
      id: `act_j_r${index + 1}`,
      userId: "jamie",
      category: "recovery",
      activityType: "rest-goal",
      amount: 1,
      day: WEEK_DAYS[index],
      time: "22:30",
    });
  }

  pushActivity(activities, { id: "act_a_a1", userId: "alex", category: "academics", activityType: "library", amount: 4, day: "2026-11-16", time: "09:00" });
  pushActivity(activities, { id: "act_a_a2", userId: "alex", category: "academics", activityType: "focused-study", amount: 4, day: "2026-11-18", time: "13:00" });
  pushActivity(activities, { id: "act_a_f1", userId: "alex", category: "fitness", activityType: "gym", amount: 1, day: "2026-11-17", time: "18:00" });
  pushActivity(activities, { id: "act_a_f2", userId: "alex", category: "fitness", activityType: "running", amount: 1, day: "2026-11-19", time: "08:00" });
  pushActivity(activities, { id: "act_a_s1", userId: "alex", category: "social", activityType: "club", amount: 1, day: "2026-11-16", time: "19:30" });
  pushActivity(activities, { id: "act_a_s2", userId: "alex", category: "social", activityType: "coffee", amount: 1, day: "2026-11-18", time: "12:00" });
  pushActivity(activities, { id: "act_a_s3", userId: "alex", category: "social", activityType: "gathering", amount: 1, day: "2026-11-20", time: "18:30" });
  pushActivity(activities, { id: "act_a_e1", userId: "alex", category: "exploration", activityType: "walk", amount: 1.5, day: "2026-11-17", time: "16:00" });
  pushActivity(activities, { id: "act_a_e2", userId: "alex", category: "exploration", activityType: "nature", amount: 1.5, day: "2026-11-19", time: "15:00" });
  for (let index = 0; index < 4; index += 1) {
    pushActivity(activities, {
      id: `act_a_r${index + 1}`,
      userId: "alex",
      category: "recovery",
      activityType: "rest-goal",
      amount: 1,
      day: WEEK_DAYS[index],
      time: "22:15",
    });
  }
  return activities;
}

function generatedActivities(student: SeedStudent): Activity[] {
  if (student.id === "jamie" || student.id === "alex") return [];
  const random = mulberry32(hashString(`${student.id}-acts`));
  const goals: Goals = DEFAULT_GOALS;
  const ratio = () => 0.4 + random() * 0.55;
  const progress: Weights = {
    academics: Math.round(goals.academics * ratio() * 4) / 4,
    fitness: Math.min(goals.fitness, Math.max(0, Math.round(goals.fitness * ratio()))),
    social: Math.min(goals.social, Math.max(0, Math.round(goals.social * ratio()))),
    exploration: Math.round(goals.exploration * ratio() * 4) / 4,
    recovery: Math.min(5, Math.max(0, Math.round(goals.recovery * ratio()))),
  };
  const activities: Activity[] = [];
  let cursor = 0;
  const nextSlot = () => {
    const day = WEEK_DAYS[cursor % WEEK_DAYS.length];
    const hour = 8 + (cursor % 10);
    cursor += 1;
    return { day, time: `${String(hour).padStart(2, "0")}:15` };
  };
  const addChunks = (category: Dimension, total: number, chunk: number) => {
    let left = total;
    let n = 0;
    const types = ACTIVITY_CATALOG[category].types;
    while (left > 0.001) {
      const amount = Math.min(chunk, left);
      const slot = nextSlot();
      pushActivity(activities, {
        id: `act_${student.id}_${category}_${n}`,
        userId: student.id,
        category,
        activityType: types[n % types.length].id,
        amount: Math.round(amount * 1000) / 1000,
        day: slot.day,
        time: slot.time,
      });
      left -= amount;
      n += 1;
      if (n > 20) break;
    }
  };
  addChunks("academics", progress.academics, 4);
  addChunks("fitness", progress.fitness, 1);
  addChunks("social", progress.social, 1);
  addChunks("exploration", progress.exploration, 2);
  for (let index = 0; index < progress.recovery; index += 1) {
    pushActivity(activities, {
      id: `act_${student.id}_recovery_${index}`,
      userId: student.id,
      category: "recovery",
      activityType: "rest-goal",
      amount: 1,
      day: WEEK_DAYS[index],
      time: "22:40",
    });
  }
  return activities;
}

function historyFor(student: SeedStudent): WeekHistory[] {
  if (student.id === "jamie") {
    const weeks = [
      { weekStart: "2026-10-05", totalXp: 820, opponentId: "fatima" },
      { weekStart: "2026-10-12", totalXp: 790, opponentId: "ethan" },
      { weekStart: "2026-10-19", totalXp: 860, opponentId: "grace" },
      { weekStart: "2026-10-26", totalXp: 810, opponentId: "maya" },
      { weekStart: "2026-11-02", totalXp: 880, opponentId: "jordan" },
      { weekStart: "2026-11-09", totalXp: 840, opponentId: "noah" },
    ];
    return weeks.map((week, index) => ({
      id: `hist_jamie_${index}`,
      userId: "jamie",
      weekStart: week.weekStart,
      totalXp: week.totalXp,
      result: "win" as DuelResult,
      categoryCompletion: {
        academics: 0.7 + (index % 3) * 0.08,
        fitness: 0.62,
        social: 0.5,
        exploration: 0.48,
        recovery: 0.71,
      },
      opponentId: week.opponentId,
    }));
  }
  const random = mulberry32(hashString(`${student.id}-hist`));
  const count = Math.max(student.streak, 4);
  const rows: WeekHistory[] = [];
  for (let index = 0; index < count; index += 1) {
    const weekStart = addCalendarDays("2026-11-09", -7 * index);
    const result: DuelResult = index < student.streak ? "win" : random() > 0.75 ? "tie" : "loss";
    rows.push({
      id: `hist_${student.id}_${index}`,
      userId: student.id,
      weekStart,
      totalXp: 560 + Math.round(random() * 420),
      result,
      categoryCompletion: {
        academics: 0.45 + random() * 0.5,
        fitness: 0.4 + random() * 0.55,
        social: 0.35 + random() * 0.6,
        exploration: 0.3 + random() * 0.6,
        recovery: 0.4 + random() * 0.55,
      },
      opponentId: null,
    });
  }
  return rows.reverse();
}

export function buildDemoData(): AppData {
  const histories = CAST.flatMap(historyFor);
  const lifetime = new Map<string, number>();
  for (const row of histories) {
    lifetime.set(row.userId, (lifetime.get(row.userId) ?? 0) + row.totalXp);
  }

  const profiles: Profile[] = CAST.map((student) => profileFrom(student, lifetime.get(student.id) ?? 0));
  profiles.push({
    id: PRACTICE_RIVAL_ID,
    displayName: "Practice Rival",
    email: "practice.rival@yale.edu",
    residentialCollege: null,
    graduationYear: 2028,
    initials: "PR",
    avatarHue: 190,
    matchmakingRating: 1000,
    lifetimeXp: 0,
    currentWinStreak: 0,
    longestWinStreak: 0,
    totalWins: 0,
    totalLosses: 0,
    isDemoRival: true,
    shareActivitySummaries: true,
    notificationsEnabled: false,
    challengeNotifications: false,
    leaderboardVisible: false,
    createdAt: "2026-08-20T14:00:00.000Z",
  });

  const preferences = profiles
    .filter((profile) => !profile.isDemoRival)
    .map((profile) => ({
      id: `pref_${profile.id}`,
      userId: profile.id,
      weights: weightsFor(profile.id),
      goals: { ...DEFAULT_GOALS },
      effectiveWeekStart: CURRENT_WEEK,
      createdAt: "2026-11-16T05:00:00.000Z",
    }));

  const activities = [...showcaseActivities(), ...CAST.flatMap(generatedActivities)];

  const data: AppData = {
    currentUserId: DEMO_USER_ID,
    demoNow: DEMO_NOW.toISOString(),
    profiles,
    preferences,
    activities,
    matches: [],
    challenges: [],
    participants: [],
    results: [],
    history: histories,
    messages: [],
    notifications: [],
  };

  const jamieScore = scoreFor(data, "jamie", CURRENT_WEEK).totalXp;
  const alexScore = scoreFor(data, "alex", CURRENT_WEEK).totalXp;
  const jamieWeights = weightsFor("jamie");
  const alexWeights = weightsFor("alex");
  const gap = ratingGapForCompatibility(
    { id: "jamie", weights: jamieWeights, recentXp: jamieScore, isDemoRival: false },
    { id: "alex", weights: alexWeights, recentXp: alexScore, isDemoRival: false },
    0.94,
  );
  const alex = profiles.find((profile) => profile.id === "alex");
  const jamie = profiles.find((profile) => profile.id === "jamie");
  if (alex && jamie) alex.matchmakingRating = Math.round(jamie.matchmakingRating - gap);

  const recent = (userId: string) => scoreFor(data, userId, CURRENT_WEEK).totalXp;
  const jamieCandidate: MatchCandidate = {
    id: "jamie",
    weights: jamieWeights,
    rating: jamie?.matchmakingRating ?? 1176,
    recentXp: jamieScore,
    isDemoRival: false,
  };
  const alexCandidate: MatchCandidate = {
    id: "alex",
    weights: alexWeights,
    rating: alex?.matchmakingRating ?? 1130,
    recentXp: alexScore,
    isDemoRival: false,
  };
  const showcase = compatibility(jamieCandidate, alexCandidate);

  const pool: MatchCandidate[] = profiles
    .filter((profile) => profile.id !== "jamie" && profile.id !== "alex" && !profile.isDemoRival)
    .map((profile) => ({
      id: profile.id,
      weights: weightsFor(profile.id),
      rating: profile.matchmakingRating,
      recentXp: recent(profile.id),
      isDemoRival: false,
    }));

  const previous = new Map<string, string>([["jamie", "noah"], ["alex", "maya"]]);
  const pairs = pairWeek(pool, previous, PRACTICE_RIVAL_ID);

  data.matches.push({
    id: "match_current_jamie",
    weekStart: CURRENT_WEEK,
    playerOneId: "jamie",
    playerTwoId: "alex",
    status: "active",
    compatibilityScore: showcase.score,
    compatibilityDetail: showcase.detail,
    winnerId: null,
    playerOneXp: null,
    playerTwoXp: null,
    isPracticeMatch: false,
    finalizedAt: null,
    createdAt: at("2026-11-16", "00:05"),
  });

  pairs.forEach((pair, index) => {
    data.matches.push({
      id: `match_current_${index}`,
      weekStart: CURRENT_WEEK,
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
      createdAt: at("2026-11-16", "00:05"),
    });
  });

  const jamieHistory = histories.filter((row) => row.userId === "jamie");
  for (const row of jamieHistory) {
    if (!row.opponentId) continue;
    const matchId = `match_past_${row.weekStart}`;
    data.matches.push({
      id: matchId,
      weekStart: row.weekStart,
      playerOneId: "jamie",
      playerTwoId: row.opponentId,
      status: "finalized",
      compatibilityScore: 0.9,
      compatibilityDetail: { wellness: 0.9, ranking: 0.9, performance: 0.9 },
      winnerId: "jamie",
      playerOneXp: row.totalXp,
      playerTwoXp: Math.max(400, row.totalXp - 70),
      isPracticeMatch: false,
      finalizedAt: at(addCalendarDays(row.weekStart, 6), "23:59"),
      createdAt: at(row.weekStart, "00:05"),
    });
    data.results.push({
      id: `result_${row.weekStart}`,
      matchId,
      userId: "jamie",
      opponentId: row.opponentId,
      weekStart: row.weekStart,
      result: "win",
      xpEarned: row.totalXp,
      ratingBefore: 1100,
      ratingAfter: row.weekStart === "2026-11-09" ? 1176 : 1140,
      streakAfter: jamieHistory.filter((item) => item.weekStart <= row.weekStart).length,
      countsForLeaderboard: true,
      createdAt: at(addCalendarDays(row.weekStart, 6), "23:59"),
    });
  }

  data.challenges.push({
    id: "ch_cross_campus",
    matchId: "match_current_jamie",
    creatorId: "alex",
    recipientId: "jamie",
    title: "The Cross Campus Challenge",
    description: "Spend 30 minutes outside today.",
    category: "exploration",
    targetAmount: 0.5,
    targetUnit: "hours",
    bonusXp: 25,
    createdAt: at("2026-11-18", "12:00"),
    expiresAt: fromZonedTime("2026-11-23T00:00:00", TIME_ZONE).toISOString(),
  });
  data.participants.push(
    {
      id: "cp_cross_alex",
      challengeId: "ch_cross_campus",
      userId: "alex",
      acceptedAt: at("2026-11-18", "12:00"),
      declinedAt: null,
      completedAt: null,
      progressAmount: 0,
      bonusAwarded: false,
    },
    {
      id: "cp_cross_jamie",
      challengeId: "ch_cross_campus",
      userId: "jamie",
      acceptedAt: at("2026-11-18", "15:10"),
      declinedAt: null,
      completedAt: null,
      progressAmount: 0,
      bonusAwarded: false,
    },
  );
  data.notifications.push({
    id: "nt_cross",
    userId: "jamie",
    title: "Alex sent a challenge",
    body: "The Cross Campus Challenge is waiting: 30 minutes outside.",
    createdAt: at("2026-11-18", "12:00"),
    read: false,
  });

  void emptyWeights;
  return data;
}
