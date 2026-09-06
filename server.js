// ============================================================
//  Order Email Web — backend proxy (ZERO dependency, multi-user)
//  Cukup: node server.js   (tidak perlu npm install)
//  Setiap user mengirim API Key-nya sendiri lewat header X-Api-Key.
//  Server TIDAK menyimpan key siapa pun — hanya meneruskan ke API.
// ============================================================
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ---- baca .env sederhana (opsional, untuk lokal) ------------------------
function loadEnv() {
  const env = {};
  try {
    const txt = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* .env optional */ }
  return env;
}
const ENV = { ...loadEnv(), ...process.env };
const API_BASE = (ENV.API_BASE || 'https://api.mtc.biz.id').replace(/\/+$/, '');
const PORT = ENV.PORT || 3000;

// ---- panggil API tujuan dengan key milik user ---------------------------
function callApi(method, endpoint, bodyObj, apiKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + endpoint);
    const body = bodyObj ? JSON.stringify(bodyObj) : null;
    const headers = { Accept: 'application/json' };
    if (apiKey) headers.Authorization = 'Bearer ' + apiKey;
    if (body) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(body); }

    const req = https.request(
      { hostname: url.hostname, path: url.pathname + url.search, method, headers },
      (r) => {
        let data = '';
        r.on('data', (c) => (data += c));
        r.on('end', () => resolve({ status: r.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('Timeout: API tidak merespons (30 detik)')));
    if (body) req.write(body);
    req.end();
  });
}

// kirim hasil API apa adanya ke client
async function proxy(res, method, endpoint, bodyObj, apiKey) {
  try {
    const out = await callApi(method, endpoint, bodyObj, apiKey);
    res.writeHead(out.status, { 'Content-Type': 'application/json' });
    res.end(out.body || '{}');
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: e.message }));
  }
}

// ambil API Key milik user dari header
function apiKeyOf(req) { return (req.headers['x-api-key'] || '').trim(); }
// wajib ada key; kalau tidak, balas 401
function requireKey(req, res) {
  const k = apiKeyOf(req);
  if (!k) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'API Key belum diisi' }));
    return null;
  }
  return k;
}

// baca body JSON dari request
function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
  });
}

// ---- static files -------------------------------------------------------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
function serveStatic(req, res) {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(__dirname, 'public', path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}

// ---- routing ------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'POST' && url === '/api/order') {
    const key = requireKey(req, res); if (!key) return;
    const b = await readBody(req);
    return proxy(res, 'POST', '/order_email', {
      website: (b.website || 'digitalocean.com').trim(),
      domain: (b.domain || 'gmail.com').trim(),
      qty: Math.max(1, parseInt(b.qty, 10) || 1),
    }, key);
  }
  if (req.method === 'GET' && url === '/api/profile') {
    const key = requireKey(req, res); if (!key) return;
    return proxy(res, 'GET', '/my_profile', null, key);
  }
  if (req.method === 'GET' && url === '/api/price') {
    const key = requireKey(req, res); if (!key) return;
    return proxy(res, 'GET', '/price', null, key);
  }
  if (req.method === 'GET' && url.startsWith('/api/messages')) {
    const key = requireKey(req, res); if (!key) return;
    const id = url.replace('/api/messages', '').replace(/^\//, '');
    return proxy(res, 'GET', '/email_messages' + (id ? '/' + id : ''), null, key);
  }
  if (req.method === 'GET' && url === '/api/health') {
    return proxy(res, 'GET', '/health', null, null); // tanpa key
  }

  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`✅  Server jalan di  http://localhost:${PORT}`);
  console.log(`    API target      ${API_BASE}`);
});
