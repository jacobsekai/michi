// Small DOM + text helpers shared by every view.

export const $ = (sel, root = document) => root.querySelector(sel);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// Tagged template that escapes interpolations unless wrapped with raw().
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(s);
export function html(strings, ...vals) {
  let out = strings[0];
  vals.forEach((v, i) => {
    if (Array.isArray(v)) out += v.map((x) => (x instanceof Raw ? x.s : esc(x))).join('');
    else if (v instanceof Raw) out += v.s;
    else if (v === false || v == null) out += '';
    else out += esc(v);
    out += strings[i + 1];
  });
  return raw(out);
}

// ---- furigana ---------------------------------------------------------------
// Content uses "漢字[かんじ]" notation: the bracket reading covers the run of kanji/digits before it.
const KANJI = '\\u4E00-\\u9FFF\\u3400-\\u4DBF々〆ヶヵ';
const RUN = new RegExp(`([0-9０-９${KANJI}]+)\\[([^\\]]*)\\]`, 'g');

export const plain = (s) => String(s ?? '').replace(RUN, '$1');
export const kanaOnly = (s) => String(s ?? '').replace(RUN, '$2');

// mode: 'on' (always shown), 'tap' (hidden until tapped), 'off' (never)
export function ruby(s, mode = 'on') {
  const text = String(s ?? '');
  if (mode === 'off') return esc(plain(text));
  let out = '';
  let last = 0;
  for (const m of text.matchAll(RUN)) {
    out += esc(text.slice(last, m.index));
    out += `<ruby>${esc(m[1])}<rt>${esc(m[2])}</rt></ruby>`;
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}

// Dictionary words come as (word, reading) pairs, e.g. 取り消す / とりけす. Line the kana in the word up
// with the reading so furigana sits only over the kanji: 取[と]り消[け]す. Falls back to one ruby over the whole word.
const hira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
export function wordRuby(w, r) {
  if (!w || w === r || !/[一-鿿々〆ヶ]/.test(w)) return esc(w);
  const parts = w.match(/[一-鿿々〆ヶ0-9０-９]+|[^一-鿿々〆ヶ0-9０-９]+/g);
  const isK = (p) => /[一-鿿々〆ヶ0-9０-９]/.test(p[0]);
  const re = new RegExp('^' + parts.map((p) => (isK(p) ? '(.+?)' : hira(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('') + '$');
  const m = hira(r).match(re);
  if (!m) return `<ruby>${esc(w)}<rt>${esc(r)}</rt></ruby>`;
  let g = 1;
  return parts.map((p) => (isK(p) ? `<ruby>${esc(p)}<rt>${esc(m[g++])}</rt></ruby>` : esc(p))).join('');
}

// Prose: English with {日本語[にほんご]} spans, **bold**, blank-line paragraphs and "- " bullets.
export function prose(s, mode = 'on') {
  const inline = (line) =>
    esc(line)
      .replace(/\{([^}]*)\}/g, (_, jp) => `<span class="jp">${ruby(unesc(jp), mode)}</span>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return String(s ?? '')
    .split(/\n\s*\n/)
    .map((para) => {
      const lines = para.split('\n');
      if (lines.every((l) => /^\s*- /.test(l))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*- /, ''))}</li>`).join('')}</ul>`;
      }
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('');
}
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

// ---- misc ------------------------------------------------------------------
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const sample = (arr, n) => shuffle(arr).slice(0, n);

export function toast(msg, ms = 2200) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}

export function fmtInterval(days) {
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 1440))}m`;
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export const isTyping = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName);
