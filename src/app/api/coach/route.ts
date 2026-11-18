import { COACH_SYSTEM_PROMPT, demoCoachReply } from "@/lib/coach";
import type { CoachContext } from "@/lib/view";

export const runtime = "nodejs";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

function isContext(value: unknown): value is CoachContext {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.studentName === "string" && typeof record.weakest === "string";
}

export async function POST(request: Request) {
  let body: { context?: unknown; messages?: ChatTurn[] };
  try {
    body = (await request.json()) as { context?: unknown; messages?: ChatTurn[] };
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!isContext(body.context)) {
    return Response.json({ error: "Missing student context." }, { status: 400 });
  }
  const turns = (body.messages ?? [])
    .filter((turn) => turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string")
    .slice(-12)
    .map((turn) => ({ role: turn.role, content: turn.content.slice(0, 2000) }));
  const lastUser = [...turns].reverse().find((turn) => turn.role === "user")?.content ?? "How's my week?";
  const fallback = () => Response.json({ content: demoCoachReply(body.context as CoachContext, lastUser), source: "demo" });

  const key = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!key) return fallback();

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROK_MODEL || "grok-3",
        temperature: 0.6,
        messages: [
          { role: "system", content: COACH_SYSTEM_PROMPT },
          { role: "system", content: `Student context:\n${JSON.stringify(body.context)}` },
          ...turns,
        ],
      }),
    });
    if (!response.ok) return fallback();
    const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return fallback();
    return Response.json({ content, source: "grok" });
  } catch {
    return fallback();
  }
}
