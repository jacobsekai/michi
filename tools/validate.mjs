#!/usr/bin/env node
// Validates Michi content JSON files against content/SCHEMA.md.
// Usage: node tools/validate.mjs content/grammar-n5.json [more files...]
import fs from 'node:fs';
import path from 'node:path';

const KANJI = '\\u4E00-\\u9FFF\\u3400-\\u4DBF々〆ヶヵ';
const RUN = new RegExp(`[0-9０-９${KANJI}]+\\[([^\\]]*)\\]`, 'g');
const BARE_KANJI = new RegExp(`[${KANJI.replace('ヶヵ', '')}]`);
const READING_OK = /^[ぁ-ゖー・]+$/;

let errors = 0;
let warnings = 0;
const err = (where, msg) => { errors++; console.log(`ERROR  ${where}: ${msg}`); };
const warn = (where, msg) => { warnings++; console.log(`warn   ${where}: ${msg}`); };

function checkJp(where, s, { prose = false } = {}) {
  if (typeof s !== 'string') return err(where, 'expected string');
  const chunks = prose ? [...s.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]) : [s];
  if (prose) {
    const outside = s.replace(/\{[^}]*\}/g, '');
    if (BARE_KANJI.test(outside)) err(where, `kanji outside {…} in prose: ${outside.match(BARE_KANJI)[0]} in "${s.slice(0, 80)}"`);
    if (/[ぁ-ゖァ-ヺ]/.test(outside)) warn(where, `kana outside {…} in prose: "${outside.match(/[ぁ-ゖァ-ヺ]+/)[0]}"`);
  }
  for (const c of chunks) {
    for (const m of c.matchAll(RUN)) {
      if (!READING_OK.test(m[1])) err(where, `bad reading [${m[1]}] in "${c}"`);
    }
    const stripped = c.replace(RUN, '');
    const bare = stripped.match(BARE_KANJI);
    if (bare) err(where, `kanji without reading: "${bare[0]}" in "${c}"`);
    if (/\[[^\]]*\]/.test(stripped)) err(where, `bracket not attached to kanji in "${c}"`);
  }
}

const need = (where, obj, keys) => {
  for (const k of keys) if (obj[k] === undefined || obj[k] === '') err(where, `missing "${k}"`);
};

function checkQuiz(where, q, { blank }) {
  need(where, q, ['q', 'choices', 'answer']);
  if (blank) {
    checkJp(`${where}.q`, q.q || '');
    const n = (q.q || '').split('＿＿').length - 1;
    if (n !== 1) err(where, `quiz q must contain exactly one ＿＿ (found ${n})`);
    q.choices?.forEach((c, i) => checkJp(`${where}.choices[${i}]`, c));
  }
  if (!Array.isArray(q.choices) || q.choices.length !== 4) err(where, 'choices must have 4 items');
  if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4)) err(where, 'answer must be 0..3');
  if (new Set(q.choices).size !== q.choices?.length) err(where, 'duplicate choices');
}

const ids = new Set();
const uniq = (where, id) => {
  if (!id) return err(where, 'missing id');
  if (ids.has(id)) err(where, `duplicate id ${id}`);
  ids.add(id);
};

function validateGrammar(d, f) {
  if (!/^N[1-5]$/.test(d.level)) err(f, 'level must be N1..N5');
  let points = 0;
  for (const [ui, u] of (d.units || []).entries()) {
    const uw = `${f} unit[${ui}] ${u.id}`;
    uniq(uw, u.id);
    need(uw, u, ['title', 'summary', 'points']);
    checkJp(`${uw}.summary`, u.summary || '', { prose: true });
    for (const p of u.points || []) {
      points++;
      const pw = `${f} ${p.id}`;
      uniq(pw, p.id);
      need(pw, p, ['title', 'meaning', 'structure', 'explanation', 'examples', 'quiz']);
      checkJp(`${pw}.title`, p.title || '');
      checkJp(`${pw}.structure`, p.structure || '');
      checkJp(`${pw}.explanation`, p.explanation || '', { prose: true });
      if (p.notes) checkJp(`${pw}.notes`, p.notes, { prose: true });
      if (!(p.examples?.length >= 3)) warn(pw, `only ${p.examples?.length || 0} examples`);
      p.examples?.forEach((e, i) => { need(`${pw}.ex[${i}]`, e, ['jp', 'en']); checkJp(`${pw}.ex[${i}]`, e.jp || ''); });
      if (!(p.quiz?.length >= 2)) warn(pw, `only ${p.quiz?.length || 0} quiz items`);
      p.quiz?.forEach((q, i) => checkQuiz(`${pw}.quiz[${i}]`, q, { blank: true }));
    }
  }
  console.log(`${f}: ${d.units?.length || 0} units, ${points} points`);
}

function validateReading(d, f) {
  for (const p of d.passages || []) {
    const pw = `${f} ${p.id}`;
    uniq(pw, p.id);
    need(pw, p, ['level', 'title', 'titleJp', 'sentences', 'questions']);
    checkJp(`${pw}.titleJp`, p.titleJp || '');
    p.sentences?.forEach((s, i) => { need(`${pw}.s[${i}]`, s, ['jp', 'en']); checkJp(`${pw}.s[${i}]`, s.jp || ''); });
    p.questions?.forEach((q, i) => checkQuiz(`${pw}.q[${i}]`, q, { blank: false }));
  }
  console.log(`${f}: ${d.passages?.length || 0} passages`);
}

function validateLife(d, f) {
  for (const u of d.units || []) {
    const uw = `${f} ${u.id}`;
    uniq(uw, u.id);
    need(uw, u, ['title', 'level', 'intro', 'phrases']);
    checkJp(`${uw}.intro`, u.intro || '', { prose: true });
    for (const k of ['phrases', 'vocab', 'dialogue']) {
      u[k]?.forEach((p, i) => {
        need(`${uw}.${k}[${i}]`, p, ['jp', 'en']);
        checkJp(`${uw}.${k}[${i}]`, p.jp || '');
        if (p.note) checkJp(`${uw}.${k}[${i}].note`, p.note, { prose: true });
      });
    }
    u.tips?.forEach((t, i) => checkJp(`${uw}.tips[${i}]`, t, { prose: true }));
  }
  console.log(`${f}: ${d.units?.length || 0} units`);
}

for (const f of process.argv.slice(2)) {
  let d;
  try {
    d = JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    err(f, `invalid JSON: ${e.message}`);
    continue;
  }
  const base = path.basename(f);
  if (base.startsWith('grammar-')) validateGrammar(d, base);
  else if (base.startsWith('reading')) validateReading(d, base);
  else if (base.startsWith('life')) validateLife(d, base);
  else err(f, 'unknown content file type (expected grammar-*, reading*, life*)');
}
console.log(`\n${errors} errors, ${warnings} warnings`);
process.exit(errors ? 1 : 0);
