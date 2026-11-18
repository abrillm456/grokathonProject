export const DIMENSIONS = [
  "academics",
  "fitness",
  "social",
  "exploration",
  "recovery",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export const COLLEGES = [
  "Berkeley",
  "Branford",
  "Davenport",
  "Ezra Stiles",
  "Grace Hopper",
  "Jonathan Edwards",
  "Morse",
  "Pauli Murray",
  "Pierson",
  "Saybrook",
  "Silliman",
  "Timothy Dwight",
  "Trumbull",
  "Benjamin Franklin",
] as const;

export type ResidentialCollege = (typeof COLLEGES)[number];

export type ActivityUnit = "hours" | "sessions" | "events" | "nights";

export type MatchStatus = "active" | "finalized";

export type DuelResult = "win" | "loss" | "tie";

export type ChallengeState =
  | "pending"
  | "accepted"
  | "declined"
  | "in_progress"
  | "completed"
  | "expired";

export interface Weights {
  academics: number;
  fitness: number;
  social: number;
  exploration: number;
  recovery: number;
}

export interface Goals {
  academics: number;
  fitness: number;
  social: number;
  exploration: number;
  recovery: number;
}

export interface Profile {
  id: string;
  displayName: string;
  email: string;
  residentialCollege: ResidentialCollege | null;
  graduationYear: number;
  initials: string;
  avatarHue: number;
  matchmakingRating: number;
  lifetimeXp: number;
  currentWinStreak: number;
  longestWinStreak: number;
  totalWins: number;
  totalLosses: number;
  isDemoRival: boolean;
  shareActivitySummaries: boolean;
  notificationsEnabled: boolean;
  challengeNotifications: boolean;
  leaderboardVisible: boolean;
  createdAt: string;
}

export interface PreferenceSet {
  id: string;
  userId: string;
  weights: Weights;
  goals: Goals;
  effectiveWeekStart: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  category: Dimension;
  activityType: string;
  amount: number;
  unit: ActivityUnit;
  activityDate: string;
  notes: string;
  proofName: string | null;
  proofDataUrl: string | null;
  selfReported: true;
  createdAt: string;
}

export interface CompatibilityDetail {
  wellness: number;
  ranking: number;
  performance: number;
}

export interface WeeklyMatch {
  id: string;
  weekStart: string;
  playerOneId: string;
  playerTwoId: string;
  status: MatchStatus;
  compatibilityScore: number;
  compatibilityDetail: CompatibilityDetail;
  winnerId: string | null;
  playerOneXp: number | null;
  playerTwoXp: number | null;
  isPracticeMatch: boolean;
  finalizedAt: string | null;
  createdAt: string;
}

export interface Challenge {
  id: string;
  matchId: string;
  creatorId: string;
  recipientId: string;
  title: string;
  description: string;
  category: Dimension;
  targetAmount: number;
  targetUnit: ActivityUnit;
  bonusXp: number;
  createdAt: string;
  expiresAt: string;
}

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  completedAt: string | null;
  progressAmount: number;
  bonusAwarded: boolean;
}

export interface MatchResult {
  id: string;
  matchId: string;
  userId: string;
  opponentId: string;
  weekStart: string;
  result: DuelResult;
  xpEarned: number;
  ratingBefore: number;
  ratingAfter: number;
  streakAfter: number;
  countsForLeaderboard: boolean;
  createdAt: string;
}

export interface WeekHistory {
  id: string;
  userId: string;
  weekStart: string;
  totalXp: number;
  result: DuelResult;
  categoryCompletion: Weights;
  opponentId: string | null;
}

export interface CoachMessage {
  id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  source: "demo" | "grok";
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface AppData {
  currentUserId: string;
  demoNow: string;
  profiles: Profile[];
  preferences: PreferenceSet[];
  activities: Activity[];
  matches: WeeklyMatch[];
  challenges: Challenge[];
  participants: ChallengeParticipant[];
  results: MatchResult[];
  history: WeekHistory[];
  messages: CoachMessage[];
  notifications: AppNotification[];
}

export interface CategoryScore {
  actual: number;
  goal: number;
  completion: number;
  weight: number;
  xp: number;
}

export interface WeekScore {
  categories: Record<Dimension, CategoryScore>;
  balanceScore: number;
  baseXp: number;
  challengeXp: number;
  totalXp: number;
}

export interface ActivityDraft {
  id?: string;
  userId: string;
  category: Dimension;
  activityType: string;
  amount: number;
  activityDate: string;
  notes: string;
  proofName: string | null;
  proofDataUrl: string | null;
}

export interface LeaderboardRow {
  rank: number;
  profile: Profile;
  currentStreak: number;
  longestStreak: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  rating: number;
  lifetimeXp: number;
  weeklyXp: number;
}

export interface CollegeStanding {
  college: ResidentialCollege;
  students: number;
  wins: number;
  losses: number;
  winRate: number;
  averageStreak: number;
}

export const CHALLENGE_BONUS = 25;
export const MAX_CHALLENGE_XP = 100;
export const MAX_WEEKLY_XP = 1100;
export const ELO_START = 1000;
export const ELO_K = 32;
