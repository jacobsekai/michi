// Checking typed answers: kana readings, romaji, and English meanings (with typo tolerance).
import { toHira, toKana } from './kana.js';
import { plain, kanaOnly } from './util.js';

const normKana = (s) => toHira(String(s)).replace(/[\s。、．.！!？?・〜～]/g, '');

const MACRONS = { ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ei', ō: 'ou', â: 'aa', î: 'ii', û: 'uu', ê: 'ei', ô: 'ou' };
export const demacron = (s) => s.replace(/[āīūēōâîûêô]/g, (c) => MACRONS[c]);

export function checkKana(input, accepted) {
  const a = normKana(toKana(demacron(input.trim().toLowerCase())));
  if (!a) return { ok: false, empty: true };
  const targets = accepted.map(normKana);
  if (targets.includes(a)) return { ok: true };
  // Close misses worth pointing out: long vowels, small っ, dakuten.
  const loose = (s) => s.replace(/(?<=.)[あいうえおー]/g, '').replace(/っ/g, '').normalize('NFD').replace(/[゙゚]/g, '');
  const close = targets.some((t) => loose(t) === loose(a));
  return { ok: false, close, typed: a };
}

const ROMAJI_ALTS = { shi: ['si'], chi: ['ti'], tsu: ['tu'], fu: ['hu'], ji: ['zi', 'di'], zu: ['du'], wo: ['o'], sha: ['sya'], shu: ['syu'], sho: ['syo'], cha: ['tya', 'cya'], chu: ['tyu', 'cyu'], cho: ['tyo', 'cyo'], ja: ['jya', 'zya'], ju: ['jyu', 'zyu'], jo: ['jyo', 'zyo'], n: ['nn'] };
export function checkRomaji(input, romaji) {
  const a = input.trim().toLowerCase();
  if (!a) return { ok: false, empty: true };
  return { ok: a === romaji || (ROMAJI_ALTS[romaji] || []).includes(a), typed: a };
}

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}
const normEn = (s) => s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/^\s*(to|a|an|the)\s+/, '').replace(/[^a-z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim();

// English meaning check: any listed gloss counts; small typos are forgiven.
export function checkMeaning(input, meanings) {
  const a = normEn(input);
  if (!a) return { ok: false, empty: true };
  const glosses = meanings.flatMap((m) => String(m).split(/[,;/]/)).map(normEn).filter(Boolean);
  const tol = (t) => (t.length >= 8 ? 2 : t.length >= 4 ? 1 : 0);
  const ok = glosses.some((g) => g === a || lev(g, a) <= tol(g) || (a.length >= 4 && g.split(' ').length > 1 && g.split(' ').includes(a)));
  return { ok, typed: input.trim() };
}

// Accepted answers for a grammar cloze choice: as written, or its kana reading.
export const grammarAnswers = (choice) => [plain(choice), kanaOnly(choice)];
