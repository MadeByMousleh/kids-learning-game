import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { EVERYDAY_OBJECTS, choicesFor, shuffle, type EverydayObject } from "@/lib/objects";
import { hydrateProgress, useProgress } from "@/lib/progress";
import { speak, warmVoices } from "@/lib/speech";

type Mode = "look" | "find";

export function ObjectsGame() {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("look");
  const [order, setOrder] = useState<EverydayObject[]>(EVERYDAY_OBJECTS);
  const [index, setIndex] = useState(0);
  const [promptId, setPromptId] = useState(EVERYDAY_OBJECTS[0].id);
  const [picked, setPicked] = useState<string | null>(null);
  const known = useProgress((state) => state.known);
  const markKnown = useProgress((state) => state.markKnown);
  const markFind = useProgress((state) => state.markFind);

  const current = order[index] ?? order[0];
  const prompt = EVERYDAY_OBJECTS.find((item) => item.id === promptId) ?? EVERYDAY_OBJECTS[0];
  const choices = useMemo(() => choicesFor(prompt.id), [prompt.id]);

  useEffect(() => {
    hydrateProgress();
    warmVoices();
    setOrder(shuffle(EVERYDAY_OBJECTS));
  }, []);

  function begin() {
    warmVoices();
    setReady(true);
    const first = order[0] ?? EVERYDAY_OBJECTS[0];
    speak(first.name);
    markKnown(first.id);
  }

  function showLook(nextIndex: number) {
    const item = order[nextIndex];
    if (!item) return;
    setIndex(nextIndex);
    setPicked(null);
    speak(item.name);
    markKnown(item.id);
  }

  function nextLook() {
    showLook((index + 1) % order.length);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setPicked(null);
    if (next === "look") {
      speak(current.name);
      markKnown(current.id);
      return;
    }
    const target = shuffle(EVERYDAY_OBJECTS)[0];
    setPromptId(target.id);
    speak(`Find the ${target.name}`);
  }

  function nextFind(correct: boolean) {
    if (correct) markFind();
    const target = shuffle(EVERYDAY_OBJECTS)[0];
    setPromptId(target.id);
    setPicked(null);
    window.setTimeout(() => speak(`Find the ${target.name}`), 450);
  }

  function choose(id: string) {
    if (picked) return;
    setPicked(id);
    if (id === prompt.id) {
      speak(prompt.praise);
      markKnown(id);
      window.setTimeout(() => nextFind(true), 900);
    } else {
      speak("Try again");
      window.setTimeout(() => setPicked(null), 700);
    }
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-5 py-10">
        <p className="text-sm font-extrabold uppercase tracking-widest text-coral">Everyday objects</p>
        <h1 className="text-5xl font-extrabold leading-none text-ink">Tap to hear the words</h1>
        <p className="text-lg font-semibold text-muted">Sound starts with your first tap, so the names play out loud.</p>
        <button
          type="button"
          onClick={begin}
          className="min-h-14 rounded-full bg-coral px-8 text-xl font-extrabold text-coral-ink"
        >
          Start
        </button>
        <Link to="/" className="font-bold text-muted underline-offset-4 hover:underline">
          Back to games
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-8">
      <header className="flex items-center justify-between gap-3">
        <Link to="/" className="min-h-11 rounded-full bg-card px-4 py-2 text-sm font-extrabold text-ink">
          Games
        </Link>
        <div className="flex rounded-full bg-card p-1">
          <ModeButton active={mode === "look"} onClick={() => switchMode("look")} label="Look" />
          <ModeButton active={mode === "find"} onClick={() => switchMode("find")} label="Find" />
        </div>
        <p className="min-w-16 text-right text-sm font-extrabold text-muted">
          {Object.keys(known).length}/{EVERYDAY_OBJECTS.length}
        </p>
      </header>

      {mode === "look" ? (
        <section className="flex flex-1 flex-col items-center gap-5">
          <button
            type="button"
            onClick={() => {
              speak(current.name);
              markKnown(current.id);
            }}
            className="w-full max-w-md overflow-hidden rounded-card border border-line bg-card shadow-sm"
            aria-label={`Say ${current.name}`}
          >
            <img src={current.image} alt={current.name} className="aspect-square w-full object-cover" />
          </button>
          <h1 className="text-5xl font-extrabold capitalize text-ink">{current.name}</h1>
          <div className="flex w-full max-w-md gap-3">
            <button
              type="button"
              onClick={() => speak(current.name)}
              className="min-h-14 flex-1 rounded-full bg-sun text-lg font-extrabold text-sun-ink"
            >
              Hear it
            </button>
            <button
              type="button"
              onClick={nextLook}
              className="min-h-14 flex-1 rounded-full bg-leaf text-lg font-extrabold text-leaf-ink"
            >
              Next
            </button>
          </div>
        </section>
      ) : (
        <section className="flex flex-1 flex-col gap-5">
          <div className="rounded-card bg-sun px-5 py-4 text-center">
            <p className="text-sm font-extrabold uppercase tracking-widest text-sun-ink">Listen</p>
            <h1 className="text-4xl font-extrabold capitalize text-sun-ink">{prompt.name}</h1>
            <button
              type="button"
              onClick={() => speak(`Find the ${prompt.name}`)}
              className="mt-3 min-h-12 rounded-full bg-card px-5 font-extrabold text-ink"
            >
              Say it again
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {choices.map((item) => {
              const correct = picked === item.id && item.id === prompt.id;
              const wrong = picked === item.id && item.id !== prompt.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => choose(item.id)}
                  className={`overflow-hidden rounded-card border-4 bg-card ${
                    correct ? "border-leaf" : wrong ? "border-coral" : "border-transparent"
                  }`}
                  aria-label={item.name}
                >
                  <img src={item.image} alt="" className="aspect-square w-full object-cover" />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full px-4 text-sm font-extrabold ${
        active ? "bg-coral text-coral-ink" : "text-muted"
      }`}
    >
      {label}
    </button>
  );
}
