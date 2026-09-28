import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { GrownUpCorner } from "@/components/grown-up-corner";
import { asEveryday, hydrateCustomObjects, useCustomObjects } from "@/lib/custom-objects";
import { EVERYDAY_OBJECTS, shuffle, type EverydayObject } from "@/lib/objects";
import { playWord } from "@/lib/play-word";
import { hydrateSettings, useSettings } from "@/lib/settings";
import { cheer, warmVoices } from "@/lib/speech";

type Card = {
  key: string;
  object: EverydayObject;
};

const PAIRS = 4;

function deal(pool: EverydayObject[], saved: EverydayObject[]): Card[] {
  const must = shuffle(saved).slice(0, PAIRS);
  const fillers = shuffle(pool.filter((item) => !must.some((kept) => kept.id === item.id)));
  const chosen = [...must, ...fillers].slice(0, Math.min(PAIRS, must.length + fillers.length));
  return shuffle(
    chosen.flatMap((object) => [
      { key: `${object.id}-a-${Math.random().toString(36).slice(2, 7)}`, object },
      { key: `${object.id}-b-${Math.random().toString(36).slice(2, 7)}`, object },
    ]),
  );
}

export function MemoryGame() {
  const custom = useCustomObjects((state) => state.items);
  const pool = useMemo(() => [...EVERYDAY_OBJECTS, ...custom.map(asEveryday)], [custom]);
  const showWord = useSettings((state) => state.showWord);
  const [ready, setReady] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [first, setFirst] = useState<string | null>(null);
  const [second, setSecond] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const done = ready && cards.length > 0 && matched.length * 2 === cards.length;

  useEffect(() => {
    hydrateSettings();
    hydrateCustomObjects();
    warmVoices();
  }, []);

  function start() {
    warmVoices();
    setCards(deal(pool, custom.map(asEveryday)));
    setFirst(null);
    setSecond(null);
    setMatched([]);
    setBusy(false);
    setReady(true);
  }

  function flip(card: Card) {
    if (!ready || busy || done) return;
    if (matched.includes(card.object.id)) return;
    if (card.key === first || card.key === second) return;
    void playWord(card.object.id, card.object.name);
    if (!first) {
      setFirst(card.key);
      return;
    }
    const other = cards.find((item) => item.key === first);
    setSecond(card.key);
    if (other && other.object.id === card.object.id) {
      const next = [...matched, card.object.id];
      setMatched(next);
      setFirst(null);
      setSecond(null);
      cheer();
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      setFirst(null);
      setSecond(null);
      setBusy(false);
    }, 900);
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-6 px-6">
        <GrownUpCorner />
        <Link to="/" className="text-sm font-extrabold text-muted">
          Home
        </Link>
        <h1 className="text-5xl font-black leading-none tracking-tight text-ink sm:text-7xl">Memory</h1>
        <p className="max-w-md text-lg font-semibold text-muted">Turn two pictures. If they match, you hear the word and they stay.</p>
        <button type="button" onClick={start} className="min-h-16 w-fit rounded-full bg-sun px-10 text-2xl font-black text-sun-ink">
          Play
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <GrownUpCorner />
      <div className="flex items-center justify-between pr-24">
        <Link to="/" className="min-h-11 rounded-full bg-card px-4 py-2 text-sm font-extrabold text-ink">
          Home
        </Link>
        <p className="text-sm font-extrabold text-muted">
          {matched.length} of {cards.length / 2}
        </p>
      </div>

      {done ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="text-7xl text-sun">★</p>
          <button type="button" onClick={start} className="min-h-16 rounded-full bg-sun px-10 text-2xl font-black text-sun-ink">
            Play again
          </button>
        </section>
      ) : (
        <section className="mt-4 grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((card) => {
            const up = matched.includes(card.object.id) || card.key === first || card.key === second;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => flip(card)}
                aria-label={up ? card.object.name : "Hidden picture"}
                className="aspect-square [perspective:900px]"
              >
                <span
                  className={`relative block h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                    up ? "[transform:rotateY(180deg)]" : ""
                  }`}
                >
                  <span className="absolute inset-0 flex items-center justify-center rounded-[1.4rem] bg-ink [backface-visibility:hidden]">
                    <span className="h-8 w-8 rounded-full bg-sun" />
                  </span>
                  <span className="absolute inset-0 overflow-hidden rounded-[1.4rem] bg-card [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <img src={card.object.image} alt="" className="h-full w-full object-cover" />
                    {showWord ? (
                      <span className="absolute inset-x-0 bottom-0 bg-card/90 py-1 text-center text-sm font-black capitalize">
                        {card.object.name}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      )}
    </main>
  );
}
