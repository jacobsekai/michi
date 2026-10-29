#!/usr/bin/env python3
"""Builds data/vocab-n*.json and data/kanji.json from the open datasets.

Usage: python3 -I tools/build_data.py <downloads-dir> <michi-dir>
  <downloads-dir>/vocab/n1..n5.csv   jamsinclair/open-anki-jlpt-decks (MIT; Tanos JLPT lists, CC BY)
  <downloads-dir>/kanji/kanji.json   davidluzgouveia/kanji-data (MIT; KANJIDIC, CC BY-SA 4.0)
  <downloads-dir>/pitch/accents.txt   kanjium pitch accents (CC BY-SA 4.0)
Run tools/build_sentences.py afterwards: it adds example sentences and orders each level by frequency.
"""
import csv
import json
import re
import sys
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2]) / 'data'
out.mkdir(exist_ok=True)


def first(s):
    return re.split(r'[;、。\s]+', s.strip())[0]


KANJI = re.compile(r'[\u4e00-\u9fff々]')


def tidy(s):
    """Removes dictionary annotations from a headword or reading: '(かん)' interjection tags, '(する)',
    usage hints like '(みずを～)', and joins optional parts like 'コンタクト (レンズ)'."""
    s = re.sub(r'\s*\((かん|する)\)', '', s)
    s = re.sub(r'\s*\([^)]*[～〜を][^)]*\)\s*', '', s)
    s = re.sub(r'\s*\(([^)]*)\)\s*', r'\1', s)
    return s.strip()


def clean_pair(expr, reading):
    expr, reading = first(tidy(expr.split(';')[0])), first(tidy(reading.split(';')[0]))
    if KANJI.search(reading) and not KANJI.search(expr):
        expr, reading = reading, expr
    # Some suru-nouns carry する on the reading only: 運動 / うんどうする.
    if reading.endswith('する') and len(reading) > 2 and expr and KANJI.match(expr[-1]):
        reading = reading[:-2]
    return expr, reading


def clean_meaning(m):
    return re.sub(r'\s+', ' ', m).strip(' -')


# Pitch accent (kanjium, CC BY-SA 4.0): downstep mora number, first variant.
pitch = {}
with open(src / 'pitch' / 'accents.txt', encoding='utf-8') as f:
    for line in f:
        parts = line.rstrip('\n').split('\t')
        if len(parts) == 3 and parts[2].split(',')[0].isdigit():
            pitch.setdefault((parts[0], parts[1]), int(parts[2].split(',')[0]))
hira = lambda s: ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)

seen = set()
counts = {}
for n in [5, 4, 3, 2, 1]:
    words = []
    with open(src / 'vocab' / f'n{n}.csv', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            expr, reading = clean_pair(r['expression'], r['reading'])
            key = (expr, reading)
            if key in seen or not expr:
                continue
            seen.add(key)
            alts = [a.strip() for a in r['expression'].split(';')[1:] if a.strip()]
            p = pitch.get((expr, hira(reading)), pitch.get((hira(reading), hira(reading))))
            entry = [expr, reading, clean_meaning(r['meaning']), alts or None, p]
            while entry[-1] is None:
                entry.pop()
            words.append(entry)
    counts[f'N{n}'] = len(words)
    (out / f'vocab-n{n}.json').write_text(json.dumps(words, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

kanji = json.loads((src / 'kanji' / 'kanji.json').read_text(encoding='utf-8'))
rows = []
for ch, k in kanji.items():
    level = k.get('jlpt_new')
    grade = k.get('grade')
    if level is None:
        # Jōyō kanji outside the JLPT lists still matter for fluency: file them under N1.
        if grade is None or grade > 8:
            continue
        level = 1
    meanings = [m for m in k.get('meanings') or [] if 'Radical' not in m] or (k.get('meanings') or [])[:1]
    rows.append({
        'c': ch,
        'l': level,
        'm': meanings[:5],
        'on': k.get('readings_on') or [],
        'kun': k.get('readings_kun') or [],
        's': k.get('strokes'),
        'g': grade,
        'f': k.get('freq'),
    })
# Teach easier levels first, and frequent / low-grade kanji first within a level.
rows.sort(key=lambda r: (-r['l'], r['g'] or 99, r['f'] or 9999, r['s'] or 99))
(out / 'kanji.json').write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

from collections import Counter
print('vocab', counts, 'total', sum(counts.values()))
print('kanji', dict(sorted(Counter(r['l'] for r in rows).items(), reverse=True)), 'total', len(rows))
