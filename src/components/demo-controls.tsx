"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PRACTICE_RIVAL_ID } from "@/lib/demo-data";
import { advanceToWeekEnd, finalizeWeek, setCurrentUser, startNextWeek } from "@/lib/game";
import { useAppStore } from "@/lib/store";
import { useGame } from "@/components/use-game";

export function DemoControls() {
  const { data, apply, resetDemo } = useGame();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const demoMode = process.env.NEXT_PUBLIC_DATA_MODE !== "supabase";
  if (!demoMode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(92vw,320px)]">
      {open ? (
        <div className="panel mb-2 p-4">
          <p className="kicker">Demo controls</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            These only touch the local demo league. They never write to production students.
          </p>
          <label className="mt-3 block text-xs text-muted" htmlFor="demo-user">
            View as
          </label>
          <select
            id="demo-user"
            className="field mt-1"
            value={data.currentUserId}
            onChange={(event) => apply(setCurrentUser(data, event.target.value))}
          >
            {data.profiles
              .slice()
              .sort((a, b) => Number(a.isDemoRival) - Number(b.isDemoRival) || a.displayName.localeCompare(b.displayName))
              .map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.displayName}
                  {profile.isDemoRival ? " (practice)" : ""}
                </option>
              ))}
          </select>
          <div className="mt-3 grid gap-2">
            <button className="btn btn-ghost" onClick={() => apply(advanceToWeekEnd(data))}>
              Advance to end of week
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                const ok = apply(finalizeWeek(data));
                if (ok) router.push("/results");
              }}
            >
              Simulate match finalization
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                const ok = apply(startNextWeek(data, PRACTICE_RIVAL_ID));
                if (ok) router.push("/duel");
              }}
            >
              Generate next weekly matchup
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                resetDemo();
                useAppStore.persist.clearStorage();
                router.push("/dashboard");
              }}
            >
              Reset demo data
            </button>
          </div>
        </div>
      ) : null}
      <button className="btn btn-primary ml-auto flex" onClick={() => setOpen((value) => !value)}>
        {open ? "Hide demo controls" : "Demo controls"}
      </button>
    </div>
  );
}
