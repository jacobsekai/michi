#!/usr/bin/env python3
"""Picks real example sentences for every vocabulary word and adds furigana.

Usage: python3 -I tools/build_sentences.py <downloads-dir> <michi-dir>
  <downloads>/tanaka/examples.utf.gz   Tanaka Corpus / Tatoeba (CC BY 2.0 FR), A-lines + indexed B-lines
  <downloads>/jmdict/JMdict_e.gz       JMdict (EDRDG, CC BY-SA 4.0), for readings of unglossed headwords

Run after tools/build_data.py. Reorders data/vocab-n*.json by corpus frequency and
writes data/sentences-n5.json … n1.json: { "<word>|<reading>": [[jp, en], ...] }.
jp uses the app's bracket furigana, with the target word wrapped in ⟦…⟧.
Sentences are chosen "i+1": short, and the other words in them are at or below the target word's level.
"""
import gzip
import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

src, root = Path(sys.argv[1]), Path(sys.argv[2])
LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']
K = '一-鿿㐀-䶿々〆ヶ'
KANJI = re.compile(f'[{K}]')
PARTS = re.compile(f'[{K}0-9０-９]+|[^{K}0-9０-９]+')
hira = lambda s: ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)

# ---- JMdict: kanji headword -> first applicable reading ------------------------------
jm = {}
usually_kana = set()  # (kanji headword, reading) pairs whose first sense is "usually written using kana alone"
for _, el in ET.iterparse(gzip.open(src / 'jmdict' / 'JMdict_e.gz')):
    if el.tag != 'entry':
        continue
    kebs = [k.text for k in el.iter('keb')]
    first = el.find('sense')
    if first is not None and any('kana alone' in (m.text or '') for m in first.iter('misc')):
        usually_kana.update((k, hira(r.findtext('reb'))) for k in kebs for r in el.iter('r_ele'))
    rebs = [(r.findtext('reb'), [x.text for x in r.iter('re_restr')], r.find('re_nokanji') is not None) for r in el.iter('r_ele')]
    for k in kebs:
        if k in jm:
            continue
        for reb, restr, nok in rebs:
            if not nok and (not restr or k in restr):
                jm[k] = reb
                break
    el.clear()


def align(word, reading):
    """Split word into (text, reading-or-None) segments, e.g. 取り消す/とりけす -> 取:と り 消:け す."""
    parts = PARTS.findall(word)
    is_k = [bool(KANJI.search(p)) for p in parts]
    pat = '^' + ''.join('(.+?)' if k else re.escape(hira(p)) for p, k in zip(parts, is_k)) + '$'
    m = re.match(pat, hira(reading))
    if not m:
        return None
    g = iter(m.groups())
    return [(p, next(g) if k else None) for p, k in zip(parts, is_k)]


def annotate(surface, headword, reading):
    """Bracket-furigana for an (often inflected) surface form, using the headword's aligned reading."""
    if not KANJI.search(surface):
        return surface
    if not reading:
        return None
    segs = align(headword, reading)
    if not segs:
        return None
    kmap = [(t, r) for t, r in segs if r]
    out, i = '', 0
    for p in PARTS.findall(surface):
        if KANJI.search(p):
            if i >= len(kmap) or kmap[i][0] != p:
                return None
            out += f'{p}[{kmap[i][1]}]'
            i += 1
        else:
            out += p
    return out


# Keep the corpus friendly: skip sentences whose English contains crude or violent wording.
UNSUITABLE = re.compile(r"\b(fuck\w*|shit\w*|bitch\w*|bastard|damn|ass(hole)?|dick|cock|pussy|sex\w*|porn\w*|rape\w*|naked|nude|whore|slut|drugs?|cocaine|suicide|murder\w*|kill(s|ed|ing)?|corpse|nazi\w*|hitler)\b", re.I)

TOKEN = re.compile(r'^(?P<hw>[^(\[{~]+)(?:\((?P<rd>[^)]*)\))?(?:\[\d+\])?(?:\{(?P<sf>[^}]+)\})?~?$')

vocab = {}
for i, l in enumerate(LEVELS):
    for e in json.loads((root / 'data' / f'vocab-{l.lower()}.json').read_text(encoding='utf-8')):
        vocab.setdefault((e[0], hira(e[1])), i)
by_word = defaultdict(list)
for (w, r), lv in vocab.items():
    by_word[w].append((r, lv))

candidates = defaultdict(list)  # (w, r) -> [(score, jp, en)]
counts = defaultdict(int)  # (headword, reading) -> occurrences in the whole corpus
lines = gzip.open(src / 'tanaka' / 'examples.utf.gz', 'rt', encoding='utf-8').read().split('\n')
for a, b in zip(lines[0::2], lines[1::2]):
    if not (a.startswith('A: ') and b.startswith('B: ')):
        continue
    jp, _, en = a[3:].partition('\t')
    en = en.split('#ID=')[0].strip()
    toks = []
    for t in b[3:].split():
        m = TOKEN.match(t)
        if not m:
            break
        hw, rd, sf = m['hw'], m['rd'], m['sf'] or m['hw']
        if rd and rd.startswith('#'):
            rd = None
        toks.append((hw, rd or jm.get(hw) or (hw if not KANJI.search(hw) else None), sf))
    else:
        for hw, rd, _ in toks:
            counts[(hw, hira(rd or ''))] += 1
        if not (5 <= len(jp) <= 28) or not en or UNSUITABLE.search(en):
            continue
        # Rebuild the sentence with furigana by locating each surface form in order.
        out, cur, spans, ok = '', 0, [], True
        for hw, rd, sf in toks:
            pos = jp.find(sf, cur)
            ann = annotate(sf, hw, rd) if pos >= 0 else None
            if ann is None or KANJI.search(jp[cur:pos]):
                ok = False
                break
            out += jp[cur:pos]
            spans.append((len(out), len(out) + len(ann), hw, rd))
            out += ann
            cur = pos + len(sf)
        if not ok or KANJI.search(jp[cur:]):
            continue
        out += jp[cur:]
        levels = [vocab.get((hw, hira(rd or '')), 5 if KANJI.search(hw) else 0) for _, _, hw, rd in spans]
        for (s, e, hw, rd), lv in zip(spans, levels):
            for r, wl in by_word.get(hw, []):
                if rd and hira(rd) != r:
                    continue
                harder = max([x for x in levels if x != lv] + [0])
                # Prefer sentences whose other words are no harder than the target, then ones near 15 characters.
                score = max(0, harder - wl) * 100 + abs(len(jp) - 15)
                candidates[(hw, r)].append((score, out[:s] + '⟦' + out[s:e] + '⟧' + out[e:], en))

per_level = [dict() for _ in LEVELS]
orig = {}
for i, l in enumerate(LEVELS):
    for e in json.loads((root / 'data' / f'vocab-{l.lower()}.json').read_text(encoding='utf-8')):
        orig[(e[0], hira(e[1]))] = (i, f'{e[0]}|{e[1]}')
covered = 0
for key, cands in candidates.items():
    if key not in orig:
        continue
    i, wid = orig[key]
    seen, picked = set(), []
    for score, jp, en in sorted(cands):
        base = re.sub(r'[。、！？!?\s]', '', jp)
        if base in seen:
            continue
        seen.add(base)
        picked.append([jp, en])
        if len(picked) == 3:
            break
    per_level[i][wid] = picked
    covered += 1
renamed = {}  # old word id -> new id for words shown in kana
by_reading = defaultdict(int)
for (hw, rd), n in counts.items():
    by_reading[rd] += n
# Order each level's vocabulary by how often the word appears in the corpus, so lessons teach common words first.
for l in LEVELS:
    f = root / 'data' / f'vocab-{l.lower()}.json'
    words = json.loads(f.read_text(encoding='utf-8'))
    # Kana-only entries (よく, りっぱ) are indexed under kanji headwords in the corpus, so count those by reading.
    words.sort(key=lambda e: -(counts.get((e[0], hira(e[1])), 0) or (by_reading.get(hira(e[1]), 0) if e[0] == e[1] else 0)))
    for e in words:
        if (e[0], hira(e[1])) in usually_kana and KANJI.search(e[0]):
            renamed[f'{e[0]}|{e[1]}'] = f'{e[1]}|{e[1]}'
            while len(e) < 4:
                e.append(None)
            e[3] = [e[0]] + (e[3] or [])
            e[0] = e[1]
    # Renaming can make two entries identical (有る/在る -> ある); keep the more frequent one.
    ids = set()
    words = [e for e in words if not (f'{e[0]}|{e[1]}' in ids or ids.add(f'{e[0]}|{e[1]}'))]
    f.write_text(json.dumps(words, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
for i, l in enumerate(LEVELS):
    per_level[i] = {renamed.get(k, k): v for k, v in per_level[i].items()}
    (root / 'data' / f'sentences-{l.lower()}.json').write_text(json.dumps(per_level[i], ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(l, f'{len(per_level[i])} words with sentences')
print('total covered', covered, 'of', len(orig), '·', len(renamed), 'shown in kana')
