import { playClip } from "./recordings";
import { currentLanguage } from "./settings";
import { speak } from "./speech";

export function playWord(wordId: string, spoken: string) {
  const language = currentLanguage();
  void playClip(language.id, wordId).then((result) => {
    if (result !== "played") speak(spoken, language.speechLang);
  });
}
