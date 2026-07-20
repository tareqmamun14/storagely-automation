#!/usr/bin/env node
/**
 * Flex location-pool SITEMAP DISCOVERY. FLEX-ONLY. Plain Node (no TS toolchain).
 *
 * Grows each client's location pool beyond the committed seed so
 * `FLEX_SAMPLE=random[:N]` can rotate across MANY real production pages:
 * for every client seeded in flex/configs/locationPool.ts it fetches the
 * site's sitemap (handling sitemap-index files), keeps URLs shaped like
 * /storage-units/<state>/<city>/<street>, and writes the result to
 * flex/test-results/location-pools/<client>.json — the LOCAL, gitignored
 * cache that getLocationPool() already unions with the seed.
 *
 * Run it any time (results just refresh the cache):
 *   node flex/scripts/discover-locations.js            # all seeded clients
 *   node flex/scripts/discover-locations.js storagestar # one client
 *   npm run run:flex:discover
 * …or click "🌐 grow pool from sitemaps" in the control panel's Flex card
 * (the panel server calls discoverAll() below).
 *
 * Best-effort by design: a client whose sitemap is missing/blocked reports an
 * error row and keeps its previous cache — never breaks a run.
 */
const fs = require('fs');
const path = require('path');

const FLEX_DIR = path.resolve(__dirname, '..');
const POOL_TS = path.join(FLEX_DIR, 'configs', 'locationPool.ts');
const OUT_DIR = path.join(FLEX_DIR, 'test-results', 'location-pools');

// Browser UA — the prod CDNs/WAFs (cloudfront) 403 obvious bots.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MAX_PER_CLIENT = 200;
const MAX_CHILD_SITEMAPS = 10;

/** client → origin, derived from the committed seed pool (first URL per client). */
function seedHosts() {
  const map = {};
  try {
    const text = fs.readFileSync(POOL_TS, 'utf8');
    const block = text.match(/LOCATION_POOL[^=]*=\s*\{([\s\S]*?)\n\};/);
    if (!block) return map;
    const re = /(\w+):\s*\[([^\]]*)\]/g;
    let m;
    while ((m = re.exec(block[1]))) {
      const url = (m[2].match(/https?:\/\/[^'"\s]+/) || [])[0];
      if (url) { try { map[m[1].toLowerCase()] = new URL(url).origin; } catch { /* bad seed */ } }
    }
  } catch { /* no pool file — nothing to discover */ }
  return map;
}

async function fetchText(url, timeoutMs = 15000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/xml,text/xml,*/*' },
      signal: ac.signal,
      redirect: 'follow',
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally { clearTimeout(t); }
}

function locs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => m[1]);
}

/** Same-origin /storage-units/<state>/<city>/<street> pages only. */
function isLocationUrl(u, origin) {
  try {
    const x = new URL(u);
    if (x.origin !== origin) return false;
    const parts = x.pathname.split('/').filter(Boolean);
    return parts.length === 4 && parts[0] === 'storage-units';
  } catch { return false; }
}

/** Sitemap URLs declared in robots.txt (the Flex sites publish theirs there,
 *  e.g. /public/sitemaps/<brand>_sitemap.xml — not at /sitemap.xml). */
async function sitemapsFromRobots(origin) {
  try {
    const robots = await fetchText(origin + '/robots.txt');
    return [...robots.matchAll(/^\s*sitemap:\s*(\S+)\s*$/gim)].map(m => m[1]);
  } catch { return []; }
}

async function discoverClient(client, origin) {
  let xml = null;
  const tried = [];
  const candidates = [
    ...(await sitemapsFromRobots(origin)),
    origin + '/sitemap.xml',
    origin + '/sitemap_index.xml',
  ];
  for (const sm of candidates) {
    try { xml = await fetchText(sm); tried.push(`${sm.replace(origin, '')} ✓`); break; }
    catch (e) { tried.push(`${sm.replace(origin, '')} (${e.message})`); }
  }
  if (!xml) return { client, origin, found: 0, error: `no sitemap: ${tried.join(', ')}` };

  let urls = locs(xml);
  if (/<sitemapindex/i.test(xml)) {
    const children = urls.slice(0, MAX_CHILD_SITEMAPS);
    urls = [];
    for (const child of children) {
      try { urls.push(...locs(await fetchText(child))); } catch { /* skip unreachable child */ }
    }
  }
  const found = [...new Set(urls.filter(u => isLocationUrl(u, origin)))].slice(0, MAX_PER_CLIENT);
  if (!found.length) return { client, origin, found: 0, error: 'sitemap fetched but no /storage-units/<state>/<city>/<street> URLs in it' };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${client}.json`);
  fs.writeFileSync(file, JSON.stringify(found, null, 2));
  return { client, origin, found: found.length, file };
}

/** Discover every seeded client (or just the given slugs). Never throws per-client. */
async function discoverAll(clients) {
  const hosts = seedHosts();
  const want = (clients || []).map(c => String(c).toLowerCase()).filter(Boolean);
  const targets = Object.entries(hosts).filter(([c]) => !want.length || want.includes(c));
  const out = [];
  for (const [client, origin] of targets) {
    try { out.push(await discoverClient(client, origin)); }
    catch (e) { out.push({ client, origin, found: 0, error: String((e && e.message) || e) }); }
  }
  return out;
}

module.exports = { discoverAll };

if (require.main === module) {
  discoverAll(process.argv.slice(2)).then(rows => {
    if (!rows.length) console.log('No seeded clients found in flex/configs/locationPool.ts');
    for (const r of rows) {
      console.log(r.error
        ? `${r.client.padEnd(12)} ✗ ${r.error}`
        : `${r.client.padEnd(12)} ✓ ${String(r.found).padStart(3)} locations → ${path.relative(process.cwd(), r.file)}`);
    }
  }).catch(e => { console.error(e); process.exit(1); });
}
