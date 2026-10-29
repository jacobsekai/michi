# Michi 道 — Japanese from zero to fluent

A free, offline, installable Japanese course (a Progressive Web App). Runs on iPhone, Android, Windows, macOS and Linux from a single codebase. No accounts, no ads, no tracking, and progress stays on the device.

## What's inside

- **Path**: lessons in teaching order. Start here (how Japanese works, sounds, scripts) → Hiragana → Katakana → JLPT N5 → N4 → N3 → N2 → N1 → Fluency. Each level interleaves kanji, vocabulary, grammar units and graded reading.
- **Reviews**: Anki-style spaced repetition (SM-2) for kana, words, kanji, grammar cloze sentences and Life & Work phrases.
- **Library**:
  - dictionary search (English, kana, kanji or romaji)
  - kana chart with audio
  - grammar, vocabulary and kanji browsers
  - graded reading
  - the **Life & Work in Japan** track (ward office, apartments, banking, job interviews, keigo, business email, taxes…)
- **Practice**: typed kana drill, listening drill, kanji-reading drill.
- **Audio**: the device's built-in Japanese text-to-speech, which works offline once the OS voice is installed.
- **Stroke order**: animated diagrams for every kanji and kana.
- **Backup**: export/import a JSON file to move progress between phone and computer.

## Install on a device

The app must be served over HTTPS once (any static host works, e.g. GitHub Pages). After the first visit it's cached and works offline.

- **iPhone/iPad**: open in Safari → Share → *Add to Home Screen*.
- **Android**: open in Chrome → menu → *Install app*.
- **Windows/Linux/ChromeOS**: Chrome or Edge → install icon in the address bar.
- **Mac**: Safari → File → *Add to Dock* (or Chrome's install icon).

## Develop

No build step is needed to run it. Serve the folder and open it:

```sh
python3 -m http.server 8765 --bind 127.0.0.1   # then open http://127.0.0.1:8765
```

After changing anything, regenerate the service worker so installed copies pick up the update:

```sh
node tools/build.mjs          # validates content/, copies it into data/, rewrites sw.js
```

Content lives in `content/*.json` (format: `content/SCHEMA.md`; per-unit sources in `content/parts/`, merged with `node tools/merge-parts.mjs <name>`). Vocabulary, kanji and stroke data are generated from open datasets:

```sh
python3 -I tools/build_data.py <downloads>/ .              # vocab-n*.json, kanji.json
python3 -I tools/build_strokes.py <kanjivg.xml.gz> .       # strokes.json
```

## Credits & licenses

- Vocabulary: [open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) (MIT), based on Jonathan Waller's JLPT lists ([tanos.co.uk](http://www.tanos.co.uk/jlpt/), CC BY).
- Kanji: [KANJIDIC](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) © EDRDG, CC BY-SA 4.0, via [kanji-data](https://github.com/davidluzgouveia/kanji-data) (MIT).
- Stroke order: [KanjiVG](https://kanjivg.tagaini.net) © Ulrich Apel, CC BY-SA 3.0.
- Lessons, stories and the Life & Work track were written for Michi.

JLPT levels are unofficial estimates; the JLPT hasn't published official lists since 2010.
