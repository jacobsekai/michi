// Free practice drills. These don't change review scheduling.
import { html, sample } from '../util.js';
import { D, LEVELS } from '../data.js';
import { isLearned } from '../srs.js';
import { ALL_KANA } from '../kana.js';
import { speak } from '../tts.js';
import { backBar, runQuiz, distractors, shortMeaning } from '../ui.js';

const ROUND = 20;

export function practiceView(root, [mode = 'kana']) {
  const fn = { kana: kanaDrill, listening: listeningDrill, reading: readingDrill }[mode];
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

