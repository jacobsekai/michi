// Review session. Default is active recall: type the answer, it's checked, then you grade.
// "Flip" mode (Settings) is classic self-graded flashcards.
import { html, raw, plain, isTyping, fmtInterval, toast } from '../util.js';
import { cardInfo } from '../data.js';
import { settings, S } from '../store.js';
import { dueIds, card, answer, preview } from '../srs.js';
import { speak } from '../tts.js';
import { toRomaji, toHira } from '../kana.js';
import { attachIme } from '../ime.js';
import { checkKana, checkRomaji, checkMeaning, grammarAnswers } from '../check.js';
import { backBar, furi, proseHtml, audioBtn, wordBlock, kanjiBlock, shortMeaning, noteBox, ICON } from '../ui.js';
import { clozeHtml } from './lesson.js';

const AHEAD = 20 * 60e3; // learning cards due within 20 minutes are shown rather than ending the session

// What the learner must produce for each card type.
function spec(c) {
  switch (c.kind) {
    case 'kana': return { mode: 'romaji', label: 'Type the romaji', check: (a) => checkRomaji(a, c.romaji) };
    case 'vocab': return c.v.w === c.v.r && !/[ァ-ヺ]/.test(c.v.w)
      ? { mode: 'meaning', label: 'Type the meaning in English', check: (a) => checkMeaning(a, [c.v.m]) }
      : { mode: 'kana', label: 'Type the reading (romaji or kana)', check: (a) => checkKana(a, [toHira(c.v.r), c.v.w]) };
    case 'vocab-rev': return { mode: 'kana', label: 'Type it in Japanese (romaji or kana)', check: (a) => checkKana(a, [toHira(c.v.r), c.v.w]) };
    case 'kanji': return { mode: 'meaning', label: 'Type a meaning in English', check: (a) => checkMeaning(a, c.k.m) };
    case 'grammar': return { mode: 'kana', label: 'Type the missing part', check: (a) => checkKana(a, grammarAnswers(c.q.choices[c.q.answer])) };
    default: return null; // phrases: say it out loud, then self-grade
  }
}

export function reviewView(root) {
  let done = 0;
  let again = 0;
  let current = null;
  let phase = 'front'; // front -> answer
  let result = null; // { ok, ... } from typed check, or null in flip mode
  const started = Date.now();
  const typeMode = settings().answerMode !== 'flip';

  function nextId() {
    const now = dueIds();
    return now.length ? now[0] : dueIds(AHEAD)[0];
  }

  function show() {
    let id = nextId();
    while (id && !cardInfo(id)) {
      delete S().srs[id]; // content removed from the course
      id = nextId();
    }
    if (!id) return finished();
    current = cardInfo(id);
    phase = 'front';
    result = null;
    const sp = typeMode ? spec(current) : null;
    const remaining = dueIds(AHEAD).length;
    root.innerHTML = html`
      ${backBar('#/', 'Reviews')}
      <div class="review-meta muted small"><span>${remaining} left</span><span>${done} done</span></div>
      <div class="review-card card kind-${current.kind}">
        <div class="front">${front(current)}</div>
        ${sp ? html`<form class="answer-form"><input class="type-input answer-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${sp.label}" aria-label="${sp.label}" enterkeyhint="done"></form>` : ''}
        <div class="verdict"></div>
        <div class="back hidden"></div>
      </div>
      <div class="review-actions">
        <button class="btn primary wide" data-act="reveal">${sp ? html`Check <span class="key">Enter</span>` : html`Show answer <span class="key">Space</span>`}</button>
        ${sp ? html`<button class="btn small dontknow" data-act="dontknow">I don't know</button>` : ''}
      </div>`.s;
    const input = root.querySelector('.answer-input');
    if (input) {
      if (sp.mode === 'kana') attachIme(input);
      input.focus({ preventScroll: true });
      root.querySelector('.answer-form').onsubmit = (e) => { e.preventDefault(); reveal(); };
    }
    root.querySelector('[data-act=reveal]').onclick = () => reveal();
    root.querySelector('[data-act=dontknow]')?.addEventListener('click', () => reveal({ giveUp: true }));
    if (settings().autoAudio && current.kind === 'kana' && !sp) speak(current.kana);
  }

  function reveal({ giveUp = false } = {}) {
    if (phase !== 'front' || !current) return;
    const sp = typeMode ? spec(current) : null;
    const input = root.querySelector('.answer-input');
    if (sp) {
      if (!giveUp && !input.value.trim()) return input.focus();
      result = giveUp ? { ok: false, typed: '' } : sp.check(input.value);
      input.disabled = true;
      input.classList.add(result.ok ? 'right' : 'wrong');
      root.querySelector('.verdict').innerHTML = (result.ok
        ? html`<div class="ok">${raw(ICON.check)} Correct</div>`
        : html`<div class="bad">${giveUp ? 'Here it is:' : result.close ? 'Close — check long vowels, っ and ゛' : 'Not quite'}</div>`).s;
    }
    phase = 'answer';
    const back = root.querySelector('.back');
    back.innerHTML = backHtml(current).s;
    back.classList.remove('hidden');
    renderGrades();
    const say = sayText(current);
    if (say && settings().autoAudio) speak(say);
  }

  function renderGrades() {
    const opts = preview(card(current.id));
    const failed = result && !result.ok;
    const suggested = failed ? 1 : 3;
    root.querySelector('.review-actions').innerHTML = html`
      <div class="grades ${failed ? 'failed' : ''}">
        ${['Again', 'Hard', 'Good', 'Easy'].map((label, i) => html`
          <button class="grade g${i + 1} ${i + 1 === suggested ? 'suggested' : ''}" data-g="${i + 1}" ${failed && i > 0 ? 'disabled' : ''}>
            <span class="g-label">${label}</span>
            <span class="g-ivl">${fmtInterval(opts[i].days)}</span>
            <span class="key">${i + 1}</span>
          </button>`)}
      </div>
      ${failed ? html`<button class="btn small" data-act="override">I was right (typo) — let me grade</button>` : ''}
      <p class="muted small center">${result ? (failed ? 'Enter = Again' : 'Enter = Good. Didn\'t really know it? Press Again.') : 'How well did you remember?'}</p>`.s;
    root.querySelectorAll('.grade').forEach((b) => b.addEventListener('click', () => grade(+b.dataset.g)));
    root.querySelector('[data-act=override]')?.addEventListener('click', () => {
      result = { ...result, ok: true };
      renderGrades();
    });
  }

  function grade(g) {
    if (phase !== 'answer' || !current) return;
    if (result && !result.ok && g > 1) return;
    const r = answer(current.id, g);
    if (r?.leechNow) toast('That one keeps slipping — it\'s now marked as a leech. Add a mnemonic note to it.', 4000);
    done++;
    if (g === 1) again++;
    current = null;
    show();
  }

  function finished() {
    document.removeEventListener('keydown', onKey);
    const mins = Math.max(1, Math.round((Date.now() - started) / 60e3));
    root.innerHTML = html`
      ${backBar('#/', 'Reviews')}
      <div class="done-screen card">
        <div class="big-check">${raw(ICON.check)}</div>
        <h2>${done ? 'All caught up!' : 'Nothing to review'}</h2>
        ${done ? html`<p>${done} reviews in about ${mins} min · ${Math.round(((done - again) / done) * 100)}% remembered.</p>` : html`<p>Learn a new lesson and its items will appear here.</p>`}
        <div class="btn-row"><a class="btn primary" href="#/">Home</a><a class="btn" href="#/path">Path</a></div>
      </div>`.s;
    window.dispatchEvent(new Event('michi:session-end'));
  }

  const onKey = (e) => {
    if (!root.isConnected) return document.removeEventListener('keydown', onKey);
    if (phase === 'answer' && e.key === 'Enter' && !e.target.closest?.('textarea')) {
      e.preventDefault();
      return grade(result && !result.ok ? 1 : 3);
    }
    if (isTyping(e)) return;
    if (phase === 'front' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); reveal(); }
    else if (phase === 'answer' && /^[1-4]$/.test(e.key)) grade(+e.key);
    else if (phase === 'answer' && e.key === ' ') { e.preventDefault(); grade(result && !result.ok ? 1 : 3); }
    else if (e.key === 'r' && current) { const s = sayText(current); s && speak(s); }
  };
  document.addEventListener('keydown', onKey);
  show();
}

function sayText(c) {
  switch (c.kind) {
    case 'kana': return c.kana;
    case 'vocab':
    case 'vocab-rev': return c.v.r; // the kana reading, so the voice can't misread the kanji
    case 'grammar': return c.q.q.replace('＿＿', c.q.choices[c.q.answer]);
    case 'phrase': return c.ph.jp;
    default: return null;
  }
}

function front(c) {
  switch (c.kind) {
    case 'kana':
      return html`<div class="hint-label">${c.script === 'h' ? 'Hiragana' : 'Katakana'}</div><div class="prompt-huge jp">${c.kana}</div>`;
    case 'vocab':
      return html`<div class="hint-label">Vocabulary${c.v.custom ? ' · my word' : ''}</div><div class="prompt-huge jp">${c.v.w}</div>`;
    case 'vocab-rev':
      return html`<div class="hint-label">Say it in Japanese</div><div class="prompt-en">${shortMeaning(c.v.m)}</div>`;
    case 'kanji':
      return html`<div class="hint-label">Kanji</div><div class="prompt-huge jp kanji-font">${c.k.c}</div>`;
    case 'grammar':
      return html`<div class="hint-label">Grammar — fill the blank</div><div class="cloze jp">${raw(clozeHtml(c.q.q))}</div>${c.q.en ? html`<div class="muted">${c.q.en}</div>` : ''}`;
    case 'phrase':
      return html`<div class="hint-label">Say it in Japanese — out loud</div><div class="prompt-en">${c.ph.en}</div><div class="muted small">${c.u.title}</div>`;
    default:
      return '';
  }
}

function backHtml(c) {
  switch (c.kind) {
    case 'kana':
      return html`<div class="answer-big">${c.romaji}</div>${audioBtn(c.kana)}`;
    case 'vocab':
    case 'vocab-rev':
      return html`${wordBlock(c.v, { big: false, examples: 1 })}${settings().romaji && c.v.w !== c.v.r ? html`<div class="romaji">${toRomaji(c.v.r)}</div>` : ''}${c.v.custom ? '' : html`<a class="small" href="#/word/${encodeURIComponent(c.v.id)}">Details</a>`}`;
    case 'kanji':
      return kanjiBlock(c.k);
    case 'grammar': {
      const filled = c.q.q.replace('＿＿', `【${c.q.choices[c.q.answer]}】`);
      return html`<div class="cloze jp">${furi(filled)} ${audioBtn(plain(c.q.q.replace('＿＿', c.q.choices[c.q.answer])))}</div>
        <div class="g-answer"><span class="jp">${furi(c.p.title)}</span> — ${c.p.meaning}</div>
        <a class="small" href="#/grammar/${c.p.id}">Review this grammar point</a>${noteBox(c.id)}`;
    }
    case 'phrase':
      return html`<div class="jp answer-jp">${furi(c.ph.jp)} ${audioBtn(c.ph.jp)}</div>${c.ph.note ? html`<div class="muted small prose">${proseHtml(c.ph.note)}</div>` : ''}${noteBox(c.id)}`;
    default:
      return html``;
  }
}
