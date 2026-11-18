import { buildDemoData } from "../src/lib/demo-data";
import { completeChallenge, createChallenge, finalizeWeek, logActivity, saveNextPreferences, startNextWeek } from "../src/lib/game";
import { PRACTICE_RIVAL_ID } from "../src/lib/demo-data";
import { preferenceForWeek, scoreFor } from "../src/lib/view";
import { fromZonedTime } from "date-fns-tz";
import { TIME_ZONE, weekStartISO } from "../src/lib/week";

const failures: string[] = [];
const expect = (condition: unknown, message: string) => {
  if (!condition) failures.push(message);
};

let data = buildDemoData();
const before = scoreFor(data, "jamie", "2026-11-16");
const logged = logActivity(data, {
  userId: "jamie",
  category: "fitness",
  activityType: "gym",
  amount: 1,
  activityDate: fromZonedTime("2026-11-21T17:00:00", TIME_ZONE).toISOString(),
  notes: "",
  proofName: null,
  proofDataUrl: null,
});
expect(!logged.error, logged.error ?? "log should succeed");
data = logged.data;
const after = scoreFor(data, "jamie", "2026-11-16");
expect(after.categories.fitness.actual === before.categories.fitness.actual + 1, "fitness progress should increase by one session");
expect(after.totalXp > before.totalXp, `XP should rise, ${before.totalXp} -> ${after.totalXp}`);

const again = logActivity(data, {
  userId: "jamie",
  category: "fitness",
  activityType: "gym",
  amount: 1,
  activityDate: fromZonedTime("2026-11-21T17:00:00", TIME_ZONE).toISOString(),
  notes: "",
  proofName: null,
  proofDataUrl: null,
});
expect(Boolean(again.error), "duplicate minute should be rejected");

const impossible = logActivity(data, {
  userId: "jamie",
  category: "academics",
  activityType: "library",
  amount: 9,
  activityDate: fromZonedTime("2026-11-21T09:00:00", TIME_ZONE).toISOString(),
  notes: "",
  proofName: null,
  proofDataUrl: null,
});
expect(Boolean(impossible.error), "9 study hours should be rejected");

const first = completeChallenge(data, "jamie", "ch_cross_campus");
expect(!first.error, first.error ?? "complete challenge");
data = first.data;
const boosted = scoreFor(data, "jamie", "2026-11-16");
expect(boosted.challengeXp === 25, `challenge XP should be 25, got ${boosted.challengeXp}`);
const second = completeChallenge(data, "jamie", "ch_cross_campus");
expect(Boolean(second.error), "challenge XP must not be granted twice");

const locked = scoreFor(data, "jamie", "2026-11-16").totalXp;
const saved = saveNextPreferences(
  data,
  "jamie",
  { academics: 30, fitness: 20, social: 20, exploration: 15, recovery: 15 },
  { academics: 10, fitness: 4, social: 3, exploration: 5, recovery: 7 },
);
expect(!saved.error, saved.error ?? "save prefs");
data = saved.data;
expect(scoreFor(data, "jamie", "2026-11-16").totalXp === locked, "current week XP must ignore next-week weights");

const closed = finalizeWeek(data);
expect(!closed.error, closed.error ?? "finalize");
data = closed.data;
const jamie = data.profiles.find((profile) => profile.id === "jamie");
const alex = data.profiles.find((profile) => profile.id === "alex");
expect(jamie?.currentWinStreak === 7, `Jamie streak should be 7, got ${jamie?.currentWinStreak}`);
expect(alex?.currentWinStreak === 0, `Alex streak should reset, got ${alex?.currentWinStreak}`);
expect(data.matches.find((match) => match.id === "match_current_jamie")?.status === "finalized", "match finalized once");
const twice = finalizeWeek(data);
expect(Boolean(twice.error), "a week can only be finalized once");

data.currentUserId = "jamie";
const next = startNextWeek(data, PRACTICE_RIVAL_ID);
expect(!next.error, next.error ?? "next week");
data = next.data;
const nextWeek = weekStartISO(new Date(data.demoNow));
const activePrefs = preferenceForWeek(data, "jamie", nextWeek);
expect(activePrefs?.weights.academics === 30, "next duel should use the queued weights");
const rematch = data.matches.find(
  (match) =>
    match.weekStart === nextWeek &&
    ((match.playerOneId === "jamie" && match.playerTwoId === "alex") ||
      (match.playerTwoId === "jamie" && match.playerOneId === "alex")),
);
expect(!rematch, "Jamie should not be handed Alex again when another rival is close");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Flow checks passed.");
console.log(`After a workout and one challenge, Jamie has ${boosted.totalXp} XP. Streak is now ${jamie?.currentWinStreak}.`);
