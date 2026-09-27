const DB_NAME = "look-and-name-voices";
const STORE = "clips";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function key(languageId: string, wordId: string) {
  return `${languageId}:${wordId}`;
}

export async function saveRecording(languageId: string, wordId: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key(languageId, wordId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteRecording(languageId: string, wordId: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key(languageId, wordId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadRecording(languageId: string, wordId: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(key(languageId, wordId));
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

export async function listRecordedIds(languageId: string): Promise<string[]> {
  const db = await openDb();
  const ids = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAllKeys();
    request.onsuccess = () => {
      const prefix = `${languageId}:`;
      resolve(
        (request.result as IDBValidKey[])
          .map(String)
          .filter((item) => item.startsWith(prefix))
          .map((item) => item.slice(prefix.length)),
      );
    };
    request.onerror = () => reject(request.error);
  });
  db.close();
  return ids;
}

let currentAudio: HTMLAudioElement | null = null;

export async function playRecording(languageId: string, wordId: string): Promise<boolean> {
  const blob = await loadRecording(languageId, wordId);
  if (!blob) return false;
  if (currentAudio) {
    currentAudio.pause();
    URL.revokeObjectURL(currentAudio.src);
  }
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  audio.onended = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  };
  await audio.play().catch(() => undefined);
  return true;
}
