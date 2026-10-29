// Spaced repetition: an Anki-style SM-2 variant.
// Grades: 1 Again, 2 Hard, 3 Good, 4 Easy.
import { S, save, today } from './store.js';

const MIN = 60e3;
const DAY = 86400e3;
const STEPS = [1, 10]; // learning steps, minutes
const RELEARN = [10];
const MAX_IVL = 3650;

// Review cards come due at 4am on their due day, so "due today" means any time today.
function dayStart(daysFromNow) {
  const d = new Date(Date.now() - 4 * 3600e3);
  d.setHours(4, 0, 0, 0);
  d.setDate(d.getDate() + daysFromNow);
  return d.getTime();
}
const fuzz = (ivl) => (ivl < 3 ? ivl : Math.round(ivl * (0.95 + Math.random() * 0.1)));

export const card = (id) => S().srs[id];
export const isLearned = (id) => !!S().srs[id];

// Called when a lesson is finished: the lesson already showed + quizzed the item, so start at the 10-minute step.
export function introduce(ids) {
  const srs = S().srs;
  let n = 0;
  for (const id of ids) {
    if (srs[id]) continue;
    srs[id] = { due: Date.now() + STEPS[1] * MIN, ivl: 0, ease: 2.5, reps: 0, lapses: 0, step: 1, added: Date.now() };
    n++;
  }
  today().learned += n;
  save();
  return n;
}

// What each grade would do, without changing anything (for the button labels).
export function preview(c) {
  return [1, 2, 3, 4].map((g) => next(c, g, false));
}

function next(c, grade, randomize = true) {
  const f = randomize ? fuzz : (x) => x;
  const learning = c.step >= 0;
  const steps = c.reps === 0 || c.ivl === 0 ? STEPS : RELEARN;
  if (learning) {
    if (grade === 1) return { ...c, step: 0, due: Date.now() + steps[0] * MIN, days: steps[0] / 1440 };
    if (grade === 2) {
      const m = steps[c.step] ?? steps[steps.length - 1];
      const mins = c.step === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : m;
      return { ...c, due: Date.now() + mins * MIN, days: mins / 1440 };
    }
    if (grade === 3 && c.step + 1 < steps.length) {
      return { ...c, step: c.step + 1, due: Date.now() + steps[c.step + 1] * MIN, days: steps[c.step + 1] / 1440 };
    }
    // Graduate.
    const base = c.ivl > 0 ? c.ivl : grade === 4 ? 4 : 1;
    const ivl = grade === 4 && c.ivl > 0 ? Math.max(base + 1, Math.round(base * 1.5)) : base;
    return { ...c, step: -1, ivl, due: dayStart(ivl), days: ivl };
  }
  // Review card.
  if (grade === 1) {
    const ivl = Math.max(1, Math.round(c.ivl * 0.3));
    return { ...c, step: 0, ivl, lapses: c.lapses + 1, ease: Math.max(1.3, c.ease - 0.2), due: Date.now() + RELEARN[0] * MIN, days: RELEARN[0] / 1440 };
  }
  const overdue = Math.max(0, (Date.now() - c.due) / DAY);
  let ivl;
  let ease = c.ease;
  if (grade === 2) {
    ivl = Math.max(c.ivl + 1, c.ivl * 1.2);
    ease = Math.max(1.3, ease - 0.15);
  } else if (grade === 3) {
    ivl = Math.max(c.ivl + 1, (c.ivl + overdue / 2) * ease);
  } else {
    ivl = Math.max(c.ivl + 2, (c.ivl + overdue) * ease * 1.3);
    ease += 0.15;
  }
  ivl = Math.min(MAX_IVL, f(Math.round(ivl)));
  return { ...c, ivl, ease, due: dayStart(ivl), days: ivl };
}

export function answer(id, grade) {
  const srs = S().srs;
  const c = srs[id];
  if (!c) return;
  const n = next(c, grade);
  delete n.days;
  n.reps = c.reps + 1;
  n.last = Date.now();
  srs[id] = n;
  const t = today();
  t.reviews++;
  if (grade > 1) t.correct++;
  save();
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
  for (const c of Object.values(S().srs)) {
    for (let i = 0; i < days; i++) {
      if (c.due < dayStart(i + 1)) { out[i]++; break; }
    }
  }
  return out;
}

// Rough "strength" buckets, WaniKani-style, for stats.
export function stage(c) {
  if (!c) return 'new';
  if (c.step >= 0 || c.ivl < 7) return 'learning';
  if (c.ivl < 21) return 'young';
  if (c.ivl < 90) return 'mature';
  return 'mastered';
}
