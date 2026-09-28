const STORAGE_KEY = "look-and-name-clips";

function key(languageId: string, wordId: string) {
  return `${languageId}:${wordId}`;
}

function readAll(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const memory = new Map<string, Blob>();

export async function saveRecording(languageId: string, wordId: string, blob: Blob) {
  if (!blob.size) throw new Error("The recording was empty.");
  memory.set(key(languageId, wordId), blob);
  const dataUrl = await blobToDataUrl(blob);
  const all = readAll();
  all[key(languageId, wordId)] = dataUrl;
  writeAll(all);
}

export async function deleteRecording(languageId: string, wordId: string) {
  memory.delete(key(languageId, wordId));
  const all = readAll();
  delete all[key(languageId, wordId)];
  writeAll(all);
}

export async function deleteWordRecordings(wordId: string) {
  const all = readAll();
  for (const item of Object.keys(all)) {
    if (item.endsWith(`:${wordId}`)) {
      memory.delete(item);
      delete all[item];
    }
  }
  writeAll(all);
}

export async function listRecordedIds(languageId: string): Promise<string[]> {
  const prefix = `${languageId}:`;
  return Object.keys(readAll())
    .filter((item) => item.startsWith(prefix))
    .map((item) => item.slice(prefix.length));
}

let player: HTMLAudioElement | null = null;

function clipSource(languageId: string, wordId: string) {
  const id = key(languageId, wordId);
  const blob = memory.get(id);
  if (blob) return URL.createObjectURL(blob);
  const dataUrl = readAll()[id];
  if (!dataUrl) return null;
  const comma = dataUrl.indexOf(",");
  const mime = /data:([^;,]+)/.exec(dataUrl)?.[1] ?? "audio/webm";
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

let cheerBusy = false;

export function playClipIfIdle(languageId: string, wordId: string) {
  if (cheerBusy) return;
  const src = clipSource(languageId, wordId);
  if (!src) return;
  cheerBusy = true;
  const audio = new Audio(src);
  audio.volume = 1;
  audio.muted = false;
  const done = () => {
    cheerBusy = false;
  };
  audio.addEventListener("ended", done, { once: true });
  audio.addEventListener("error", done, { once: true });
  audio.play().then(() => undefined, done);
}

export async function playClip(languageId: string, wordId: string): Promise<"played" | "missing" | "failed"> {
  const src = clipSource(languageId, wordId);
  if (!src) return "missing";
  if (player) {
    player.pause();
    player.src = "";
  }
  player = new Audio(src);
  player.volume = 1;
  player.muted = false;
  try {
    await player.play();
    return "played";
  } catch {
    return "failed";
  }
}

export async function clipPeak(blob: Blob) {
  const ctx = new AudioContext();
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    let peak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      const step = Math.max(1, Math.floor(data.length / 8000));
      for (let i = 0; i < data.length; i += step) peak = Math.max(peak, Math.abs(data[i]));
    }
    return peak;
  } finally {
    void ctx.close();
  }
}
