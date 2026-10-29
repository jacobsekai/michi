// Shared UI pieces: audio buttons, quizzes, info blocks for words/kanji/grammar.
import { html, raw, esc, ruby, wordRuby, prose, shuffle, isTyping } from './util.js';
import { S, settings, save } from './store.js';
import { speak } from './tts.js';
import { attachIme } from './ime.js';
import { D, LEVELS, wordsWithKanji, examplesFor } from './data.js';
import { toRomaji, HINTS } from './kana.js';
import { card, stage, LEECH } from './srs.js';

export const furi = (s) => raw(ruby(s, settings().furigana));
export const proseHtml = (s) => raw(prose(s, settings().furigana));

export const audioBtn = (text, label = 'Play audio') =>
  html`<button class="icon-btn audio" data-say="${text}" aria-label="${label}" title="${label}">${raw(ICON.speaker)}</button>`;

export const ICON = {
  speaker: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
};

// Global handlers: audio buttons and tap-to-reveal furigana.
document.addEventListener('click', (e) => {
  const say = e.target.closest('[data-say]');
  if (say) {
    e.preventDefault();
    speak(say.dataset.say);
    return;
  }
  const r = e.target.closest('ruby');
  if (r && document.body.classList.contains('furi-tap')) r.classList.toggle('show');
});

// Theme + furigana mode live on <html>/<body> so CSS can react.
export function applySettings() {
  const s = settings();
  document.documentElement.dataset.theme = s.theme;
  document.body.classList.toggle('furi-tap', s.furigana === 'tap');
}

// ---- stroke order (KanjiVG) ---------------------------------------------------------
// Any element with data-strokes="字" gets an animated stroke-order diagram; tap to replay.
let strokeData = null;
const loadStrokes = () => (strokeData ||= fetch('data/strokes.json').then((r) => r.json()).catch(() => ({})));

async function mountStrokes(el) {
  const ch = el.dataset.strokes;
  el.removeAttribute('data-strokes');
  const paths = (await loadStrokes())[ch];
  if (!paths || !el.isConnected) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 109 109');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Stroke order for ${ch}`);
  svg.innerHTML = '<path class="grid" d="M54.5 0v109M0 54.5h109"/>' +
    paths.map((d) => `<path class="ghost" d="${d}"/>`).join('') +
    paths.map((d) => `<path class="ink" d="${d}"/>`).join('');
  el.appendChild(svg);
  const label = document.createElement('div');
  label.className = 'stroke-label';
  label.textContent = `${paths.length} stroke${paths.length > 1 ? 's' : ''} · tap to replay`;
  el.appendChild(label);
  const inks = [...svg.querySelectorAll('.ink')];
  let run = 0;
  const play = async () => {
    const me = ++run;
    for (const p of inks) {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    }
    for (const p of inks) {
      if (me !== run || !el.isConnected) return;
      const len = p.getTotalLength();
      await p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: Math.max(250, len * 9), easing: 'ease-in-out', fill: 'forwards' }).finished;
      p.style.strokeDashoffset = 0;
    }
  };
  el.addEventListener('click', play);
  play();
}
new MutationObserver(() => document.querySelectorAll('[data-strokes]').forEach(mountStrokes))
  .observe(document.documentElement, { childList: true, subtree: true });

export const shortMeaning = (m, n = 3) => {
  const parts = String(m).split(/,\s*/);
  return parts.length > n ? parts.slice(0, n).join(', ') : m;
};

export function backBar(href, title) {
  return html`<div class="backbar"><a class="icon-btn" href="${href}" aria-label="Back">${raw(ICON.back)}</a><h1>${title}</h1></div>`;
}

export function statusPill(id) {
  const c = card(id);
  const s = stage(c);
  const label = { new: 'Not learned', learning: 'Learning', young: 'Young', mature: 'Mature', mastered: 'Mastered' }[s];
  return html`<span class="pill pill-${s}">${label}</span>${c?.leech ? html` <span class="pill pill-leech" title="Missed ${LEECH}+ times — add a mnemonic">Leech</span>` : ''}`;
}

// ---- pitch accent ------------------------------------------------------------------
// p = downstep position (0 = heiban/flat). Shows each mora high or low, with ꜜ where the pitch drops.
const SMALL_KANA = /[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]/;
export function morae(r) {
  const out = [];
  for (const ch of r) {
    if (SMALL_KANA.test(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}
export function pitchHtml(r, p) {
  if (p == null) return '';
  const m = morae(r);
  const high = (i) => (p === 0 ? i > 0 : p === 1 ? i === 0 : i > 0 && i < p);
  const name = p === 0 ? 'Heiban (flat)' : p === 1 ? 'Atamadaka (high start)' : p === m.length ? 'Odaka (drops after the word)' : 'Nakadaka (drops in the middle)';
  const cells = m.map((x, i) => `<span class="mora ${high(i) ? 'hi' : 'lo'}${i > 0 && high(i) !== high(i - 1) ? ' turn' : ''}">${esc(x)}</span>${p === i + 1 ? '<span class="drop">ꜜ</span>' : ''}`).join('');
  return `<span class="pitch" title="Pitch accent: ${name}">${cells}<span class="pitch-name">${name}</span></span>`;
}

// ---- example sentences (loaded lazily) ------------------------------------------------
// <div data-examples="<word id>"> gets up to `data-n` real example sentences with the word highlighted.
export const markTarget = (h) => h.replace(/⟦/g, '<mark>').replace(/⟧/g, '</mark>');
export const stripMarks = (s) => s.replace(/[⟦⟧]/g, '');
async function mountExamples(el) {
  const id = el.dataset.examples;
  el.removeAttribute('data-examples');
  const v = D.index.vocab.get(id);
  const list = (await examplesFor(v)).slice(0, +(el.dataset.n || 3));
  if (!list.length || !el.isConnected) return;
  el.innerHTML = `<h3>Example sentences</h3><ul class="examples">${list.map(([jp, en]) => `<li><div class="ex-jp jp">${markTarget(ruby(jp, settings().furigana))} ${audioBtn(stripMarks(jp)).s}</div><div class="ex-en">${esc(en)}</div></li>`).join('')}</ul>`;
}
new MutationObserver(() => document.querySelectorAll('[data-examples]').forEach(mountExamples))
  .observe(document.documentElement, { childList: true, subtree: true });

// ---- personal notes / mnemonics ------------------------------------------------------
export function noteBox(id) {
  const n = S().notes[id]?.text || '';
  return html`<details class="note-box" ${n ? 'open' : ''}><summary>${n ? 'Your note' : '+ Add a note or mnemonic'}</summary>
    <textarea data-note="${id}" rows="2" placeholder="e.g. a story that links the shape, sound and meaning">${n}</textarea></details>`;
}
document.addEventListener('input', (e) => {
  const id = e.target.dataset?.note;
  if (!id) return;
  const text = e.target.value.trim();
  if (text) S().notes[id] = { text, t: Date.now() };
  else delete S().notes[id];
  save();
});

// ---- info blocks ----------------------------------------------------------------

export function wordBlock(v, { big = true, examples = 2, notes = true } = {}) {
  const hasKanji = v.w !== v.r;
  const kanji = [...new Set(v.w.match(/[一-鿿々]/g) || [])].map((c) => D.index.kanji.get(c)).filter(Boolean);
  return html`
    <div class="word ${big ? 'big' : ''}">
      <div class="word-top">
        <div>
          ${hasKanji ? html`<div class="reading jp">${v.r}</div>` : ''}
          <div class="word-text jp">${v.w}</div>
          ${v.p != null ? html`<div class="jp">${raw(pitchHtml(v.r, v.p))}</div>` : ''}
          ${settings().romaji && !hasKanji ? html`<div class="romaji">${toRomaji(v.r)}</div>` : ''}
        </div>
        ${audioBtn(v.r)}
      </div>
      <div class="meaning">${v.m}</div>
      ${v.alt?.length ? html`<div class="muted small">Also written: <span class="jp">${v.alt.join('、')}</span></div>` : ''}
      ${kanji.length ? html`<div class="kanji-parts">${kanji.map((k) => html`<a class="kanji-chip" href="#/kanji-detail/${encodeURIComponent(k.c)}"><span class="jp">${k.c}</span><span>${k.m.slice(0, 2).join(', ')}</span></a>`)}</div>` : ''}
      <div class="tags"><span class="pill">${v.level}</span> ${statusPill(v.id)}</div>
      ${examples && !v.custom ? html`<div class="ex-host" data-examples="${v.id}" data-n="${examples}"></div>` : ''}
      ${notes ? noteBox(v.id) : ''}
    </div>`;
}

// KANJIDIC marks okurigana with a dot (く.る); show it as く(る).
export const fmtKun = (r) => r.replace(/\.(.+)$/, '($1)');

export function kanjiBlock(k) {
  const words = wordsWithKanji(k.c, 5);
  return html`
    <div class="kanji-info">
      <div class="kanji-top">
        <div class="kanji-big jp">${k.c}</div>
        <div class="strokes" data-strokes="${k.c}" title="Stroke order"></div>
        <div>
          <div class="meaning">${k.m.join(', ')}</div>
          ${k.on.length ? html`<div class="readings"><span class="label">On</span> <span class="jp">${k.on.join('、')}</span></div>` : ''}
          ${k.kun.length ? html`<div class="readings"><span class="label">Kun</span> <span class="jp">${k.kun.map(fmtKun).join('、')}</span></div>` : ''}
          <div class="muted small">${k.s} strokes${k.g ? ` · grade ${k.g <= 6 ? k.g : 'secondary'}` : ''} · N${k.l}</div>
        </div>
      </div>
      ${words.length ? html`<h3>Words</h3><ul class="list">${words.map((v) => html`
        <li><a href="#/word/${encodeURIComponent(v.id)}" class="row">
          <span class="jp">${raw(wordRuby(v.w, v.r))}</span>
          <span class="muted">${shortMeaning(v.m, 2)}</span></a></li>`)}</ul>` : ''}
      <div class="tags">${statusPill(`j:${k.c}`)}</div>
      ${noteBox(`j:${k.c}`)}
    </div>`;
}

export function exampleList(examples, { romaji = false } = {}) {
  return html`<ul class="examples">${examples.map((e) => html`
    <li>
      <div class="ex-jp jp">${furi(e.jp)} ${audioBtn(e.jp)}</div>
      ${romaji && e.ro ? html`<div class="romaji">${e.ro}</div>` : ''}
      <div class="ex-en">${e.en}</div>
    </li>`)}</ul>`;
}

export function grammarBlock(p) {
  return html`
    <article class="grammar">
      <div class="g-head">
        <h2 class="jp">${furi(p.title)}</h2>
        <div class="g-meaning">${p.meaning}</div>
      </div>
      <div class="structure"><span class="label">Structure</span> <span class="jp">${furi(p.structure)}</span></div>
      <div class="prose">${proseHtml(p.explanation)}</div>
      <h3>Examples</h3>
      ${exampleList(p.examples)}
      ${p.notes ? html`<div class="note prose">${proseHtml(p.notes)}</div>` : ''}
    </article>`;
}

export function kanaBlock(item) {
  return html`
    <div class="kana-info">
      <div class="kana-row">
        <div class="kana-big jp">${item.kana}</div>
        ${[...item.kana].length === 1 ? html`<div class="strokes" data-strokes="${item.kana}" title="Stroke order"></div>` : ''}
      </div>
      <div class="kana-romaji">${item.romaji}</div>
      ${audioBtn(item.kana)}
      ${HINTS[item.kana] ? html`<p class="hint">${HINTS[item.kana]}</p>` : ''}
    </div>`;
}

// ---- quiz -------------------------------------------------------------------------
// questions: [{ prompt: html, choices: [html|string], answer: index, say?: text, explain?: html }]
// Wrong answers are re-asked at the end. Calls onDone({ correct, total }) when every question is answered right once.
export function runQuiz(root, questions, { title = 'Quiz', onDone } = {}) {
  const queue = questions.map((q) => shuffleChoices(q));
  const total = queue.length;
  let firstTry = 0;
  const missed = new Set();
  let i = 0;

  function render() {
    if (i >= queue.length) return onDone?.({ correct: firstTry, total });
    const q = queue[i];
    root.innerHTML = html`
      <div class="quiz">
        <div class="progress"><div style="width:${Math.round((Math.min(i, total) / total) * 100)}%"></div></div>
        <div class="quiz-title muted small">${title} · ${Math.min(i + 1, total)}/${total}${i >= total ? ' (retry)' : ''}</div>
        <div class="quiz-prompt">${raw(String(q.prompt))} ${q.say ? audioBtn(q.say) : ''}</div>
        ${q.input ? html`<form class="type-form wide-form"><input class="type-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${q.input.label}" aria-label="${q.input.label}"><button class="btn primary">Check</button></form>`
          : html`<div class="choices">${q.choices.map((c, ci) => html`<button class="choice" data-i="${ci}"><span class="key">${ci + 1}</span><span>${raw(String(c))}</span></button>`)}</div>`}
        <div class="feedback"></div>
      </div>`.s;
    if (q.say && q.autoSay) speak(q.say);
    root.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => pick(+b.dataset.i)));
    const input = root.querySelector('.type-input');
    if (input) {
      if (q.input.mode === 'kana') attachIme(input);
      input.focus({ preventScroll: true });
      root.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        if (!input.value.trim() || locked) return;
        const r = q.input.check(input.value);
        input.disabled = true;
        input.classList.add(r.ok ? 'right' : 'wrong');
        settle(r.ok, r.close);
      };
    }
  }

  let locked = false;
  function pick(ci) {
    if (locked) return;
    const q = queue[i];
    const ok = ci === q.answer;
    const btns = root.querySelectorAll('.choice');
    btns[q.answer].classList.add('right');
    if (!ok) btns[ci].classList.add('wrong');
    settle(ok);
  }
  function settle(ok, close = false) {
    locked = true;
    const q = queue[i];
    if (!ok) {
      if (!missed.has(q)) queue.push(q.input ? { ...q } : shuffleChoices(q));
      missed.add(q);
    } else if (!missed.has(q) && i < total) firstTry++;
    const fb = root.querySelector('.feedback');
    fb.innerHTML = html`
      ${ok ? html`<div class="ok">Correct!</div>` : html`<div class="bad">${close ? 'Close! Check long vowels, っ and ゛.' : 'Not quite'} — it'll come back at the end.</div>${q.input ? html`<div class="explain">Answer: <strong class="jp">${q.input.answer}</strong></div>` : ''}`}
      ${q.explain ? html`<div class="explain">${raw(String(q.explain))}</div>` : ''}
      <button class="btn primary next">Continue <span class="key">↵</span></button>`.s;
    if (ok && !q.explain) setTimeout(() => locked && advance(), 650);
    fb.querySelector('.next').addEventListener('click', advance);
    fb.querySelector('.next').focus({ preventScroll: true });
  }
  function advance() {
    if (!locked) return;
    locked = false;
    i++;
    render();
  }
  const onKey = (e) => {
    if (!root.isConnected) return document.removeEventListener('keydown', onKey);
    if (isTyping(e)) return;
    if (!locked && /^[1-4]$/.test(e.key)) pick(+e.key - 1);
    else if (locked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); advance(); }
  };
  // A host can be reused for another round; drop the previous round's key handler.
  root.__quizCleanup?.();
  root.__quizCleanup = () => document.removeEventListener('keydown', onKey);
  document.addEventListener('keydown', onKey);
  render();
}

function shuffleChoices(q) {
  if (q.input) return q;
  const order = shuffle(q.choices.map((_, i) => i));
  return { ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer), orig: q.orig || q };
}

// Distractors that aren't the same as the answer, as strings.
export function distractors(pool, correct, n = 3, key = (x) => x) {
  const seen = new Set([key(correct)]);
  const out = [];
  for (const x of shuffle(pool)) {
    const k = key(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
    if (out.length === n) break;
  }
  return out;
}

export function levelTabs(base, current) {
  return html`<div class="tabs">${LEVELS.map((l) => html`<a class="tab ${l === current ? 'active' : ''}" href="${base}/${l}">${l}</a>`)}</div>`;
}

