import { useEffect, useRef, useState } from "react";
import { asEveryday, hydrateCustomObjects, useCustomObjects } from "@/lib/custom-objects";
import { EVERYDAY_OBJECTS } from "@/lib/objects";
import { clipPeak, deleteRecording, listRecordedIds, playClip, saveRecording } from "@/lib/recordings";
import { hydrateSettings, useSettings } from "@/lib/settings";
import { useProgress } from "@/lib/progress";

export function GrownUpCorner() {
  const [open, setOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const languages = useSettings((state) => state.languages);
  const languageId = useSettings((state) => state.languageId);
  const showWord = useSettings((state) => state.showWord);
  const setLanguage = useSettings((state) => state.setLanguage);
  const setShowWord = useSettings((state) => state.setShowWord);
  const addLanguage = useSettings((state) => state.addLanguage);
  const custom = useCustomObjects((state) => state.items);
  const words = [...EVERYDAY_OBJECTS, ...custom.map(asEveryday)];
  const reset = useProgress((state) => state.reset);
  const bumpReset = useSettings((state) => state.bumpReset);

  useEffect(() => {
    hydrateSettings();
    hydrateCustomObjects();
  }, []);

  useEffect(() => {
    void listRecordedIds(languageId).then(setRecorded);
  }, [languageId, open]);

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
      setRecordingId(wordId);
      setStatus("Recording. Speak now, then tap Stop.");
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        setRecordingId(null);
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) {
          setStatus("Nothing was captured.");
          return;
        }
        void (async () => {
          let peak = 1;
          try {
            peak = await clipPeak(blob);
          } catch {
            peak = 1;
          }
          if (peak < 0.01) {
            setStatus("The microphone recording is silent, so there is nothing to play. Allow the mic in the address bar and record again.");
            return;
          }
          const audio = new Audio(URL.createObjectURL(blob));
          audio.volume = 1;
          try {
            await audio.play();
            setStatus("Playing your voice.");
          } catch (error) {
            setStatus(`Playback was blocked: ${error instanceof Error ? error.message : "unknown error"}`);
          }
          try {
            await saveRecording(languageId, wordId, blob);
            setRecorded(await listRecordedIds(languageId));
          } catch (error) {
            setStatus(`Could not store it: ${error instanceof Error ? error.message : "storage error"}`);
          }
        })();
      };
      recorder.start();
      window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 4000);
    } catch (error) {
      setRecordingId(null);
      const message = error instanceof Error ? error.message : "Could not start the microphone.";
      const blocked = /denied|not allowed|permission|policy/i.test(message);
      setStatus(
        blocked
          ? "The preview blocked the microphone. Tap Open in a new tab, allow the mic, then record."
          : message,
      );
    }
  }

  async function saveChosenFile(wordId: string, file: File | undefined) {
    if (!file) return;
    try {
      await saveRecording(languageId, wordId, file);
      setRecorded(await listRecordedIds(languageId));
      const audio = new Audio(URL.createObjectURL(file));
      audio.volume = 1;
      await audio.play();
      setStatus(`Playing the file for ${wordId}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save.";
      setStatus(`Not saved. ${message}`);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Record your voice"
        onClick={() => setOpen(true)}
        className="fixed right-4 top-4 z-20 min-h-12 rounded-full border border-line bg-card/95 px-5 text-base font-extrabold text-ink shadow-sm backdrop-blur"
      >
        Voice
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

        <p className="mt-2 text-sm font-semibold text-muted">Recordings stay on this device.</p>

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
        <p className="text-sm font-semibold text-muted">Tap Record, say the word, tap Stop. It plays back immediately.</p>
        {status ? <p className="mt-2 rounded-2xl bg-sun px-3 py-2 text-sm font-extrabold text-sun-ink">{status}</p> : null}
        <button
          type="button"
          onClick={() => window.open(window.location.href, "_blank", "noopener")}
          className="mt-2 min-h-11 rounded-full bg-bg px-4 text-sm font-extrabold"
        >
          Open in a new tab to use the mic
        </button>
        <ul className="mt-2 grid gap-2">
          {words.map((item) => {
            const hasClip = recorded.includes(item.id);
            const live = recordingId === item.id;
            return (
              <li key={item.id} className="flex items-center gap-2 rounded-2xl bg-bg px-3 py-2">
                <img src={item.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
                <span className="flex-1 font-extrabold capitalize">{item.name}</span>
                {hasClip && !live ? <span className="text-xs font-extrabold text-leaf">Saved</span> : null}
                <button
                  type="button"
                  onClick={() => {
                    void playClip(languageId, item.id).then((result) => {
                      if (result === "played") setStatus(`Playing your recording of ${item.name}.`);
                      else if (result === "missing") setStatus("Nothing is saved for this word yet.");
                      else setStatus("The clip is saved, but playback was blocked.");
                    });
                  }}
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
                <label className="min-h-10 cursor-pointer rounded-full bg-card px-3 py-2 text-sm font-extrabold">
                  File
                  <input
                    type="file"
                    accept="audio/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      void saveChosenFile(item.id, file);
                      event.target.value = "";
                    }}
                  />
                </label>
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
