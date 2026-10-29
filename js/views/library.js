// Library: kana chart, word/kanji/grammar browsers, dictionary search, reading, Life & Work in Japan.
import { html, raw, wordRuby } from '../util.js';
import { D, LEVELS } from '../data.js';
import { S, markDone } from '../store.js';
import { introduce, isLearned } from '../srs.js';
import { CHART, toKata, toKana, toHira, HINTS } from '../kana.js';
import { backBar, furi, proseHtml, audioBtn, wordBlock, kanjiBlock, grammarBlock, levelTabs, shortMeaning, runQuiz, statusPill } from '../ui.js';
import { passageHtml, wirePassage, readingQuestions } from './lesson.js';

export function libraryView(root) {
  const tile = (href, icon, title, sub) => html`<a class="tile lib" href="${href}"><div class="tile-icon jp">${icon}</div><div><div class="tile-title">${title}</div><div class="muted small">${sub}</div></div></a>`;
  const counts = { v: LEVELS.reduce((a, l) => a + D.vocab[l].length, 0), g: LEVELS.reduce((a, l) => a + D.grammar[l].units.reduce((b, u) => b + u.points.length, 0), 0) };
  root.innerHTML = html`
    <h1>Library</h1>
    <div class="lib-grid">
      ${tile('#/search', '🔍', 'Dictionary', 'Search words, kanji & grammar (English, kana or romaji)')}
      ${tile('#/kana', 'あ', 'Kana chart', 'Hiragana & katakana with audio')}
      ${tile('#/grammar/N5', '文', 'Grammar', `${counts.g} grammar points, N5–N1`)}
      ${tile('#/vocab/N5', '語', 'Vocabulary', `${counts.v.toLocaleString()} words, N5–N1`)}
      ${tile('#/kanji/N5', '漢', 'Kanji', `${D.kanji.length.toLocaleString()} kanji, N5–N1`)}
      ${tile('#/reading', '読', 'Reading', `${D.reading.length} graded stories & articles`)}
      ${tile('#/life', '🗾', 'Life & Work in Japan', `${D.life.length} practical units: housing, ward office, jobs, keigo…`)}
    </div>`.s;
}

// ---- kana chart -----------------------------------------------------------------
export function kanaChartView(root, [script = 'h']) {
  const conv = script === 'k' ? toKata : (x) => x;
  const cell = ([k, r]) => {
    const kana = conv(k);
    return html`<button class="kana-cell" data-say="${kana}" title="${HINTS[kana] || ''}"><span class="jp">${kana}</span><small>${r}</small>${isLearned(`${script}:${kana}`) ? html`<i class="dot"></i>` : ''}</button>`;
  };
  const table = (rows, cols = 5) => html`<div class="kana-grid" style="--cols:${cols}">${rows.map((row) => {
    // Pad the y- and w-rows so columns line up with the vowels.
    const r = row.length === 3 && cols === 5 && row[0][1] === 'ya' ? [row[0], null, row[1], null, row[2]] : row.length === 2 && row[0][1] === 'wa' ? [row[0], null, null, null, row[1]] : row;
    return r.map((c) => (c ? cell(c) : html`<span></span>`));
  })}</div>`;
  root.innerHTML = html`
    ${backBar('#/library', 'Kana chart')}
    <div class="tabs"><a class="tab ${script === 'h' ? 'active' : ''}" href="#/kana/h">Hiragana</a><a class="tab ${script === 'k' ? 'active' : ''}" href="#/kana/k">Katakana</a></div>
    <p class="muted small">Tap any character to hear it. A dot means you've learned it.</p>
    <h3>Basic</h3>${table(CHART.basic)}
    <h3>Voiced (゛ ゜)</h3>${table(CHART.voiced)}
    <h3>Combinations</h3>${table(CHART.yoon, 3)}
    ${script === 'k' ? html`<h3>Extended (for foreign sounds)</h3><div class="kana-grid" style="--cols:5">${CHART.extended.map(([k, r]) => html`<button class="kana-cell" data-say="${k}"><span class="jp">${k}</span><small>${r}</small></button>`)}</div>` : ''}
  `.s;
}

// ---- vocabulary & kanji lists -----------------------------------------------------
const PAGE = 100;
export function vocabListView(root, [level = 'N5', page = '1']) {
  const words = D.vocab[level] || [];
  const p = Math.max(1, +page);
  const slice = words.slice((p - 1) * PAGE, p * PAGE);
  const learned = words.filter((v) => isLearned(v.id)).length;
  root.innerHTML = html`
    ${backBar('#/library', 'Vocabulary')}
    ${levelTabs('#/vocab', level)}
    <p class="muted small">${words.length} words · ${learned} learned. Words are taught through the path; you can also add any word to your reviews from its page.</p>
    <ul class="list">${slice.map((v) => html`<li><a class="row" href="#/word/${encodeURIComponent(v.id)}">
      <span class="jp">${raw(wordRuby(v.w, v.r))}</span><span class="muted">${shortMeaning(v.m, 2)}</span>${isLearned(v.id) ? html`<i class="dot"></i>` : ''}</a></li>`)}</ul>
    ${pager(`#/vocab/${level}`, p, Math.ceil(words.length / PAGE))}`.s;
}

export function kanjiListView(root, [level = 'N5']) {
  const ks = D.kanji.filter((k) => `N${k.l}` === level);
  root.innerHTML = html`
    ${backBar('#/library', 'Kanji')}
    ${levelTabs('#/kanji', level)}
    <p class="muted small">${ks.length} kanji · ${ks.filter((k) => isLearned(`j:${k.c}`)).length} learned${level === 'N1' ? ' · N1 also includes the remaining jōyō (everyday-use) kanji' : ''}.</p>
    <div class="kanji-grid">${ks.map((k) => html`<a class="kanji-cell ${isLearned(`j:${k.c}`) ? 'learned' : ''}" href="#/kanji-detail/${encodeURIComponent(k.c)}"><span class="jp">${k.c}</span><small>${k.m[0] || ''}</small></a>`)}</div>`.s;
}

const pager = (base, p, pages) => (pages <= 1 ? '' : html`<div class="pager">
  ${p > 1 ? html`<a class="btn" href="${base}/${p - 1}">Previous</a>` : html`<span></span>`}
  <span class="muted small">Page ${p} / ${pages}</span>
  ${p < pages ? html`<a class="btn" href="${base}/${p + 1}">Next</a>` : html`<span></span>`}</div>`);

function addButton(ids, label = 'Add to reviews') {
  const all = ids.every(isLearned);
  return all ? html`<p class="muted small">In your reviews.</p>` : html`<button class="btn primary" data-add="${ids.join('\u0001')}">${label}</button>`;
}
function wireAdd(root, rerender) {
  root.querySelectorAll('[data-add]').forEach((b) => (b.onclick = () => {
    introduce(b.dataset.add.split('\u0001'));
    rerender();
  }));
}

export function wordView(root, [id]) {
  const v = D.index.vocab.get(decodeURIComponent(id));
  if (!v) return (root.innerHTML = html`${backBar('#/library', 'Word')}<p>Not found.</p>`.s);
  root.innerHTML = html`${backBar(`#/vocab/${v.level}`, v.w)}<div class="card">${wordBlock(v)}</div>${addButton([v.id])}`.s;
  wireAdd(root, () => wordView(root, [id]));
}

export function kanjiDetailView(root, [c]) {
  const k = D.index.kanji.get(decodeURIComponent(c));
  if (!k) return (root.innerHTML = html`${backBar('#/library', 'Kanji')}<p>Not found.</p>`.s);
  root.innerHTML = html`${backBar(`#/kanji/N${k.l}`, k.c)}<div class="card">${kanjiBlock(k)}</div>${addButton([`j:${k.c}`])}`.s;
  wireAdd(root, () => kanjiDetailView(root, [c]));
}

// ---- grammar ---------------------------------------------------------------------
export function grammarView(root, [arg = 'N5']) {
  if (!LEVELS.includes(arg)) return grammarPointView(root, arg);
  const units = D.grammar[arg].units;
  root.innerHTML = html`
    ${backBar('#/library', 'Grammar')}
    ${levelTabs('#/grammar', arg)}
    ${units.length ? units.map((u) => html`
      <section class="card">
        <h3>${u.title}</h3>
        <ul class="list">${u.points.map((p) => html`<li><a class="row" href="#/grammar/${p.id}"><span class="jp">${furi(p.title)}</span><span class="muted">${p.meaning}</span>${p.quiz.some((_, i) => isLearned(`g:${p.id}#${i}`)) ? html`<i class="dot"></i>` : ''}</a></li>`)}</ul>
      </section>`) : html`<p class="muted">Grammar for ${arg} isn't available yet.</p>`}`.s;
}

function grammarPointView(root, pid) {
  const p = D.index.grammarPoint.get(pid);
  if (!p) return (root.innerHTML = html`${backBar('#/grammar/N5', 'Grammar')}<p>Not found.</p>`.s);
  const ids = p.quiz.map((_, i) => `g:${p.id}#${i}`);
  root.innerHTML = html`${backBar(`#/grammar/${p.level}`, `${p.level} grammar`)}<div class="card">${grammarBlock(p)}</div>${addButton(ids)}`.s;
  wireAdd(root, () => grammarPointView(root, pid));
}

// ---- reading -----------------------------------------------------------------------
export function readingListView(root) {
  root.innerHTML = html`
    ${backBar('#/library', 'Reading')}
    <p class="muted small">Original graded stories and articles. Tap a sentence to see its translation.</p>
    ${LEVELS.map((l) => {
      const ps = D.reading.filter((p) => p.level === l);
      return ps.length ? html`<h3>${l}</h3><ul class="list">${ps.map((p) => html`<li><a class="row" href="#/reading/${p.id}"><span class="jp">${furi(p.titleJp)}</span><span class="muted">${p.title}</span>${S().quiz[p.id] != null ? html`<span class="pill">${Math.round(S().quiz[p.id] * 100)}%</span>` : ''}</a></li>`)}</ul>` : '';
    })}
    ${D.reading.length ? '' : html`<p class="muted">No reading passages yet.</p>`}`.s;
}

export function readingView(root, [id]) {
  const p = D.reading.find((x) => x.id === id);
  if (!p) return (root.innerHTML = html`${backBar('#/reading', 'Reading')}<p>Not found.</p>`.s);
  root.innerHTML = html`${backBar('#/reading', 'Reading')}<div class="card">${passageHtml(p)}</div><div class="card quiz-host"></div>`.s;
  wirePassage(root, p);
  const host = root.querySelector('.quiz-host');
  const start = () => runQuiz(host, readingQuestions(p), {
    title: 'Comprehension',
    onDone: (r) => {
      S().quiz[p.id] = Math.max(S().quiz[p.id] || 0, r.correct / r.total);
      markDone(`${p.level.toLowerCase()}-reading-${p.id}`);
      host.innerHTML = html`<p><strong>${r.correct}/${r.total}</strong> on the first try.</p><button class="btn">Try again</button>`.s;
      host.querySelector('button').onclick = start;
    },
  });
  host.innerHTML = html`<button class="btn primary">Answer questions</button>`.s;
  host.querySelector('button').onclick = start;
}

// ---- life & work ---------------------------------------------------------------------
export function lifeListView(root) {
  root.innerHTML = html`
    ${backBar('#/library', 'Life & Work in Japan')}
    <p class="muted small">Practical Japanese and know-how for moving to, living in, and working in Japan. Do these alongside your JLPT levels — the level tag shows roughly what you'll need.</p>
    <ul class="list">${D.life.map((u) => html`<li><a class="row" href="#/life/${u.id}"><span>${u.title}</span><span class="pill">${u.level}</span>${S().done[u.id] ? html`<i class="dot"></i>` : ''}</a></li>`)}</ul>
    ${D.life.length ? '' : html`<p class="muted">Not available yet.</p>`}`.s;
}

export function lifeUnitView(root, [id]) {
  const u = D.index.lifeUnit.get(id);
  if (!u) return (root.innerHTML = html`${backBar('#/life', 'Life & Work')}<p>Not found.</p>`.s);
  const ids = (u.phrases || []).map((_, i) => `p:${u.id}#${i}`);
  root.innerHTML = html`
    ${backBar('#/life', 'Life & Work')}
    <div class="card">
      <h2>${u.title} <span class="pill">${u.level}</span></h2>
      <div class="prose">${proseHtml(u.intro)}</div>
    </div>
    <div class="card">
      <h3>Key phrases</h3>
      <ul class="examples">${(u.phrases || []).map((p, i) => html`<li>
        <div class="ex-jp jp">${furi(p.jp)} ${audioBtn(p.jp)}</div><div class="ex-en">${p.en}</div>
        ${p.note ? html`<div class="muted small prose">${proseHtml(p.note)}</div>` : ''}${statusPill(ids[i])}</li>`)}</ul>
      ${addButton(ids, 'Add these phrases to reviews')}
    </div>
    ${u.vocab?.length ? html`<div class="card"><h3>Vocabulary</h3><ul class="list">${u.vocab.map((v) => html`<li class="row"><span class="jp">${furi(v.jp)}</span><span class="muted">${v.en}</span>${audioBtn(v.jp)}</li>`)}</ul></div>` : ''}
    ${u.dialogue?.length ? html`<div class="card"><h3>Dialogue</h3><div class="dialogue">${u.dialogue.map((d) => html`
      <div class="line"><div class="speaker">${d.speaker}</div><div><div class="jp">${furi(d.jp)} ${audioBtn(d.jp)}</div><div class="muted small">${d.en}</div></div></div>`)}</div></div>` : ''}
    ${u.tips?.length ? html`<div class="card"><h3>Tips</h3><ul class="tips">${u.tips.map((t) => html`<li class="prose">${proseHtml(t)}</li>`)}</ul></div>` : ''}`.s;
  root.querySelectorAll('[data-add]').forEach((b) => (b.onclick = () => {
    introduce(b.dataset.add.split('\u0001'));
    markDone(u.id);
    lifeUnitView(root, [id]);
  }));
}

// ---- search -----------------------------------------------------------------------------
export function searchView(root, [q0 = '']) {
  root.innerHTML = html`
    ${backBar('#/library', 'Dictionary')}
    <input class="search" type="search" placeholder="English, かな, 漢字 or romaji…" value="${decodeURIComponent(q0)}" autocomplete="off" autocapitalize="off" spellcheck="false">
    <div class="results"></div>`.s;
  const input = root.querySelector('input');
  const out = root.querySelector('.results');
  const run = () => {
    const q = input.value.trim();
    history.replaceState(null, '', `#/search/${encodeURIComponent(q)}`);
    out.innerHTML = q ? results(q).s : html`<p class="muted small">Tip: type romaji like <em>taberu</em> and it'll match たべる.</p>`.s;
  };
  let t;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 120); });
  input.focus();
  run();
}

function results(q) {
  const lower = q.toLowerCase();
  const isLatin = /^[a-z' -]+$/i.test(q);
  const kana = isLatin ? toKana(lower) : toHira(q);
  const kanaOk = /^[ぁ-ゖー]+$/.test(kana);
  const words = [];
  const scoreWord = (v) => {
    if (v.w === q || v.r === kana) return 0;
    if (v.w.startsWith(q) || (kanaOk && v.r.startsWith(kana))) return 1;
    const m = v.m.toLowerCase();
    if (isLatin && new RegExp(`(^|[ ,;(])(to )?${lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[ ,;)])`).test(m)) return 2;
    if (v.w.includes(q)) return 3;
    if (isLatin && lower.length > 2 && m.includes(lower)) return 4;
    return -1;
  };
  for (const l of LEVELS) for (const v of D.vocab[l]) {
    const s = scoreWord(v);
    if (s >= 0) words.push([s, v]);
  }
  words.sort((a, b) => a[0] - b[0]);
  const kanji = D.kanji.filter((k) => q.includes(k.c) || (isLatin && lower.length > 1 && k.m.some((m) => m.toLowerCase() === lower))).slice(0, 12);
  const grammar = [...D.index.grammarPoint.values()].filter((p) => p.title.includes(q) || (kanaOk && p.title.includes(kana)) || (isLatin && lower.length > 2 && p.meaning.toLowerCase().includes(lower))).slice(0, 15);
  const none = !words.length && !kanji.length && !grammar.length;
  return html`
    ${kanji.length ? html`<h3>Kanji</h3><div class="kanji-grid">${kanji.map((k) => html`<a class="kanji-cell" href="#/kanji-detail/${encodeURIComponent(k.c)}"><span class="jp">${k.c}</span><small>${k.m[0]}</small></a>`)}</div>` : ''}
    ${words.length ? html`<h3>Words</h3><ul class="list">${words.slice(0, 60).map(([, v]) => html`<li><a class="row" href="#/word/${encodeURIComponent(v.id)}">
      <span class="jp">${raw(wordRuby(v.w, v.r))}</span><span class="muted">${shortMeaning(v.m, 3)}</span><span class="pill">${v.level}</span></a></li>`)}</ul>` : ''}
    ${grammar.length ? html`<h3>Grammar</h3><ul class="list">${grammar.map((p) => html`<li><a class="row" href="#/grammar/${p.id}"><span class="jp">${furi(p.title)}</span><span class="muted">${p.meaning}</span><span class="pill">${p.level}</span></a></li>`)}</ul>` : ''}
    ${none ? html`<p class="muted">No matches for “${q}”.</p>` : ''}`;
}

