"use client";

import { useState } from "react";
import { useGame } from "@/components/use-game";
import { demoCoachReply } from "@/lib/coach";
import { appendCoachMessage } from "@/lib/game";
import { useAppStore } from "@/lib/store";
import { coachContext } from "@/lib/view";

const PROMPTS = [
  "How do I beat my rival this week?",
  "Make me a plan for tomorrow.",
  "Where am I unbalanced?",
  "What challenge should I send?",
];

export default function CoachPage() {
  const { data, apply, now, userId, you } = useGame();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const context = you ? coachContext(data, userId, now) : null;
  const messages = data.messages.filter((message) => message.userId === userId);

  async function send(text: string) {
    if (!context || !text.trim() || pending) return;
    const content = text.trim();
    apply(appendCoachMessage(data, userId, "user", content, "demo"));
    setDraft("");
    setPending(true);
    const history = [
      ...messages.map((message) => ({ role: message.role, content: message.content })),
      { role: "user" as const, content },
    ];
    let reply = demoCoachReply(context, content);
    let source: "demo" | "grok" = "demo";
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, messages: history }),
      });
      if (response.ok) {
        const json = (await response.json()) as { content?: string; source?: "demo" | "grok" };
        if (json.content) {
          reply = json.content;
          source = json.source ?? "demo";
        }
      }
    } catch {
      source = "demo";
    }
    const latest = useAppStore.getState().data;
    apply(appendCoachMessage(latest, userId, "assistant", reply, source));
    setPending(false);
  }

  if (!you || !context) return null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col">
      <div>
        <p className="kicker">Strategist</p>
        <h1 className="text-3xl font-semibold tracking-tight">AI Coach</h1>
        <p className="mt-1 text-sm text-muted">
          Knows your weights, this week's log, and {context.rivalName ? context.rivalName.split(" ")[0] : "your rival"}. It will not push all-nighters or extra workouts.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {PROMPTS.map((prompt) => (
          <button key={prompt} className="btn btn-ghost px-3 py-1.5 text-xs" type="button" onClick={() => void send(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <div className="mt-4 flex-1 space-y-3">
        {messages.length === 0 ? (
          <p className="panel p-4 text-sm text-muted">Ask how to close the gap, or take one of the prompts above.</p>
        ) : null}
        {messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-yale/80" : "panel"}`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.role === "assistant" && message.source === "demo" ? (
              <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted">Demo coach</p>
            ) : null}
          </article>
        ))}
        {pending ? <p className="text-sm text-muted">Thinking…</p> : null}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <label className="sr-only" htmlFor="coach-input">
          Message the coach
        </label>
        <input
          id="coach-input"
          className="field"
          value={draft}
          placeholder="How do I beat my rival this week?"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={pending || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
