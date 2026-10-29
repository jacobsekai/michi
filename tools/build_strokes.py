#!/usr/bin/env python3
"""Builds data/strokes.json (stroke-order SVG paths) from KanjiVG.

Usage: python3 -I tools/build_strokes.py <kanjivg.xml.gz> <michi-dir>
KanjiVG (c) Ulrich Apel, CC BY-SA 3.0 — http://kanjivg.tagaini.net
"""
import gzip
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

src, root = Path(sys.argv[1]), Path(sys.argv[2])
wanted = {k['c'] for k in json.loads((root / 'data' / 'kanji.json').read_text(encoding='utf-8'))}
wanted |= {chr(c) for c in range(0x3041, 0x3097)} | {chr(c) for c in range(0x30A1, 0x30FB)}

num = re.compile(r'-?\d+\.\d+')
shorten = lambda d: num.sub(lambda m: f'{float(m.group()):.1f}'.rstrip('0').rstrip('.'), d)

out = {}
for _, el in ET.iterparse(gzip.open(src)):
    if el.tag != 'kanji':
        continue
    m = re.fullmatch(r'kvg:kanji_([0-9a-f]{5})', el.get('id', ''))
    if m:
        ch = chr(int(m.group(1), 16))
        if ch in wanted:
            out[ch] = [shorten(p.get('d')) for p in el.iter('path')]
    el.clear()

(root / 'data' / 'strokes.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
missing = sorted(wanted - out.keys())
print(f'{len(out)} characters with strokes; missing {len(missing)}: {"".join(missing[:60])}')
