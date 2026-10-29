// Michi sync server. It never sees a transfer key or any readable progress:
// clients derive (slot id, write key, encryption key) from the key with PBKDF2 and upload only AES-GCM ciphertext.
//   GET /v1/slot/<64 hex>  -> { v, data }            (404 if unused)
//   PUT /v1/slot/<64 hex>  X-Write-Key: <64 hex>     body { v, data }; v = version you last saw (0 to create)
// The first PUT stores SHA-256(write key); later PUTs must present the same key. Versions prevent lost updates.

const ORIGINS = ['https://jacobsekai.github.io', 'http://127.0.0.1:8765', 'http://localhost:8765'];
const MAX_BODY = 8 * 1024 * 1024;
const HEX64 = /^[0-9a-f]{64}$/;

const sha256hex = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Write-Key',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const m = new URL(req.url).pathname.match(/^\/v1\/slot\/([0-9a-f]{64})$/);
    if (!m) return reply({ error: 'not found' }, 404);
    if (env.LIMITER) {
      const { success } = await env.LIMITER.limit({ key: req.headers.get('CF-Connecting-IP') || 'unknown' });
      if (!success) return reply({ error: 'too many requests' }, 429);
    }
    const id = m[1];

    if (req.method === 'GET') {
      const rec = await env.SLOTS.get(id, { type: 'json' });
      return rec ? reply({ v: rec.v, data: rec.data }) : reply({ error: 'no such key' }, 404);
    }

    if (req.method === 'PUT') {
      const wk = req.headers.get('X-Write-Key') || '';
      if (!HEX64.test(wk)) return reply({ error: 'bad write key' }, 400);
      const text = await req.text();
      if (text.length > MAX_BODY) return reply({ error: 'too large' }, 413);
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        return reply({ error: 'bad json' }, 400);
      }
      if (typeof body.data !== 'string' || !Number.isInteger(body.v)) return reply({ error: 'bad body' }, 400);
      const rec = await env.SLOTS.get(id, { type: 'json' });
      const wh = await sha256hex(wk);
      if (rec && !safeEqual(rec.wh, wh)) return reply({ error: 'forbidden' }, 403);
      if ((rec?.v || 0) !== body.v) return reply({ error: 'version conflict', v: rec?.v || 0 }, 409);
      const v = body.v + 1;
      await env.SLOTS.put(id, JSON.stringify({ v, wh, data: body.data, t: Date.now() }));
      return reply({ v });
    }
    return reply({ error: 'method not allowed' }, 405);
  },
};
