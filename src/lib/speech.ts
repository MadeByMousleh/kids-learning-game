export function speak(text: string, lang = "en-US") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.82;
  utterance.pitch = 1.08;
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang.slice(0, 2).toLowerCase();
  const match =
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix) && /female|samantha|google/i.test(voice.name)) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix));
  if (match) utterance.voice = match;
  window.speechSynthesis.speak(utterance);
}

export function warmVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
}

let shared: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!shared) shared = new AudioCtx();
  if (shared.state === "suspended") void shared.resume();
  return shared;
}

export function pop() {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

export function cheer() {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const now = ctx.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03 + i * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28 + i * 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.07);
    osc.stop(now + 0.35 + i * 0.08);
  });
  window.setTimeout(() => void ctx.close(), 700);
}
