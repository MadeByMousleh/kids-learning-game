import { create } from "zustand";

const KEY = "look-and-name-progress";

type ProgressState = {
  known: Record<string, true>;
  finds: number;
  markKnown: (id: string) => void;
  markFind: () => void;
};

function read(): Pick<ProgressState, "known" | "finds"> {
  if (typeof window === "undefined") return { known: {}, finds: 0 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { known: {}, finds: 0 };
    const parsed = JSON.parse(raw) as { known?: Record<string, true>; finds?: number };
    return { known: parsed.known ?? {}, finds: parsed.finds ?? 0 };
  } catch {
    return { known: {}, finds: 0 };
  }
}

function write(known: Record<string, true>, finds: number) {
  window.localStorage.setItem(KEY, JSON.stringify({ known, finds }));
}

export const useProgress = create<ProgressState>((set, get) => ({
  known: {},
  finds: 0,
  markKnown: (id) => {
    const known = { ...get().known, [id]: true as const };
    write(known, get().finds);
    set({ known });
  },
  markFind: () => {
    const finds = get().finds + 1;
    write(get().known, finds);
    set({ finds });
  },
}));

export function hydrateProgress() {
  const saved = read();
  useProgress.setState(saved);
}
