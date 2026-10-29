# Michi content schema

All content files are UTF-8 JSON in `content/`. Run `node tools/validate.mjs content/<file>.json` after writing — it must report 0 errors.

## Japanese text notation (furigana)

Every Japanese string ("jp" fields, "q" fields, "structure", inline Japanese) uses bracket furigana:
put the hiragana reading in `[...]` directly after a run of kanji.

    私[わたし]は日本語[にほんご]を勉強[べんきょう]しています。
    食[た]べる   今日[きょう]   一人[ひとり]   三時[さんじ]   3時[さんじ]   一ヶ月[いっかげつ]

Rules:
- EVERY kanji must be covered by a bracket. The validator rejects bare kanji.
- The bracket attaches to the whole run of consecutive kanji (and digits/々/ヶ) immediately before it. If two words touch, split them: `日本[にほん]語[ご]` or `日本語[にほんご]` are both fine.
- Readings are hiragana only (no katakana, no romaji, no spaces).
- Okurigana stays outside the bracket: `食[た]べる`, not `食べる[たべる]`.
- No spaces between Japanese words (Japanese doesn't use spaces), except where one is genuinely written.
- Inside English prose fields ("explanation", "notes", "summary", "intro", "tips"), wrap any Japanese in curly braces so the app can style it: `The particle {は} marks the topic, as in {私[わたし]は学生[がくせい]です}.` Kanji inside `{...}` also need brackets. Bare kanji outside `{...}` in prose are rejected too.
- A kana particle that is pronounced differently is written normally (は, へ, を); do not annotate kana.
- `**bold**` is allowed in prose. Paragraphs are separated by `\n\n`. Lines beginning with `- ` render as bullets.

## grammar-nX.json

```json
{
  "level": "N5",
  "units": [
    {
      "id": "n5-u01",
      "title": "Saying what things are",
      "summary": "One sentence describing the unit.",
      "points": [
        {
          "id": "n5-desu",
          "title": "です",
          "meaning": "to be (am / is / are), polite",
          "structure": "Noun + です",
          "explanation": "Prose, 60-200 words, in your own words.",
          "examples": [
            { "jp": "私[わたし]は学生[がくせい]です。", "en": "I am a student." }
          ],
          "notes": "Optional: common mistakes, nuance vs similar grammar, casual/formal variants.",
          "quiz": [
            {
              "q": "これはペン＿＿。",
              "en": "This is a pen.",
              "choices": ["です", "ます", "でした", "だった"],
              "answer": 0
            }
          ]
        }
      ]
    }
  ]
}
```

- `id`s are unique across the whole app: prefix with the level (`n5-`, `n4-`...).
- 3–5 examples per point, natural Japanese, increasing difficulty, vocabulary appropriate to the level or below.
- 2 quiz items per point. `q` contains exactly one blank written `＿＿` (two full-width low lines). `choices` has 4 options, `answer` is the 0-based index of the correct one. Distractors must be plausibly wrong (and actually wrong in context — only one choice may be grammatical/natural).
- Units group 4–8 related points in a sensible teaching order (simplest first, later points may build on earlier ones).

## reading.json

```json
{
  "passages": [
    {
      "id": "r-n5-01",
      "level": "N5",
      "title": "My Morning",
      "titleJp": "私[わたし]の朝[あさ]",
      "sentences": [
        { "jp": "私[わたし]は毎朝[まいあさ]六時[ろくじ]に起[お]きます。", "en": "I get up at six every morning." }
      ],
      "questions": [
        { "q": "What time does the writer get up?", "choices": ["5:00", "6:00", "7:00", "8:00"], "answer": 1 }
      ]
    }
  ]
}
```

## life.json  (Life & Work in Japan track)

```json
{
  "units": [
    {
      "id": "life-arrival",
      "title": "Arriving & the ward office",
      "level": "N5",
      "intro": "Prose: what this situation is like in Japan, what to expect, practical tips.",
      "phrases": [
        { "jp": "転入届[てんにゅうとどけ]を出[だ]したいんですが。", "en": "I'd like to file a moving-in notification.", "note": "Optional usage note." }
      ],
      "vocab": [
        { "jp": "在留[ざいりゅう]カード", "en": "residence card" }
      ],
      "dialogue": [
        { "speaker": "Staff", "jp": "...", "en": "..." }
      ],
      "tips": ["Short practical/cultural tip in English (may include {Japanese})."]
    }
  ]
}
```
