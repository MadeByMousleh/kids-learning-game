export function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.82;
  utterance.pitch = 1.08;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((voice) => voice.lang.startsWith("en") && /female|samantha|google us/i.test(voice.name));
  const english = preferred ?? voices.find((voice) => voice.lang.startsWith("en"));
  if (english) utterance.voice = english;
  window.speechSynthesis.speak(utterance);
}

export function warmVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
}
