import type { AppData } from "@/types";

/**
 * Demo Mode persists the whole league in localStorage under this key
 * (see the Zustand store). Supabase is selected only when
 * NEXT_PUBLIC_DATA_MODE=supabase and the server has a service role key.
 * The browser never receives that key. Until a signed-in Supabase session
 * exists, the running app stays on this local repository so missing
 * credentials cannot take the demo down.
 */
export const LOCAL_STORAGE_KEY = "life-rival-demo-v1";

export interface CompetitionRepository {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}

export function createLocalRepository(): CompetitionRepository {
  return {
    async load() {
      if (typeof window === "undefined") return null;
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as { state?: { data?: AppData } };
        return parsed.state?.data ?? null;
      } catch {
        return null;
      }
    },
    async save(data) {
      if (typeof window === "undefined") return;
      const existing = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      const wrapper = existing ? JSON.parse(existing) : { state: {}, version: 0 };
      wrapper.state = { ...(wrapper.state ?? {}), data };
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(wrapper));
    },
    async clear() {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    },
  };
}
