import { createFileRoute, Link } from "@tanstack/react-router";
import { GrownUpCorner } from "@/components/grown-up-corner";
import { EVERYDAY_OBJECTS } from "@/lib/objects";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  useEffect(() => {
    document.title = "Look & Name";
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8">
      <GrownUpCorner />
      <header className="max-w-xl pr-24">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-muted">Look & Name</p>
        <h1 className="mt-2 text-5xl font-black leading-none tracking-tight text-ink sm:text-7xl">What shall we play?</h1>
      </header>

      <div className="mt-8 grid flex-1 gap-4 md:grid-cols-5">
        <Link
          to="/objects"
          className="group relative flex min-h-80 flex-col justify-between overflow-hidden rounded-[2rem] bg-ink p-6 text-card md:col-span-3"
        >
          <div className="grid grid-cols-4 gap-2">
            {EVERYDAY_OBJECTS.slice(0, 4).map((item) => (
              <img key={item.id} src={item.image} alt="" className="aspect-square rounded-2xl object-cover" />
            ))}
          </div>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-black">Words</h2>
              <p className="mt-1 font-semibold text-card/70">See it. Hear it. Find it.</p>
            </div>
            <span className="rounded-full bg-sun px-5 py-3 text-lg font-black text-sun-ink">Play</span>
          </div>
        </Link>

        <div className="grid gap-4 md:col-span-2">
          <Link to="/paint" className="flex min-h-44 flex-col justify-between rounded-[2rem] border border-line bg-card p-6 shadow-sm">
            <img src="/coloring/cat.png" alt="" className="h-24 w-20 object-contain" />
            <div className="mt-4 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-black text-ink">Paint</h2>
                <p className="font-semibold text-muted">Stay inside the lines.</p>
              </div>
              <span className="rounded-full bg-ink px-4 py-2 font-black text-card">Open</span>
            </div>
          </Link>
          <Link to="/memory" className="flex min-h-32 flex-col justify-between rounded-[2rem] bg-sun p-6 text-sun-ink">
            <h2 className="text-3xl font-black">Memory</h2>
            <p className="font-semibold text-sun-ink/80">Turn two pictures. Hear the word.</p>
          </Link>
          <Link to="/catch" className="flex min-h-32 flex-col justify-between rounded-[2rem] bg-coral p-6 text-coral-ink">
            <h2 className="text-3xl font-black">Catch</h2>
            <p className="font-semibold text-coral-ink/80">Tap the picture you hear.</p>
          </Link>
        </div>
      </div>
      <Link to="/pancakes" className="mt-4 flex min-h-32 items-center justify-between rounded-[2rem] bg-[#c9842f] p-6 text-[#3a291c]">
        <div>
          <h2 className="text-3xl font-black">Pancakes</h2>
          <p className="font-semibold text-[#3a291c]/80">Catch them on the plate. Stack a tower.</p>
        </div>
        <span className="rounded-full bg-[#3a291c] px-5 py-3 text-lg font-black text-[#ffe7a3]">Play</span>
      </Link>
    </main>
  );
}
