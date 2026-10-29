// Hand-written intro lessons and stage descriptions. Prose uses {日本語[にほんご]} for inline Japanese.

export const FOUNDATIONS = {
  welcome: {
    id: 'f-welcome',
    title: 'Welcome: the road to fluency',
    sub: 'What fluency takes and how Michi gets you there',
    sections: [
      {
        h: 'You can do this',
        body: `Japanese has a reputation for being impossible. It isn't. It is **big** — new scripts, new sounds, a word order that runs backwards from English — but it is also very regular. Verbs barely have exceptions, there are no genders, no plurals to memorise, no articles, and pronunciation is simple and consistent once you know the kana.

What makes Japanese hard is mostly **volume**: thousands of words and about two thousand kanji. Volume is beaten by showing up every day, which is exactly what Michi is built for.`,
      },
      {
        h: 'How long does it take?',
        body: `Honest numbers: for a native English speaker, reaching comfortable professional Japanese usually takes somewhere around **2,000–4,000 hours** of total study and exposure. That sounds like a lot, but an hour a day plus some Japanese TV, games or reading adds up fast — most people who stay consistent reach conversational ability in 1–2 years and business level in 3–5.

The milestones you'll pass, using the JLPT (the Japanese-Language Proficiency Test) as a yardstick:
- **N5** — basic sentences, survival phrases, hiragana/katakana, ~100 kanji.
- **N4** — everyday conversation about familiar topics, ~300 kanji.
- **N3** — the bridge: you can follow everyday conversation and simple articles. Many part-time jobs become possible.
- **N2** — the level most Japanese companies ask for in job postings. You can work in Japanese.
- **N1** — newspapers, contracts, meetings, nuance. Close to fluent in reading.`,
      },
      {
        h: 'How Michi works',
        body: `Michi has three parts that work together:
- **Path** — lessons in a sensible order: sounds → hiragana → katakana → N5 → N4 → N3 → N2 → N1. Each JLPT level mixes grammar, vocabulary, kanji and reading.
- **Reviews** — everything you learn becomes a flashcard that comes back just before you'd forget it (spaced repetition). Do your reviews every day; it's the single most important habit.
- **Library** — the kana chart, a dictionary, reading practice and the **Life & Work in Japan** track for living there.

A good daily routine: **reviews first**, then one or two new lessons (about 15 new items), then 10 minutes of reading or listening. If reviews pile up, skip new lessons for a day — never skip reviews.`,
      },
      {
        h: 'Two tips before you start',
        body: `- **Say everything out loud.** Tap the speaker icons. Speaking while you study wires the sounds in far better than reading silently.
- **Romaji is training wheels.** Michi shows romaji (Japanese in English letters) only while you learn the kana. Within a couple of weeks you'll read real Japanese script, and that's what Japan uses — street signs, menus and job ads are never in romaji.

Your progress is saved on this device. Use **Settings → Export backup** now and then, and to move between your phone and computer.`,
      },
    ],
    quiz: [
      { q: 'What is the most important daily habit in Michi?', choices: ['Doing your reviews', 'Learning 50 new words', 'Reading romaji', 'Taking the JLPT'], answer: 0 },
      { q: 'Which JLPT level do most Japanese companies ask for?', choices: ['N5', 'N4', 'N2', 'None'], answer: 2 },
    ],
  },

  howItWorks: {
    id: 'f-structure',
    title: 'How a Japanese sentence works',
    sub: 'Word order, particles and politeness — the big picture',
    sections: [
      {
        h: 'The verb goes last',
        body: `English says *I eat sushi* (subject–verb–object). Japanese puts the verb at the very end: *I sushi eat*.

{私[わたし]はすしを食[た]べます。} — watashi wa sushi o tabemasu — "I eat sushi."

Everything else in the sentence leads up to the verb. A handy result: you always know a Japanese sentence is finished when you hear the verb (or {です}).`,
        examples: [
          { jp: '私[わたし]はすしを食[た]べます。', en: 'I eat sushi.', ro: 'watashi wa sushi o tabemasu' },
          { jp: '田中[たなか]さんは東京[とうきょう]に行[い]きます。', en: 'Mr./Ms. Tanaka goes to Tokyo.', ro: 'tanaka-san wa toukyou ni ikimasu' },
        ],
      },
      {
        h: 'Particles are labels',
        body: `Instead of relying on word order, Japanese tags each word with a small **particle** that says what job it does. Think of them as sticky labels placed *after* the word:
- {は} (pronounced *wa*) — the topic: "as for…"
- {を} (pronounced *o*) — the thing acted on
- {に} — a destination or a time
- {で} — where something happens, or by what means
- {の} — "of / 's"

Because the labels carry the meaning, word order is flexible as long as the verb stays at the end. You'll learn each particle properly in N5.`,
      },
      {
        h: 'Leave out what\'s obvious',
        body: `Japanese happily drops anything clear from context — especially "I" and "you". {食[た]べます。} alone is a full sentence: "(I) eat." / "(Someone) will eat." Saying {私[わたし]は} all the time actually sounds a bit unnatural.

There are also **no articles** (a/the) and usually **no plurals**: {本[ほん]} is "book", "a book", "the books" — context decides.`,
      },
      {
        h: 'Politeness is built into the grammar',
        body: `The same sentence changes form depending on who you're talking to:
- **Polite** — {食[た]べます} — for strangers, coworkers, shops. Learn this first; it's always safe.
- **Plain/casual** — {食[た]べる} — for friends and family, and inside longer sentences.
- **Keigo (honorific)** — {召[め]し上[あ]がります} — for customers and senior people at work.

You'll learn polite style first, plain style in N5, and keigo gradually from N4 to N2 — which is exactly the order you'll need them living in Japan.`,
      },
    ],
    quiz: [
      { q: 'Where does the verb go in a Japanese sentence?', choices: ['At the start', 'After the subject', 'At the end', 'Anywhere'], answer: 2 },
      { q: 'What do particles like は and を do?', choices: ['Mark questions', 'Label the role of the word before them', 'Make words plural', 'Show politeness'], answer: 1 },
      { q: 'Which style should you learn first for life in Japan?', choices: ['Casual', 'Polite (ます/です)', 'Keigo', 'Classical'], answer: 1 },
    ],
  },

  sounds: {
    id: 'f-sounds',
    title: 'The sounds of Japanese',
    sub: 'Five vowels, even rhythm, and the few tricky sounds',
    sections: [
      {
        h: 'Just five vowels',
        body: `Japanese has only five vowel sounds, and they never change:
- **a** as in *father*
- **i** as in *machine*
- **u** as in *food*, but with relaxed, unrounded lips
- **e** as in *get*
- **o** as in *old* (short, no "w" glide)

Every syllable ends in a vowel, except the single consonant {ん} (n). That's why loanwords get extra vowels: "McDonald's" becomes {マクドナルド} *ma-ku-do-na-ru-do*.`,
        examples: [
          { jp: 'あいうえお', en: 'a, i, u, e, o', ro: 'a i u e o' },
          { jp: 'マクドナルド', en: "McDonald's", ro: 'makudonarudo' },
        ],
      },
      {
        h: 'Even rhythm: every beat counts',
        body: `Japanese is timed in **beats** (called *mora*), each about the same length. {き} is one beat; {きって} (*kitte*, stamp) is three: ki–t–te. The pause in the middle is a full beat.

Length changes meaning, so these pairs are different words:
- {おばさん} (aunt) vs {おばあさん} (grandmother) — long vowel
- {きて} (come) vs {きって} (stamp) — double consonant
- {ビル} (building) vs {ビール} (beer) — long vowel

Hold long vowels and double consonants for a full extra beat.`,
        examples: [
          { jp: 'おばさん', en: 'aunt', ro: 'obasan' },
          { jp: 'おばあさん', en: 'grandmother', ro: 'obaasan' },
          { jp: 'きて', en: 'come (and…)', ro: 'kite' },
          { jp: 'きって', en: 'postage stamp', ro: 'kitte' },
          { jp: 'ビル', en: 'building', ro: 'biru' },
          { jp: 'ビール', en: 'beer', ro: 'biiru' },
        ],
      },
      {
        h: 'The tricky consonants',
        body: `- **r** — a light tap of the tongue behind the teeth, between English *r*, *l* and *d*. Like the *tt* in American *butter*.
- **f** ({ふ}) — blow softly through barely-parted lips, without touching your teeth.
- **tsu** ({つ}) — like the end of *cats*, then *u*.
- **n** ({ん}) — a full beat on its own; it shifts to *m* before b/p/m: {さんぽ} sounds like *sampo*.
- **Whispered vowels** — *i* and *u* between voiceless consonants often fade: {です} sounds like *dess*, {すき} like *ski*.`,
        examples: [
          { jp: 'ありがとう', en: 'thank you', ro: 'arigatou' },
          { jp: 'ふじさん', en: 'Mount Fuji', ro: 'fujisan' },
          { jp: 'です', en: 'is (polite)', ro: 'desu' },
          { jp: 'さんぽ', en: 'a walk', ro: 'sanpo' },
        ],
      },
      {
        h: 'Pitch, not stress',
        body: `English stresses syllables (*PHO-to-graph*). Japanese instead uses **high and low pitch**, and keeps volume even. {はし} with high–low pitch is "chopsticks"; low–high is "bridge". Don't worry about memorising pitch now — listen to the audio, copy what you hear, and context will almost always make you understood.`,
      },
    ],
    quiz: [
      { q: 'How many beats is きって (stamp)?', choices: ['1', '2', '3', '4'], answer: 2 },
      { q: 'おばあさん means…', choices: ['aunt', 'grandmother', 'sister', 'mother'], answer: 1 },
      { q: 'The Japanese "r" sounds most like…', choices: ['The English r in "red"', 'A tongue-tap, like tt in American "butter"', 'A rolled Spanish rr', 'An English w'], answer: 1 },
    ],
  },

  scripts: {
    id: 'f-scripts',
    title: 'Three scripts working together',
    sub: 'Hiragana, katakana and kanji',
    sections: [
      {
        h: 'One sentence, three scripts',
        body: `Look at this ordinary sentence:

{私[わたし]はコーヒーを飲[の]みます。} — "I drink coffee."

It mixes three writing systems:
- **Kanji** ({私}, {飲}) — Chinese-origin characters that carry meaning: nouns, verb and adjective stems.
- **Hiragana** ({は}, {を}, {みます}) — a curvy phonetic script for grammar: particles, verb endings, and native words.
- **Katakana** ({コーヒー}) — an angular phonetic script for foreign loanwords, names and emphasis.`,
        examples: [{ jp: '私[わたし]はコーヒーを飲[の]みます。', en: 'I drink coffee.', ro: 'watashi wa koohii o nomimasu' }],
      },
      {
        h: 'Kana first',
        body: `Hiragana and katakana each have **46 basic characters**, and each one is a single sound — like an alphabet of syllables. With those two you can read and write *anything* in Japanese (children's books are written entirely in kana).

Most learners can read hiragana within a week and katakana within another. That's your next step. Michi teaches them in small rows, with a memory hint for each shape.`,
      },
      {
        h: 'Then kanji, steadily',
        body: `Kanji are learned gradually over your whole journey: about 100 for N5, 2,000+ for full literacy. Small reading hints called **furigana** appear above kanji: {日本語[にほんご]}. In Settings you can make furigana always visible, tap-to-show, or hidden as you get stronger.

Kanji look scary, but they're built from a few hundred recurring parts, and they actually make reading *faster* — once you know them you can skim Japanese text very quickly.`,
      },
    ],
    quiz: [
      { q: 'Which script is used mainly for foreign loanwords like コーヒー?', choices: ['Hiragana', 'Katakana', 'Kanji', 'Romaji'], answer: 1 },
      { q: 'Which script is used for particles and verb endings?', choices: ['Hiragana', 'Katakana', 'Kanji', 'Romaji'], answer: 0 },
      { q: 'What are furigana?', choices: ['A type of kanji', 'Small kana readings written above kanji', 'Katakana loanwords', 'Polite verb endings'], answer: 1 },
    ],
  },

  kanji: {
    id: 'f-kanji',
    title: 'How kanji work',
    sub: 'Meanings, readings and how to learn them',
    sections: [
      {
        h: 'Meaning first',
        body: `Each kanji carries a meaning: {山[やま]} mountain, {川[かわ]} river, {人[ひと]} person. Many started as pictures, and complicated kanji are usually combinations of simpler parts. {休[やす]む} (to rest) is {人} person + {木} tree — a person resting against a tree.`,
        examples: [
          { jp: '山[やま]', en: 'mountain', ro: 'yama' },
          { jp: '休[やす]む', en: 'to rest', ro: 'yasumu' },
        ],
      },
      {
        h: 'On-yomi and kun-yomi',
        body: `Most kanji have two kinds of readings:
- **Kun-yomi** (native Japanese) — usually when the kanji stands alone or has hiragana attached: {山[やま]}, {食[た]べる}.
- **On-yomi** (from old Chinese) — usually in compound words of two or more kanji: {富士山[ふじさん]} (Mount Fuji), {食事[しょくじ]} (meal).

Don't try to memorise every reading of every kanji in isolation. **Learn readings through words.** Michi's kanji lessons show the main readings and real example words, and your vocabulary lessons do the heavy lifting.`,
        examples: [
          { jp: '食[た]べる', en: 'to eat (kun-yomi)', ro: 'taberu' },
          { jp: '食事[しょくじ]', en: 'a meal (on-yomi)', ro: 'shokuji' },
        ],
      },
      {
        h: 'Writing',
        body: `Kanji follow consistent stroke-order rules: top to bottom, left to right, horizontal before vertical, outside before inside (but close the box last). Writing a kanji by hand a few times — on paper or with your finger — helps it stick. You'll mostly *type* Japanese in daily life, though, so recognition matters more than handwriting.`,
      },
    ],
    quiz: [
      { q: 'In the word 食事 (meal), the kanji are read with…', choices: ['Kun-yomi', 'On-yomi', 'Romaji', 'Katakana'], answer: 1 },
      { q: 'The best way to learn kanji readings is…', choices: ['Memorise every reading of each kanji', 'Through real words that use them', 'Ignore readings', 'Only through romaji'], answer: 1 },
    ],
  },

  beyond: {
    id: 'f-beyond',
    title: 'Beyond the textbook: becoming fluent',
    sub: 'Immersion, output and living in Japanese',
    sections: [
      {
        h: 'Fluency comes from input',
        body: `Courses (including this one) give you the skeleton: grammar, core vocabulary and kanji. Fluency comes from **thousands of hours of real Japanese** that you actually understand. From N4 onwards, add native material you enjoy:
- **Listening:** podcasts for learners, then YouTube, dramas and anime with Japanese subtitles.
- **Reading:** graded readers, NHK's easy news, manga, then novels and news sites.
- **Games:** Japanese-language games are fantastic reading practice.

Aim for material where you understand about 80–90%. Too easy is boring; too hard teaches nothing.`,
      },
      {
        h: 'Speaking and writing',
        body: `Comprehension runs ahead of speaking — that's normal. To build output:
- **Shadowing:** play a sentence and repeat it immediately, copying rhythm and pitch. Use Michi's audio buttons this way.
- **Talk to people:** language exchange partners and online tutors are affordable and very effective from N4 up.
- **Write a little every day:** a three-line diary in Japanese, then ask a native speaker or tutor to correct it.`,
      },
      {
        h: 'Preparing for life and work in Japan',
        body: `- Work through the **Life & Work in Japan** track in the Library alongside your JLPT levels — it covers the ward office, apartments, banking, job interviews, business email and keigo.
- The **JLPT** is held in July and December (in many countries too). N2 opens most doors; N1 helps for competitive roles and some visa points.
- Many tech and English-teaching jobs hire at lower levels, but daily life is far easier — and more fun — with N3+.
- Keep reviewing. Even fluent speakers keep a small daily kanji/vocab habit.`,
      },
    ],
    quiz: [
      { q: 'What builds fluency beyond a course?', choices: ['Only grammar drills', 'Large amounts of real Japanese you understand', 'Memorising dictionaries', 'Romaji practice'], answer: 1 },
      { q: 'What is "shadowing"?', choices: ['Repeating audio immediately, copying rhythm and pitch', 'Reading silently', 'Writing kanji', 'Watching without sound'], answer: 0 },
    ],
  },
};

export const STAGE_INFO = {
  start: { title: 'Start here', blurb: 'How Japanese works, its sounds, and how to study.' },
  hira: { title: 'Hiragana', blurb: 'The main phonetic script. ~1 week.' },
  kata: { title: 'Katakana', blurb: 'The script for loanwords and names. ~1 week.' },
  N5: { title: 'N5 · Beginner', blurb: 'Basic sentences, polite speech, survival Japanese. You can introduce yourself, shop, and ask simple questions.' },
  N4: { title: 'N4 · Elementary', blurb: 'Everyday conversation, plain speech, conditionals, giving & receiving, first keigo.' },
  N3: { title: 'N3 · Intermediate', blurb: 'The bridge to real Japanese: follow daily conversations, read simple articles, start part-time work.' },
  N2: { title: 'N2 · Upper intermediate', blurb: 'Working level. The JLPT level most companies in Japan ask for.' },
  N1: { title: 'N1 · Advanced', blurb: 'News, business documents, literature and nuance — the top of the JLPT.' },
  beyond: { title: 'Fluency', blurb: 'Immersion, speaking practice and living in Japanese.' },
};
