// Entry point: loads data, routes hash URLs to views, keeps the nav badge fresh.
import { loadAll } from './data.js';
import { dueCount } from './srs.js';
import { stop } from './tts.js';
import { applySettings } from './ui.js';
import { homeView, pathView } from './views/home.js';
import { lessonView } from './views/lesson.js';
import { reviewView } from './views/review.js';
import { libraryView, kanaChartView, vocabListView, kanjiListView, wordView, kanjiDetailView, grammarView, readingListView, readingView, lifeListView, lifeUnitView, searchView } from './views/library.js';
import { practiceView } from './views/practice.js';
import { statsView, settingsView } from './views/me.js';

const ROUTES = {
  '': [homeView, 'home'],
  path: [pathView, 'path'],
  lesson: [lessonView, 'path'],
  review: [reviewView, 'review'],
  library: [libraryView, 'library'],
  kana: [kanaChartView, 'library'],
  vocab: [vocabListView, 'library'],
  kanji: [kanjiListView, 'library'],
  word: [wordView, 'library'],
  'kanji-detail': [kanjiDetailView, 'library'],
  grammar: [grammarView, 'library'],
  reading: [readingListView, 'library'],
  life: [lifeListView, 'library'],
  search: [searchView, 'library'],
  practice: [practiceView, 'home'],
  stats: [statsView, 'me'],
  settings: [settingsView, 'me'],
};

let view = document.getElementById('view');

function route() {
  stop();
  const [name = '', ...params] = location.hash.replace(/^#\/?/, '').split('/');
  let [fn, tab] = ROUTES[name] || ROUTES[''];
  if (name === 'reading' && params[0]) fn = readingView;
  if (name === 'life' && params[0]) fn = lifeUnitView;
  // Replace the view element so old keyboard listeners (which check isConnected) detach.
  const fresh = view.cloneNode(false);
  view.replaceWith(fresh);
  view = fresh;
  try {
    fn(fresh, params);
  } catch (e) {
    console.error(e);
    fresh.innerHTML = `<div class="card"><h2>Something went wrong</h2><p class="muted small">${String(e.message).replace(/</g, '&lt;')}</p><a class="btn" href="#/">Home</a></div>`;
  }
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
  if (!name || name === 'path' || name === 'library') window.scrollTo(0, 0);
  updateBadge();
}

function updateBadge() {
  const n = dueCount();
  document.querySelectorAll('.due-badge').forEach((b) => {
    b.textContent = n > 999 ? '999+' : n;
    b.hidden = n === 0;
  });
}

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__installPrompt = e;
});

async function start() {
  applySettings();
  await loadAll();
  document.getElementById('splash')?.remove();
  addEventListener('hashchange', route);
  route();
  setInterval(updateBadge, 60e3);
  navigator.storage?.persist?.();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
  }
}

start();
