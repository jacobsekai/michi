// Free practice drills. These don't change review scheduling.
import { html, raw, sample, ruby, kanaOnly, esc } from '../util.js';
import { D, LEVELS, sentencesFor } from '../data.js';
import { settings } from '../store.js';
import { toHira } from '../kana.js';
import { attachIme, finishKana } from '../ime.js';
import { isLearned } from '../srs.js';
import { ALL_KANA } from '../kana.js';
import { speak } from '../tts.js';
import { backBar, runQuiz, distractors, shortMeaning, audioBtn, stripMarks, fmtKun } from '../ui.js';

const ROUND = 20;

export function practiceView(root, [mode = 'kana']) {
  const fn = { kana: kanaDrill, listening: listeningDrill, reading: readingDrill, dictation: dictationDrill, shadowing: shadowingDrill, writing: writingDrill }[mode];
  if (!fn) return (location.hash = '#/');
  fn(root);
}

// Learned vocab, falling back to the first N5 words for brand-new learners.
function vocabPool(filter = () => true) {
  const learned = LEVELS.flatMap((l) => D.vocab[l]).filter((v) => isLearned(v.id) && filter(v));
  return learned.length >= 8 ? { words: learned, learned: true } : { words: D.vocab.N5.filter(filter).slice(0, 200), learned: false };
}

function frame(root, title, note) {
  root.innerHTML = html`${backBar('#/', title)}${note ? html`<p class="muted small">${note}</p>` : ''}<div class="card quiz-host"></div>`.s;
  return root.querySelector('.quiz-host');
}

function again(host, r, restart) {
  host.innerHTML = html`<div class="done-screen"><h2>${r.correct}/${r.total}</h2><p>right on the first try.</p><div class="btn-row"><button class="btn primary">Another round</button><a class="btn" href="#/">Home</a></div></div>`.s;
  host.querySelector('button').onclick = restart;
}

// Typed kana drill: see a kana, type its romaji.
const ALTS = { shi: ['si'], chi: ['ti'], tsu: ['tu'], fu: ['hu'], ji: ['zi', 'di'], zu: ['du'], wo: ['o'], sha: ['sya'], shu: ['syu'], sho: ['syo'], cha: ['tya', 'cya'], chu: ['tyu', 'cyu'], cho: ['tyo', 'cyo'], ja: ['jya', 'zya'], ju: ['jyu', 'zyu'], jo: ['jyo', 'zyo'], n: ['nn'] };

function kanaDrill(root) {
  const learned = ALL_KANA.filter((k) => isLearned(k.id));
  const pool = learned.length >= 10 ? learned : ALL_KANA.filter((k) => k.id.startsWith('h:')).slice(0, 46);
  const host = frame(root, 'Kana drill', learned.length >= 10 ? `Drilling the ${learned.length} kana you've learned. Type the romaji and press Enter.` : 'Drilling basic hiragana. Type the romaji and press Enter.');
  let items = sample(pool, Math.min(ROUND, pool.length));
  let i = 0;
  let right = 0;
  const missed = [];
  const ask = () => {
    if (i >= items.length) return again(host, { correct: right, total: items.length }, () => kanaDrill(root));
    const k = items[i];
    host.innerHTML = html`
      <div class="progress"><div style="width:${(i / items.length) * 100}%"></div></div>
      <div class="prompt-huge jp">${k.kana}</div>
      <form class="type-form"><input class="type-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="romaji" aria-label="Romaji"><button class="btn primary">Check</button></form>
      <div class="feedback"></div>`.s;
    const input = host.querySelector('input');
    input.focus();
    host.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const a = input.value.trim().toLowerCase();
      if (!a) return;
      const ok = a === k.romaji || (ALTS[k.romaji] || []).includes(a);
      if (ok) right++;
      else missed.push(k);
      speak(k.kana);
      host.querySelector('.feedback').innerHTML = ok ? html`<div class="ok">Correct — ${k.romaji}</div>`.s : html`<div class="bad">It's <strong>${k.romaji}</strong></div>`.s;
      input.disabled = true;
      setTimeout(() => { i++; ask(); }, ok ? 600 : 1500);
    };
  };
  ask();
}

// Listening: hear a word, pick the meaning.
function listeningDrill(root) {
  const { words, learned } = vocabPool();
  const host = frame(root, 'Listening', learned ? 'Words you have learned. Press the speaker to hear it again.' : 'Using beginner words until you have learned a few of your own.');
  const qs = sample(words, Math.min(ROUND, words.length)).map((v) => ({
    prompt: html`<div class="muted">What does this mean?</div>`,
    say: v.r,
    autoSay: true,
    choices: [v, ...distractors(words.length > 10 ? words : D.vocab.N5, v, 3, (x) => shortMeaning(x.m, 2))].map((x) => shortMeaning(x.m, 2)),
    answer: 0,
    explain: html`<span class="jp">${v.w}</span> (${v.r})`,
  }));
  runQuiz(host, qs, { title: 'Listening', onDone: (r) => again(host, r, () => listeningDrill(root)) });
}

// Kanji readings: see a word written in kanji, pick its reading.
function readingDrill(root) {
  const hasKanji = (v) => v.w !== v.r && /[一-鿿]/.test(v.w);
  const { words, learned } = vocabPool(hasKanji);
  const host = frame(root, 'Kanji readings', learned ? 'Words with kanji that you have learned.' : 'Using beginner words until you have learned a few of your own.');
  const qs = sample(words, Math.min(ROUND, words.length)).map((v) => {
    // Similar-length readings make better distractors.
    const near = (words.length > 12 ? words : D.vocab[v.level]).filter((x) => hasKanji(x) && Math.abs(x.r.length - v.r.length) <= 1);
    return {
      prompt: html`<div class="prompt-big jp">${v.w}</div><div class="muted small">${shortMeaning(v.m, 2)}</div>`,
      choices: [v, ...distractors(near, v, 3, (x) => x.r)].map((x) => html`<span class="jp">${x.r}</span>`),
      answer: 0,
      say: v.r,
    };
  });
  runQuiz(host, qs, { title: 'Readings', onDone: (r) => again(host, r, () => readingDrill(root)) });
}


// ---- sentences for listening-based drills ------------------------------------------------
// Short sentences at the learner's level: levels they've learned words from, else N5.
async function sentencePool(maxLen = 22) {
  const lv = LEVELS.filter((l) => D.vocab[l].some((v) => isLearned(v.id)));
  const out = [];
  for (const l of lv.length ? lv : ['N5']) {
    const s = await sentencesFor(l);
    for (const [id, list] of Object.entries(s)) {
      if (lv.length && !isLearned(`v:${id}`)) continue;
      for (const [jp, en] of list) if (stripMarks(jp).replace(/\[[^\]]*\]/g, '').length <= maxLen) out.push([stripMarks(jp), en]);
    }
  }
  return out;
}

// Character-level diff via longest common subsequence: which characters of the target you got.
function diff(target, typed) {
  const a = [...target];
  const b = [...typed];
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = Array(a.length).fill(false);
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { hit[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return { html: a.map((c, i) => `<span class="${hit[i] ? 'd-ok' : 'd-miss'}">${esc(c)}</span>`).join(''), score: a.length ? dp[0][0] / Math.max(a.length, b.length) : 0 };
}
const normDict = (s) => toHira(s).replace(/[、。！？!?「」『』（）\s・ー〜～]/g, '');

// Dictation: hear a sentence, type it in kana. Trains listening at the level of individual sounds.
async function dictationDrill(root) {
  const pool = sample(await sentencePool(18), 10);
  const host = frame(root, 'Dictation', 'Listen and type what you hear in kana (romaji converts automatically). Replay as often as you like.');
  let i = 0;
  let total = 0;
  const ask = () => {
    if (i >= pool.length) return again(host, { correct: Math.round(total), total: pool.length * 100 }, () => dictationDrill(root));
    const [jp, en] = pool[i];
    host.innerHTML = html`
      <div class="progress"><div style="width:${(i / pool.length) * 100}%"></div></div>
      <div class="center">${audioBtn(jp, 'Play sentence')} <button class="btn small" data-act="slow">Slower</button></div>
      <form class="type-form wide-form"><input class="type-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="type what you hear"><button class="btn primary">Check</button></form>
      <div class="feedback"></div>`.s;
    speak(jp);
    host.querySelector('[data-act=slow]').onclick = () => speak(jp, { rate: 0.6 });
    const input = host.querySelector('input');
    attachIme(input);
    input.focus();
    host.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const d = diff(normDict(kanaOnly(jp)), normDict(finishKana(input.value)));
      total += d.score * 100;
      input.disabled = true;
      host.querySelector('.feedback').innerHTML = html`
        <div class="${d.score > 0.9 ? 'ok' : 'bad'}">${Math.round(d.score * 100)}% match</div>
        <div class="dict-diff jp">${raw(d.html)}</div>
        <div class="jp ex-jp">${raw(ruby(jp, settings().furigana))}</div><div class="muted">${en}</div>
        <button class="btn primary next">Next</button>`.s;
      host.querySelector('.next').onclick = () => { i++; ask(); };
      host.querySelector('.next').focus();
    };
  };
  ask();
}

// Shadowing: hear the model, record yourself, compare. The best-evidenced way to fix rhythm and pitch.
async function shadowingDrill(root) {
  const pool = sample(await sentencePool(26), 10);
  const host = frame(root, 'Shadowing', 'Play the sentence, then record yourself saying it the same way — same rhythm, same melody. Recordings stay on this device.');
  let i = 0;
  let rec = null;
  let url = null;
  const ask = () => {
    if (i >= pool.length) return again(host, { correct: pool.length, total: pool.length }, () => shadowingDrill(root));
    const [jp, en] = pool[i];
    host.innerHTML = html`
      <div class="progress"><div style="width:${(i / pool.length) * 100}%"></div></div>
      <div class="cloze jp">${raw(ruby(jp, settings().furigana))}</div>
      <div class="muted center">${en}</div>
      <div class="btn-row center-row">
        <button class="btn" data-act="model">▶ Model</button>
        <button class="btn" data-act="slow">▶ Slow</button>
        <button class="btn primary" data-act="rec">● Record</button>
        <button class="btn" data-act="mine" disabled>▶ Mine</button>
        <button class="btn" data-act="both" disabled>▶ Both</button>
      </div>
      <div class="muted small center rec-status"></div>
      <button class="btn wide" data-act="next">Next sentence</button>`.s;
    const $ = (a) => host.querySelector(`[data-act=${a}]`);
    const playMine = () => url && new Audio(url).play();
    $('model').onclick = () => speak(jp, { rate: 1 });
    $('slow').onclick = () => speak(jp, { rate: 0.7 });
    $('mine').onclick = playMine;
    $('both').onclick = () => {
      speak(jp, { rate: 1 });
      const wait = setInterval(() => { if (!speechSynthesis.speaking) { clearInterval(wait); playMine(); } }, 150);
    };
    $('rec').onclick = async () => {
      if (rec?.state === 'recording') return rec.stop();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const chunks = [];
        rec = new MediaRecorder(stream);
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }));
          $('rec').textContent = '● Record again';
          $('mine').disabled = $('both').disabled = false;
          host.querySelector('.rec-status').textContent = 'Compare: is your rhythm even? Do you rise and fall in the same places?';
        };
        rec.start();
        $('rec').textContent = '■ Stop';
        host.querySelector('.rec-status').textContent = 'Recording…';
      } catch {
        host.querySelector('.rec-status').textContent = 'Microphone not available — you can still shadow out loud along with the model.';
      }
    };
    $('next').onclick = () => { i++; ask(); };
    speak(jp, { rate: 1 });
  };
  ask();
}

// Writing from memory: see meaning + reading, draw the kanji, then compare with the stroke-order diagram.
function writingDrill(root) {
  const learned = D.kanji.filter((k) => isLearned(`j:${k.c}`));
  const pool = sample(learned.length >= 5 ? learned : D.kanji.filter((k) => k.l === 5), 10);
  const host = frame(root, 'Writing from memory', 'Draw the kanji from memory (finger, mouse or pen), then check it. Producing a kanji, not just recognising it, makes it stick.');
  let i = 0;
  let right = 0;
  const ask = () => {
    if (i >= pool.length) return again(host, { correct: right, total: pool.length }, () => writingDrill(root));
    const k = pool[i];
    host.innerHTML = html`
      <div class="progress"><div style="width:${(i / pool.length) * 100}%"></div></div>
      <div class="center"><div class="prompt-en">${k.m.slice(0, 3).join(', ')}</div><div class="muted jp">${[...k.kun.slice(0, 2).map(fmtKun), ...k.on.slice(0, 2)].join('、')}</div></div>
      <div class="write-wrap"><canvas class="write-pad" width="600" height="600"></canvas><div class="write-answer hidden"></div></div>
      <div class="btn-row center-row"><button class="btn" data-act="clear">Clear</button><button class="btn primary" data-act="check">Check</button></div>
      <div class="feedback"></div>`.s;
    const cv = host.querySelector('canvas');
    const ctx = cv.getContext('2d');
    ctx.lineWidth = 18;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(document.body).color;
    let drawing = false;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * cv.width, ((e.clientY - r.top) / r.height) * cv.height]; };
    cv.onpointerdown = (e) => { drawing = true; cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); };
    cv.onpointermove = (e) => { if (drawing) { ctx.lineTo(...pos(e)); ctx.stroke(); } };
    cv.onpointerup = cv.onpointercancel = () => { drawing = false; };
    host.querySelector('[data-act=clear]').onclick = () => ctx.clearRect(0, 0, cv.width, cv.height);
    host.querySelector('[data-act=check]').onclick = () => {
      const ans = host.querySelector('.write-answer');
      ans.innerHTML = `<div class="strokes" data-strokes="${esc(k.c)}"></div>`;
      ans.classList.remove('hidden');
      host.querySelector('.feedback').innerHTML = html`<div class="jp prompt-big kanji-font">${k.c}</div>
        <p class="muted small">Same shape and stroke order? Be honest — it's only for you.</p>
        <div class="btn-row center-row"><button class="btn" data-g="0">Missed it</button><button class="btn primary" data-g="1">Got it</button></div>`.s;
      host.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => { right += +b.dataset.g; i++; ask(); }));
    };
  };
  ask();
}

