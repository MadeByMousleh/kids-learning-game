import { useEffect, useMemo, useState } from "react";
import { GrownUpCorner } from "@/components/grown-up-corner";
import { EVERYDAY_OBJECTS, choicesFor, type EverydayObject } from "@/lib/objects";
import { playWord } from "@/lib/play-word";
import { hydrateProgress, pickRound, useProgress } from "@/lib/progress";
import { hydrateSettings, useSettings } from "@/lib/settings";
import { cheer, warmVoices } from "@/lib/speech";

type Phase = "look" | "find" | "star";

export function ObjectsGame() {
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("look");
  const [round, setRound] = useState<EverydayObject[]>(() => EVERYDAY_OBJECTS.slice(0, 3));
  const [lookIndex, setLookIndex] = useState(0);
  const [quiz, setQuiz] = useState<EverydayObject[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const showWord = useSettings((state) => state.showWord);
  const languageId = useSettings((state) => state.languageId);
  const resetFlag = useSettings((state) => state.resetProgressFlag);
  const markSeen = useProgress((state) => state.markSeen);
  const markCorrect = useProgress((state) => state.markCorrect);
  const markMiss = useProgress((state) => state.markMiss);

  const current = round[lookIndex] ?? round[0];
  const prompt = quiz[quizIndex] ?? round[0];
  const choices = useMemo(() => choicesFor(prompt?.id ?? round[0]?.id), [prompt?.id, quizIndex]);

  useEffect(() => {
    hydrateProgress();
    hydrateSettings();
    warmVoices();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const next = pickRound(3);
    setRound(next);
    setLookIndex(0);
    setPhase("look");
    setPicked(null);
    void playWord(next[0].id, next[0].name);
    markSeen(next[0].id);
  }, [resetFlag]);

  function startRound(items = pickRound(3)) {
    setRound(items);
    setLookIndex(0);
    setQuiz([]);
    setQuizIndex(0);
    setPicked(null);
    setPhase("look");
    void playWord(items[0].id, items[0].name);
    markSeen(items[0].id);
  }

  function begin() {
    warmVoices();
    setReady(true);
    startRound();
  }

  function nextLook() {
    const nextIndex = lookIndex + 1;
    if (nextIndex >= round.length) {
      const quizOrder = [...round].sort(() => Math.random() - 0.5);
      setQuiz(quizOrder);
      setQuizIndex(0);
      setPicked(null);
      setPhase("find");
      void playWord(quizOrder[0].id, quizOrder[0].name);
      return;
    }
    const item = round[nextIndex];
    setLookIndex(nextIndex);
    void playWord(item.id, item.name);
    markSeen(item.id);
  }

  function choose(id: string) {
    if (picked || phase !== "find") return;
    if (id === prompt.id) {
      setPicked(id);
      markCorrect(id);
      cheer();
      setStars((value) => value + 1);
      window.setTimeout(() => {
        const nextQuiz = quizIndex + 1;
        if (nextQuiz >= quiz.length) {
          setPhase("star");
          return;
        }
        const next = quiz[nextQuiz];
        setQuizIndex(nextQuiz);
        setPicked(null);
        void playWord(next.id, next.name);
      }, 850);
      return;
    }
    markMiss(prompt.id);
    setPicked(id);
    window.setTimeout(() => setPicked(null), 420);
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-5 py-10">
        <GrownUpCorner />
        <h1 className="text-5xl font-extrabold leading-none text-ink">Look, then find</h1>
        <p className="text-lg font-semibold text-muted">Three new pictures. Then a short quiz of those three.</p>
        <button type="button" onClick={begin} className="min-h-14 rounded-full bg-coral px-8 text-xl font-extrabold text-coral-ink">
          Start
        </button>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-3 py-3 sm:px-6">
      <GrownUpCorner />
      <div className="pointer-events-none flex justify-center gap-1 pt-1">
        {Array.from({ length: Math.min(stars, 8) }).map((_, index) => (
          <span key={index} className="text-2xl">
            ⭐
          </span>
        ))}
      </div>

      {phase === "look" ? (
        <section className="flex flex-1 flex-col items-center">
          <button
            type="button"
            onClick={() => void playWord(current.id, current.name)}
            className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-card shadow-sm"
            aria-label={current.name}
          >
            <img src={current.image} alt={current.name} className="aspect-square w-full object-cover" />
          </button>
          {showWord ? <h1 className="mt-4 text-5xl font-extrabold capitalize text-ink">{current.name}</h1> : null}
          <div className="mt-4 flex w-full max-w-md gap-3">
            <button
              type="button"
              onClick={() => void playWord(current.id, current.name)}
              className="min-h-16 flex-1 rounded-full bg-sun text-xl font-extrabold text-sun-ink"
            >
              Hear
            </button>
            <button type="button" onClick={nextLook} className="min-h-16 flex-1 rounded-full bg-leaf text-xl font-extrabold text-leaf-ink">
              Next
            </button>
          </div>
          <p className="mt-3 text-sm font-extrabold text-muted">
            {lookIndex + 1} / {round.length}
          </p>
        </section>
      ) : null}

      {phase === "find" ? (
        <section className="flex flex-1 flex-col gap-4">
          <button
            type="button"
            onClick={() => void playWord(prompt.id, prompt.name)}
            className="mx-auto min-h-16 rounded-full bg-sun px-8 text-xl font-extrabold text-sun-ink"
          >
            Hear again
          </button>
          {showWord ? <h1 className="text-center text-4xl font-extrabold capitalize">{prompt.name}</h1> : null}
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            {choices.map((item) => {
              const right = picked === item.id && item.id === prompt.id;
              return (
                <button
                  key={`${prompt.id}-${item.id}`}
                  type="button"
                  onClick={() => choose(item.id)}
                  className={`overflow-hidden rounded-[2rem] bg-card ${
                    right ? "ring-8 ring-sun" : ""
                  }`}
                  aria-label={item.name}
                >
                  <img src={item.image} alt="" className="aspect-square w-full object-cover" />
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {phase === "star" ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="text-7xl">⭐</p>
          <button type="button" onClick={() => startRound()} className="min-h-16 rounded-full bg-leaf px-10 text-2xl font-extrabold text-leaf-ink">
            Next three
          </button>
        </section>
      ) : null}
      <span className="sr-only">{languageId}</span>
    </main>
  );
}
