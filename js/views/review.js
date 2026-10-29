// Review session: show due cards, reveal, self-grade.
import { html, raw, plain, isTyping, fmtInterval } from '../util.js';
import { cardInfo } from '../data.js';
import { settings, S } from '../store.js';
import { dueIds, card, answer, preview } from '../srs.js';
import { speak } from '../tts.js';
import { toRomaji } from '../kana.js';
import { backBar, furi, proseHtml, audioBtn, wordBlock, kanjiBlock, shortMeaning, ICON } from '../ui.js';
import { clozeHtml } from './lesson.js';

const AHEAD = 20 * 60e3; // learning cards due within 20 minutes are shown rather than ending the session

export function reviewView(root) {
  let done = 0;
  let again = 0;
  let current = null;
  let revealed = false;
  const started = Date.now();

  function nextId() {
    const now = dueIds();
    if (now.length) return now[0];
    const soon = dueIds(AHEAD);
    return soon[0];
  }

  function show() {
    let id = nextId();
    // Skip cards whose content was removed from the course.
    while (id && !cardInfo(id)) {
      delete S().srs[id];
      id = nextId();
    }
    if (!id) return finished();
    current = cardInfo(id);
    revealed = false;
    const remaining = dueIds(AHEAD).length;
    root.innerHTML = html`
      ${backBar('#/', 'Reviews')}
      <div class="review-meta muted small"><span>${remaining} left</span><span>${done} done</span></div>
      <div class="review-card card kind-${current.kind}">
        <div class="front">${front(current)}</div>
        <div class="back hidden"></div>
      </div>
      <div class="review-actions">
        <button class="btn primary wide" data-act="reveal">Show answer <span class="key">Space</span></button>
      </div>`.s;
    root.querySelector('[data-act=reveal]').onclick = reveal;
    if (settings().autoAudio && current.kind === 'kana') speak(current.kana);
  }

  function reveal() {
    if (revealed || !current) return;
    revealed = true;
    const back = root.querySelector('.back');
    back.innerHTML = backHtml(current).s;
    back.classList.remove('hidden');
    const opts = preview(card(current.id));
    root.querySelector('.review-actions').innerHTML = html`
      <div class="grades">
        ${['Again', 'Hard', 'Good', 'Easy'].map((label, i) => html`
          <button class="grade g${i + 1}" data-g="${i + 1}">
            <span class="g-label">${label}</span>
            <span class="g-ivl">${fmtInterval(opts[i].days)}</span>
            <span class="key">${i + 1}</span>
          </button>`)}
      </div>`.s;
    root.querySelectorAll('.grade').forEach((b) => b.addEventListener('click', () => grade(+b.dataset.g)));
    const say = sayText(current);
    if (say && settings().autoAudio) speak(say);
  }

  function grade(g) {
    if (!revealed || !current) return;
    answer(current.id, g);
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
  }

  const onKey = (e) => {
    if (!root.isConnected) return document.removeEventListener('keydown', onKey);
    if (isTyping(e)) return;
    if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); reveal(); }
    else if (revealed && /^[1-4]$/.test(e.key)) grade(+e.key);
    else if (revealed && e.key === ' ') { e.preventDefault(); grade(3); }
    else if (e.key === 'r' && current) { const s = sayText(current); s && speak(s); }
  };
  document.addEventListener('keydown', onKey);
  show();
}

// Speak dictionary words from their kana reading so the voice can't pick the wrong reading of the kanji.
const vSay = (v) => v.r;

function sayText(c) {
  switch (c.kind) {
    case 'kana': return c.kana;
    case 'vocab':
    case 'vocab-rev': return vSay(c.v);
    case 'grammar': return c.q.q.replace('＿＿', c.q.choices[c.q.answer]);
    case 'phrase': return c.ph.jp;
    default: return null;
  }
}

function front(c) {
  switch (c.kind) {
    case 'kana':
      return html`<div class="hint-label">${c.script === 'h' ? 'Hiragana' : 'Katakana'} — reading?</div><div class="prompt-huge jp">${c.kana}</div>`;
    case 'vocab':
      return html`<div class="hint-label">Vocabulary — reading & meaning?</div><div class="prompt-huge jp">${c.v.w}</div>`;
    case 'vocab-rev':
      return html`<div class="hint-label">Say it in Japanese</div><div class="prompt-en">${shortMeaning(c.v.m)}</div>`;
    case 'kanji':
      return html`<div class="hint-label">Kanji — meaning & readings?</div><div class="prompt-huge jp">${c.k.c}</div>`;
    case 'grammar':
      return html`<div class="hint-label">Grammar — fill the blank</div><div class="cloze jp">${raw(clozeHtml(c.q.q))}</div>${c.q.en ? html`<div class="muted">${c.q.en}</div>` : ''}`;
    case 'phrase':
      return html`<div class="hint-label">Phrase — say it in Japanese</div><div class="prompt-en">${c.ph.en}</div><div class="muted small">${c.u.title}</div>`;
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
      return html`${wordBlock(c.v, { big: false })}${settings().romaji && c.v.w !== c.v.r ? html`<div class="romaji">${toRomaji(c.v.r)}</div>` : ''}<a class="small" href="#/word/${encodeURIComponent(c.v.id)}">Details</a>`;
    case 'kanji':
      return kanjiBlock(c.k);
    case 'grammar': {
      const filled = c.q.q.replace('＿＿', `【${c.q.choices[c.q.answer]}】`);
      return html`<div class="cloze jp">${furi(filled)} ${audioBtn(plain(c.q.q.replace('＿＿', c.q.choices[c.q.answer])))}</div>
        <div class="g-answer"><span class="jp">${furi(c.p.title)}</span> — ${c.p.meaning}</div>
        <a class="small" href="#/grammar/${c.p.id}">Review this grammar point</a>`;
    }
    case 'phrase':
      return html`<div class="jp answer-jp">${furi(c.ph.jp)} ${audioBtn(c.ph.jp)}</div>${c.ph.note ? html`<div class="muted small prose">${proseHtml(c.ph.note)}</div>` : ''}`;
    default:
      return html``;
  }
}
