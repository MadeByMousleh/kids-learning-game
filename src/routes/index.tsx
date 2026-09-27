import { createFileRoute, Link } from "@tanstack/react-router";
import { EVERYDAY_OBJECTS } from "@/lib/objects";
import { hydrateProgress, useProgress } from "@/lib/progress";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const scores = useProgress((state) => state.scores);
  const finds = useProgress((state) => state.finds);
  const knownCount = Object.values(scores).filter((item) => item.correct > 0 || item.seen > 0).length;

  useEffect(() => {
    hydrateProgress();
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8">
      <header>
        <h1 className="text-4xl font-extrabold leading-none text-ink sm:text-5xl">Look & Name</h1>
        <p className="mt-3 max-w-xl text-lg font-semibold text-muted">
          See three pictures. Hear the words. Then find those three.
        </p>
      </header>

      <Link
        to="/objects"
        className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 shadow-sm sm:flex-row sm:items-center"
      >
        <div className="grid grid-cols-4 gap-2 sm:w-56">
          {EVERYDAY_OBJECTS.slice(0, 4).map((item) => (
            <img key={item.id} src={item.image} alt="" className="aspect-square rounded-2xl object-cover" />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-3xl font-extrabold text-ink">Everyday objects</h2>
          <p className="font-semibold text-muted">
            {knownCount}/{EVERYDAY_OBJECTS.length} words · {finds} finds
          </p>
        </div>
      </Link>
    </main>
  );
}
