// Kana tables, lesson groups, memory hints and romaji conversion.

const ROWS = [
  ['あいうえお', 'a i u e o'],
  ['かきくけこ', 'ka ki ku ke ko'],
  ['さしすせそ', 'sa shi su se so'],
  ['たちつてと', 'ta chi tsu te to'],
  ['なにぬねの', 'na ni nu ne no'],
  ['はひふへほ', 'ha hi fu he ho'],
  ['まみむめも', 'ma mi mu me mo'],
  ['やゆよ', 'ya yu yo'],
  ['らりるれろ', 'ra ri ru re ro'],
  ['わを', 'wa wo'],
  ['ん', 'n'],
];
const DAKUTEN = [
  ['がぎぐげご', 'ga gi gu ge go'],
  ['ざじずぜぞ', 'za ji zu ze zo'],
  ['だぢづでど', 'da ji zu de do'],
  ['ばびぶべぼ', 'ba bi bu be bo'],
  ['ぱぴぷぺぽ', 'pa pi pu pe po'],
];
const YOON_BASE = 'き:k し:sh ち:ch に:n ひ:h み:m り:r ぎ:g じ:j び:b ぴ:p';
const EXTENDED_KATA = [
  ['ファ', 'fa'], ['フィ', 'fi'], ['フェ', 'fe'], ['フォ', 'fo'], ['ティ', 'ti'], ['ディ', 'di'],
  ['トゥ', 'tu'], ['ドゥ', 'du'], ['ウィ', 'wi'], ['ウェ', 'we'], ['ウォ', 'wo'], ['シェ', 'she'],
  ['ジェ', 'je'], ['チェ', 'che'], ['ヴァ', 'va'], ['ヴィ', 'vi'], ['ヴ', 'vu'], ['ヴェ', 've'],
  ['ヴォ', 'vo'], ['ツァ', 'tsa'], ['デュ', 'dyu'], ['フュ', 'fyu'],
];

export const toKata = (s) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
export const toHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

const pairs = (kana, roma) => [...kana].map((k, i) => [k, roma.split(' ')[i]]);
const BASIC = ROWS.flatMap(([k, r]) => pairs(k, r));
const VOICED = DAKUTEN.flatMap(([k, r]) => pairs(k, r));
const YOON = YOON_BASE.split(' ').flatMap((x) => {
  const [k, c] = x.split(':');
  const plainY = c === 'sh' || c === 'ch' || c === 'j';
  return [['ゃ', 'a'], ['ゅ', 'u'], ['ょ', 'o']].map(([s, v]) => [k + s, plainY ? c + v : c + 'y' + v]);
});

// For the kana chart.
export const CHART = {
  basic: ROWS.map(([k, r]) => pairs(k, r)),
  voiced: DAKUTEN.map(([k, r]) => pairs(k, r)),
  yoon: YOON_BASE.split(' ').map((x) => YOON.filter(([k]) => k[0] === x[0])),
  extended: EXTENDED_KATA,
};

// Original memory hints. Keep them short — they're a crutch to drop once the shape sticks.
export const HINTS = {
  あ: 'A cross with a big loop, like someone tangled in string yelling "Ah!"',
  い: 'Two short sticks side by side — like the letters "ii".',
  う: 'A person hunched over a sore stomach groaning "ooh".',
  え: 'A bird with a tall crest tilting its head: "Eh?"',
  お: 'Like あ but with an extra flick on the side — "Oh, there\'s one more piece!"',
  か: 'A blade making a "ka!" chop, with a little spark beside it.',
  き: 'An old key with two teeth.',
  く: 'An open bird beak going "coo".',
  け: 'A keg standing next to a post.',
  こ: 'Two short worms lying parallel — a co-pair.',
  さ: 'A cross over a curved line — a sad face looking down.',
  し: 'A fishhook: she is fishing.',
  す: 'A rope with a loop, swinging: "swoosh".',
  せ: 'A wide-open mouth with one fang: "say ahh".',
  そ: 'A zig-zag of thread: sew-sew.',
  た: 'The letters t and a squeezed together: "ta".',
  ち: 'Looks like the number 5 — a cheeky chi.',
  つ: 'A tsunami wave curling over.',
  て: 'An arm reaching out — て sounds like 手 (hand).',
  と: 'A toe with a splinter in it.',
  な: 'A nun kneeling by a cross, with a loop below.',
  に: 'A post next to two lines — に (ni) means two.',
  ぬ: 'Tangled noodles with a loop at the end.',
  ね: 'A cat (neko) curling its tail into a loop.',
  の: 'A "no entry" sign: one swirl.',
  は: 'A post next to a little laughing face: "ha!"',
  ひ: 'A wide grin: "hee hee".',
  ふ: 'Mount Fuji with puffs of cloud around it.',
  へ: 'A small hill — "heh, that\'s it?"',
  ほ: 'Like は with an extra roof line: a ho-house.',
  ま: 'A mama with arms out and a round belly.',
  み: 'A lazily written "21" — "me at 21".',
  む: 'A cow\'s face with a tail: "moo".',
  め: 'An eye — め (me) means eye — with a curl like a tear.',
  も: 'A fishing hook with more bait on it.',
  や: 'A yak\'s horns poking out.',
  ゆ: 'A fish swimming through a U-turn: "you".',
  よ: 'A yo-yo hanging from a finger.',
  ら: 'A rabbit sitting, one ear up.',
  り: 'Two reeds standing by a river.',
  る: 'A road ending in a roundabout loop.',
  れ: 'A person kneeling with one leg kicked out.',
  ろ: 'Like る but no loop — a road with no roundabout.',
  わ: 'Like ね but without the loop: the cat lost its tail — "wah!"',
  を: 'Someone struggling with a heavy load: "whoa".',
  ん: 'A lowercase cursive n.',
  ア: 'An axe.',
  イ: 'An easel standing on the floor.',
  ウ: 'う with a roof on it — a wooden hut, "ooh".',
  エ: 'An I-beam in an elevator shaft.',
  オ: 'An opera singer with arms flung out.',
  カ: 'か without the spark — a clean cut.',
  キ: 'A key with two notches.',
  ク: 'The handle of a cooking pot.',
  ケ: 'A crooked K.',
  コ: 'A corner of a box.',
  サ: 'A saddle on two posts.',
  シ: 'Two dots and a stroke sweeping UP from the bottom-left: she smiles. (Compare ツ.)',
  ス: 'A superhero mid-stride.',
  セ: 'Same idea as せ, but angular.',
  ソ: 'A needle sewing DOWN from the top. (Compare ン.)',
  タ: 'ク with an extra stroke inside — a taco shell.',
  チ: 'A cheerleader with a hat.',
  ツ: 'Two dots on TOP and a stroke falling down: a tsunami. (Compare シ.)',
  テ: 'A telephone pole.',
  ト: 'A totem pole with a branch.',
  ナ: 'A knife crossing a line.',
  ニ: 'Two lines — ni is two.',
  ヌ: 'Chopsticks pulling noodles.',
  ネ: 'A necktie hanging off a hook.',
  ノ: 'A single slash: no.',
  ハ: 'Two lines bursting apart in laughter: ha!',
  ヒ: 'A heel kicking backwards.',
  フ: 'A fuse folding over.',
  ヘ: 'Same as へ.',
  ホ: 'A holy cross with two dots.',
  マ: 'Mama\'s nose and chin.',
  ミ: 'Three lines — mi as in mittsu (three).',
  ム: 'A cow\'s nose: "moo".',
  メ: 'An X marking me on the map.',
  モ: 'も without the hook.',
  ヤ: 'A yak horn, like や.',
  ユ: 'A U-turn sign on its side.',
  ヨ: 'A backwards E doing a yo-yo trick.',
  ラ: 'A rabbit with a flat lid on its head.',
  リ: 'Like り — two reeds.',
  ル: 'Two roots growing down.',
  レ: 'A leg kicking to the right.',
  ロ: 'A square robot head.',
  ワ: 'A wine glass.',
  ヲ: 'ワ with an extra bar — whoa, heavy.',
  ン: 'A stroke rising UP like ソ flipped — an "N" sound. (Compare ソ.)',
};

// Lesson groups. Each kana id is "h:<kana>" or "k:<kana>".
function groups(script) {
  const conv = script === 'k' ? toKata : (x) => x;
  const g = (title, list) => ({ title, items: list.map(([k, r]) => ({ id: `${script}:${conv(k)}`, kana: conv(k), romaji: r })) });
  const row = (i) => pairs(...ROWS[i]);
  const out = [
    g('a i u e o', row(0)),
    g('k-row', row(1)),
    g('s-row', row(2)),
    g('t-row', row(3)),
    g('n-row', row(4)),
    g('h-row', row(5)),
    g('m-row', row(6)),
    g('y-row & r-row', [...row(7), ...row(8)]),
    g('w-row & ん', [...row(9), ...row(10)]),
    g('Voiced: g, z, d', VOICED.slice(0, 15)),
    g('Voiced: b & p', VOICED.slice(15)),
    g('Combos (きゃ, しゅ…)', YOON.slice(0, 15)),
    g('More combos', YOON.slice(15)),
  ];
  if (script === 'k') out.push({ title: 'Extended katakana (ファ, ティ…)', items: EXTENDED_KATA.map(([k, r]) => ({ id: `k:${k}`, kana: k, romaji: r })) });
  return out;
}
export const KANA_GROUPS = { h: groups('h'), k: groups('k') };
export const ALL_KANA = [...KANA_GROUPS.h, ...KANA_GROUPS.k].flatMap((g) => g.items);
export const KANA_BY_ID = Object.fromEntries(ALL_KANA.map((k) => [k.id, k]));

// ---- kana -> romaji (Hepburn-ish, for display & search) --------------------
const K2R = new Map();
for (const [k, r] of [...BASIC, ...VOICED, ...YOON, ...EXTENDED_KATA.map(([k, r]) => [toHira(k), r])]) K2R.set(k, r);
const SMALL = { ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ゎ: 'wa' };

export function toRomaji(input) {
  const s = toHira(String(input));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    const ch = s[i];
    if (ch === 'っ') {
      const next = K2R.get(s.slice(i + 1, i + 3)) || K2R.get(s[i + 1]) || '';
      out += next.startsWith('ch') ? 't' : next[0] || '';
      continue;
    }
    if (ch === 'ー') { out += out.slice(-1); continue; }
    if (ch === 'ん') { out += /^[aiueoy]/.test(K2R.get(s[i + 1]) || '') ? "n'" : 'n'; continue; }
    if (K2R.has(two)) { out += K2R.get(two); i++; continue; }
    if (K2R.has(ch)) out += K2R.get(ch);
    else if (SMALL[ch]) out += SMALL[ch];
    else out += ch;
  }
  return out;
}

// ---- romaji -> hiragana (for search) ----------------------------------------
const R2K = [...K2R.entries()].map(([k, r]) => [r, k]);
R2K.unshift(['si', 'し'], ['ti', 'ち'], ['tu', 'つ'], ['hu', 'ふ'], ['zi', 'じ'], ['di', 'ぢ'], ['du', 'づ'], ['jya', 'じゃ'], ['jyu', 'じゅ'], ['jyo', 'じょ'], ['sya', 'しゃ'], ['syu', 'しゅ'], ['syo', 'しょ'], ['tya', 'ちゃ'], ['tyu', 'ちゅ'], ['tyo', 'ちょ'], ["n'", 'ん'], ['-', 'ー'], ['wo', 'を']);
R2K.sort((a, b) => b[0].length - a[0].length);

// ime: leave an unfinished syllable ("k", "ky", a final "n") as latin so typing can continue.
export function toKana(input, { ime = false } = {}) {
  let s = String(input).toLowerCase();
  let out = '';
  while (s) {
    if (s.length > 1 && s[0] === s[1] && /[bcdfghjkmpqrstvwxz]/.test(s[0])) { out += 'っ'; s = s.slice(1); continue; }
    if (ime && /^[a-z']+$/.test(s) && R2K.some(([r]) => r.length > s.length && r.startsWith(s))) { out += s; break; }
    const hit = R2K.find(([r]) => s.startsWith(r));
    if (hit) { out += hit[1]; s = s.slice(hit[0].length); continue; }
    if (s[0] === 'n') { out += 'ん'; s = s.slice(1); continue; }
    out += s[0];
    s = s.slice(1);
  }
  return out;
}
