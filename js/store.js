// Everything the learner owns lives in localStorage on this device. Export/import moves it between devices.

const KEY = 'michi.v1';
const DEFAULT_SETTINGS = {
  dailyNew: 15,
  furigana: 'on', // on | tap | off
  romaji: true, // show romaji under kana in early lessons & reviews of kana-only words
  autoAudio: true,
  rate: 0.9,
  voice: '',
  reverseVocab: false, // also make English -> Japanese cards
  theme: 'auto', // auto | light | dark
};

function blank() {
  return {
    version: 1,
    created: Date.now(),
    settings: { ...DEFAULT_SETTINGS },
    srs: {}, // cardId -> { due, ivl, ease, reps, lapses, step }
    done: {}, // lessonId -> timestamp completed
    days: {}, // 'YYYY-MM-DD' -> { reviews, correct, learned, minutes }
    quiz: {}, // passage/unit id -> best score
  };
}

let state = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.version === 1) {
      s.settings = { ...DEFAULT_SETTINGS, ...s.settings };
      for (const k of ['srs', 'done', 'days', 'quiz']) s[k] ||= {};
      return s;
    }
  } catch { /* corrupt or missing: start fresh */ }
  return blank();
}

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 150);
}
export function flush() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    alert('Could not save progress — device storage may be full. Export a backup from Settings.');
  }
}
addEventListener('pagehide', flush);
addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());

export const S = () => state;
export const settings = () => state.settings;
export function setSetting(k, v) {
  state.settings[k] = v;
  save();
}

// Learning "day" rolls over at 4am local time so late-night study counts for the day you're still in.
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dayKey = (t = Date.now()) => fmt(new Date(t - 4 * 3600e3));
export function today() {
  const k = dayKey();
  return (state.days[k] ||= { reviews: 0, correct: 0, learned: 0 });
}

export function streak() {
  const d = new Date(Date.now() - 4 * 3600e3);
  d.setHours(12, 0, 0, 0);
  // Today doesn't break the streak until it's over.
  if (!active(fmt(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (active(fmt(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
const active = (k) => {
  const x = state.days[k];
  return x && (x.reviews > 0 || x.learned > 0);
};

export function markDone(lessonId) {
  state.done[lessonId] = Date.now();
  save();
}

export function exportData() {
  flush();
  const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `michi-backup-${dayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function importData(text) {
  const s = JSON.parse(text);
  if (!s || s.version !== 1 || typeof s.srs !== 'object') throw new Error('Not a Michi backup file.');
  state = s;
  state.settings = { ...DEFAULT_SETTINGS, ...s.settings };
  flush();
}

export function resetAll() {
  state = blank();
  flush();
}
