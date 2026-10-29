// Japanese text-to-speech using the device's built-in voices (works offline once the OS voice is installed).
import { settings } from './store.js';
import { plain } from './util.js';

let voices = [];
function refresh() {
  voices = (speechSynthesis?.getVoices() || []).filter((v) => /^ja/i.test(v.lang));
}
if ('speechSynthesis' in window) {
  refresh();
  speechSynthesis.addEventListener?.('voiceschanged', refresh);
}

export const available = () => 'speechSynthesis' in window;
export const japaneseVoices = () => voices;

function pick() {
  const want = settings().voice;
  return (
    voices.find((v) => v.name === want) ||
    voices.find((v) => v.localService && /kyoko|o-ren|otoya|haruka|ayumi|nanami|google/i.test(v.name)) ||
    voices.find((v) => v.localService) ||
    voices[0]
  );
}

export function speak(text, { rate } = {}) {
  if (!available()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(plain(text));
  u.lang = 'ja-JP';
  const v = pick();
  if (v) u.voice = v;
  u.rate = rate ?? settings().rate;
  speechSynthesis.speak(u);
}

// Reads several sentences in a row; onIndex(i) fires as each starts and onIndex(-1) at the end.
export function speakAll(texts, onIndex = () => {}) {
  if (!available()) return;
  speechSynthesis.cancel();
  const v = pick();
  texts.forEach((t, i) => {
    const u = new SpeechSynthesisUtterance(plain(t));
    u.lang = 'ja-JP';
    if (v) u.voice = v;
    u.rate = settings().rate;
    u.onstart = () => onIndex(i);
    if (i === texts.length - 1) u.onend = () => onIndex(-1);
    speechSynthesis.speak(u);
  });
}

export const stop = () => available() && speechSynthesis.cancel();
