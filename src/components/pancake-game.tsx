import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { GrownUpCorner } from "@/components/grown-up-corner";
import { clipPeak, deleteRecording, listRecordedIds, playClip, playClipIfIdle, saveRecording } from "@/lib/recordings";
import { hydrateSettings, useSettings } from "@/lib/settings";
import { pop } from "@/lib/speech";

const CHEERS = [1, 2, 3, 4, 5].map((n) => ({ id: `pancake-cheer-${n}`, label: `Cheer ${n}` }));

const LEVELS = {
  easy: { label: "Easy", speed: 150, every: 1.8, ramp: 0.025, pan: 210 },
  medium: { label: "Medium", speed: 200, every: 1.35, ramp: 0.038, pan: 168 },
  hard: { label: "Hard", speed: 260, every: 1.05, ramp: 0.05, pan: 124 },
} as const;

type LevelId = keyof typeof LEVELS;

type Fall = { id: number; x: number; y: number; tilt: number };
type Layer = { tilt: number };

type World = {
  pan: number;
  falling: Fall[];
  stack: Layer[];
  catches: number;
  lives: number;
  spawn: number;
  over: boolean;
};

const CAKE_H = 12;
const RISE = 5;
const PLATE_LIFT = 0.04;
const PLATE_SURFACE = 26;

function seatFromBottom(height: number, count: number) {
  return height * PLATE_LIFT + PLATE_SURFACE + count * RISE;
}

function Cake({ tilt = 0, width = 92 }: { tilt?: number; width?: number }) {
  return (
    <svg width={width} height={CAKE_H} viewBox="0 6 140 16" style={{ transform: `rotate(${tilt}deg)` }} aria-hidden>
      <ellipse cx="70" cy="15" rx="64" ry="6" fill="#b87428" />
      <ellipse cx="70" cy="12" rx="64" ry="6" fill="#f0b429" />
      <ellipse cx="70" cy="10" rx="50" ry="3.2" fill="#ffe3a3" />
    </svg>
  );
}

function Plate({ width }: { width: number }) {
  return (
    <svg width={width} height={42} viewBox="0 0 220 42" aria-hidden>
      <ellipse cx="110" cy="28" rx="98" ry="12" fill="#000" opacity="0.12" />
      <ellipse cx="110" cy="22" rx="100" ry="14" fill="#e7e2da" />
      <ellipse cx="110" cy="20" rx="86" ry="10" fill="#ffffff" />
      <ellipse cx="110" cy="19" rx="62" ry="6" fill="#f4f1ea" />
      <ellipse cx="110" cy="18" rx="78" ry="8" fill="none" stroke="#d9d3c8" strokeWidth="2" />
    </svg>
  );
}

export function PancakeGame() {
  const languageId = useSettings((state) => state.languageId);
  const [level, setLevel] = useState<LevelId>("easy");
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [recording, setRecording] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [view, setView] = useState<World>({ pan: 200, falling: [], stack: [], catches: 0, lives: 3, spawn: 0, over: false });
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World>(view);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cheersRef = useRef<string[]>([]);
  const languageRef = useRef(languageId);
  languageRef.current = languageId;
  cheersRef.current = CHEERS.map((item) => item.id).filter((id) => saved.includes(id));

  useEffect(() => {
    hydrateSettings();
  }, []);

  useEffect(() => {
    void listRecordedIds(languageId).then(setSaved);
  }, [languageId]);

  useEffect(() => {
    if (!running) return;
    const stage = stageRef.current;
    if (!stage) return;
    const tune = LEVELS[level];
    const world: World = {
      pan: stage.clientWidth / 2,
      falling: [],
      stack: [],
      catches: 0,
      lives: 3,
      spawn: 0.45,
      over: false,
    };
    worldRef.current = world;
    let last = performance.now();
    let frame = 0;
    let nextId = 1;
    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const box = stage.getBoundingClientRect();
      const speed = Math.min(420, tune.speed * (1 + tune.ramp) ** world.catches);
      const every = Math.max(0.75, tune.every / (1 + world.catches * 0.02));
      if (!world.over) {
        world.spawn -= dt;
        if (world.spawn <= 0) {
          world.spawn = every;
          const edge = 18;
          world.falling.push({
            id: nextId,
            x: edge + Math.random() * Math.max(20, box.width - edge * 2),
            y: -24,
            tilt: (Math.random() - 0.5) * 14,
          });
          nextId += 1;
        }
      }
      const seat = seatFromBottom(box.height, world.stack.length);
      const catchCenter = box.height - seat - CAKE_H / 2;
      const cakeWidth = Math.max(70, tune.pan * 0.62);
      const half = world.stack.length === 0 ? tune.pan * 0.34 : cakeWidth * 0.32;
      const kept: Fall[] = [];
      let caught = false;
      for (const cake of world.falling) {
        const y = cake.y + speed * dt;
        const crossed = cake.y < catchCenter && y >= catchCenter;
        if (crossed && Math.abs(cake.x - world.pan) <= half) {
          world.catches += 1;
          world.stack.push({ tilt: cake.tilt * 0.2 });
          caught = true;
          continue;
        }
        if (y > box.height + 40) {
          world.lives = Math.max(0, world.lives - 1);
          if (world.lives <= 0) world.over = true;
          continue;
        }
        kept.push({ ...cake, y });
      }
      world.falling = kept;
      if (caught) {
        pop();
        const choices = cheersRef.current;
        if (choices.length) {
          const id = choices[Math.floor(Math.random() * choices.length)];
          playClipIfIdle(languageRef.current, id);
        }
      }
      const snapshot: World = {
        pan: world.pan,
        falling: world.falling,
        stack: world.stack,
        catches: world.catches,
        lives: world.lives,
        spawn: world.spawn,
        over: world.over,
      };
      worldRef.current = world;
      setView(snapshot);
      if (!world.over) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [running, runId, level]);

  useEffect(() => {
    if (!running) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const stage = stageRef.current;
      if (!stage || worldRef.current.over) return;
      const rect = stage.getBoundingClientRect();
      const step = event.repeat ? 22 : 36;
      const next = worldRef.current.pan + (event.key === "ArrowLeft" ? -step : step);
      worldRef.current.pan = Math.min(rect.width, Math.max(0, next));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, level]);

  function place(clientX: number) {
    const stage = stageRef.current;
    if (!stage || worldRef.current.over) return;
    const rect = stage.getBoundingClientRect();
    worldRef.current.pan = Math.min(rect.width, Math.max(0, clientX - rect.left));
  }

  function start() {
    setRunning(true);
    setRunId((value) => value + 1);
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
  }

  async function record(id: string) {
    if (recording === id) {
      stopRecording();
      return;
    }
    if (recording) stopRecording();
    setStatus("Asking for the microphone…");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("This browser cannot record here.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      setRecording(id);
      setStatus("Say a cheer, then tap Stop.");
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        setRecording(null);
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        void (async () => {
          if (!blob.size) {
            setStatus("Nothing was captured.");
            return;
          }
          let peak = 1;
          try {
            peak = await clipPeak(blob);
          } catch {
            peak = 1;
          }
          if (peak < 0.01) {
            setStatus("That take was silent. Allow the mic and try again.");
            return;
          }
          await saveRecording(languageId, id, blob);
          setSaved(await listRecordedIds(languageId));
          const audio = new Audio(URL.createObjectURL(blob));
          audio.volume = 1;
          try {
            await audio.play();
            setStatus("Saved. That cheer can play when you catch a pancake.");
          } catch {
            setStatus("Saved.");
          }
        })();
      };
      recorder.start();
      window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 4000);
    } catch (error) {
      setRecording(null);
      const message = error instanceof Error ? error.message : "Could not start the microphone.";
      setStatus(/denied|not allowed|permission|policy/i.test(message) ? "The mic was blocked. Allow it, then record again." : message);
    }
  }

  const tune = LEVELS[level];
  const cakeWidth = Math.max(70, tune.pan * 0.62);

  if (!running) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <GrownUpCorner />
        <Link to="/" className="text-sm font-extrabold text-muted">
          Home
        </Link>
        <div>
          <h1 className="text-5xl font-black leading-none tracking-tight text-ink sm:text-6xl">Pancakes</h1>
          <p className="mt-3 max-w-lg font-semibold text-muted">Move the plate with the mouse or the arrow keys. Catch each pancake on top of the last one.</p>
        </div>
        <div className="flex gap-2">
          {(Object.keys(LEVELS) as LevelId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setLevel(id)}
              className={`min-h-14 flex-1 rounded-full text-lg font-black ${level === id ? "bg-ink text-card" : "bg-card text-ink"}`}
            >
              {LEVELS[id].label}
            </button>
          ))}
        </div>
        <section className="rounded-[1.75rem] bg-card p-4">
          <h2 className="text-xl font-black">Five cheers</h2>
          <p className="mt-1 text-sm font-semibold text-muted">Record five. One plays at random every time a pancake lands.</p>
          <ul className="mt-3 grid gap-2">
            {CHEERS.map((item) => {
              const has = saved.includes(item.id);
              const live = recording === item.id;
              return (
                <li key={item.id} className="flex items-center gap-2">
                  <span className="w-20 font-black">{item.label}</span>
                  {has && !live ? <span className="text-xs font-extrabold text-leaf">Saved</span> : <span className="text-xs font-extrabold text-muted">Empty</span>}
                  <button
                    type="button"
                    onClick={() => void record(item.id)}
                    className={`ml-auto min-h-11 rounded-full px-4 text-sm font-black ${live ? "bg-coral text-coral-ink" : "bg-sun text-sun-ink"}`}
                  >
                    {live ? "Stop" : has ? "Redo" : "Record"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void playClip(languageId, item.id).then((result) => {
                        if (result !== "played") setStatus("Nothing saved on this cheer yet.");
                      });
                    }}
                    className="min-h-11 rounded-full bg-bg px-4 text-sm font-black"
                  >
                    Hear
                  </button>
                  {has ? (
                    <button
                      type="button"
                      onClick={() => {
                        void deleteRecording(languageId, item.id).then(() => listRecordedIds(languageId).then(setSaved));
                      }}
                      className="min-h-11 rounded-full px-3 text-sm font-black text-muted"
                    >
                      Clear
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {status ? <p className="mt-3 text-sm font-extrabold">{status}</p> : null}
        </section>
        <button type="button" onClick={start} className="min-h-16 rounded-full bg-coral text-2xl font-black text-coral-ink">
          Play
        </button>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-[#f3e2c4]">
      <div
        ref={stageRef}
        className="absolute inset-0 touch-none"
        onPointerDown={(event) => {
          if (worldRef.current.over) return;
          const target = event.target;
          if (target instanceof Element && target.closest("button, a")) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          place(event.clientX);
        }}
        onPointerMove={(event) => {
          if (worldRef.current.over) return;
          if (event.pointerType === "mouse" || event.currentTarget.hasPointerCapture(event.pointerId)) place(event.clientX);
        }}
      >
        <img
          src="/pancakes/kitchen.jpg"
          alt=""
          className="pointer-events-none h-full w-full origin-bottom object-cover object-bottom"
          style={{ transform: "scale(0.86)" }}
        />
        {view.falling.map((cake) => (
          <div key={cake.id} className="absolute" style={{ left: cake.x, top: cake.y, transform: "translate(-50%, -50%)" }}>
            <Cake tilt={cake.tilt} width={cakeWidth} />
          </div>
        ))}
        <div className="absolute" style={{ left: view.pan, bottom: `${PLATE_LIFT * 100}%`, transform: "translateX(-50%)" }}>
          {view.stack.map((layer, index) => (
            <div key={index} className="absolute left-1/2" style={{ bottom: PLATE_SURFACE + index * RISE, transform: "translateX(-50%)" }}>
              <Cake tilt={layer.tilt} width={cakeWidth} />
            </div>
          ))}
          <Plate width={tune.pan} />
        </div>
        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-card/90 px-4 py-2 font-black">
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className={`h-3 w-3 rounded-full ${index < view.lives ? "bg-coral" : "bg-line"}`} />
          ))}
          <span className="ml-2">{view.catches}</span>
        </div>
        {view.over ? null : (
          <Link to="/" className="absolute right-4 top-4 z-10 rounded-full bg-card/90 px-4 py-2 text-sm font-black">
            Home
          </Link>
        )}
      </div>
      {view.over ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/35 p-6">
          <div className="w-full max-w-sm rounded-[2rem] bg-card p-6 text-center">
            <p className="text-5xl font-black">{view.catches}</p>
            <p className="mt-1 font-extrabold text-muted">pancakes in the tower</p>
            <button type="button" onClick={start} className="mt-5 min-h-14 w-full rounded-full bg-coral text-xl font-black text-coral-ink">
              Play again
            </button>
            <button type="button" onClick={() => setRunning(false)} className="mt-2 min-h-12 w-full rounded-full text-base font-black text-muted">
              Back
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
