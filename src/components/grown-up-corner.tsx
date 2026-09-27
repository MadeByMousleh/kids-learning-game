import { useEffect, useRef, useState } from "react";
import { EVERYDAY_OBJECTS } from "@/lib/objects";
import { deleteRecording, listRecordedIds, saveRecording } from "@/lib/recordings";
import { hydrateSettings, useSettings } from "@/lib/settings";
import { useProgress } from "@/lib/progress";
import { playWord } from "@/lib/play-word";

export function GrownUpCorner() {
  const [open, setOpen] = useState(false);
  const [hold, setHold] = useState<number | null>(null);
  const [customName, setCustomName] = useState("");
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<string[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const languages = useSettings((state) => state.languages);
  const languageId = useSettings((state) => state.languageId);
  const showWord = useSettings((state) => state.showWord);
  const setLanguage = useSettings((state) => state.setLanguage);
  const setShowWord = useSettings((state) => state.setShowWord);
  const addLanguage = useSettings((state) => state.addLanguage);
  const reset = useProgress((state) => state.reset);
  const bumpReset = useSettings((state) => state.bumpReset);

  useEffect(() => {
    hydrateSettings();
  }, []);

  useEffect(() => {
    void listRecordedIds(languageId).then(setRecorded);
  }, [languageId, open]);

  function startHold() {
    const id = window.setTimeout(() => setOpen(true), 850);
    setHold(id);
  }

  function endHold() {
    if (hold) window.clearTimeout(hold);
    setHold(null);
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
  }

  async function recordWord(wordId: string) {
    if (recordingId === wordId) {
      stopRecording();
      return;
    }
    if (recordingId) stopRecording();
    if (!navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: BlobPart[] = [];
    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = recorder;
    setRecordingId(wordId);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      setRecordingId(null);
      if (!chunks.length) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      await saveRecording(languageId, wordId, blob);
      setRecorded(await listRecordedIds(languageId));
    };
    recorder.start();
    window.setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, 4000);
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Grown-up settings. Hold to open."
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        className="fixed right-2 top-2 z-20 flex h-11 w-11 items-center justify-center rounded-full text-lg text-ink/25"
      >
        🔒
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <section className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-card bg-card p-5 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-extrabold">Grown-up corner</h2>
          <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-full bg-bg px-4 font-extrabold">
            Done
          </button>
        </div>

        <p className="mt-2 text-sm font-semibold text-muted">
          Hold the lock to open this. Recordings stay on this device.
        </p>

        <h3 className="mt-5 text-sm font-extrabold uppercase tracking-widest text-muted">Language</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {languages.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLanguage(item.id)}
              className={`min-h-11 rounded-full px-4 font-extrabold ${
                item.id === languageId ? "bg-coral text-coral-ink" : "bg-bg text-ink"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (customName.trim()) {
              addLanguage(customName);
              setCustomName("");
            }
          }}
        >
          <input
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            placeholder="New set name"
            className="min-h-11 flex-1 rounded-full border border-line bg-bg px-4 font-semibold"
          />
          <button type="submit" className="min-h-11 rounded-full bg-sun px-4 font-extrabold text-sun-ink">
            Add
          </button>
        </form>

        <label className="mt-5 flex min-h-12 items-center gap-3 font-extrabold">
          <input type="checkbox" checked={showWord} onChange={(event) => setShowWord(event.target.checked)} />
          Show the written word
        </label>

        <h3 className="mt-5 text-sm font-extrabold uppercase tracking-widest text-muted">Your voice</h3>
        <p className="text-sm font-semibold text-muted">Tap Record, say the word, tap Stop. Max 4 seconds.</p>
        <ul className="mt-2 grid gap-2">
          {EVERYDAY_OBJECTS.map((item) => {
            const hasClip = recorded.includes(item.id);
            const live = recordingId === item.id;
            return (
              <li key={item.id} className="flex items-center gap-2 rounded-2xl bg-bg px-3 py-2">
                <img src={item.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
                <span className="flex-1 font-extrabold capitalize">{item.name}</span>
                {hasClip && !live ? <span className="text-xs font-extrabold text-leaf">Saved</span> : null}
                <button
                  type="button"
                  onClick={() => void playWord(item.id, item.name)}
                  className="min-h-10 rounded-full bg-card px-3 text-sm font-extrabold"
                >
                  Play
                </button>
                <button
                  type="button"
                  onClick={() => void recordWord(item.id)}
                  className={`min-h-10 rounded-full px-3 text-sm font-extrabold ${
                    live ? "bg-coral text-coral-ink" : "bg-sun text-sun-ink"
                  }`}
                >
                  {live ? "Stop" : hasClip ? "Redo" : "Record"}
                </button>
                {hasClip ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteRecording(languageId, item.id);
                      setRecorded(await listRecordedIds(languageId));
                    }}
                    className="min-h-10 rounded-full px-3 text-sm font-extrabold text-muted"
                  >
                    Clear
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => {
            reset();
            bumpReset();
          }}
          className="mt-6 min-h-12 w-full rounded-full bg-bg font-extrabold text-muted"
        >
          Reset progress
        </button>
      </section>
    </div>
  );
}
