"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildDemoData } from "@/lib/demo-data";
import type { ActionResult } from "@/lib/game";
import type { AppData } from "@/types";

const memory = new Map<string, string>();

const safeStorage = {
  getItem: (name: string) => {
    if (typeof window === "undefined") return memory.get(name) ?? null;
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    if (typeof window === "undefined") {
      memory.set(name, value);
      return;
    }
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* Demo storage can fill up if proof images are large. The activity still exists in memory. */
    }
  },
  removeItem: (name: string) => {
    if (typeof window === "undefined") {
      memory.delete(name);
      return;
    }
    window.localStorage.removeItem(name);
  },
};

interface Store {
  data: AppData;
  toast: string | null;
  dismissToast: () => void;
  apply: (result: ActionResult) => boolean;
  resetDemo: () => void;
}

export const useAppStore = create<Store>()(
  persist(
    (set) => ({
      data: buildDemoData(),
      toast: null,
      dismissToast: () => set({ toast: null }),
      apply: (result) => {
        if (result.error) {
          set({ toast: result.error });
          return false;
        }
        set({ data: result.data, toast: result.info ?? null });
        return true;
      },
      resetDemo: () => set({ data: buildDemoData(), toast: "Demo league restored." }),
    }),
    {
      name: "life-rival-demo-v1",
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ data: state.data }),
    },
  ),
);
