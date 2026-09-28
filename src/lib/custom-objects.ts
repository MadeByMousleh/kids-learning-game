import { create } from "zustand";
import type { EverydayObject } from "./objects";

const KEY = "look-and-name-custom-objects";

export type CustomObject = {
  id: string;
  name: string;
  image: string;
};

type CustomState = {
  items: CustomObject[];
  add: (item: CustomObject) => void;
  remove: (id: string) => void;
};

function read(): CustomObject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomObject[];
    return Array.isArray(parsed) ? parsed.filter((item) => item.id && item.name && item.image) : [];
  } catch {
    return [];
  }
}

function write(items: CustomObject[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export const useCustomObjects = create<CustomState>((set, get) => ({
  items: [],
  add: (item) => {
    const items = [...get().items.filter((entry) => entry.id !== item.id), item];
    write(items);
    set({ items });
  },
  remove: (id) => {
    const items = get().items.filter((entry) => entry.id !== id);
    write(items);
    set({ items });
  },
}));

export function hydrateCustomObjects() {
  useCustomObjects.setState({ items: read() });
}

export function asEveryday(item: CustomObject): EverydayObject {
  const name = item.name.trim();
  return { id: item.id, name, image: item.image, praise: `Yes! ${name}.` };
}

export function shrinkImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const max = 480;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that picture."));
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that picture."));
    };
    image.src = url;
  });
}
