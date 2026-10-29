// Spaced repetition with FSRS-5 (Free Spaced Repetition Scheduler) — the scheduler Anki uses by default.
// Each card has a stability S (days until recall probability falls to 90%) and difficulty D (1–10).
// Grades: 1 Again, 2 Hard, 3 Good, 4 Easy.
import { S, save, today, settings } from './store.js';

const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
const DECAY = -0.5;
const FACTOR = 19 / 81;
const MIN = 60e3;
const DAY = 86400e3;
const STEPS = [1, 10]; // learning steps for new cards, minutes
const RELEARN = [10];
const MAX_IVL = 36500;
export const LEECH = 8; // lapses before a card is flagged as a leech

const clampD = (d) => Math.min(10, Math.max(1, d));
const retrievability = (t, s) => Math.pow(1 + (FACTOR * t) / s, DECAY);
const initS = (g) => Math.max(0.1, W[g - 1]);
const initD = (g) => clampD(W[4] - Math.exp(W[5] * (g - 1)) + 1);

function nextD(d, g) {
  const delta = -W[6] * (g - 3);
  const damped = d + (delta * (10 - d)) / 9;
  return clampD(W[7] * initD(4) + (1 - W[7]) * damped);
}
function recallS(d, s, r, g) {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  return s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy);
}
const forgetS = (d, s, r) => Math.min(s, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)));
const shortTermS = (s, g) => s * Math.exp(W[17] * (g - 3 + W[18]));

function interval(s) {
  const r = settings().retention || 0.9;
  const ivl = (s / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
  return Math.min(MAX_IVL, Math.max(1, Math.round(ivl)));
}

// Review cards come due at 4am on their due day, so "due today" means any time today.
function dayStart(daysFromNow) {
  const d = new Date(Date.now() - 4 * 3600e3);
  d.setHours(4, 0, 0, 0);
  d.setDate(d.getDate() + daysFromNow);
  return d.getTime();
}
const fuzz = (ivl) => (ivl < 3 ? ivl : Math.max(1, Math.round(ivl * (0.95 + Math.random() * 0.1))));
const elapsedDays = (c) => (c.last ? Math.max(0, (Date.now() - c.last) / DAY) : 0);

export const card = (id) => S().srs[id];
export const isLearned = (id) => !!S().srs[id];

// Cards scheduled by the old SM-2 version of Michi: carry their interval over as stability.
export function migrate() {
  let n = 0;
  for (const c of Object.values(S().srs)) {
    if (c.s != null) continue;
    c.s = Math.max(0.5, c.ivl || STEPS[1] / 1440);
    c.d = clampD(10 - ((c.ease ?? 2.5) - 1.3) * 4);
    c.state = c.step >= 0 ? (c.ivl > 0 ? 'relearning' : 'learning') : 'review';
    delete c.ease;
    n++;
  }
  if (n) save();
}

// A lesson already taught + quizzed the item, so it starts as if answered "Good" once, 10 minutes ago.
export function introduce(ids) {
  const srs = S().srs;
  let n = 0;
  for (const id of ids) {
    if (srs[id]) continue;
    srs[id] = { s: initS(3), d: initD(3), state: 'learning', step: 1, due: Date.now() + STEPS[1] * MIN, ivl: 0, reps: 0, lapses: 0, added: Date.now(), last: Date.now() };
    n++;
  }
  today().learned += n;
  save();
  return n;
}

// For placement: items you already know start as mature review cards, spread out so they don't all come due at once.
export function markKnown(ids, minDays = 7, maxDays = 60) {
  const srs = S().srs;
  ids.forEach((id, i) => {
    if (srs[id]) return;
    const ivl = Math.round(minDays + ((maxDays - minDays) * i) / Math.max(1, ids.length - 1));
    srs[id] = { s: ivl, d: 4, state: 'review', step: -1, due: dayStart(ivl), ivl, reps: 1, lapses: 0, added: Date.now(), last: Date.now(), known: true };
  });
  save();
}

// Bring a card back for relearning now (e.g. it was missed in an exam).
export function relearn(id) {
  const c = S().srs[id];
  if (!c) return;
  c.due = Date.now();
  save();
}

function next(c, g, randomize = true) {
  const f = randomize ? fuzz : (x) => x;
  const t = elapsedDays(c);
  const sameDay = t < 0.5;
  const r = c.state === 'review' || !sameDay ? retrievability(t, c.s) : 1;
  const d = nextD(c.d, g);
  if (c.state === 'learning' || c.state === 'relearning') {
    const steps = c.state === 'learning' ? STEPS : RELEARN;
    const s = sameDay ? shortTermS(c.s, g) : g === 1 ? forgetS(c.d, c.s, r) : recallS(c.d, c.s, r, g);
    if (g === 1) return { ...c, s, d, step: 0, due: Date.now() + steps[0] * MIN, days: steps[0] / 1440 };
    if (g === 2) {
      const mins = c.step === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[Math.min(c.step, steps.length - 1)];
      return { ...c, s, d, due: Date.now() + mins * MIN, days: mins / 1440 };
    }
    if (g === 3 && c.step + 1 < steps.length) {
      const mins = steps[c.step + 1];
      return { ...c, s, d, step: c.step + 1, due: Date.now() + mins * MIN, days: mins / 1440 };
    }
    const ivl = f(Math.max(1, interval(s) + (g === 4 ? 1 : 0)));
    return { ...c, s, d, state: 'review', step: -1, ivl, due: dayStart(ivl), days: ivl };
  }
  // Review card.
  if (g === 1) {
    const s = forgetS(c.d, c.s, r);
    return { ...c, s, d, state: 'relearning', step: 0, lapses: c.lapses + 1, due: Date.now() + RELEARN[0] * MIN, days: RELEARN[0] / 1440 };
  }
  const s = sameDay ? shortTermS(c.s, g) : recallS(c.d, c.s, r, g);
  let ivl = interval(s);
  // Keep Hard ≤ Good ≤ Easy and always move forward.
  if (g === 2) ivl = Math.min(ivl, Math.max(1, Math.round(interval(recallS(c.d, c.s, r, 3)))));
  if (g === 3) ivl = Math.max(ivl, (c.ivl || 0) + 1);
  if (g === 4) ivl = Math.max(ivl, Math.round(interval(recallS(c.d, c.s, r, 3))) + 1);
  ivl = f(ivl);
  return { ...c, s, d, ivl, due: dayStart(ivl), days: ivl };
}

// What each grade would do, without changing anything (for the button labels).
export const preview = (c) => [1, 2, 3, 4].map((g) => next(c, g, false));

export function answer(id, grade) {
  const srs = S().srs;
  const c = srs[id];
  if (!c) return null;
  const n = next(c, grade);
  delete n.days;
  n.reps = (c.reps || 0) + 1;
  n.last = Date.now();
  if (n.lapses >= LEECH) n.leech = true;
  srs[id] = n;
  const t = today();
  t.reviews++;
  if (grade > 1) t.correct++;
  save();
  return { leechNow: n.leech && !c.leech };
}

// Ids due now; learning cards due within `ahead` ms count too (so a session doesn't end with cards 30s away).
export function dueIds(ahead = 0) {
  const now = Date.now() + ahead;
  return Object.entries(S().srs).filter(([, c]) => c.due <= now).sort((a, b) => a[1].due - b[1].due).map(([id]) => id);
}

export function dueCount() {
  const now = Date.now();
  let n = 0;
  for (const id in S().srs) if (S().srs[id].due <= now) n++;
  return n;
}

// Cards per day over the next `days` days (index 0 = due now or later today).
export function forecast(days = 7) {
  const out = Array(days).fill(0);
  const ends = Array.from({ length: days }, (_, i) => dayStart(i + 1));
  for (const c of Object.values(S().srs)) {
    const i = ends.findIndex((e) => c.due < e);
    if (i >= 0) out[i]++;
  }
  return out;
}

// Current probability of remembering a card (0–1).
export const recall = (c) => (c ? retrievability(elapsedDays(c), c.s || 0.1) : 0);

// Strength buckets for stats, by stability.
export function stage(c) {
  if (!c) return 'new';
  if (c.state !== 'review' || c.s < 7) return 'learning';
  if (c.s < 21) return 'young';
  if (c.s < 90) return 'mature';
  return 'mastered';
}

export const leeches = () => Object.entries(S().srs).filter(([, c]) => c.leech).map(([id]) => id);
