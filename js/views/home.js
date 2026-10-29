// Home dashboard and the learning path.
import { html } from '../util.js';
import { D } from '../data.js';
import { S, settings, today, streak } from '../store.js';
import { dueCount, isLearned } from '../srs.js';
import { nextNode } from './lesson.js';

const TYPE_LABEL = { foundation: 'Lesson', kana: 'Kana', vocab: 'Vocabulary', kanji: 'Kanji', grammar: 'Grammar', reading: 'Reading', exam: 'Exam' };

export function homeView(root) {
  const due = dueCount();
  const next = nextNode();
  const t = today();
  const st = streak();
  const fresh = !Object.keys(S().done).length;
  const learnedToday = t.learned;
  const goal = settings().dailyNew;
  const stage = next && D.path.find((s) => s.id === next.stage);

  root.innerHTML = html`
    <header class="home-head">
      <div>
        <div class="brand jp">道 <span>Michi</span></div>
        <div class="muted small">Japanese, from zero to fluent</div>
      </div>
      <div class="streak" title="Day streak">🔥 ${st}</div>
    </header>

    ${fresh ? html`
      <section class="hero card">
        <h2>ようこそ! Welcome.</h2>
        <p>Start with a 5-minute intro to how Japanese works, then learn hiragana. Everything works offline.</p>
        <a class="btn primary wide" href="#/lesson/${next.id}">Start from zero</a>
        <a class="btn wide" href="#/exams/placement" style="margin-top:8px">I already know some Japanese — placement test</a>
      </section>` : html`
      <section class="grid2">
        <a class="tile big ${due ? 'accent' : ''}" href="#/review">
          <div class="tile-num">${due}</div>
          <div class="tile-label">${due === 1 ? 'review due' : 'reviews due'}</div>
        </a>
        <div class="tile big">
          <div class="tile-num">${learnedToday}<span class="muted">/${goal}</span></div>
          <div class="tile-label">new items today</div>
        </div>
      </section>
      ${next ? html`
        <section class="card next-card">
          <div class="muted small">${stage?.title} · ${TYPE_LABEL[next.type]}</div>
          <h3 class="jp">${next.title}</h3>
          <div class="muted jp">${next.sub}</div>
          ${due > 50 ? html`<p class="note">You have a lot of reviews waiting. Clearing them first makes new lessons stick better.</p>` : ''}
          ${learnedToday >= goal ? html`<p class="note">You've hit today's goal of ${goal} new items. Keep going if you're fresh, or come back tomorrow — reviews matter more.</p>` : ''}
          <a class="btn primary wide" href="#/lesson/${next.id}">${learnedToday >= goal ? 'Learn more anyway' : 'Continue learning'}</a>
        </section>` : html`<section class="card"><h3>You've completed the whole path. すごい!</h3><p>Keep up your reviews and spend your time on native Japanese.</p></section>`}
    `}

    ${lifePick(next)}

    <section>
      <h3 class="section-title">Practice</h3>
      <div class="grid3">
        <a class="tile" href="#/practice/kana"><div class="tile-icon jp">あ</div><div>Kana drill</div></a>
        <a class="tile" href="#/practice/listening"><div class="tile-icon">🎧</div><div>Listening</div></a>
        <a class="tile" href="#/practice/reading"><div class="tile-icon jp">読</div><div>Kanji readings</div></a>
        <a class="tile" href="#/practice/dictation"><div class="tile-icon">✍️</div><div>Dictation</div></a>
        <a class="tile" href="#/practice/shadowing"><div class="tile-icon">🎙️</div><div>Shadowing</div></a>
        <a class="tile" href="#/practice/writing"><div class="tile-icon jp">書</div><div>Write kanji</div></a>
        <a class="tile" href="#/exams"><div class="tile-icon jp">試</div><div>Exams</div></a>
        <a class="tile" href="#/reading"><div class="tile-icon">📖</div><div>Stories</div></a>
        <a class="tile" href="#/life"><div class="tile-icon">🗾</div><div>Life in Japan</div></a>
        <a class="tile" href="#/search"><div class="tile-icon">🔍</div><div>Dictionary</div></a>
      </div>
    </section>

    ${installHint()}
  `.s;
  root.querySelector('[data-act=install]')?.addEventListener('click', async () => {
    window.__installPrompt?.prompt();
    window.__installPrompt = null;
  });
}

// Suggest the next Life & Work unit the learner's level can handle (survival units are fine from the start).
function lifePick(next) {
  const order = ['start', 'hira', 'kata', 'N5', 'N4', 'N3', 'N2', 'N1', 'beyond'];
  const at = order.indexOf(next?.stage ?? 'beyond');
  const reach = at <= 3 ? 'N5' : order[Math.min(at, 7)];
  const ok = (lvl) => order.indexOf(lvl) <= order.indexOf(reach);
  const u = D.life.find((x) => !S().done[x.id] && ok(x.level));
  if (!u || at < 1) return '';
  return html`<a class="card next-card life-pick" href="#/life/${u.id}"><div class="muted small">Life & Work in Japan · ${u.level}</div><h3>${u.title}</h3><div class="muted small">Practical phrases and know-how for living there.</div></a>`;
}

function installHint() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) return '';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (window.__installPrompt) {
    return html`<section class="card install"><strong>Install Michi</strong><p class="small">Add it to your device so it opens like an app and works offline.</p><button class="btn primary" data-act="install">Install app</button></section>`;
  }
  if (ios) return html`<section class="card install"><strong>Install on iPhone/iPad</strong><p class="small">Tap the Share button in Safari, then <em>Add to Home Screen</em>. Michi will open full-screen and work offline.</p></section>`;
  return html`<section class="card install"><strong>Install Michi</strong><p class="small">Use your browser's menu → <em>Install app</em> / <em>Add to Home Screen</em> (Chrome, Edge) or <em>File → Add to Dock</em> (Safari on Mac) so it works offline like a normal app.</p></section>`;
}

export function pathView(root) {
  const next = nextNode();
  const done = S().done;
  root.innerHTML = html`
    <h1>Your path</h1>
    <p class="muted">Follow the lessons in order, or jump anywhere — nothing is locked.</p>
    <div class="stages">
      ${D.path.map((s) => {
        const total = s.nodes.length;
        const n = s.nodes.filter((x) => done[x.id]).length;
        const open = next ? next.stage === s.id : s.id === 'beyond';
        return html`
          <details class="stage card" ${open ? 'open' : ''} id="stage-${s.id}">
            <summary>
              <div class="stage-title">${s.title}</div>
              <div class="muted small">${s.blurb}</div>
              <div class="progress thin"><div style="width:${total ? Math.round((n / total) * 100) : 0}%"></div></div>
              <div class="muted small">${n}/${total} lessons</div>
            </summary>
            <ol class="nodes">${s.nodes.map((x) => {
              const isDone = !!done[x.id];
              const isNext = next && x.id === next.id;
              const partial = !isDone && x.items.length && x.items.some(isLearned);
              return html`<li class="node ${isDone ? 'done' : ''} ${isNext ? 'next' : ''} ${partial ? 'partial' : ''}">
                <a href="#/lesson/${x.id}">
                  <span class="node-dot">${isDone ? '✓' : ''}</span>
                  <span class="node-body"><span class="node-type">${TYPE_LABEL[x.type]}</span>
                  <span class="node-title">${x.title}</span><span class="node-sub jp">${x.sub}</span></span>
                </a></li>`;
            })}</ol>
          </details>`;
      })}
    </div>`.s;
  const cur = root.querySelector('.node.next');
  if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center' }), 50);
}

