"use client";

import { useEffect, useState } from "react";
import { profileById } from "@/lib/view";
import { useAppStore } from "@/lib/store";

export function useLiveNow() {
  const demoNow = useAppStore((state) => state.data.demoNow);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed(Date.now() - started), 1000);
    return () => window.clearInterval(timer);
  }, [demoNow]);

  return new Date(new Date(demoNow).getTime() + elapsed);
}

export function useGame() {
  const data = useAppStore((state) => state.data);
  const apply = useAppStore((state) => state.apply);
  const resetDemo = useAppStore((state) => state.resetDemo);
  const now = useLiveNow();
  const userId = data.currentUserId;
  return { data, apply, resetDemo, now, userId, you: profileById(data, userId) };
}
