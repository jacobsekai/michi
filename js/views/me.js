// Progress stats and settings.
import { html, toast } from '../util.js';
import { D, LEVELS } from '../data.js';
import { S, settings, setSetting, streak, dayKey, exportData, importData, resetAll } from '../store.js';
import { forecast, stage } from '../srs.js';
import { japaneseVoices, speak, available } from '../tts.js';
import { applySettings } from '../ui.js';

export function statsView(root) {
  const srs = S().srs;
  const buckets = { learning: 0, young: 0, mature: 0, mastered: 0 };
  const byKind = {};
  for (const [id, c] of Object.entries(srs)) {
    buckets[stage(c)]++;
    const kind = { h: 'Kana', k: 'Kana', v: 'Words', w: 'Words (EN→JP)', j: 'Kanji', g: 'Grammar', p: 'Phrases' }[id[0]] || 'Other';
    byKind[kind] = (byKind[kind] || 0) + 1;
  }
  const fc = forecast(7);
  const max = Math.max(1, ...fc);
  const days = [];
  for (let i = 27; i >= 0; i--) {
    const k = dayKey(Date.now() - i * 86400e3);
    days.push([k, S().days[k]]);
  }
  const total = Object.values(S().days).reduce((a, d) => [a[0] + d.reviews, a[1] + d.correct], [0, 0]);
  const lvl = (l) => {
    const n = l.slice(1);
    const vocab = D.vocab[l];
    const kanji = D.kanji.filter((k) => String(k.l) === n);
    const points = D.grammar[l].units.flatMap((u) => u.points);
    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
    const v = vocab.filter((x) => srs[x.id]).length;
    const k = kanji.filter((x) => srs[`j:${x.c}`]).length;
    const g = points.filter((p) => srs[`g:${p.id}#0`]).length;
    return html`<tr><th>${l}</th>
      <td>${bar(pct(v, vocab.length))}<small>${v}/${vocab.length}</small></td>
      <td>${bar(pct(k, kanji.length))}<small>${k}/${kanji.length}</small></td>
      <td>${bar(pct(g, points.length))}<small>${g}/${points.length}</small></td></tr>`;
  };
  root.innerHTML = html`
    <h1>Progress</h1>
    <section class="grid3">
      <div class="tile"><div class="tile-num">🔥 ${streak()}</div><div class="tile-label">day streak</div></div>
      <div class="tile"><div class="tile-num">${Object.keys(srs).length}</div><div class="tile-label">items learned</div></div>
      <div class="tile"><div class="tile-num">${total[0] ? Math.round((total[1] / total[0]) * 100) : 0}%</div><div class="tile-label">review accuracy</div></div>
    </section>
    <section class="card">
      <h3>Memory strength</h3>
      <div class="buckets">
        ${Object.entries(buckets).map(([k, n]) => html`<div class="bucket b-${k}"><strong>${n}</strong><span>${k}</span></div>`)}
      </div>
      <p class="muted small">Learning: under a week · Young: 1–3 weeks · Mature: 3 weeks–3 months · Mastered: 3+ months between reviews.</p>
      <p class="small">${Object.entries(byKind).map(([k, n]) => `${k}: ${n}`).join(' · ') || 'Nothing learned yet.'}</p>
    </section>
    <section class="card">
      <h3>JLPT coverage</h3>
      <table class="levels"><thead><tr><th></th><th>Words</th><th>Kanji</th><th>Grammar</th></tr></thead><tbody>${LEVELS.map(lvl)}</tbody></table>
    </section>
    <section class="card">
      <h3>Reviews coming up</h3>
      <div class="forecast">${fc.map((n, i) => html`<div class="fc-col"><div class="fc-bar" style="height:${Math.round((n / max) * 100)}%"></div><small>${n}</small><small class="muted">${i === 0 ? 'Today' : new Date(Date.now() + i * 86400e3).toLocaleDateString(undefined, { weekday: 'short' })}</small></div>`)}</div>
    </section>
    <section class="card">
      <h3>Last 4 weeks</h3>
      <div class="heat">${days.map(([k, d]) => {
        const n = d ? d.reviews + d.learned : 0;
        const lv = n === 0 ? 0 : n < 20 ? 1 : n < 60 ? 2 : n < 150 ? 3 : 4;
        return html`<div class="heat-cell h${lv}" title="${k}: ${d?.reviews || 0} reviews, ${d?.learned || 0} new"></div>`;
      })}</div>
    </section>
    <a class="btn wide" href="#/settings">Settings</a>`.s;
}

const bar = (p) => html`<div class="progress thin"><div style="width:${p}%"></div></div>`;

export function settingsView(root) {
  const s = settings();
  const voices = japaneseVoices();
  const opt = (v, cur, label) => html`<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${label}</option>`;
  root.innerHTML = html`
    <h1>Settings</h1>
    <section class="card form">
      <h3>Learning</h3>
      <label>New items per day <select data-k="dailyNew">${[5, 10, 15, 20, 30, 40].map((n) => opt(n, s.dailyNew, n))}</select></label>
      <p class="muted small">15 a day reaches N2-level vocabulary in under two years. Reviews grow with this number — about 6–10× as many reviews as new items each day.</p>
      <label>Furigana (readings over kanji) <select data-k="furigana">${opt('on', s.furigana, 'Always show')}${opt('tap', s.furigana, 'Tap to show')}${opt('off', s.furigana, 'Hide')}</select></label>
      <label class="check"><input type="checkbox" data-k="romaji" ${s.romaji ? 'checked' : ''}> Show romaji for kana words (turn off once you read kana comfortably)</label>
      <label class="check"><input type="checkbox" data-k="reverseVocab" ${s.reverseVocab ? 'checked' : ''}> Also review new words English → Japanese (builds speaking; doubles word reviews)</label>
    </section>
    <section class="card form">
      <h3>Audio</h3>
      ${available() ? html`
        <label>Voice <select data-k="voice">${opt('', s.voice, 'Automatic')}${voices.map((v) => opt(v.name, s.voice, `${v.name}${v.localService ? '' : ' (online)'}`))}</select></label>
        <label>Speed <select data-k="rate">${[0.6, 0.75, 0.9, 1, 1.15].map((r) => opt(r, s.rate, `${r}×`))}</select></label>
        <label class="check"><input type="checkbox" data-k="autoAudio" ${s.autoAudio ? 'checked' : ''}> Play audio automatically</label>
        <button class="btn" data-act="test">Test voice: こんにちは</button>
        ${voices.length ? '' : html`<p class="note">No Japanese voice found on this device. Install one for offline audio: <strong>iPhone</strong> Settings → Accessibility → Spoken Content → Voices → Japanese. <strong>Android</strong> Settings → Text-to-speech → Google → Install voice data → Japanese. <strong>Windows</strong> Settings → Time & language → Speech → Add voices → Japanese. <strong>Mac</strong> System Settings → Accessibility → Spoken Content → System voice → Manage voices.</p>`}
      ` : html`<p class="muted">This browser doesn't support speech.</p>`}
    </section>
    <section class="card form">
      <h3>Appearance</h3>
      <label>Theme <select data-k="theme">${opt('auto', s.theme, 'Match device')}${opt('light', s.theme, 'Light')}${opt('dark', s.theme, 'Dark')}</select></label>
    </section>
    <section class="card form">
      <h3>Your data</h3>
      <p class="small">Progress is stored only on this device — no account, nothing sent anywhere. Export a backup regularly, and use it to move between phone and computer.</p>
      <div class="btn-row">
        <button class="btn primary" data-act="export">Export backup</button>
        <label class="btn">Import backup<input type="file" accept="application/json,.json" hidden data-act="import"></label>
      </div>
      <button class="btn danger" data-act="reset">Reset all progress</button>
    </section>
    <section class="card small">
      <h3>About</h3>
      <p>Michi (道, "the way") is free, offline, and has no ads or tracking.</p>
      <p>Vocabulary lists: <a href="https://github.com/jamsinclair/open-anki-jlpt-decks" target="_blank" rel="noopener">open-anki-jlpt-decks</a> (MIT), based on Jonathan Waller's JLPT lists (<a href="http://www.tanos.co.uk/jlpt/" target="_blank" rel="noopener">tanos.co.uk</a>, CC BY). Kanji data: <a href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project" target="_blank" rel="noopener">KANJIDIC</a> by the Electronic Dictionary Research and Development Group, CC BY-SA 4.0, via <a href="https://github.com/davidluzgouveia/kanji-data" target="_blank" rel="noopener">kanji-data</a> (MIT). Stroke order: <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener">KanjiVG</a> by Ulrich Apel, CC BY-SA 3.0. JLPT levels are unofficial estimates — the official lists haven't been published since 2010.</p>
      <p class="muted">Lessons, stories and the Life & Work track were written for Michi. If something looks wrong, trust a native speaker over the app.</p>
    </section>`.s;

  root.querySelectorAll('[data-k]').forEach((el) => el.addEventListener('change', () => {
    const k = el.dataset.k;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (k === 'dailyNew') v = +v;
    if (k === 'rate') v = +v;
    setSetting(k, v);
    applySettings();
    toast('Saved');
  }));
  root.querySelector('[data-act=test]')?.addEventListener('click', () => speak('こんにちは。日本語[にほんご]を勉強[べんきょう]しましょう。'));
  root.querySelector('[data-act=export]').onclick = exportData;
  root.querySelector('[data-act=import]').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      if (!confirm('Replace the progress on this device with this backup?')) return;
      importData(text);
      applySettings();
      toast('Backup restored');
      settingsView(root);
    } catch (err) {
      alert(`Couldn't import: ${err.message}`);
    }
  };
  root.querySelector('[data-act=reset]').onclick = () => {
    if (!confirm('Delete ALL progress on this device? This cannot be undone. (Export a backup first if unsure.)')) return;
    if (!confirm('Really delete everything?')) return;
    resetAll();
    applySettings();
    toast('Progress reset');
    location.hash = '#/';
  };
}

