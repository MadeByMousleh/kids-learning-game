import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { GrownUpCorner } from "@/components/grown-up-corner";
import { asEveryday, hydrateCustomObjects, useCustomObjects } from "@/lib/custom-objects";
import { EVERYDAY_OBJECTS, shuffle, type EverydayObject } from "@/lib/objects";
import { playWord } from "@/lib/play-word";
import { hydrateProgress, useProgress } from "@/lib/progress";
import { hydrateSettings, useSettings } from "@/lib/settings";
import { cheer, warmVoices } from "@/lib/speech";

const DRIFTS = ["drift-a", "drift-b", "drift-c"] as const;

export function CatchGame() {
  const [ready, setReady] = useState(false);
  const [trio, setTrio] = useState<EverydayObject[]>([]);
  const [targetId, setTargetId] = useState("");
  const [left, setLeft] = useState<string[]>([]);
  const [pop, setPop] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const [done, setDone] = useState(false);
  const custom = useCustomObjects((state) => state.items);
  const pool = useMemo(() => [...EVERYDAY_OBJECTS, ...custom.map(asEveryday)], [custom]);
  const showWord = useSettings((state) => state.showWord);

  const markCorrect = useProgress((state) => state.markCorrect);

  useEffect(() => {
    hydrateProgress();
    hydrateSettings();
    hydrateCustomObjects();
    warmVoices();
  }, []);

  function deal() {
    const saved = custom.map(asEveryday);
    const must = shuffle(saved).slice(0, 3);
    const fillers = shuffle(pool.filter((item) => !must.some((kept) => kept.id === item.id)));
    const next = [...must, ...fillers].slice(0, 3);
    const order = shuffle(next.map((item) => item.id));
    setTrio(next);
    setLeft(order);
    setTargetId(order[0]);
    setPop(null);
    setDone(false);
    const first = next.find((item) => item.id === order[0]);
    if (first) void playWord(first.id, first.name);
  }

  function begin() {
    warmVoices();
    setReady(true);
    deal();
  }

  function tap(id: string) {
    if (pop || done) return;
    if (id !== targetId) return;
    setPop(id);
    cheer();
    markCorrect(id);
    setStars((value) => value + 1);
    window.setTimeout(() => {
      const rest = left.filter((itemId) => itemId !== id);
      if (rest.length === 0) {
        setDone(true);
        setPop(null);
        return;
      }
      setLeft(rest);
      setTargetId(rest[0]);
      setPop(null);
      const next = trio.find((entry) => entry.id === rest[0]);
      if (next) void playWord(next.id, next.name);
    }, 700);
  }

  const target = trio.find((item) => item.id === targetId);

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-6 px-6">
        <GrownUpCorner />
        <Link to="/" className="text-sm font-extrabold text-muted">
          Home
        </Link>
        <h1 className="text-5xl font-black leading-none tracking-tight text-ink sm:text-7xl">Catch the word</h1>
        <p className="max-w-md text-lg font-semibold text-muted">Three pictures float. Hear the word. Tap the right one.</p>
        <button type="button" onClick={begin} className="min-h-16 w-fit rounded-full bg-coral px-10 text-2xl font-black text-coral-ink">
          Play
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-4">
      <GrownUpCorner />
      <div className="flex items-center justify-between px-2 pt-1">
        <button
          type="button"
          onClick={() => target && void playWord(target.id, target.name)}
          className="min-h-14 rounded-full bg-sun px-6 text-xl font-extrabold text-sun-ink"
        >
          Hear
        </button>
        {showWord && target ? <p className="text-3xl font-extrabold capitalize">{target.name}</p> : <span />}
        <p className="text-2xl" aria-label={`${stars} stars`}>
          {"★".repeat(Math.min(stars, 6))}
        </p>
      </div>

      {done ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="text-7xl">★</p>
          <button type="button" onClick={deal} className="min-h-16 rounded-full bg-leaf px-10 text-2xl font-extrabold text-leaf-ink">
            Three more
          </button>
        </section>
      ) : (
        <section className="relative mt-3 min-h-0 flex-1 overflow-hidden rounded-[2rem] bg-card">
          {trio.map((item, index) => {
            const caught = !left.includes(item.id);
            if (caught && pop !== item.id) return null;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => tap(item.id)}
                className={`absolute h-40 w-40 overflow-hidden rounded-[1.6rem] bg-bg shadow-sm md:h-56 md:w-56 ${DRIFTS[index]} ${
                  pop === item.id ? "scale-110 ring-8 ring-sun" : ""
                }`}
                style={{ left: `${12 + index * 28}%`, top: `${18 + (index % 2) * 28}%` }}
                aria-label={item.name}
              >
                <img src={item.image} alt="" className="h-full w-full object-cover" />
              </button>
            );
          })}
        </section>
      )}
    </main>
  );
}
