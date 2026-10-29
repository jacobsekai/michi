# Michi 道 — Japanese from zero to fluent

A free, offline, installable Japanese course (a Progressive Web App). Runs on iPhone, Android, Windows, macOS and Linux from a single codebase. No accounts, no ads, no tracking, and progress stays on the device.

## What's inside

- **Path**: lessons in teaching order. Start here (how Japanese works, sounds, scripts) → Hiragana → Katakana → JLPT N5 → N4 → N3 → N2 → N1 → Fluency. Each level interleaves kanji, vocabulary, grammar units and graded reading.
- **Reviews**: FSRS-5 spaced repetition (the scheduler Anki uses) with a chosen target retention. Reviews are active recall by default: you type the reading, the Japanese or the meaning (built-in romaji → kana conversion) and it's checked for you; flashcard mode is optional. Leeches are detected and you can attach your own mnemonics to any card.
- **Exams**: JLPT-style mock exams for N5–N1 (vocabulary, grammar, reading, listening; scored /180 with sectional minimums), checkpoint quizzes inside every level, and an adaptive placement test.
- **Sync**: a transfer key you choose links any number of devices. Progress is encrypted on the device (PBKDF2 + AES-GCM) and stored by a tiny Cloudflare Worker (`worker/`) that never sees the key.
- **Library**:
  - dictionary search (English, kana, kanji or romaji)
  - kana chart with audio
  - grammar, vocabulary and kanji browsers
  - graded reading
  - the **Life & Work in Japan** track (ward office, apartments, banking, job interviews, keigo, business email, taxes…)
- **Practice**: typed kana drill, listening, kanji readings, dictation, shadowing (record yourself vs the model) and writing kanji from memory.
- **Context**: 1–3 real example sentences for most words (chosen so the other words are at or below your level), pitch-accent diagrams, and frequency-ordered vocabulary.
- **My words**: add words you meet in real life (sentence mining) and they join your reviews.
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
python3 -I tools/build_sentences.py <downloads>/ .         # sentences-n*.json, frequency order
python3 -I tools/build_strokes.py <kanjivg.xml.gz> .       # strokes.json
tools/deploy-sync.sh                                       # sync worker (after: npx wrangler login)
```

## Credits & licenses

- Vocabulary: [open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) (MIT), based on Jonathan Waller's JLPT lists ([tanos.co.uk](http://www.tanos.co.uk/jlpt/), CC BY).
- Kanji: [KANJIDIC](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) © EDRDG, CC BY-SA 4.0, via [kanji-data](https://github.com/davidluzgouveia/kanji-data) (MIT).
- Example sentences: [Tanaka Corpus](https://www.edrdg.org/wiki/index.php/Tanaka_Corpus) / [Tatoeba](https://tatoeba.org), CC BY 2.0 FR; readings via [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html) © EDRDG, CC BY-SA 4.0.
- Pitch accent: [Kanjium](https://github.com/mifunetoshiro/kanjium), CC BY-SA 4.0.
- Stroke order: [KanjiVG](https://kanjivg.tagaini.net) © Ulrich Apel, CC BY-SA 3.0.
- Lessons, stories and the Life & Work track were written for Michi.

JLPT levels are unofficial estimates; the JLPT hasn't published official lists since 2010.
