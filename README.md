# LIFE//RIVAL

Your life is the game. Your rival is real.

A Yale Campus League demo: students log a real week, earn Life XP for balance rather than raw hours, and face one rival until Sunday night.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose **Enter demo as Yale student**. You land as Jamie Rivera (Berkeley, class of 2028), matched with Alex Chen.

No API keys are required.

```bash
npm run typecheck
npm run verify:seed
npx tsx scripts/verify-flows.ts
```

## Environment

Copy `.env.example` to `.env.local` only if you want to turn a service on. Missing values never crash the UI.

| Variable | Where it is used |
|---|---|
| `NEXT_PUBLIC_DATA_MODE` | `demo` (default) or `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key. Safe to expose. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Never prefix with `NEXT_PUBLIC_`. |
| `XAI_API_KEY` | Server only. Powers `/api/coach`. |
| `GROK_MODEL` | Optional. Defaults to `grok-3`. |

`/api/health` reports whether Supabase and the coach key are present, without returning the secrets.

## Demo clock

The league is frozen at **Saturday, November 21, 2026, 6:00 PM America/New_York**, so the seeded week is already in progress (Jamie 740 XP, Alex 660 XP, about a day and a half left). The countdown ticks while the tab is open and returns to that moment on refresh. Demo Controls can move the clock, close the week, and start the next one. Those controls are hidden when `NEXT_PUBLIC_DATA_MODE=supabase`, and they only rewrite the local league.

## What works in the demo

- Dashboard, weekly duel, activity log, challenges, coach, streak leaderboard, stats, settings, and the results reveal
- Deterministic Life XP: goal completion × weight, capped at the goal, plus up to 100 challenge XP
- Matchmaking from wellness similarity (50%), rating similarity (35%), and recent form (15%)
- One active rival per student, mutual matches, and a labeled practice rival only when nobody is free
- Challenge bonus of 25 XP, once per person, only after the rival accepts
- Weight and goal edits apply to the next duel, not the current one
- Win streak leaderboard (default), all-time streaks, residential colleges, and weekly XP
- A tie or a loss ends the streak. A practice match does not move the real board
- Local persistence across refresh
- Coach replies from Grok when `XAI_API_KEY` is set, otherwise from a stats-aware fallback

## Presenting it

1. Enter as Jamie. The duel should read 740–660 and about 94% compatibility.
2. Log Activity → Fitness → Save. Fitness moves from 3/4 to 4/4 and Life XP jumps.
3. Open the duel. The fitness bar and the feed update. Private notes stay off the feed.
4. Rival Challenges. The Cross Campus Challenge is already accepted. Mark it complete once (+25 XP). Marking it again does nothing.
5. Switch to Alex Chen in Demo Controls, accept or complete from that side, then switch back.
6. Settings. Move Academics to 30% and rebalance to 100%. The current duel does not change. The page says the edit waits until next week.
7. Leaderboard opens on Current Streaks, with Jamie at #21. Try All-Time Legends, Residential Colleges, and Weekly XP.
8. Demo Controls → Simulate match finalization. Jamie’s streak becomes 7. Find my next rival starts a new week and does not hand Alex back automatically.

## Production still open

Supabase Auth for `@yale.edu`, Row Level Security, and server-side match finalization are sketched in `supabase/migrations/001_init.sql` and `/api/health`. The live app stores the league in the browser. Pointing `NEXT_PUBLIC_DATA_MODE` at Supabase does not yet sign students in or sync rows, because that path needs a real project and a service role that must stay on the server.

## Grokathon Materials
### Proof of Grok for y/cs
<img width="2560" height="1600" alt="Screenshot 2026-11-17 185028" src="https://github.com/user-attachments/assets/9ff40eda-6501-4905-9133-347d78478a1f" />

### Video Link
https://drive.google.com/file/d/1aqQXUzs72Zro-VNKm4StG1whG7xyTHGH/view?usp=sharing
