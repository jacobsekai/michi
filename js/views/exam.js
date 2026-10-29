// Exams: JLPT-style mock tests, checkpoint quizzes inside the path, and an adaptive placement test.
// Questions are generated from the course data, so every attempt is different.
import { html, raw, ruby, plain, shuffle, sample, isTyping, esc } from '../util.js';
import { D, LEVELS, sentencesFor, allNodes } from '../data.js';
import { S, save, markDone, newId, settings } from '../store.js';
import { introduce, relearn, isLearned, markKnown } from '../srs.js';
import { speak } from '../tts.js';
import { ALL_KANA } from '../kana.js';
import { backBar, furi, audioBtn, shortMeaning, ICON } from '../ui.js';
import { clozeHtml } from './lesson.js';

// JLPT scoring: N1–N3 have three 60-point sections; N4/N5 combine language knowledge + reading into one 120-point section.
const PASS = { N1: 100, N2: 90, N3: 95, N4: 90, N5: 80 };
const SECTIONS = (level) => (['N4', 'N5'].includes(level)
  ? [{ id: 'lang', name: 'Language knowledge & reading', max: 120, min: 38, parts: ['vocab', 'grammar', 'reading'] }, { id: 'listen', name: 'Listening', max: 60, min: 19, parts: ['listening'] }]
  : [{ id: 'lang', name: 'Language knowledge (vocabulary & grammar)', max: 60, min: 19, parts: ['vocab', 'grammar'] }, { id: 'read', name: 'Reading', max: 60, min: 19, parts: ['reading'] }, { id: 'listen', name: 'Listening', max: 60, min: 19, parts: ['listening'] }]);

// ---- question generators ---------------------------------------------------------------

const hasKanji = (s) => /[一-鿿々]/.test(s);
// Realistic wrong readings: long/short vowels, small っ, voicing — the traps the real JLPT uses.
function mutateReading(r) {
  const out = new Set();
  const swaps = [[/う(?!$)/, ''], [/([こそとのほもよろごぞどぼぽょ])(?!う)/, '$1う'], [/っ/, ''], [/([かきくけこさしすせそたちつてとぱぴぷぺぽ])/, 'っ$1'], [/ゅう/, 'ょう'], [/ょう/, 'ゅう'], [/い$/, ''], [/([かきくけこ])/, (m) => String.fromCharCode(m.charCodeAt(0) + 1)], [/([がぎぐげご])/, (m) => String.fromCharCode(m.charCodeAt(0) - 1)], [/([さしすせそ])/, (m) => String.fromCharCode(m.charCodeAt(0) + 1)], [/([たてと])/, (m) => String.fromCharCode(m.charCodeAt(0) + 1)], [/([はひふへほ])/, (m) => String.fromCharCode(m.charCodeAt(0) + 1)], [/ん/, ''], [/([あいうえお])/, '$1$1']];
  for (const [re, rep] of shuffle(swaps)) {
    const m = r.replace(re, rep);
    if (m !== r && m.length > 1) out.add(m);
  }
  return [...out];
}

function readingDistractors(v, pool) {
  const valid = new Set(pool.filter((x) => x.w === v.w).map((x) => x.r));
  const cands = [...mutateReading(v.r), ...shuffle(pool.filter((x) => x.r.length === v.r.length && x.r !== v.r)).slice(0, 6).map((x) => x.r)];
  return [...new Set(cands)].filter((x) => !valid.has(x) && x !== v.r).slice(0, 3);
}

// Fake spellings: swap one kanji for another with the same on-reading (as the JLPT orthography section does).
function spellingDistractors(v) {
  const ks = [...v.w].filter((c) => /[一-鿿]/.test(c));
  const out = new Set();
  for (const c of shuffle(ks)) {
    const k = D.index.kanji.get(c);
    if (!k) continue;
    const alike = D.kanji.filter((o) => o.c !== c && o.l >= k.l - 1 && o.on.some((r) => k.on.includes(r)));
    for (const o of sample(alike, 3)) out.add(v.w.replace(c, o.c));
  }
  return [...out].filter((w) => !D.index.vocab.has(`v:${w}|${v.r}`)).slice(0, 3);
}

// Strip furigana from the target word only, so the sentence stays readable but the tested reading isn't given away.
function sentenceHtml(jp, { hideTarget = false, kanaTarget = null, blank = false } = {}) {
  const parts = jp.split(/[⟦⟧]/);
  if (parts.length !== 3) return ruby(jp, settings().furigana);
  const [a, t, b] = parts;
  const mid = blank ? '<span class="blank">＿＿</span>' : `<u>${esc(kanaTarget ?? (hideTarget ? plain(t) : t))}</u>`;
  return ruby(a, settings().furigana) + (hideTarget || kanaTarget || blank ? mid : `<u>${ruby(t)}</u>`) + ruby(b, settings().furigana);
}

async function vocabQuestions(level, words, n) {
  const sents = await sentencesFor(level);
  const withS = shuffle(words).map((v) => [v, sents[v.id.slice(2)]?.[0]]).filter(([, s]) => s);
  const pool = D.vocab[level];
  const qs = [];
  const third = Math.ceil(n / 3);
  // 漢字読み — reading of the underlined kanji word.
  for (const [v, [jp]] of withS.filter(([v, [jp]]) => hasKanji(v.w) && jp.includes(`⟦${v.w}`) && !v.w.includes('～')).slice(0, third)) {
    const wrong = readingDistractors(v, pool);
    if (wrong.length < 3) continue;
    qs.push({ part: 'vocab', type: 'Kanji reading', card: v.id, prompt: html`<div class="muted small">How is the underlined word read?</div><div class="cloze jp">${raw(sentenceHtml(jp, { hideTarget: true }))}</div>`, choices: [v.r, ...wrong].map((x) => html`<span class="jp">${x}</span>`), answer: 0, answerText: v.r });
  }
  // 表記 — which kanji spelling is right.
  for (const [v, [jp]] of withS.filter(([v, [jp]]) => hasKanji(v.w) && /^[一-鿿]+$/.test(v.w) && v.w.length > 1 && jp.includes(`⟦${v.w}`)).slice(0, third)) {
    const wrong = spellingDistractors(v);
    if (wrong.length < 3) continue;
    qs.push({ part: 'vocab', type: 'Spelling', card: v.id, prompt: html`<div class="muted small">Which kanji is right for the underlined word?</div><div class="cloze jp">${raw(sentenceHtml(jp, { kanaTarget: v.r }))}</div>`, choices: [v.w, ...wrong].map((x) => html`<span class="jp">${x}</span>`), answer: 0, answerText: v.w });
  }
  // 文脈規定 — which word fits the blank.
  const shape = (w) => (/[うくぐすつぬぶむる]$/.test(w.w) ? 'verb' : /い$/.test(w.w) ? 'adj' : 'noun');
  for (const [v, [jp, en]] of withS.filter(([, [jp]]) => /⟦[^⟧]+⟧/.test(jp)).slice(0, n - qs.length)) {
    if (qs.length >= n) break;
    const target = plain(jp.match(/⟦([^⟧]+)⟧/)[1]);
    if (target !== v.w) continue; // only uninflected uses, so every choice can be shown in dictionary form
    const wrong = sample(pool.filter((x) => x !== v && shape(x) === shape(v) && x.m !== v.m && x.w !== v.w), 3);
    if (wrong.length < 3) continue;
    qs.push({ part: 'vocab', type: 'Word in context', card: v.id, prompt: html`<div class="muted small">Which word best fills the blank?</div><div class="cloze jp">${raw(sentenceHtml(jp, { blank: true }))}</div><div class="muted small">${en}</div>`, choices: [v, ...wrong].map((x) => html`<span class="jp">${x.w}</span>`), answer: 0, answerText: v.w });
  }
  return qs.slice(0, n);
}

function grammarQuestions(points, n) {
  return sample(points.flatMap((p) => p.quiz.map((q, qi) => ({ p, q, qi }))), n).map(({ p, q, qi }) => ({
    part: 'grammar', type: 'Grammar', card: `g:${p.id}#${qi}`,
    prompt: html`<div class="muted small">Choose what fits the blank.</div><div class="cloze jp">${raw(clozeHtml(q.q))}</div>`,
    choices: q.choices.map((c) => html`<span class="jp">${furi(c)}</span>`), answer: q.answer, answerText: plain(q.choices[q.answer]),
    explain: html`<span class="jp">${furi(p.title)}</span> — ${p.meaning}`,
  }));
}

function readingQuestionsFor(level, passages) {
  return sample(D.reading.filter((p) => p.level === level), passages).flatMap((p) => p.questions.map((q) => ({
    part: 'reading', type: 'Reading', passage: p,
    prompt: html`<details class="exam-passage" open><summary>${p.title}</summary><div class="jp passage-text">${p.sentences.map((s) => furi(s.jp))}</div></details><div class="exam-q">${q.q}</div>`,
    choices: q.choices.map((c) => html`${c}`), answer: q.answer, answerText: q.choices[q.answer],
  })));
}

async function listeningQuestions(level, words, n) {
  const sents = await sentencesFor(level);
  const all = Object.values(sents).flat();
  const picks = sample(words.map((v) => [v, sents[v.id.slice(2)]?.[0]]).filter(([, s]) => s), n);
  return picks.map(([v, [jp, en]]) => ({
    part: 'listening', type: 'Listening', card: v.id, say: jp.replace(/[⟦⟧]/g, ''), autoSay: true,
    prompt: html`<div class="muted small">Listen, then choose what it means. (Tap the speaker to replay.)</div>`,
    choices: [en, ...sample(all.filter((x) => x[1] !== en), 3).map((x) => x[1])], answer: 0, answerText: en,
    reveal: jp,
  }));
}

// ---- exam runner -------------------------------------------------------------------------

function runExam(root, { title, level, qs, minutes, onFinish }) {
  const items = qs.map((q) => ({ ...q, order: shuffle(q.choices.map((_, k) => k)) }));
  const answers = Array(items.length).fill(null);
  const end = Date.now() + minutes * 60e3;
  let i = 0;
  let timer;

  const render = () => {
    const q = items[i];
    const left = Math.max(0, end - Date.now());
    root.innerHTML = html`
      ${backBar('#/exams', title)}
      <div class="exam-bar"><span>${q.type} · ${i + 1}/${items.length}</span><span class="exam-timer ${left < 120e3 ? 'low' : ''}">${fmtClock(left)}</span></div>
      <div class="progress"><div style="width:${(i / items.length) * 100}%"></div></div>
      <div class="card quiz">
        <div class="quiz-prompt">${raw(String(q.prompt))} ${q.say ? audioBtn(q.say) : ''}</div>
        <div class="choices">${q.order.map((oi, ci) => html`<button class="choice ${answers[i] === oi ? 'picked' : ''}" data-i="${oi}"><span class="key">${ci + 1}</span><span>${raw(String(q.choices[oi]))}</span></button>`)}</div>
      </div>
      <div class="pager">
        <button class="btn" data-act="prev" ${i === 0 ? 'disabled' : ''}>Back</button>
        <span class="muted small">${answers.filter((a) => a != null).length} answered</span>
        <button class="btn ${i === items.length - 1 ? 'primary' : ''}" data-act="next">${i === items.length - 1 ? 'Finish' : 'Skip'}</button>
      </div>`.s;
    if (q.autoSay && answers[i] == null) speak(q.say, { rate: 1 });
    root.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => choose(+b.dataset.i)));
    root.querySelector('[data-act=prev]').onclick = () => { i--; render(); };
    root.querySelector('[data-act=next]').onclick = () => (i === items.length - 1 ? finish() : (i++, render()));
  };
  const choose = (oi) => {
    answers[i] = oi;
    if (i < items.length - 1) { i++; render(); } else render();
  };
  const finish = () => {
    if (answers.some((a) => a == null) && Date.now() < end && !confirm(`${answers.filter((a) => a == null).length} questions unanswered. Finish anyway?`)) return;
    clearInterval(timer);
    document.removeEventListener('keydown', onKey);
    onFinish(items.map((q, k) => ({ ...q, chosen: answers[k], ok: answers[k] === q.answer })));
  };
  const onKey = (e) => {
    if (!root.isConnected) { clearInterval(timer); return document.removeEventListener('keydown', onKey); }
    if (isTyping(e)) return;
    const q = items[i];
    if (/^[1-4]$/.test(e.key) && q.order[+e.key - 1] != null) choose(q.order[+e.key - 1]);
  };
  timer = setInterval(() => {
    if (!root.isConnected) return clearInterval(timer);
    const t = root.querySelector('.exam-timer');
    const left = end - Date.now();
    if (t) t.textContent = fmtClock(Math.max(0, left));
    if (left <= 0) { alert('Time is up!'); finish(); }
  }, 1000);
  document.addEventListener('keydown', onKey);
  render();
}
const fmtClock = (ms) => `${Math.floor(ms / 60e3)}:${String(Math.floor((ms % 60e3) / 1000)).padStart(2, '0')}`;

function score(level, results) {
  const secs = SECTIONS(level).map((s) => {
    const qs = results.filter((r) => s.parts.includes(r.part));
    const right = qs.filter((r) => r.ok).length;
    const pts = qs.length ? Math.round((right / qs.length) * s.max) : 0;
    return { ...s, right, n: qs.length, pts, passed: pts >= s.min };
  });
  const total = secs.reduce((a, s) => a + s.pts, 0);
  return { secs, total, max: 180, pass: total >= PASS[level] && secs.every((s) => s.passed) };
}

function resultsHtml(level, kind, results, sc) {
  const missed = results.filter((r) => !r.ok);
  return html`
    <div class="card done-screen">
      <div class="${sc.pass ? 'big-check' : 'big-x'}">${sc.pass ? raw(ICON.check) : '…'}</div>
      <h2>${sc.total} / 180</h2>
      <p>${sc.pass ? `That's a pass at ${level} standard.` : `Not a pass yet — the ${level} pass mark is ${PASS[level]}, with a minimum in every section.`}</p>
      <p class="muted small">Scaled like the real JLPT${kind === 'checkpoint' ? ' (checkpoint covers only what you\'ve studied so far)' : ''}. Real exam scores are equated across sittings, so treat this as an estimate.</p>
    </div>
    <div class="card">
      <h3>Sections</h3>
      <table class="levels"><tbody>${sc.secs.map((s) => html`<tr><th>${s.name}</th><td>${s.right}/${s.n} right</td><td><strong>${s.pts}</strong>/${s.max}</td><td>${s.passed ? '✓' : html`<span class="bad">below ${s.min}</span>`}</td></tr>`)}</tbody></table>
    </div>
    ${missed.length ? html`<div class="card">
      <h3>Review your mistakes (${missed.length})</h3>
      <ul class="examples">${missed.map((r) => html`<li>
        <div class="muted small">${r.type}</div>
        <div class="exam-review">${raw(String(r.prompt).replace(/<details[^]*?<\/details>/, `<em>${esc(r.passage?.title || '')}</em>`))}</div>
        ${r.reveal ? html`<div class="jp">${furi(r.reveal.replace(/[⟦⟧]/g, ''))} ${audioBtn(r.reveal.replace(/[⟦⟧]/g, ''))}</div>` : ''}
        <div>Answer: <strong class="jp">${r.answerText}</strong>${r.chosen != null ? html` · <span class="muted">you chose <span class="jp">${raw(String(r.choices[r.chosen]))}</span></span>` : html` · <span class="muted">skipped</span>`}</div>
        ${r.explain ? html`<div class="explain">${raw(String(r.explain))}</div>` : ''}
      </li>`)}</ul>
      ${missed.some((r) => r.card) ? html`<button class="btn primary" data-act="drill">Send these to my reviews</button><p class="muted small">Words and grammar you missed will come up in your next review session.</p>` : ''}
    </div>` : ''}
    <div class="btn-row"><a class="btn primary" href="#/exams">Exams</a><a class="btn" href="#/">Home</a></div>`;
}

function showResults(root, { level, kind, title, nodeId }, results) {
  const sc = score(level, results);
  S().exams.push({ id: newId(), level, kind, t: Date.now(), total: sc.total, pass: sc.pass, sections: sc.secs.map((s) => [s.id, s.pts]) });
  if (nodeId && (kind !== 'mock' || sc.pass || confirm('Mark this exam as done on your path anyway?'))) markDone(nodeId);
  save();
  root.innerHTML = html`${backBar('#/exams', title)}${resultsHtml(level, kind, results, sc)}`.s;
  root.querySelector('[data-act=drill]')?.addEventListener('click', (e) => {
    const ids = [...new Set(results.filter((r) => !r.ok && r.card).map((r) => r.card))];
    const fresh = ids.filter((id) => !isLearned(id));
    ids.filter(isLearned).forEach(relearn);
    introduce(fresh);
    e.target.replaceWith(Object.assign(document.createElement('p'), { textContent: `Done — ${ids.length} items queued for review.` }));
  });
}

// Items a checkpoint can test: what the path teaches before the checkpoint.
function scopeFor(level, upto) {
  const stage = D.path.find((s) => s.id === level);
  const nodes = upto == null ? stage.nodes : stage.nodes.slice(0, upto);
  const words = nodes.filter((n) => n.type === 'vocab').flatMap((n) => n.items.map((id) => D.index.vocab.get(id)));
  const points = nodes.filter((n) => n.type === 'grammar').flatMap((n) => n.unit.points);
  return { words, points: points.length ? points : D.grammar[level].units.flatMap((u) => u.points) };
}

export async function startExam(root, { level, kind = 'mock', size = 'full', upto = null, nodeId = null }) {
  root.innerHTML = html`${backBar('#/exams', 'Exam')}<p class="muted">Preparing your exam…</p>`.s;
  const { words, points } = scopeFor(level, kind === 'checkpoint' ? upto : null);
  const full = size === 'full';
  const qs = [
    ...(await vocabQuestions(level, words, full ? 15 : 6)),
    ...grammarQuestions(points, full ? 15 : 6),
    ...(kind === 'checkpoint' ? [] : readingQuestionsFor(level, full ? 2 : 1)),
    ...(await listeningQuestions(level, words, full ? 12 : 5)),
  ];
  if (!qs.length) {
    root.innerHTML = html`${backBar('#/exams', 'Exam')}<p>Not enough content for this exam yet.</p>`.s;
    return;
  }
  const title = kind === 'checkpoint' ? `${level} checkpoint` : `${level} mock exam${full ? '' : ' (quick)'}`;
  const minutes = Math.max(10, Math.round(qs.length * (full ? 1.1 : 1)));
  root.innerHTML = html`
    ${backBar('#/exams', title)}
    <div class="card">
      <h2>${title}</h2>
      <p>${qs.length} questions · ${minutes} minutes. Sections: ${SECTIONS(level).map((s) => s.name).join(', ')}.</p>
      <ul class="small"><li>No feedback until the end — like the real test.</li><li>Listening plays automatically; use headphones.</li><li>You can go back and change answers.</li></ul>
      <button class="btn primary wide" data-act="go">Start</button>
    </div>`.s;
  root.querySelector('[data-act=go]').onclick = () => runExam(root, { title, level, qs, minutes, onFinish: (res) => showResults(root, { level, kind, title, nodeId }, res) });
}

// ---- placement test -------------------------------------------------------------------------

export async function placementView(root) {
  root.innerHTML = html`
    ${backBar('#/exams', 'Placement test')}
    <div class="card">
      <h2>Find your starting point</h2>
      <p>Already know some Japanese? This short adaptive test checks kana, then each JLPT level in turn, and stops when it gets too hard. Guessing hurts your result — use "I don't know".</p>
      <button class="btn primary wide" data-act="go">Start (about 5–15 minutes)</button>
    </div>`.s;
  root.querySelector('[data-act=go]').onclick = () => runPlacement(root);
}

async function runPlacement(root) {
  const stages = [{ id: 'kana', name: 'Kana' }, ...LEVELS.map((l) => ({ id: l, name: l }))];
  const passed = [];
  for (const st of stages) {
    const qs = st.id === 'kana' ? kanaQs() : await levelQs(st.id);
    const right = await askAll(root, `Placement · ${st.name}`, qs);
    const ratio = right / qs.length;
    if (ratio < (st.id === 'kana' ? 0.85 : 0.75)) break;
    passed.push(st.id);
  }
  placementResult(root, passed);
}

function kanaQs() {
  const h = sample(ALL_KANA.filter((k) => k.id[0] === 'h' && k.kana.length === 1), 8);
  const k = sample(ALL_KANA.filter((x) => x.id[0] === 'k' && x.kana.length === 1), 8);
  return [...h, ...k].map((x) => ({ prompt: html`<div class="prompt-big jp">${x.kana}</div>`, choices: [x.romaji, ...sample(ALL_KANA.filter((y) => y.romaji !== x.romaji && y.kana.length === 1), 3).map((y) => y.romaji)], answer: 0 }));
}

async function levelQs(level) {
  const words = sample(D.vocab[level].slice(0, 400), 8);
  const pool = D.vocab[level];
  const vq = words.map((v) => ({ prompt: html`<div class="prompt-big jp">${v.w}</div>`, choices: [shortMeaning(v.m, 2), ...sample(pool.filter((x) => x.m !== v.m), 3).map((x) => shortMeaning(x.m, 2))], answer: 0 }));
  const gq = grammarQuestions(D.grammar[level].units.flatMap((u) => u.points), 6).map((q) => ({ prompt: q.prompt, choices: q.choices, answer: q.answer }));
  const lq = (await listeningQuestions(level, D.vocab[level].slice(0, 400), 2)).map((q) => ({ prompt: q.prompt, choices: q.choices, answer: q.answer, say: q.say, autoSay: true }));
  return [...vq, ...gq, ...lq];
}

// Asks questions with no feedback, plus an "I don't know" option; resolves with the number right.
function askAll(root, title, qs) {
  return new Promise((resolve) => {
    let i = 0;
    let right = 0;
    const render = () => {
      if (i >= qs.length) return resolve(right);
      const q = qs[i];
      const order = shuffle(q.choices.map((_, k) => k));
      root.innerHTML = html`
        ${backBar('#/exams', title)}
        <div class="progress"><div style="width:${(i / qs.length) * 100}%"></div></div>
        <div class="card quiz">
          <div class="quiz-prompt">${raw(String(q.prompt))} ${q.say ? audioBtn(q.say) : ''}</div>
          <div class="choices">${order.map((oi, ci) => html`<button class="choice" data-i="${oi}"><span class="key">${ci + 1}</span><span>${raw(String(q.choices[oi]))}</span></button>`)}</div>
          <button class="btn wide idk">I don't know</button>
        </div>`.s;
      if (q.say && q.autoSay) speak(q.say, { rate: 1 });
      root.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => { if (+b.dataset.i === q.answer) right++; i++; render(); }));
      root.querySelector('.idk').onclick = () => { i++; render(); };
    };
    render();
  });
}

function placementResult(root, passed) {
  const levels = passed.filter((x) => x !== 'kana');
  const knowsKana = passed.includes('kana');
  const start = !knowsKana ? 'Hiragana' : LEVELS.find((l) => !levels.includes(l)) || 'Fluency';
  root.innerHTML = html`
    ${backBar('#/exams', 'Placement test')}
    <div class="card done-screen">
      <h2>Start at: ${start}</h2>
      <p>${!knowsKana ? 'Begin with the kana — everything else builds on them.' : levels.length ? `You passed: kana, ${levels.join(', ')}.` : 'You know your kana. Start with N5.'}</p>
      ${knowsKana ? html`
        <label class="check"><input type="checkbox" checked data-act="known"> Add what I already know to my reviews as "known" (recommended — it gets checked now and then so gaps show up)</label>
        <button class="btn primary wide" data-act="apply">Skip ahead to ${start}</button>` : html`<a class="btn primary wide" href="#/path">Go to the path</a>`}
    </div>`.s;
  root.querySelector('[data-act=apply]')?.addEventListener('click', () => {
    const skipStages = ['start', 'hira', 'kata', ...levels];
    const nodes = allNodes().filter((n) => skipStages.includes(n.stage));
    nodes.forEach((n) => markDone(n.id));
    if (root.querySelector('[data-act=known]')?.checked) {
      const ids = nodes.flatMap((n) => n.items);
      markKnown(ids, 5, Math.max(30, Math.min(150, Math.round(ids.length / 12))));
    }
    location.hash = '#/path';
  });
}

// ---- exams hub ---------------------------------------------------------------------------------

export function examsView(root, [arg, size]) {
  if (arg === 'placement') return placementView(root);
  if (LEVELS.includes(arg)) return startExam(root, { level: arg, kind: 'mock', size: size || 'full' });
  const history = [...S().exams].reverse().slice(0, 15);
  root.innerHTML = html`
    ${backBar('#/library', 'Exams')}
    <div class="card">
      <h3>Placement test</h3>
      <p class="small">Already studied some Japanese? Find where to start and skip what you know.</p>
      <a class="btn primary" href="#/exams/placement">Take placement test</a>
    </div>
    <div class="card">
      <h3>JLPT mock exams</h3>
      <p class="small">Vocabulary, grammar, reading and listening, scored out of 180 like the real JLPT. A new set of questions every time.</p>
      <ul class="list">${LEVELS.map((l) => {
        const best = Math.max(-1, ...S().exams.filter((e) => e.level === l && e.kind === 'mock').map((e) => e.total));
        return html`<li class="row"><strong>${l}</strong><span class="muted small">${best >= 0 ? `best ${best}/180` : ''}</span>
          <a class="btn small" href="#/exams/${l}/quick">Quick (~20 min)</a><a class="btn small primary" href="#/exams/${l}/full">Full (~50 min)</a></li>`;
      })}</ul>
    </div>
    ${history.length ? html`<div class="card"><h3>History</h3><ul class="list">${history.map((e) => html`<li class="row"><span>${e.level} ${e.kind}</span><span class="muted small">${new Date(e.t).toLocaleDateString()}</span><strong>${e.total}/180</strong><span>${e.pass ? '✓' : ''}</span></li>`)}</ul></div>` : ''}`.s;
}

