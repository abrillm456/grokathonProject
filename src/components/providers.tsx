"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const toast = useAppStore((state) => state.toast);
  const dismiss = useAppStore((state) => state.dismissToast);

  useEffect(() => {
    const persist = useAppStore.persist;
    const finish = () => {
      const data = useAppStore.getState().data;
      if (!data?.profiles?.length || !data.currentUserId || !data.demoNow) {
        useAppStore.getState().resetDemo();
      }
      setReady(true);
    };
    const unsubscribe = persist.onFinishHydration(finish);
    if (persist.hasHydrated()) finish();
    else void persist.rehydrate();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => dismiss(), 4200);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);

  return (
    <>
      {ready ? children : <Splash />}
      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm shadow-2xl">
          {toast}
        </div>
      ) : null}
    </>
  );
}

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="text-center">
        <p className="wordmark text-4xl">
          LIFE<span>//</span>RIVAL
        </p>
        <p className="kicker mt-3">Yale Campus League</p>
      </div>
    </div>
  );
}
