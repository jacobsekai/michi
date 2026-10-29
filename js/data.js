// Loads all course data once and builds the learning path + lookup indexes.
import { KANA_GROUPS, KANA_BY_ID } from './kana.js';
import { FOUNDATIONS, STAGE_INFO } from './foundations.js';

export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const D = {
  vocab: {}, // level -> [{ id, w, r, m, alt, level }]
  kanji: [], // [{ c, l, m, on, kun, s, g, f }]
  grammar: {}, // level -> { units: [...] }
  reading: [],
  life: [],
  index: { vocab: new Map(), kanji: new Map(), grammarPoint: new Map(), lifeUnit: new Map(), node: new Map() },
  path: [],
};

const getJSON = (url, fallback) => fetch(url).then((r) => (r.ok ? r.json() : fallback)).catch(() => fallback);

export async function loadAll() {
  const [kanji, reading, life, ...rest] = await Promise.all([
    getJSON('data/kanji.json', []),
    getJSON('data/reading.json', { passages: [] }),
    getJSON('data/life.json', { units: [] }),
    ...LEVELS.map((l) => getJSON(`data/vocab-${l.toLowerCase()}.json`, [])),
    ...LEVELS.map((l) => getJSON(`data/grammar-${l.toLowerCase()}.json`, { units: [] })),
  ]);
  D.kanji = kanji;
  for (const k of kanji) D.index.kanji.set(k.c, k);
  LEVELS.forEach((l, i) => {
    D.vocab[l] = rest[i].map(([w, r, m, alt]) => ({ id: `v:${w}|${r}`, w, r, m, alt, level: l }));
    for (const v of D.vocab[l]) D.index.vocab.set(v.id, v);
    D.grammar[l] = rest[LEVELS.length + i];
    for (const u of D.grammar[l].units) for (const p of u.points) D.index.grammarPoint.set(p.id, { ...p, unit: u, level: l });
  });
  D.reading = reading.passages;
  D.life = life.units;
  for (const u of D.life) D.index.lifeUnit.set(u.id, u);
  buildPath();
}

// ---- path ---------------------------------------------------------------------

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const KANJI_RE = /[一-鿿々]/g;

// Example words for a kanji, easiest levels first.
export function wordsWithKanji(c, limit = 4) {
  const out = [];
  for (const l of LEVELS) {
    for (const v of D.vocab[l]) {
      if (v.w.includes(c)) out.push(v);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

function levelNodes(level) {
  const lvl = level.toLowerCase();
  const kanjiOrder = new Map(D.kanji.map((k, i) => [k.c, i]));
  const levelKanji = D.kanji.filter((k) => `N${k.l}` === level);
  const kSize = level === 'N5' || level === 'N4' ? 6 : 10;
  const vSize = level === 'N5' || level === 'N4' ? 10 : 15;

  // Words become "ready" once the kanji they use have been taught, so sort vocab by its hardest kanji.
  const readiness = (v) => Math.max(-1, ...(v.w.match(KANJI_RE) || []).map((c) => kanjiOrder.get(c) ?? 99999));
  const vocab = D.vocab[level].map((v, i) => ({ v, i, r: readiness(v) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.v);

  const lists = {
    kanji: chunk(levelKanji, kSize).map((ks, i, all) => ({
      id: `${lvl}-kanji-${i + 1}`, type: 'kanji', level, title: `Kanji ${i + 1}`, sub: ks.map((k) => k.c).join(' '),
      items: ks.map((k) => `j:${k.c}`), pos: i / all.length, order: 0,
    })),
    vocab: chunk(vocab, vSize).map((vs, i, all) => ({
      id: `${lvl}-vocab-${i + 1}`, type: 'vocab', level, title: `Vocabulary ${i + 1}`, sub: vs.slice(0, 4).map((v) => v.w).join('、') + '…',
      items: vs.map((v) => v.id), pos: (i + 0.5) / all.length, order: 1,
    })),
    grammar: D.grammar[level].units.map((u, i, all) => ({
      id: `${lvl}-grammar-${u.id}`, type: 'grammar', level, title: u.title, sub: u.points.map((p) => p.title).slice(0, 4).join(' · '),
      unit: u, items: u.points.flatMap((p) => p.quiz.map((_, qi) => `g:${p.id}#${qi}`)), pos: i / all.length, order: 2,
    })),
    reading: D.reading.filter((p) => p.level === level).map((p, i, all) => ({
      id: `${lvl}-reading-${p.id}`, type: 'reading', level, title: `Reading: ${p.title}`, sub: p.titleJp, passage: p, items: [], pos: (i + 1) / all.length, order: 3,
    })),
  };
  const nodes = Object.values(lists).flat().sort((a, b) => a.pos - b.pos || a.order - b.order);
  if (level === 'N5') nodes.unshift(foundationNode(FOUNDATIONS.kanji, level));
  return nodes;
}

const foundationNode = (f, stage) => ({ id: f.id, type: 'foundation', level: stage, title: f.title, sub: f.sub, lesson: f, items: [] });

function kanaNodes(script) {
  return KANA_GROUPS[script].map((g, i) => ({
    id: `kana-${script}-${i + 1}`, type: 'kana', script, level: script === 'h' ? 'hira' : 'kata',
    title: `${script === 'h' ? 'Hiragana' : 'Katakana'}: ${g.title}`, sub: g.items.map((k) => k.kana).join(' '),
    items: g.items.map((k) => k.id), group: g,
  }));
}

function buildPath() {
  const stages = [
    { id: 'start', nodes: [FOUNDATIONS.welcome, FOUNDATIONS.howItWorks, FOUNDATIONS.sounds, FOUNDATIONS.scripts].map((f) => foundationNode(f, 'start')) },
    { id: 'hira', nodes: kanaNodes('h') },
    { id: 'kata', nodes: kanaNodes('k') },
    ...LEVELS.map((l) => ({ id: l, nodes: levelNodes(l) })),
    { id: 'beyond', nodes: [foundationNode(FOUNDATIONS.beyond, 'beyond')] },
  ];
  for (const s of stages) Object.assign(s, STAGE_INFO[s.id]);
  D.path = stages;
  D.index.node.clear();
  for (const s of stages) for (const n of s.nodes) D.index.node.set(n.id, { ...n, stage: s.id });
  for (const s of stages) s.nodes = s.nodes.map((n) => D.index.node.get(n.id));
}

// ---- card lookup ----------------------------------------------------------------

// Returns a normalized description of any card id, or null if its content no longer exists.
export function cardInfo(id) {
  const [kind, rest] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)];
  switch (kind) {
    case 'h':
    case 'k': {
      const k = KANA_BY_ID[id];
      return k && { kind: 'kana', id, kana: k.kana, romaji: k.romaji, script: kind };
    }
    case 'v':
    case 'w': {
      const v = D.index.vocab.get(`v:${rest}`);
      return v && { kind: kind === 'v' ? 'vocab' : 'vocab-rev', id, v };
    }
    case 'j': {
      const k = D.index.kanji.get(rest);
      return k && { kind: 'kanji', id, k };
    }
    case 'g': {
      const [pid, qi] = rest.split('#');
      const p = D.index.grammarPoint.get(pid);
      const q = p?.quiz[+qi];
      return q && { kind: 'grammar', id, p, q };
    }
    case 'p': {
      const [uid, i] = rest.split('#');
      const u = D.index.lifeUnit.get(uid);
      const ph = u?.phrases?.[+i];
      return ph && { kind: 'phrase', id, u, ph };
    }
    default:
      return null;
  }
}

export const allNodes = () => D.path.flatMap((s) => s.nodes);
