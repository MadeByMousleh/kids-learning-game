import { playRecording } from "./recordings";
import { currentLanguage } from "./settings";
import { speak } from "./speech";

export async function playWord(wordId: string, spoken: string) {
  const language = currentLanguage();
  const played = await playRecording(language.id, wordId);
  if (!played) speak(spoken, language.speechLang);
}
