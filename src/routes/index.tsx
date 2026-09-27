import { createFileRoute, Link } from "@tanstack/react-router";
import { EVERYDAY_OBJECTS } from "@/lib/objects";
import { hydrateProgress, useProgress } from "@/lib/progress";
import { useEffect } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const known = useProgress((state) => state.known);
  const finds = useProgress((state) => state.finds);
  const knownCount = Object.keys(known).length;

  useEffect(() => {
    hydrateProgress();
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-muted">Vocabulary</p>
          <h1 className="mt-1 text-4xl font-extrabold leading-none text-ink sm:text-5xl">Look & Name</h1>
        </div>
        <p className="rounded-full bg-sun px-4 py-2 text-sm font-extrabold text-sun-ink">
          {knownCount}/{EVERYDAY_OBJECTS.length} words
        </p>
      </header>

      <p className="max-w-xl text-lg font-semibold leading-snug text-muted">
        A small set of picture games. Start with everyday things, hear the word, then find it.
      </p>

      <section className="grid gap-4">
        <Link
          to="/objects"
          className="group flex flex-col gap-4 rounded-card border border-line bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 sm:flex-row sm:items-center"
        >
          <div className="grid grid-cols-4 gap-2 sm:w-56">
            {EVERYDAY_OBJECTS.slice(0, 4).map((item) => (
              <img
                key={item.id}
                src={item.image}
                alt=""
                className="aspect-square rounded-2xl bg-bg object-cover"
              />
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-coral">Ready to play</p>
            <h2 className="text-3xl font-extrabold text-ink">Everyday objects</h2>
            <p className="font-semibold text-muted">Ball, fork, spoon, shoe, cup, and more. Look, listen, then find.</p>
            <p className="font-bold text-leaf">{finds} finds so far</p>
          </div>
        </Link>

        <article className="rounded-card border border-dashed border-line bg-card/70 p-5">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted">Next game</p>
          <h2 className="mt-1 text-2xl font-extrabold text-ink">More games later</h2>
          <p className="mt-1 font-semibold text-muted">This launchpad is built so the next picture game can sit beside this one.</p>
        </article>
      </section>
    </main>
  );
}
