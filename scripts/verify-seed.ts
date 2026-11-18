import { pairWeek } from "../src/lib/matchmaking";
import { buildDemoData, CURRENT_WEEK, DEMO_USER_ID, PRACTICE_RIVAL_ID } from "../src/lib/demo-data";
import { duelFeed, leaderboard, scoreFor } from "../src/lib/view";
import { weightTotal } from "../src/lib/scoring";
import { DEMO_NOW, weekStartISO } from "../src/lib/week";
import { DIMENSIONS } from "../src/types";

const failures: string[] = [];

function expect(condition: unknown, message: string) {
  if (!condition) failures.push(message);
}

const data = buildDemoData();
expect(weekStartISO(DEMO_NOW) === CURRENT_WEEK, `week start should be ${CURRENT_WEEK}, got ${weekStartISO(DEMO_NOW)}`);

const jamie = scoreFor(data, "jamie", CURRENT_WEEK);
const alex = scoreFor(data, "alex", CURRENT_WEEK);
expect(jamie.baseXp === 740, `Jamie base XP expected 740, got ${jamie.baseXp} (balance ${jamie.balanceScore})`);
expect(alex.baseXp === 660, `Alex base XP expected 660, got ${alex.baseXp} (balance ${alex.balanceScore})`);
expect(jamie.challengeXp === 0, "Jamie challenge XP should start at 0");
expect(jamie.totalXp === 740 && alex.totalXp === 660, "Totals should match base XP before any challenge is completed");

for (const profile of data.profiles.filter((item) => !item.isDemoRival)) {
  const preference = data.preferences.find((item) => item.userId === profile.id && item.effectiveWeekStart === CURRENT_WEEK);
  expect(
    preference &&
      weightTotal(preference.weights) === 100 &&
      DIMENSIONS.every((dimension) => preference.weights[dimension] >= 0 && preference.weights[dimension] <= 100),
    `${profile.displayName} weights must total 100`,
  );
}

const match = data.matches.find((item) => item.id === "match_current_jamie");
expect(match, "Showcase match exists");
expect(match && Math.round(match.compatibilityScore * 100) === 94, `Compatibility should round to 94, got ${match?.compatibilityScore}`);

const active = data.matches.filter((item) => item.weekStart === CURRENT_WEEK);
const seen = new Set<string>();
for (const item of active) {
  expect(item.playerOneId !== item.playerTwoId, "No self matches");
  expect(!seen.has(item.playerOneId) && !seen.has(item.playerTwoId), "A student has two active matches");
  seen.add(item.playerOneId);
  seen.add(item.playerTwoId);
}
const humans = data.profiles.filter((profile) => !profile.isDemoRival);
expect(humans.every((profile) => seen.has(profile.id)), "Every Yale student has one active match");
expect(active.every((item) => !item.isPracticeMatch), "Seeded week should not need a practice rival");

const rows = leaderboard(data, "streak", DEMO_NOW);
const jamieRow = rows.find((row) => row.profile.id === DEMO_USER_ID);
expect(jamieRow?.rank === 21, `Jamie should be rank 21, got ${jamieRow?.rank}`);
expect(rows[0].currentStreak >= rows[1].currentStreak, "Leaderboard is streak-sorted");

const feed = duelFeed(data, "jamie", DEMO_NOW).map((item) => item.text).join(" ");
expect(!feed.includes("Problem set"), "Rival feed leaked a private note");
expect(feed.includes("Alex"), "Feed includes the rival");

const practice = pairWeek(
  [
    {
      id: "solo",
      weights: { academics: 20, fitness: 20, social: 20, exploration: 20, recovery: 20 },
      rating: 1000,
      recentXp: 500,
      isDemoRival: false,
    },
  ],
  new Map(),
  PRACTICE_RIVAL_ID,
);
expect(practice.length === 1 && practice[0].isPracticeMatch, "A student with no opponent gets a labeled practice rival");
expect(practice[0].playerTwoId === PRACTICE_RIVAL_ID, "Practice rival id is used");

expect(DIMENSIONS.length === 5, "Five dimensions");

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Seed checks passed.");
console.log(`Jamie ${jamie.totalXp} XP, Alex ${alex.totalXp} XP, compatibility ${Math.round((match?.compatibilityScore ?? 0) * 100)}%, rank #${jamieRow?.rank}.`);
