import { ACTIVITY_CATALOG } from "@/lib/catalog";
import type { CoachContext } from "@/lib/view";
import type { Dimension } from "@/types";

const ACTION: Record<Dimension, string> = {
  academics: "90 focused minutes in Sterling Memorial Library",
  fitness: "one workout at Payne Whitney Gymnasium",
  social: "coffee or a club meeting on Cross Campus",
  exploration: "a 30-minute walk around Cross Campus",
  recovery: "an early night so the recovery night actually counts",
};

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function gapLine(context: CoachContext): string {
  if (!context.rivalName || context.rivalWeeklyXp === null) {
    return "You don't have a rival on the board yet.";
  }
  const name = context.rivalName.split(" ")[0];
  if (context.xpGap > 0) return `You're leading ${name} by ${context.xpGap} XP.`;
  if (context.xpGap < 0) return `You're ${Math.abs(context.xpGap)} XP behind ${name}.`;
  return `You and ${name} are tied.`;
}

function rivalLead(context: CoachContext): string | null {
  if (!context.rivalCompletion || !context.rivalName) return null;
  const name = context.rivalName.split(" ")[0];
  const leads = (Object.keys(context.rivalCompletion) as Dimension[]).filter(
    (dimension) => context.rivalCompletion![dimension] > context.categoryCompletion[dimension] + 0.02,
  );
  if (leads.length === 0) return `${name} isn't ahead in any dimension right now.`;
  const labels = leads.map((dimension) => ACTIVITY_CATALOG[dimension].label).slice(0, 2);
  return `${name} is ahead in ${labels.join(" and ")}.`;
}

export function demoCoachReply(context: CoachContext, message: string): string {
  const text = message.toLowerCase();
  if (/(plan|tomorrow|today|schedule)/.test(text)) return plan(context);
  if (/(beat|rival|behind|win|catch)/.test(text)) return strategy(context);
  if (/(balance|weak|focus|priorit)/.test(text)) return balance(context);
  if (/challenge/.test(text)) return challengeAdvice(context);
  return status(context);
}

function strategy(context: CoachContext): string {
  const weak = ACTIVITY_CATALOG[context.weakest].label;
  const strong = ACTIVITY_CATALOG[context.strongest].label;
  const action = ACTION[context.weakest];
  const rival = rivalLead(context);
  return [
    gapLine(context),
    `You're in good shape on ${strong} (${percent(context.categoryCompletion[context.strongest])} of that goal).`,
    `The clearest opening is ${weak} at ${percent(context.categoryCompletion[context.weakest])}.`,
    rival,
    `One concrete move: ${action}. That improves the week without adding a second workout or a late night.`,
    `The duel closes in ${context.countdown}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function plan(context: CoachContext): string {
  const weak = context.weakest;
  const lines = [
    "Here's a day that moves the score and still leaves room to recover:",
    "",
    `9:00 AM — ${ACTION[weak === "academics" ? "academics" : "academics"]}`,
    "12:30 PM — lunch with a friend, phones down",
    `4:00 PM — ${weak === "fitness" ? ACTION.fitness : weak === "exploration" ? ACTION.exploration : "a short walk if fitness is already on track, otherwise one workout"}`,
    "7:30 PM — stop. An intentional recovery night is worth more than another hour in the library.",
    "",
    `That touches ${ACTIVITY_CATALOG[context.weakest].label.toLowerCase()} without asking you to overtrain or cut sleep. ${gapLine(context)}`,
  ];
  if (context.categoryCompletion.academics >= 0.95) {
    lines[2] = "9:00 AM — you're already near the study goal, so keep this block short or skip it";
  }
  return lines.join("\n");
}

function balance(context: CoachContext): string {
  const weights = (Object.keys(context.weights) as Dimension[])
    .sort((a, b) => context.weights[b] - context.weights[a])
    .slice(0, 2)
    .map((dimension) => ACTIVITY_CATALOG[dimension].label);
  return `${context.studentName.split(" ")[0]}, your weights lean toward ${weights.join(" and ")}. ${ACTIVITY_CATALOG[context.strongest].label} is carrying the week. ${ACTIVITY_CATALOG[context.weakest].label} is lagging at ${percent(context.categoryCompletion[context.weakest])}. You don't need to blow up the schedule — ${ACTION[context.weakest]} is enough to make the balance score move.`;
}

function challengeAdvice(context: CoachContext): string {
  const open = context.activeChallenges[0];
  const suggestion = ACTION[context.weakest];
  if (open) {
    return `You already have “${open}” on the table. Finish that before sending another one. If you do send something new, aim it at ${ACTIVITY_CATALOG[context.weakest].label.toLowerCase()}: ${suggestion}. Challenges are optional, declining is free, and the bonus caps at 100 XP.`;
  }
  return `Send one challenge, not a stack of them. A good one this week: ${suggestion}. It's voluntary, it's inside a safe target, and it's worth 25 XP once if you both actually do it.`;
}

function status(context: CoachContext): string {
  const name = context.rivalName ? context.rivalName.split(" ")[0] : "your rival";
  return `${gapLine(context)} Streak: ${context.streak}. Strongest category: ${ACTIVITY_CATALOG[context.strongest].label}. Biggest opening: ${ACTIVITY_CATALOG[context.weakest].label}. ${context.countdown} left against ${name}. Ask me for a plan, a way to close the gap, or a challenge worth sending.`;
}

export const COACH_SYSTEM_PROMPT = `You are the LIFE//RIVAL coach for a Yale student in a weekly 1v1 wellness duel.
Voice: encouraging, slightly competitive, energetic, friendly, direct, never judgmental.
Use the supplied stats. Do not invent activities the student did not log.
Encourage balance across academics, fitness, social life, exploration, and recovery.
Never recommend unsafe exercise, sleep deprivation, skipping meals, more than one extra workout in a day, or more than a few focused study hours.
Challenges are voluntary. Declining has no penalty.
Do not ask for precise location history.
Keep replies under 180 words unless the student asks for a plan. Plans should be a short daytime schedule with room to rest.`;
