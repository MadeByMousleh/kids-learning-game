import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { GrownUpCorner } from "@/components/grown-up-corner";
import { YourPictures } from "@/components/your-pictures";
import { asEveryday, hydrateCustomObjects, useCustomObjects } from "@/lib/custom-objects";
import { EVERYDAY_OBJECTS, choicesFor, type EverydayObject } from "@/lib/objects";
import { playWord } from "@/lib/play-word";
import { hydrateProgress, pickRound, useProgress } from "@/lib/progress";
import { hydrateSettings, useSettings } from "@/lib/settings";
import { cheer, warmVoices } from "@/lib/speech";

type Phase = "look" | "find" | "star";

export function ObjectsGame() {
  const [ready, setReady] = useState(false);
  const [adding, setAdding] = useState(false);
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
  const custom = useCustomObjects((state) => state.items);
  const pool = useMemo(() => [...EVERYDAY_OBJECTS, ...custom.map(asEveryday)], [custom]);
  const current = round[lookIndex] ?? round[0];
  const prompt = quiz[quizIndex] ?? round[0];
  const choices = useMemo(() => choicesFor(prompt?.id ?? round[0]?.id ?? "", pool), [prompt?.id, quizIndex, pool]);

  useEffect(() => {
    hydrateProgress();
    hydrateSettings();
    hydrateCustomObjects();
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
    if (picked) return;
    if (id === prompt.id) {
      markCorrect(prompt.id);
      setPicked(id);
      setStars((value) => value + 1);
      cheer();
      const nextQuiz = quizIndex + 1;
      if (nextQuiz >= quiz.length) {
        window.setTimeout(() => setPhase("star"), 700);
        return;
      }
      window.setTimeout(() => {
        const next = quiz[nextQuiz];
        setQuizIndex(nextQuiz);
        setPicked(null);
        void playWord(next.id, next.name);
      }, 700);
      return;
    }
    markMiss(prompt.id);
    setPicked(id);
    window.setTimeout(() => setPicked(null), 420);
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
        <GrownUpCorner />
        <div className="flex items-center justify-between gap-3 pr-24">
          <Link to="/" className="text-sm font-extrabold text-muted">
            Home
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-muted">Words</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-6xl">Pick a picture. Then play.</h1>
          </div>
          <button type="button" onClick={begin} className="min-h-16 rounded-full bg-coral px-10 text-2xl font-black text-coral-ink">
            Play
          </button>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {pool.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void playWord(item.id, item.name)}
              className="overflow-hidden rounded-3xl bg-card text-left shadow-sm"
            >
              <img src={item.image} alt="" className="aspect-square w-full object-cover" />
              {showWord ? <span className="block px-3 py-2 text-sm font-extrabold capitalize">{item.name}</span> : null}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex aspect-square flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line bg-card/70 text-center"
          >
            <span className="text-4xl font-black text-ink">+</span>
            <span className="mt-1 px-2 text-sm font-extrabold text-muted">Add yours</span>
          </button>
        </div>
        {adding ? (
          <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-3 sm:items-center">
            <div className="max-h-[92dvh] w-full max-w-lg overflow-auto rounded-[2rem] bg-bg p-2">
              <div className="flex justify-end px-3 pt-3">
                <button type="button" onClick={() => setAdding(false)} className="min-h-11 rounded-full bg-card px-4 font-extrabold">
                  Close
                </button>
              </div>
              <YourPictures />
            </div>
          </div>
        ) : null}
        <span className="sr-only">{languageId}</span>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <GrownUpCorner />
      <div className="flex items-center justify-between pr-24">
        <button type="button" onClick={() => setReady(false)} className="min-h-11 rounded-full bg-card px-4 text-sm font-extrabold text-ink">
          Pictures
        </button>
        <p className="text-sm font-extrabold text-sun-ink" aria-label={`${stars} stars`}>
          {stars > 0 ? `${"★".repeat(Math.min(stars, 8))}` : ""}
        </p>
      </div>

      {phase === "look" && current ? (
        <section className="flex flex-1 flex-col items-center justify-center">
          <button
            type="button"
            onClick={() => void playWord(current.id, current.name)}
            className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-card shadow-sm"
            aria-label={current.name}
          >
            <img src={current.image} alt={current.name} className="aspect-square w-full object-cover" />
          </button>
          {showWord ? <h1 className="mt-4 text-5xl font-black capitalize text-ink">{current.name}</h1> : null}
          <div className="mt-5 flex w-full max-w-xl gap-3">
            <button
              type="button"
              onClick={() => void playWord(current.id, current.name)}
              className="min-h-16 flex-1 rounded-full bg-sun text-xl font-black text-sun-ink"
            >
              Hear
            </button>
            <button type="button" onClick={nextLook} className="min-h-16 flex-1 rounded-full bg-ink text-xl font-black text-card">
              Next
            </button>
          </div>
          <p className="mt-3 text-sm font-extrabold text-muted">
            {lookIndex + 1} of {round.length}
          </p>
        </section>
      ) : null}

      {phase === "find" && prompt ? (
        <section className="flex flex-1 flex-col justify-center gap-5">
          <button
            type="button"
            onClick={() => void playWord(prompt.id, prompt.name)}
            className="mx-auto min-h-16 rounded-full bg-sun px-10 text-xl font-black text-sun-ink"
          >
            Hear again
          </button>
          {showWord ? <h1 className="text-center text-4xl font-black capitalize">{prompt.name}</h1> : null}
          <div className="grid grid-cols-3 gap-3">
            {choices.map((item) => {
              const right = picked === item.id && item.id === prompt.id;
              return (
                <button
                  key={`${prompt.id}-${item.id}`}
                  type="button"
                  onClick={() => choose(item.id)}
                  className={`overflow-hidden rounded-[1.6rem] bg-card ${right ? "ring-8 ring-sun" : ""}`}
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
          <p className="text-7xl">★</p>
          <button type="button" onClick={() => startRound()} className="min-h-16 rounded-full bg-coral px-10 text-2xl font-black text-coral-ink">
            Play again
          </button>
        </section>
      ) : null}
    </main>
  );
}
