import { useEffect, useRef, useState } from "react";
import { hydrateCustomObjects, shrinkImage, useCustomObjects } from "@/lib/custom-objects";
import { clipPeak, deleteWordRecordings, playClip, saveRecording } from "@/lib/recordings";
import { hydrateSettings, useSettings } from "@/lib/settings";

export function YourPictures() {
  const items = useCustomObjects((state) => state.items);
  const add = useCustomObjects((state) => state.add);
  const remove = useCustomObjects((state) => state.remove);
  const languageId = useSettings((state) => state.languageId);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [draftId, setDraftId] = useState("");
  const [recording, setRecording] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const [status, setStatus] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    hydrateCustomObjects();
    hydrateSettings();
  }, []);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setStatus("Reading the picture…");
    try {
      const next = await shrinkImage(file);
      setImage(next);
      setDraftId(`custom-${crypto.randomUUID()}`);
      setHasVoice(false);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not use that picture.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
  }

  async function record() {
    const word = name.trim();
    if (!image || !word || !draftId) {
      setStatus("Add a picture and a word first.");
      return;
    }
    if (recording) {
      stopRecording();
      return;
    }
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
      setRecording(true);
      setStatus("Say the word, then tap Stop.");
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        setRecording(false);
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
          await saveRecording(languageId, draftId, blob);
          add({ id: draftId, name: word, image });
          setHasVoice(true);
          const audio = new Audio(URL.createObjectURL(blob));
          audio.volume = 1;
          try {
            await audio.play();
            setStatus("Saved. Playing your voice.");
          } catch {
            setStatus("Saved. Playback was blocked, but the voice is stored.");
          }
        })();
      };
      recorder.start();
      window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 4000);
    } catch (error) {
      setRecording(false);
      const message = error instanceof Error ? error.message : "Could not start the microphone.";
      setStatus(/denied|not allowed|permission|policy/i.test(message) ? "The mic was blocked. Allow it, then record again." : message);
    }
  }

  function addWithoutVoice() {
    const word = name.trim();
    if (!image || !word || !draftId) {
      setStatus("Add a picture and a word first.");
      return;
    }
    add({ id: draftId, name: word, image });
    setStatus("Added. Record a voice so the game says it your way.");
  }

  function resetDraft() {
    stopRecording();
    setName("");
    setImage("");
    setDraftId("");
    setHasVoice(false);
    setStatus("");
  }

  return (
    <section className="rounded-[1.75rem] bg-card p-5">
      <h2 className="text-3xl font-extrabold text-ink">Your pictures</h2>
      <p className="mt-1 font-semibold text-muted">Add a photo to Everyday objects, then record the word.</p>

      <label className="mt-4 flex min-h-14 cursor-pointer items-center justify-center rounded-full bg-sun px-4 text-lg font-extrabold text-sun-ink">
        Choose a picture
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            void onPhoto(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>

      {image ? <img src={image} alt="" className="mt-4 aspect-square w-full rounded-3xl object-cover" /> : null}

      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="What is it?"
        className="mt-4 min-h-14 w-full rounded-full border border-line bg-bg px-5 text-lg font-extrabold"
      />

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => void record()} className={`min-h-14 flex-1 rounded-full text-lg font-extrabold ${recording ? "bg-coral text-coral-ink" : "bg-ink text-card"}`}>
          {recording ? "Stop" : hasVoice ? "Record again" : "Record voice"}
        </button>
        <button type="button" onClick={addWithoutVoice} className="min-h-14 rounded-full bg-bg px-4 font-extrabold text-ink">
          Add
        </button>
      </div>
      {status ? <p className="mt-3 text-sm font-extrabold text-ink">{status}</p> : null}
      {image ? (
        <button type="button" onClick={resetDraft} className="mt-2 text-sm font-extrabold text-muted">
          Clear this one
        </button>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-5 grid gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-bg px-3 py-2">
              <img src={item.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
              <span className="flex-1 font-extrabold capitalize">{item.name}</span>
              <button
                type="button"
                onClick={() => {
                  void playClip(languageId, item.id).then((result) => {
                    setStatus(result === "played" ? `Playing ${item.name}.` : "No voice yet. Record it above or in Voice.");
                  });
                }}
                className="min-h-10 rounded-full bg-card px-3 text-sm font-extrabold"
              >
                Play
              </button>
              <button
                type="button"
                onClick={() => {
                  void deleteWordRecordings(item.id);
                  remove(item.id);
                }}
                className="min-h-10 rounded-full px-3 text-sm font-extrabold text-muted"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
