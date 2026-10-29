// Lesson player: teach pages one at a time, then a quiz, then add the items to reviews.
import { html, raw, shuffle, isTyping } from '../util.js';
import { D, allNodes, wordsWithKanji } from '../data.js';
import { S, settings, markDone } from '../store.js';
import { introduce } from '../srs.js';
import { speak, speakAll } from '../tts.js';
import { ALL_KANA, toHira } from '../kana.js';
import { checkKana, checkRomaji } from '../check.js';
import { startExam } from './exam.js';
import { backBar, furi, proseHtml, audioBtn, wordBlock, kanjiBlock, grammarBlock, kanaBlock, exampleList, runQuiz, distractors, shortMeaning, ICON } from '../ui.js';

// The lesson after the furthest one finished, so jumping ahead (e.g. skipping kana you already know) moves you forward.
export function nextNode() {
  const nodes = allNodes();
  const done = S().done;
  let last = -1;
  nodes.forEach((n, i) => { if (done[n.id]) last = i; });
  return nodes.slice(last + 1).find((n) => !done[n.id]) || nodes.find((n) => !done[n.id]);
}

export function lessonView(root, [id]) {
  const n = D.index.node.get(id);
  if (!n) {
    root.innerHTML = html`${backBar('#/path', 'Lesson not found')}<p>This lesson doesn't exist (maybe content was updated).</p>`.s;
    return;
  }
  if (n.type === 'reading') return readingLesson(root, n);
  if (n.type === 'exam') return startExam(root, { level: n.level, kind: n.exam.kind, size: n.exam.kind === 'mock' ? 'full' : 'quick', upto: n.exam.upto, nodeId: n.id });
  const pages = buildPages(n);
  stepper(root, n, pages, () => quiz(root, n));
}

function buildPages(n) {
  switch (n.type) {
    case 'foundation':
      return n.lesson.sections.map((s) => ({
        body: html`<h2>${s.h}</h2><div class="prose">${proseHtml(s.body)}</div>${s.examples ? exampleList(s.examples, { romaji: true }) : ''}`,
      }));
    case 'kana':
      return [
        { body: html`<h2>${n.title}</h2><p>You'll meet ${n.items.length} characters. Say each one out loud, then take a short quiz.</p>
          <div class="kana-preview jp">${n.group.items.map((k) => html`<span>${k.kana}</span>`)}</div>
          ${n.script === 'k' && n.group.title.startsWith('a i u') ? html`<p class="note">Katakana has the same sounds as hiragana, just a different shape. You'll find many are simpler, angular versions.</p>` : ''}
          ${n.group.title.startsWith('Voiced') ? html`<p class="note">The two small marks ゛ (dakuten) make a sound "voiced": k→g, s→z, t→d, h→b. The small circle ゜ (handakuten) turns h into p.</p>` : ''}
          ${n.group.title.startsWith('Combos') ? html`<p class="note">A small ゃ, ゅ or ょ after an i-sound kana blends them into one beat: き + ゃ = きゃ (kya). Compare full-size きや (ki-ya, two beats).</p>` : ''}`,
        },
        ...n.group.items.map((k) => ({ body: kanaBlock(k), say: k.kana })),
        ...(n.id === 'kana-h-11' ? [{ body: smallTsuPage() }] : []),
        ...(n.id === 'kana-k-11' ? [{ body: longVowelPage() }] : []),
      ];
    case 'vocab':
      return n.items.map((vid) => {
        const v = D.index.vocab.get(vid);
        return { body: wordBlock(v), say: v.r };
      });
    case 'kanji':
      return n.items.map((jid) => ({ body: kanjiBlock(D.index.kanji.get(jid.slice(2))) }));
    case 'grammar':
      return [
        { body: html`<h2>${n.title}</h2><div class="prose">${proseHtml(n.unit.summary)}</div><ul class="list">${n.unit.points.map((p) => html`<li class="row"><span class="jp">${furi(p.title)}</span><span class="muted">${p.meaning}</span></li>`)}</ul>` },
        ...n.unit.points.map((p) => ({ body: grammarBlock(p) })),
      ];
    default:
      return [];
  }
}

const smallTsuPage = () => html`<h2>Small っ: the double consonant</h2>
  <div class="prose"><p>A small <span class="jp">っ</span> isn't pronounced on its own — it's a one-beat pause that doubles the next consonant.</p></div>
  ${exampleList([
    { jp: 'きって', en: 'postage stamp', ro: 'kitte' },
    { jp: 'がっこう', en: 'school', ro: 'gakkou' },
    { jp: 'ざっし', en: 'magazine', ro: 'zasshi' },
  ], { romaji: true })}
  <div class="prose"><p><strong>Long vowels</strong> in hiragana are written with an extra vowel: <span class="jp">おかあさん</span> (okaasan, mother), <span class="jp">せんせい</span> (sensei — the い makes a long e), <span class="jp">がっこう</span> (the う makes a long o).</p></div>`;

const longVowelPage = () => html`<h2>ー: the long-vowel bar</h2>
  <div class="prose"><p>In katakana, a long vowel is written with a dash <span class="jp">ー</span> that stretches the sound one more beat. It runs vertically in vertical text.</p></div>
  ${exampleList([
    { jp: 'コーヒー', en: 'coffee', ro: 'koohii' },
    { jp: 'ラーメン', en: 'ramen', ro: 'raamen' },
    { jp: 'スーパー', en: 'supermarket', ro: 'suupaa' },
    { jp: 'サッカー', en: 'soccer', ro: 'sakkaa' },
  ], { romaji: true })}`;

function stepper(root, n, pages, onFinish) {
  let i = 0;
  const render = () => {
    const p = pages[i];
    root.innerHTML = html`
      ${backBar('#/path', n.title)}
      <div class="progress"><div style="width:${Math.round(((i + 1) / (pages.length + 1)) * 100)}%"></div></div>
      <div class="page card">${p.body}</div>
      <div class="pager">
        <button class="btn" data-act="prev" ${i === 0 ? 'disabled' : ''}>Back</button>
        <span class="muted small">${i + 1} / ${pages.length}</span>
        <button class="btn primary" data-act="next">${i === pages.length - 1 ? 'Start quiz' : 'Next'}</button>
      </div>`.s;
    root.querySelector('[data-act=prev]').onclick = () => go(-1);
    root.querySelector('[data-act=next]').onclick = () => go(1);
    if (p.say && settings().autoAudio) speak(p.say);
    window.scrollTo(0, 0);
  };
  const go = (d) => {
    if (i + d >= pages.length) {
      document.removeEventListener('keydown', onKey);
      return onFinish();
    }
    i = Math.max(0, i + d);
    render();
  };
  const onKey = (e) => {
    if (!root.isConnected || !root.querySelector('.pager')) return document.removeEventListener('keydown', onKey);
    if (isTyping(e)) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  };
  document.addEventListener('keydown', onKey);
  render();
}

const BLANK = '<span class="blank">＿＿</span>';
export const clozeHtml = (q) => furi(q).s.replace('＿＿', BLANK);

function quizQuestions(n) {
  switch (n.type) {
    case 'foundation':
      return n.lesson.quiz.map((q) => ({ prompt: html`${q.q}`, choices: q.choices.map((c) => html`${c}`), answer: q.answer }));
    case 'kana': {
      const pool = ALL_KANA.filter((k) => k.id[0] === n.script);
      const qs = [];
      for (const k of n.group.items) {
        const wrong = distractors(pool, k, 3, (x) => x.romaji);
        qs.push({ prompt: html`<div class="prompt-big jp">${k.kana}</div>`, choices: [k, ...wrong].map((x) => x.romaji), answer: 0 });
        // Second round is active recall: type the sound with nothing to pick from.
        qs.push({ prompt: html`<div class="prompt-big jp">${k.kana}</div><div class="muted small">Type it</div>`, input: { mode: 'romaji', label: 'romaji', answer: k.romaji, check: (a) => checkRomaji(a, k.romaji) }, say: k.kana });
      }
      return [...shuffle(qs.filter((_, i) => i % 2 === 0)), ...shuffle(qs.filter((_, i) => i % 2 === 1))];
    }
    case 'vocab': {
      const words = n.items.map((id) => D.index.vocab.get(id));
      const pool = D.vocab[n.level];
      const a = words.map((v) => ({
        prompt: html`<div class="prompt-big jp">${v.w}</div>${v.w !== v.r ? html`<div class="muted jp">${v.r}</div>` : ''}`,
        choices: [v, ...distractors(pool, v, 3, (x) => shortMeaning(x.m, 2))].map((x) => shortMeaning(x.m, 2)),
        answer: 0,
      }));
      // Recall round: produce the word from its meaning (typed), which encodes far better than recognising it.
      const b = words.map((v) => ({
        prompt: html`<div class="prompt-en">${shortMeaning(v.m)}</div><div class="muted small">Type the Japanese (romaji is fine)</div>`,
        input: { mode: 'kana', label: 'in Japanese', answer: v.w === v.r ? v.r : `${v.w}（${v.r}）`, check: (x) => checkKana(x, [toHira(v.r), v.w]) },
        say: v.r,
      }));
      return [...shuffle(a), ...shuffle(b)];
    }
    case 'kanji': {
      const ks = n.items.map((id) => D.index.kanji.get(id.slice(2)));
      const pool = D.kanji.filter((k) => k.l === ks[0].l);
      const a = shuffle(ks.map((k) => ({
        prompt: html`<div class="prompt-big jp kanji-font">${k.c}</div>`,
        choices: [k, ...distractors(pool, k, 3, (x) => x.m[0])].map((x) => x.m.slice(0, 2).join(', ')),
        answer: 0,
      })));
      // Recall round: read a real word that uses the kanji.
      const b = ks.map((k) => [k, wordsWithKanji(k.c, 1)[0]]).filter(([, v]) => v && v.w !== v.r).map(([k, v]) => ({
        prompt: html`<div class="prompt-big jp">${v.w}</div><div class="muted small">${shortMeaning(v.m, 2)} — type the reading</div>`,
        input: { mode: 'kana', label: 'reading', answer: v.r, check: (x) => checkKana(x, [toHira(v.r)]) },
        say: v.r,
      }));
      return [...a, ...shuffle(b)];
    }
    case 'grammar':
      return n.unit.points.flatMap((p) => p.quiz.map((q) => ({
        prompt: html`<div class="cloze jp">${raw(clozeHtml(q.q))}</div>${q.en ? html`<div class="muted">${q.en}</div>` : ''}`,
        choices: q.choices.map((c) => html`<span class="jp">${furi(c)}</span>`),
        answer: q.answer,
        explain: html`<span class="jp">${furi(p.title)}</span> — ${p.meaning}`,
        say: q.q.replace('＿＿', q.choices[q.answer]),
      })));
    default:
      return [];
  }
}

function quiz(root, n) {
  const qs = quizQuestions(n);
  root.innerHTML = html`${backBar('#/path', n.title)}<div class="quiz-host"></div>`.s;
  runQuiz(root.querySelector('.quiz-host'), qs, { title: 'Quiz', onDone: (r) => finish(root, n, r) });
}

function finish(root, n, result) {
  const items = [...n.items];
  if (n.type === 'vocab' && settings().reverseVocab) items.push(...n.items.map((id) => 'w:' + id.slice(2)));
  const added = introduce(items);
  markDone(n.id);
  const next = nextNode();
  root.innerHTML = html`
    <div class="done-screen card">
      <div class="big-check">${raw(ICON.check)}</div>
      <h2>Lesson complete!</h2>
      <p>${result.total ? `${result.correct}/${result.total} right on the first try.` : ''}</p>
      ${added ? html`<p><strong>${added}</strong> new item${added === 1 ? '' : 's'} added to your reviews. First review in about 10 minutes.</p>` : ''}
      <div class="btn-row">
        ${next ? html`<a class="btn primary" href="#/lesson/${next.id}">Next: ${next.title}</a>` : ''}
        <a class="btn" href="#/">Home</a>
      </div>
    </div>`.s;
}

// ---- reading ------------------------------------------------------------------

export function passageHtml(p) {
  return html`
    <div class="passage">
      <div class="passage-head">
        <h2 class="jp">${furi(p.titleJp)}</h2>
        <div class="muted">${p.title} · ${p.level}</div>
        <div class="btn-row">
          <button class="btn small" data-act="play-all">${raw(ICON.play)} Read aloud</button>
          <button class="btn small" data-act="toggle-en">Show translation</button>
        </div>
      </div>
      <div class="sentences">${p.sentences.map((s, i) => html`
        <div class="sentence" data-i="${i}">
          <div class="jp s-jp">${furi(s.jp)} ${audioBtn(s.jp)}</div>
          <div class="s-en hidden">${s.en}</div>
        </div>`)}
      </div>
    </div>`;
}

export function wirePassage(root, p) {
  let showing = false;
  root.querySelector('[data-act=toggle-en]').onclick = (e) => {
    showing = !showing;
    root.querySelectorAll('.s-en').forEach((el) => el.classList.toggle('hidden', !showing));
    e.target.textContent = showing ? 'Hide translation' : 'Show translation';
  };
  // Tapping a sentence reveals just its translation.
  root.querySelectorAll('.sentence').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.closest('button, ruby')) return;
    el.querySelector('.s-en').classList.toggle('hidden');
  }));
  root.querySelector('[data-act=play-all]').onclick = () => {
    const els = root.querySelectorAll('.sentence');
    speakAll(p.sentences.map((s) => s.jp), (i) => els.forEach((el) => el.classList.toggle('speaking', +el.dataset.i === i)));
  };
}

export function readingQuestions(p) {
  return p.questions.map((q) => ({ prompt: html`${q.q}`, choices: q.choices.map((c) => html`${c}`), answer: q.answer }));
}

function readingLesson(root, n) {
  const p = n.passage;
  root.innerHTML = html`
    ${backBar('#/path', n.title)}
    <div class="card">${passageHtml(p)}</div>
    <div class="center"><button class="btn primary" data-act="questions">Answer questions</button></div>`.s;
  wirePassage(root, p);
  root.querySelector('[data-act=questions]').onclick = () => {
    const host = document.createElement('div');
    host.className = 'card';
    root.querySelector('[data-act=questions]').replaceWith(host);
    runQuiz(host, readingQuestions(p), {
      title: 'Comprehension',
      onDone: (r) => {
        S().quiz[p.id] = Math.max(S().quiz[p.id] || 0, r.correct / r.total);
        finish(root, n, r);
      },
    });
    host.scrollIntoView({ behavior: 'smooth' });
  };
}
