import { create } from "zustand";

const KEY = "look-and-name-settings";

export type LanguageSet = {
  id: string;
  name: string;
  speechLang: string;
};

const DEFAULT_LANGUAGES: LanguageSet[] = [
  { id: "en", name: "English", speechLang: "en-US" },
  { id: "ar", name: "Arabic", speechLang: "ar-SA" },
  { id: "es", name: "Spanish", speechLang: "es-ES" },
];

type SettingsState = {
  languages: LanguageSet[];
  languageId: string;
  showWord: boolean;
  setLanguage: (id: string) => void;
  setShowWord: (value: boolean) => void;
  addLanguage: (name: string) => LanguageSet;
  resetProgressFlag: number;
  bumpReset: () => void;
};

function slug(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `lang-${Date.now()}`;
}

function read(): Pick<SettingsState, "languages" | "languageId" | "showWord"> {
  if (typeof window === "undefined") {
    return { languages: DEFAULT_LANGUAGES, languageId: "en", showWord: false };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { languages: DEFAULT_LANGUAGES, languageId: "en", showWord: false };
    const parsed = JSON.parse(raw) as Partial<Pick<SettingsState, "languages" | "languageId" | "showWord">>;
    const languages = parsed.languages?.length ? parsed.languages : DEFAULT_LANGUAGES;
    const languageId = languages.some((item) => item.id === parsed.languageId) ? parsed.languageId! : languages[0].id;
    return { languages, languageId, showWord: parsed.showWord === true };
  } catch {
    return { languages: DEFAULT_LANGUAGES, languageId: "en", showWord: false };
  }
}

function persist(state: Pick<SettingsState, "languages" | "languageId" | "showWord">) {
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export const useSettings = create<SettingsState>((set, get) => ({
  languages: DEFAULT_LANGUAGES,
  languageId: "en",
  showWord: false,
  resetProgressFlag: 0,
  setLanguage: (id) => {
    persist({ languages: get().languages, languageId: id, showWord: get().showWord });
    set({ languageId: id });
  },
  setShowWord: (value) => {
    persist({ languages: get().languages, languageId: get().languageId, showWord: value });
    set({ showWord: value });
  },
  addLanguage: (name) => {
    const trimmed = name.trim();
    const existing = get().languages.find((item) => item.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      get().setLanguage(existing.id);
      return existing;
    }
    const created: LanguageSet = { id: slug(trimmed), name: trimmed, speechLang: "en-US" };
    const languages = [...get().languages, created];
    persist({ languages, languageId: created.id, showWord: get().showWord });
    set({ languages, languageId: created.id });
    return created;
  },
  bumpReset: () => set({ resetProgressFlag: get().resetProgressFlag + 1 }),
}));

export function hydrateSettings() {
  useSettings.setState(read());
}

export function currentLanguage() {
  const state = useSettings.getState();
  return state.languages.find((item) => item.id === state.languageId) ?? state.languages[0];
}
