import { create } from "zustand";
import { EVERYDAY_OBJECTS } from "./objects";

const KEY = "look-and-name-progress";

export type WordScore = {
  seen: number;
  correct: number;
  miss: number;
};

type ProgressState = {
  scores: Record<string, WordScore>;
  finds: number;
  markSeen: (id: string) => void;
  markCorrect: (id: string) => void;
  markMiss: (id: string) => void;
  reset: () => void;
};

const emptyScore = (): WordScore => ({ seen: 0, correct: 0, miss: 0 });

function read(): Pick<ProgressState, "scores" | "finds"> {
  if (typeof window === "undefined") return { scores: {}, finds: 0 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { scores: {}, finds: 0 };
    const parsed = JSON.parse(raw) as {
      scores?: Record<string, WordScore>;
      known?: Record<string, true>;
      finds?: number;
    };
    const scores = parsed.scores ?? {};
    if (parsed.known) {
      for (const id of Object.keys(parsed.known)) {
        scores[id] = scores[id] ?? { seen: 1, correct: 0, miss: 0 };
      }
    }
    return { scores, finds: parsed.finds ?? 0 };
  } catch {
    return { scores: {}, finds: 0 };
  }
}

function write(scores: Record<string, WordScore>, finds: number) {
  window.localStorage.setItem(KEY, JSON.stringify({ scores, finds }));
}

function bump(scores: Record<string, WordScore>, id: string, field: keyof WordScore) {
  const current = scores[id] ?? emptyScore();
  return { ...scores, [id]: { ...current, [field]: current[field] + 1 } };
}

export const useProgress = create<ProgressState>((set, get) => ({
  scores: {},
  finds: 0,
  markSeen: (id) => {
    const scores = bump(get().scores, id, "seen");
    write(scores, get().finds);
    set({ scores });
  },
  markCorrect: (id) => {
    const scores = bump(get().scores, id, "correct");
    const finds = get().finds + 1;
    write(scores, finds);
    set({ scores, finds });
  },
  markMiss: (id) => {
    const scores = bump(get().scores, id, "miss");
    write(scores, get().finds);
    set({ scores });
  },
  reset: () => {
    write({}, 0);
    set({ scores: {}, finds: 0 });
  },
}));

export function hydrateProgress() {
  useProgress.setState(read());
}

export function pickRound(count = 3) {
  const scores = useProgress.getState().scores;
  const ranked = EVERYDAY_OBJECTS.map((item) => {
    const score = scores[item.id] ?? emptyScore();
    const freshness = score.seen === 0 ? 8 : Math.max(0, 4 - score.correct);
    const weight = 1 + score.miss * 3 + freshness;
    return { item, weight };
  }).sort((a, b) => b.weight - a.weight);
  const chosen = ranked.slice(0, Math.min(count, ranked.length)).map((entry) => entry.item);
  return chosen.sort(() => Math.random() - 0.5);
}
