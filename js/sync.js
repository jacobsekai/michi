// Transfer-key sync. The key you choose (e.g. "ilovejp-luna26") never leaves the device:
// PBKDF2 turns it into a slot id, a write key and an AES-256 key; only encrypted, compressed progress is uploaded.
// Every device using the same key merges into the same slot, so progress follows you between phone and PC.
import { S, replaceState, onChange, flush } from './store.js';
import { SYNC_URL } from './config.js';

const SALT = 'michi-transfer-key-v1';
const ITERATIONS = 600000;
const COMMON = new Set(['password', 'password1', '12345678', '123456789', 'qwertyui', 'abcdefgh', 'iloveyou', 'ilovejapan', 'japanese', 'nihongo1', 'michi123', 'japan123', '11111111', '00000000', 'aaaaaaaa', 'letmein1', 'sayonara', 'konnichiwa', 'arigatou']);

const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const b64 = (b) => { let s = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Keys are case-insensitive so phone keyboards that auto-capitalise don't lock you out.
export const normalizeKey = (k) => String(k).normalize('NFKC').trim().toLowerCase();

export function keyProblem(k) {
  const n = normalizeKey(k);
  if (n.length < 8) return 'Use at least 8 characters.';
  if (COMMON.has(n) || /^(.)\1+$/.test(n)) return 'That key is too easy to guess — make it more personal.';
  return null;
}

async function derive(key) {
  const base = await crypto.subtle.importKey('raw', enc.encode(normalizeKey(key)), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT), iterations: ITERATIONS }, base, 768));
  return { id: hex(bits.slice(0, 32)), wk: hex(bits.slice(32, 64)), ak: b64(bits.slice(64, 96)) };
}

const aesKey = (ak) => crypto.subtle.importKey('raw', unb64(ak), 'AES-GCM', false, ['encrypt', 'decrypt']);

async function pack(obj, ak) {
  const gz = await new Response(new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(ak), gz);
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ct), 12);
  return b64(out);
}

async function unpack(data, ak) {
  const raw = unb64(data);
  const gz = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, await aesKey(ak), raw.slice(12));
  return JSON.parse(await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
}

async function api(method, id, { wk, body } = {}) {
  const r = await fetch(`${SYNC_URL}/v1/slot/${id}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(wk ? { 'X-Write-Key': wk } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  return { status: r.status, ...json };
}

// ---- merging --------------------------------------------------------------------------------
// Two devices studied separately; keep the newest version of every card and combine everything else.
const newer = (a, b) => ((b?.last || b?.added || 0) > (a?.last || a?.added || 0) ? b : a);
const byT = (a, b) => ((b?.t || 0) > (a?.t || 0) ? b : a);

function mergeMap(a = {}, b = {}, pick) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? pick(out[k], v) : v;
  return out;
}

function mergeDays(a = {}, b = {}) {
  return mergeMap(a, b, (x, y) => ({ reviews: Math.max(x.reviews || 0, y.reviews || 0), correct: Math.max(x.correct || 0, y.correct || 0), learned: Math.max(x.learned || 0, y.learned || 0) }));
}

// What gets uploaded: everything except this device's sync secrets. This device's study days ride along under its id.
function payload(s) {
  const { sync, ...rest } = s;
  return { ...rest, devices: { ...s.devices, [s.device]: s.days } };
}

export function merge(local, remote) {
  const deleted = mergeMap(local.deleted, remote.deleted, Math.max);
  const alive = (map, prefix = '') => Object.fromEntries(Object.entries(map).filter(([k, v]) => !(deleted[prefix + k] > (v.last || v.added || v.t || 0))));
  const devices = { ...local.devices };
  for (const [dev, days] of Object.entries(remote.devices || {})) {
    if (dev === local.device) continue; // our own days are authoritative locally
    devices[dev] = mergeDays(devices[dev], days);
  }
  const exams = [...local.exams];
  for (const e of remote.exams || []) if (!exams.some((x) => x.id === e.id)) exams.push(e);
  exams.sort((a, b) => a.t - b.t);
  const remoteSettingsNewer = (remote.settingsT || 0) > (local.settingsT || 0);
  return {
    ...local,
    created: Math.min(local.created || Date.now(), remote.created || Date.now()),
    srs: alive(mergeMap(local.srs, remote.srs, newer)),
    done: mergeMap(local.done, remote.done, Math.min),
    quiz: mergeMap(local.quiz, remote.quiz, Math.max),
    notes: mergeMap(local.notes, remote.notes, byT),
    custom: alive(mergeMap(local.custom, remote.custom, byT), 'custom:'),
    exams,
    devices,
    deleted,
    settings: remoteSettingsNewer ? { ...local.settings, ...remote.settings } : local.settings,
    settingsT: Math.max(local.settingsT || 0, remote.settingsT || 0),
  };
}

// ---- public API -------------------------------------------------------------------------------

// The app can ship before the sync server is deployed; hide sync until it has a real address.
export const syncAvailable = () => !SYNC_URL.includes('REPLACE');
export const connected = () => syncAvailable() && !!S().sync?.id;
let busy = null;
let dirty = false;
const status = { state: 'idle', error: null };
export const syncStatus = () => ({ ...status, last: S().sync?.last || 0 });
const emit = () => window.dispatchEvent(new CustomEvent('michi:sync', { detail: syncStatus() }));

// Create a brand-new key. Fails if someone (maybe you, on another device) already uses it.
export async function createKey(key) {
  const k = await derive(key);
  const got = await api('GET', k.id);
  if (got.status === 200) throw new Error('That key is already in use. If it\'s yours, use "Import with transfer key" instead; otherwise pick another.');
  if (got.status !== 404) throw new Error(`Sync server error (${got.status}).`);
  const put = await api('PUT', k.id, { wk: k.wk, body: { v: 0, data: await pack(payload(S()), k.ak) } });
  if (put.status !== 200) throw new Error(`Couldn't create the key (${put.error || put.status}).`);
  S().sync = { ...k, v: put.v, last: Date.now() };
  flush();
  emit();
}

// Use an existing key on this device. mode: 'merge' (combine with what's here) or 'replace' (take the synced copy).
export async function importKey(key, mode = 'merge') {
  const k = await derive(key);
  const got = await api('GET', k.id);
  if (got.status === 404) throw new Error('No progress found for that key. Check the spelling, or create it on your other device first.');
  if (got.status !== 200) throw new Error(`Sync server error (${got.status}).`);
  let remote;
  try {
    remote = await unpack(got.data, k.ak);
  } catch {
    throw new Error('Could not unlock the data for that key.');
  }
  const base = mode === 'replace' ? { ...remote, device: S().device, days: remote.devices?.[S().device] || {}, devices: remote.devices || {} } : S();
  const merged = merge(base, remote);
  merged.sync = { ...k, v: got.v, last: Date.now() };
  replaceState(merged);
  await syncNow(); // upload the merged result
}

export function disconnect() {
  delete S().sync;
  flush();
  emit();
}

export function syncNow() {
  if (!connected() || !navigator.onLine) return Promise.resolve(false);
  busy ||= (async () => {
    status.state = 'syncing';
    emit();
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const { id, wk, ak } = S().sync;
        const got = await api('GET', id);
        if (got.status === 404) {
          // Slot vanished (shouldn't happen); recreate it from this device.
          const put = await api('PUT', id, { wk, body: { v: 0, data: await pack(payload(S()), ak) } });
          if (put.status === 200) { S().sync.v = put.v; break; }
          throw new Error(put.error || put.status);
        }
        if (got.status !== 200) throw new Error(got.error || got.status);
        const merged = merge(S(), await unpack(got.data, ak));
        merged.sync = { ...S().sync, v: got.v };
        replaceState(merged);
        const put = await api('PUT', id, { wk, body: { v: got.v, data: await pack(payload(merged), ak) } });
        if (put.status === 200) { S().sync.v = put.v; break; }
        if (put.status === 403) throw new Error('This key is no longer valid here. Disconnect and import it again.');
        if (put.status !== 409) throw new Error(put.error || put.status); // 409: another device wrote first — merge again
      }
      dirty = false;
      S().sync.last = Date.now();
      flush();
      status.state = 'ok';
      status.error = null;
      window.dispatchEvent(new Event('michi:synced'));
      return true;
    } catch (e) {
      status.state = 'error';
      status.error = navigator.onLine ? String(e.message || e) : 'offline';
      return false;
    } finally {
      busy = null;
      emit();
    }
  })();
  return busy;
}

// Automatic sync: on start, a few minutes after changes, when a review session ends, and when the app is hidden.
export function startAutoSync() {
  onChange(() => { dirty = true; });
  const maybe = () => dirty && syncNow();
  setInterval(maybe, 3 * 60e3);
  addEventListener('michi:session-end', () => syncNow());
  addEventListener('online', () => syncNow());
  document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? maybe() : syncNow()));
  syncNow();
}
