#!/usr/bin/env node
/**
 * Storagely Test Control Panel — local server.
 *
 * Tiny zero-dependency HTTP + SSE server. Serves index.html, exposes a small
 * JSON API, and spawns Playwright runs with env vars based on the UI choices.
 *
 *   GET  /                       → index.html
 *   GET  /api/config             → discovered clients, suites, presets
 *   POST /api/run                → start a run, returns { runId }
 *   GET  /api/stream/:id         → SSE stream of stdout/stderr lines
 *   POST /api/stop/:id           → kill a running run
 *   GET  /api/presets            → load saved user presets
 *   POST /api/presets            → save user presets (whole array)
 *   GET  /api/extra-clients      → load extra (panel-added) clients
 *   POST /api/extra-clients      → save extra clients (whole array)
 */

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { spawn, execSync } = require('child_process');
const { randomUUID } = require('crypto');

const ROOT       = path.resolve(__dirname, '..');
const PANEL_DIR  = __dirname;
const PORT       = Number(process.env.PANEL_PORT) || 5173;

const PRESETS_FILE       = path.join(PANEL_DIR, 'presets.user.json');
const EXTRA_CLIENTS_FILE = path.join(PANEL_DIR, 'extra-clients.json');
const CORP_CODES_FILE    = path.join(PANEL_DIR, 'corp-codes.json');
const DEFAULT_PRESETS_FILE = path.join(PANEL_DIR, 'presets.default.json');
const LOGS_DIR           = path.join(PANEL_DIR, 'logs');
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

// ───────── Slug → FMS lookup ─────────
// One row per known client slug (both staging and production hostname forms).
// Used to render FMS badges in the panel and to drive the "1 per FMS" picker.
const FMS_BY_SLUG = {
  // storEDGE
  'columbia-self-storage':    'storEDGE',
  'columbiaselfstorage':      'storEDGE',
  'purely-storage':           'storEDGE',
  'purelystorage':            'storEDGE',
  'distinct-storage':         'storEDGE',
  'distinctstorage':          'storEDGE',
  'storsafe-self-storage':    'storEDGE',
  'storsafe':                 'storEDGE',
  // SiteLink
  'bluebirdstorage':          'SiteLink',
  'sunbirdstorage':           'SiteLink',
  'red-rocks-self-storage':   'SiteLink',
  'redrocksstorage':          'SiteLink',
  'rhino-storage':            'SiteLink',
  'gatekeeper-self-storage':  'SiteLink',
  'gatekeeperstoragega':      'SiteLink',
  'storage-boss':             'SiteLink',
  'storagedepotla':           'SiteLink',
  'selfstorage':              'SiteLink',
  'easy-stop-storage':        'SiteLink',
  'easystopstorage':          'SiteLink',
  // SSM
  'yourway-storage':          'SSM',
  'yourwaystorage':           'SSM',
  'storage-star':             'SSM',
  'storagestar':              'SSM',
  'smart-self-storage-ohio':  'SSM',
  'smartstorageohio':         'SSM',
  // Yardi
  'mini-mall-storage':        'Yardi',
  'mini-mall-storage-yardi':  'Yardi',
  'minimallstorage':          'Yardi',
  // External (Storerocket-fronted)
  'almightystorage':          'SiteLink',
};
function fmsFor(id) { return FMS_BY_SLUG[id] || '—'; }

// ───────── Run registry (in-memory) ─────────
/** id → { proc, buffer:[], listeners:Set<res>, done:bool, exitCode } */
const runs = new Map();

// ───────── Heartbeat — lifecycle sync (Ctrl+C ↔ tab close) ─────────
const heartbeatClients = new Set();
let panelShutdownTimer = null;

// ───────── Helpers ─────────
function readJsonSafe(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJsonSafe(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json', ...headers });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', c => { buf += c; if (buf.length > 5e6) reject(new Error('body too big')); });
    req.on('end',  () => resolve(buf));
    req.on('error', reject);
  });
}

// ───────── Parse client lists from configs/*.ts (regex-based, no TS compile) ─────────
function parseUrlsConfig() {
  const file = fs.readFileSync(path.join(ROOT, 'configs', 'urls.ts'), 'utf8');

  // Pull URLs from a labelled bracket block. Skips commented lines.
  function pullBlock(label) {
    // Match: export const LABEL = { ... };  (greedy until the closing };)
    const re = new RegExp(`export const ${label}\\s*=\\s*\\{([\\s\\S]*?)\\};`, 'm');
    const m = file.match(re);
    return m ? m[1] : '';
  }
  function urlsByEnv(block) {
    // Inside the block we expect [Environment.STAGING]: [...] and [Environment.PRODUCTION]: [...]
    const out = { staging: [], production: [] };
    const reEnv = /\[Environment\.(STAGING|PRODUCTION)\]\s*:\s*\[([\s\S]*?)\]/g;
    let m;
    while ((m = reEnv.exec(block))) {
      const env = m[1] === 'STAGING' ? 'staging' : 'production';
      const inner = m[2];
      // Split into lines, keep only those whose first non-space char is a quote
      // (rejects lines starting with // even if they contain a URL).
      for (const rawLine of inner.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('//')) continue;
        const um = line.match(/^['"]([^'"]+)['"]/);
        if (um) out[env].push(um[1]);
      }
    }
    return out;
  }

  return {
    ui:  urlsByEnv(pullBlock('STORAGE_SITE_URLS')),
    spc: urlsByEnv(pullBlock('SINGLE_PAGE_RENT_URLS')),
    v1:  urlsByEnv(pullBlock('CUSTOMER_URLS')),
  };
}

// Brand token from a production hostname = the registrable domain's SECOND-LEVEL
// label, NOT the first hostname segment. This correctly ignores infra
// subdomains like www / ww2 / rent / book (e.g. "rent.distinctstorage.com" →
// "distinctstorage", not "rent"). Two-label suffixes (.co.uk, .com.au) are
// handled so the brand isn't read as "co"/"com".
function registrableName(hostname) {
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length <= 2) return parts[0] || hostname;
  const twoLabelSuffix = /^(co|com|org|net|gov|edu|ac)$/i;
  const sldIdx = twoLabelSuffix.test(parts[parts.length - 2]) && parts.length >= 3
    ? parts.length - 3   // e.g. brand.co.uk  → "brand"
    : parts.length - 2;  // e.g. rent.brand.com → "brand"
  return parts[sldIdx];
}

// Friendly label for a URL (e.g. "https://bluebirdstorage.ca/..." → "Bluebird Storage")
function labelFor(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('staging')) {
      const slug = u.pathname.split('/').filter(Boolean)[0] || u.hostname;
      return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    const host = registrableName(u.hostname);
    return host.replace(/storage$/i, ' Storage').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  } catch { return url; }
}

// Stable ID for a URL (used in checkboxes)
function idFor(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('staging')) return u.pathname.split('/').filter(Boolean)[0] || u.hostname;
    return registrableName(u.hostname);
  } catch { return url; }
}

// ───────── Parse Flex client sites from flex/configs/urls.ts ─────────
function parseFlexSites() {
  try {
    const content = fs.readFileSync(path.join(ROOT, 'flex', 'configs', 'urls.ts'), 'utf8');
    const sites = [];
    const re = /url:\s*'([^']+)'[\s\S]*?label:\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(content))) sites.push({ url: m[1], label: m[2] });
    return sites;
  } catch { return []; }
}

// ───────── Parse Flex section manifest from flex/configs/sections.ts ─────────
// Each entry maps to a toggle in the control panel's Flex card. Adding a
// section in sections.ts auto-surfaces here — no panel code change needed.
function parseFlexSections() {
  try {
    const content = fs.readFileSync(path.join(ROOT, 'flex', 'configs', 'sections.ts'), 'utf8');
    const out = [];
    const re = /\{\s*id:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'\s*,\s*description:\s*'([^']+)'\s*,\s*order:\s*(\d+)/g;
    let m;
    while ((m = re.exec(content))) {
      out.push({ id: m[1], label: m[2], description: m[3], order: Number(m[4]) });
    }
    return out.sort((a, b) => a.order - b.order);
  } catch { return []; }
}

// ───────── Parse Flex facilities from flex/configs/facilities.ts ─────────
function parseFlexFacilities() {
  try {
    const content = fs.readFileSync(path.join(ROOT, 'flex', 'configs', 'facilities.ts'), 'utf8');
    const out = [];
    // Each facility is a multi-line object; pull id + name + client + env + url
    // out of each block (field order in facilities.ts: id, name, client, env, url).
    // `client` drives the control panel's per-client suite selector (FLEX_CLIENT).
    const re = /id:\s*'([^']+)'\s*,[\s\S]*?name:\s*'([^']+)'\s*,[\s\S]*?client:\s*'([^']+)'\s*,[\s\S]*?env:\s*'([^']+)'\s*,[\s\S]*?url:\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(content))) out.push({ id: m[1], name: m[2], client: m[3], env: m[4], url: m[5] });
    return out;
  } catch { return []; }
}

// ───────── /api/config ─────────
function buildConfigPayload() {
  const parsed = parseUrlsConfig();
  function decorate(arr) {
    return arr.map(url => {
      const id = idFor(url);
      return { url, id, label: labelFor(url), fms: fmsFor(id) };
    });
  }
  // Combined client list for "Build Instance Regression" — staging only,
  // deduped by id across UI / SPC / V1, with which-suites-it-appears-in info.
  // Also appends Mini Mall (SiteLink + Yardi) which are exposed by the
  // dedicated minimallrent spec, not UI/SPC/V1.
  function buildInstanceClients() {
    const map = new Map(); // id -> { id, label, fms, suites:Set, sampleUrl, defaultChecked? }
    for (const suite of ['ui','spc','v1']) {
      for (const url of parsed[suite].staging) {
        const id = idFor(url);
        if (!map.has(id)) map.set(id, { id, label: labelFor(url), fms: fmsFor(id), suites: new Set(), sampleUrl: url });
        map.get(id).suites.add(suite);
      }
    }
    // Mini Mall — biggest client. Toggled on by default in Build Instance mode.
    // Same flow as test.staging, just URL is rewritten to the build base.
    const miniMall = [
      { id: 'mini-mall-storage',       label: '⭐ Mini Mall SiteLink — Sainte-Thérèse, QC', fms: 'SiteLink',
        sampleUrl: 'https://test.staging.storagely-api.com/mini-mall-storage/storage-units/quebec/sainte-therese/30-place-sicard' },
      { id: 'mini-mall-storage-yardi', label: '⭐ Mini Mall Yardi — Birmingham, AL',        fms: 'Yardi',
        sampleUrl: 'https://test.staging.storagely-api.com/mini-mall-storage-yardi/storage-units/alabama/birmingham/richard-arrington-jr-blvd' },
    ];
    for (const mm of miniMall) {
      const existing = map.get(mm.id);
      if (existing) {
        // Override fms + label from the rental-flow definition (more accurate
        // than the generic FMS_BY_SLUG mapping, e.g. SiteLink vs Yardi variant).
        existing.fms = mm.fms;
        existing.label = mm.label;
        existing.suites.add('minimallrent');
        existing.defaultChecked = true;
      } else {
        map.set(mm.id, { ...mm, suites: new Set(['minimallrent']), defaultChecked: true });
      }
    }
    return Array.from(map.values()).map(c => ({ ...c, suites: Array.from(c.suites) }));
  }
  return {
    suites: ['ui', 'spc', 'v1', 'admin', 'datasync', 'minimallrent', 'minimall', 'allpages', 'build', 'flex'],
    clients: {
      ui:  { staging: decorate(parsed.ui.staging),  production: decorate(parsed.ui.production)  },
      spc: { staging: decorate(parsed.spc.staging), production: decorate(parsed.spc.production) },
      v1:  { staging: decorate(parsed.v1.staging),  production: decorate(parsed.v1.production)  },
    },
    buildClients: buildInstanceClients(),
    datasync: {
      // Data Sync uses 3 fixed FMS clients; environment & corp pwd are options.
      clients: [
        { id: 'SiteLink', name: 'Gate 5 Self Storage',         fms: 'SiteLink' },
        { id: 'storEDGE', name: 'Storagely Self Storage',      fms: 'storEDGE' },
        { id: 'SSM',      name: 'Smart Self Storage Ohio',     fms: 'SSM'      },
      ],
    },
    uiModules: [
      { id: 'home',     label: 'Home Page',            grep: 'Home Page'            },
      { id: 'contact',  label: 'Contact Page',         grep: 'Contact Page'         },
      { id: 'faq',      label: 'FAQ Page',             grep: 'FAQ Page'             },
      { id: 'pricing',  label: 'Unit Pricing',         grep: 'Unit Pricing'         },
      { id: 'features', label: 'Unit Feature Conflict',grep: 'Unit Feature Conflict'},
      { id: 'filter',   label: 'Filter Validation',    grep: 'Filter Validation'    },
      { id: 'sort',     label: 'Sort Validation',      grep: 'Sort Validation'      },
      { id: 'images',   label: 'Image & Carousel (PROD)', grep: 'Image & Carousel'  },
      { id: 'location', label: 'Location Page',        grep: 'Location Page'        },
    ],
    defaultPresets: readJsonSafe(DEFAULT_PRESETS_FILE, []),
    flex: (() => {
      const facilities = parseFlexFacilities();
      return {
        sites: parseFlexSites(),
        sections: parseFlexSections(),
        facilities,
        // Distinct client slugs → drives the per-client suite selector so
        // Safeguard and Minimal can be run as completely separate suites.
        clients: [...new Set(facilities.map(f => f.client).filter(Boolean))],
      };
    })(),
  };
}

// ───────── Build playwright command + env from a run request ─────────
function buildRunCommand(req) {
  /*
    req shape (all optional):
      env:        'staging' | 'production'         (top-level Storagely env)
      headed:     boolean                          (Playwright --headed)
      workers:    number                           (Playwright --workers)
      allure:     'off' | 'serve' | 'deploy'       (post-run reporter)
      suites:     ['ui','spc','v1','admin','datasync','minimall']
      ui:    { clients:[id], extras:[url], modules:[id] }
      spc:   { clients:[id], extras:[url] }
      v1:    { clients:[id], extras:[url] }
      datasync: { env:'stage'|'prod', clients:['SiteLink','storEDGE','SSM'], stagePwd:'...' }
  */
  const env = { ...process.env };
  if (req.env)        env.STORAGELY_ENV = req.env;

  // Always merge in saved corp codes so they apply to ANY staging run
  // (regular Staging mode and Build Instance mode share the same codes).
  // Build-Instance mode below may augment this with per-run codes.
  const savedCorp = readJsonSafe(CORP_CODES_FILE, {});
  if (savedCorp && Object.keys(savedCorp).length) {
    env.STORAGELY_CORP_CODES_JSON = JSON.stringify(savedCorp);
  }
  if (req.ui?.clients?.length)  env.STORAGELY_UI_CLIENTS  = req.ui.clients.join(',');
  if (req.ui?.extras?.length)   env.STORAGELY_UI_EXTRA    = req.ui.extras.join(',');
  if (req.spc?.clients?.length) env.STORAGELY_SPC_CLIENTS = req.spc.clients.join(',');
  if (req.spc?.extras?.length)  env.STORAGELY_SPC_EXTRA   = req.spc.extras.join(',');
  if (req.v1?.clients?.length)  env.STORAGELY_V1_CLIENTS  = req.v1.clients.join(',');
  if (req.v1?.extras?.length)   env.STORAGELY_V1_EXTRA    = req.v1.extras.join(',');
  if (req.datasync?.env)        env.STORAGELY_DS_ENV      = req.datasync.env;
  if (req.datasync?.clients?.length) env.STORAGELY_DS_CLIENTS = req.datasync.clients.join(',');
  if (req.datasync?.stagePwd)   env.STORAGELY_SITELINK_STAGE_PWD = req.datasync.stagePwd;
  if (req.minimallrent?.customSitelink) env.STORAGELY_MMRENT_CUSTOM_SITELINK = req.minimallrent.customSitelink;
  if (req.minimallrent?.customYardi)    env.STORAGELY_MMRENT_CUSTOM_YARDI    = req.minimallrent.customYardi;
  if (req.minimallrent?.filter)         env.STORAGELY_MMRENT_FILTER          = req.minimallrent.filter;
  if (req.flex?.password)              env.FLEX_PASSWORD                   = req.flex.password;
  if (req.flex?.customUrl)             env.FLEX_CUSTOM_URL                 = req.flex.customUrl;
  // Flex has its OWN prod/test toggle, independent of the top-level Storagely env.
  // Defaults to production (post-release regression) when unset.
  if (req.flex?.env)                   env.FLEX_ENV                        = req.flex.env;
  // Per-client suite selector — run Safeguard OR Minimal as a standalone suite.
  // 'all' (or unset) = every client. Accepts a slug or comma-separated slugs.
  if (req.flex?.client && req.flex.client !== 'all') {
    env.FLEX_CLIENT = Array.isArray(req.flex.client) ? req.flex.client.join(',') : String(req.flex.client);
  }
  if (Array.isArray(req.flex?.sections) && req.flex.sections.length) {
    env.FLEX_SECTIONS = req.flex.sections.join(',');
  }
  // Rotate ON (panel default, or flag absent = old clients): one rotating
  // location per client per run — the facilities list is NOT pinned. Rotate
  // OFF: pin the checked facilities and disable suite-side rotation.
  if (req.flex?.rotate === false) {
    env.FLEX_ROTATE = 'off';
    if (Array.isArray(req.flex?.facilities) && req.flex.facilities.length) {
      env.FLEX_FACILITY_FILTER = req.flex.facilities.join(',');
    }
  }
  // Rent-flow depth: 'handshake' = autonomous-safe checkout-entry verification
  // (no fill/captcha/submit); 'full' = drive the checkout to submit (manual
  // captcha on prod). Unset → the journey's env-aware default (prod→handshake,
  // test→full).
  if (req.flex?.rentMode === 'handshake' || req.flex?.rentMode === 'full') {
    env.FLEX_RENT_MODE = req.flex.rentMode;
  }
  // Random location sampling — widen coverage on prod ("random", "random:3").
  // The suite force-disables it whenever a run pins facilities / a custom URL.
  if (req.flex?.sample) env.FLEX_SAMPLE = String(req.flex.sample);
  // Verification mode: force EXACT exploratory probe(s) — the Re-verify button
  // uses this to confirm/refute a finding without touching probe rotation.
  if (req.flex?.exploreForce) env.FLEX_EXPLORE_FORCE = String(req.flex.exploreForce);

  let suites = Array.isArray(req.suites) ? req.suites.slice() : [];

  // ── Build-Instance Regression mode ─────────────────────────────────
  // When "build" suite is selected we run RENTAL FLOWS ONLY (SPC + V1 + minimallrent).
  // Force staging, pin the build-instance host, route Mini Mall clients to the
  // minimallrent spec and everyone else to SPC + V1. Corp codes flow through as JSON.
  if (suites.includes('build')) {
    if (!req.build?.base?.trim()) return null; // require build base URL
    env.STORAGELY_ENV = 'staging';
    env.STORAGELY_BUILD_BASE = req.build.base.trim();
    if (req.build?.corpCodes && Object.keys(req.build.corpCodes).length) {
      // Merge per-run codes ON TOP of saved codes so anything new wins.
      const merged = { ...savedCorp, ...req.build.corpCodes };
      env.STORAGELY_CORP_CODES_JSON = JSON.stringify(merged);
    }

    // Partition selected clients: Mini Mall (→ minimallrent spec) vs everything else (→ SPC+V1).
    const all = req.build.clients || [];
    const miniMallSitelink = all.includes('mini-mall-storage');
    const miniMallYardi    = all.includes('mini-mall-storage-yardi');
    const nonMiniMall      = all.filter(id => id !== 'mini-mall-storage' && id !== 'mini-mall-storage-yardi');

    // Drop the synthetic "build" suite and rebuild the spec list from selection.
    suites = suites.filter(s => s !== 'build');

    if (nonMiniMall.length > 0) {
      const csv = nonMiniMall.join(',');
      // Build mode MUST override any SPC/V1 selection — the build panel is the
      // single source of truth for which clients to run. Without this override
      // a stale selection in the SPC/V1 tabs (or no selection → undefined env)
      // would either filter to the wrong clients or run ALL clients.
      env.STORAGELY_SPC_CLIENTS = csv;
      env.STORAGELY_V1_CLIENTS  = csv;
      // Same for any "extras" (typed-in URLs in SPC/V1 tabs) — ignore in build mode.
      delete env.STORAGELY_SPC_EXTRA;
      delete env.STORAGELY_V1_EXTRA;
      if (!suites.includes('spc')) suites.push('spc');
      if (!suites.includes('v1'))  suites.push('v1');
    } else {
      // No non-mini-mall build clients selected → ensure SPC/V1 specs don't run
      // with stale env vars. Mini Mall (if any) is handled by the minimallrent spec below.
      delete env.STORAGELY_SPC_CLIENTS;
      delete env.STORAGELY_V1_CLIENTS;
      delete env.STORAGELY_SPC_EXTRA;
      delete env.STORAGELY_V1_EXTRA;
    }

    if (miniMallSitelink || miniMallYardi) {
      if (!suites.includes('minimallrent')) suites.push('minimallrent');
      // If only one variant is checked, filter the mini-mall spec to it.
      // If both are checked, no filter → spec runs both.
      if (miniMallSitelink && !miniMallYardi) env.STORAGELY_MMRENT_FILTER = 'sitelink';
      else if (miniMallYardi && !miniMallSitelink) env.STORAGELY_MMRENT_FILTER = 'yardi';
    }
  }
  const specMap = {
    ui:            'tests/uiComponents-validation.spec.ts',
    spc:           'tests/rentReserveSPC-validation.spec.ts',
    v1:            'tests/rentReserveV1-validation.spec.ts',
    admin:         'tests/adminPlatform-validation.spec.ts',
    datasync:      'tests/data-sync-validation.spec.ts',
    minimallrent:  'tests/miniMallRental.spec.ts',
    minimall:      'tests/miniMallFullScan.spec.ts',
    allpages:      'tests/allLocationsScan.spec.ts',
  };
  const specs = suites.map(s => specMap[s]).filter(Boolean);

  // Flex suite — uses its own playwright config with project-based routing.
  //
  // The e2e / live / sections checkboxes are STEPS of ONE top-down journey per
  // facility (facility-journey.spec.ts), exactly like V1/SPC: one browser per
  // customer. All are selectable — uncheck any to skip. Checkbox → FLEX_LAYERS:
  //
  //   live            → 'health'   (page health + token audit)
  //   sections        → 'sections' (section detectors, single navigation)
  //   e2e             → 'rent'     (SPC form fill + submit — runs LAST)
  //   sections-each   → SLOWER pinpoint mode: each section as its own
  //                     isolated test/browser (flex/tests/live/sections/*.spec.ts)
  //   editor          → 'editor' project (separate login browser)
  let flexCmd = null;
  if (suites.includes('flex')) {
    const hm = req.flex?.modules || ['e2e', 'live', 'sections'];

    // Which layers does the unified journey run? The journey runs whenever any
    // of e2e / live / sections is selected. All are optional.
    const journeyLayers = [];
    if (hm.includes('live'))     journeyLayers.push('health');
    if (hm.includes('sections')) journeyLayers.push('sections');
    if (hm.includes('e2e'))      journeyLayers.push('rent');
    const runJourney = journeyLayers.length > 0;

    const projects = new Set();
    if (runJourney || hm.includes('sections-each')) projects.add('live');
    if (hm.includes('editor')) projects.add('editor');

    if (projects.size > 0) {
      const args = ['playwright', 'test', '--config=flex/playwright.config.ts'];
      for (const p of projects) args.push('--project=' + p);

      // Narrow within the live project via --grep. The unified journey is one
      // describe block ("Flex Facility Journey"); the pinpoint mode uses the
      // per-section "Section:" blocks. Editor specs live in their own project.
      if (!hm.includes('editor')) {
        const greps = [];
        if (runJourney) greps.push('Flex Facility Journey');
        // "Sections — each as own test" only runs the per-section pinpoint specs
        // when the journey is NOT already verifying sections. They check the same
        // detectors, so never run both in one cycle (the UI enforces this too).
        const journeyDoesSections = journeyLayers.includes('sections');
        if (hm.includes('sections-each') && !journeyDoesSections) greps.push('Section:');
        if (greps.length) args.push('--grep', greps.join('|'));
      }

      // Tell the journey spec which layers to run. An empty FLEX_LAYERS would
      // mean "all layers", so only set it when the journey actually runs.
      if (runJourney) env.FLEX_LAYERS = journeyLayers.join(',');

      if (req.headed) args.push('--headed');
      if (req.workers && Number(req.workers) > 0) args.push('--workers', String(req.workers));
      flexCmd = { cmd: 'npx', args, env, allure: 'off' };
    }
  }

  // ── Assemble the command LIST ───────────────────────────────────────
  // A single run can span TWO playwright invocations: the regular specs
  // (root config) and Flex (its own config). They can't be merged into one
  // `npx playwright test` call — different --config — so they run as separate
  // processes, back-to-back, streaming into the SAME run. This is what makes
  // "Flex + SPC + V1 + Mini Mall" all execute from one launch instead of the
  // old behavior where Flex short-circuited everything else.
  const commands = [];

  // Regular specs (root playwright config) — run FIRST.
  if (specs.length > 0) {
    const args = ['playwright', 'test', ...specs];

    // UI sub-modules → playwright --grep (only meaningful when UI is selected)
    if (suites.includes('ui') && req.ui?.modules?.length) {
      const greps = req.ui.modules.map(m => m).filter(Boolean);
      if (greps.length) args.push('--grep', greps.join('|'));
    }

    if (req.headed) args.push('--headed');
    if (req.workers && Number(req.workers) > 0) args.push('--workers', String(req.workers));
    // mini-mall scan + all-pages scan need --project=chrome
    if (suites.includes('minimall') || suites.includes('allpages')) args.push('--project=chrome');
    // mini-mall rental always runs headed (captcha)
    if (suites.includes('minimallrent') && !req.headed) args.push('--headed');

    // Allure reporter when requested
    if (req.allure === 'serve' || req.allure === 'deploy') {
      args.push('--reporter=allure-playwright');
    }

    const label = suites.filter(s => specMap[s]).join('+') || 'tests';
    commands.push({ cmd: 'npx', args, env, allure: req.allure || 'off', label });
  }

  // Flex (separate config) — runs as its OWN process, LAST, so its per-facility
  // journey reports are the final thing in the log.
  if (flexCmd) commands.push({ ...flexCmd, label: 'flex' });

  if (commands.length === 0) return null;
  return commands;
}

// ───────── /api/run handler ─────────
function startRun(req, res) {
  readBody(req).then(raw => {
    let body;
    try { body = JSON.parse(raw || '{}'); } catch { return send(res, 400, { error: 'invalid json' }); }
    const built = buildRunCommand(body);
    if (!built) return send(res, 400, { error: 'No suites selected' });

    const id = randomUUID();
    // Persistent log: every line of stdout/stderr is also appended to disk.
    const stamp   = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(LOGS_DIR, `run-${stamp}.log`);
    const logFd   = fs.openSync(logFile, 'a');
    const entry   = { proc: null, buffer: [], listeners: new Set(), done: false, stopped: false, exitCode: null, startedAt: Date.now(), logFile, logFd };
    runs.set(id, entry);

    // On win32 with shell:true, args are concatenated into a cmd.exe command
    // string. Args containing &, |, ^, <, >, spaces, etc. must be wrapped in
    // double quotes or cmd will treat them as command separators.
    const quoteWinShell = (a) => {
      if (process.platform !== 'win32') return a;
      if (a === '' || /[\s&|^<>"]/.test(a)) return '"' + a.replace(/"/g, '\\"') + '"';
      return a;
    };
    // buildRunCommand now returns an ARRAY of commands. A single run can span
    // two playwright processes: the regular specs (root config) and Flex
    // (its own config). They cannot be one `npx playwright test` call
    // (different --config), so we spawn them one after another, streaming all
    // output into this one run. That is what makes "Flex + SPC + V1 + Mini
    // Mall" all execute from a single launch.
    const commands = built;
    const allureMode = (commands.find(c => c.allure && c.allure !== 'off') || {}).allure || 'off';

    // Header: the run config + every command that will execute, in order.
    let header =
      `[36m+-- Storagely Test Run --------------------------------------+[0m\n` +
      `[36m|[0m env=${body.env || '(default)'}  headed=${!!body.headed}  workers=${body.workers || '(auto)'}  allure=${allureMode}\n` +
      `[36m|[0m suites: ${(body.suites || []).join(', ') || '(none)'}\n`;
    commands.forEach((c, i) => {
      const tag = commands.length > 1 ? ` [${i + 1}/${commands.length}]` : '';
      header += `[36m|[0m cmd${tag}: ${c.cmd} ${c.args.map(quoteWinShell).join(' ')}\n`;
    });
    header += `[36m+------------------------------------------------------------+[0m\n`;
    pushLine(entry, header);
    process.stdout.write(header);

    let cmdIdx = 0;
    let anyFail = false;

    const finishRun = () => {
      entry.exitCode = anyFail ? 1 : 0;
      entry.done = true;
      const tail = `\n== RUN FINISHED - PLEASE REVIEW RESULTS (exit ${entry.exitCode}) ==\n`;
      pushLine(entry, tail);
      process.stdout.write(tail);
      // Optional Allure post-step: runs once, after every command completes.
      if (allureMode === 'serve' || allureMode === 'deploy') {
        const post = allureMode === 'serve'
          ? { cmd: 'npm', args: ['run', 'allure:serve'] }
          : { cmd: 'npm', args: ['run', 'test:deploy'] };
        pushLine(entry, `\n[36m> Starting allure: ${post.cmd} ${post.args.join(' ')}[0m\n`);
        const allure = spawn(post.cmd, post.args, { cwd: ROOT, env: commands[0].env, shell: process.platform === 'win32' });
        allure.stdout.on('data', c => fanout(entry, c));
        allure.stderr.on('data', c => fanout(entry, c));
        allure.on('close', () => closeListeners(entry));
        entry.allureProc = allure;
      } else {
        closeListeners(entry);
      }
    };

    const runNext = () => {
      if (entry.stopped || cmdIdx >= commands.length) return finishRun();
      const c = commands[cmdIdx];
      const safeArgs = c.args.map(quoteWinShell);

      // Step banner when a run has more than one command.
      if (commands.length > 1) {
        const banner = `\n[36m== Step ${cmdIdx + 1}/${commands.length} - ${c.label} =============================[0m\n`;
        pushLine(entry, banner);
        process.stdout.write(banner);
      }

      const proc = spawn(c.cmd, safeArgs, {
        cwd: ROOT, env: c.env, shell: process.platform === 'win32',
      });
      entry.proc = proc;

      // A spawn can emit BOTH 'error' and 'close'; guard so we advance once.
      let settled = false;
      const advance = (failed) => {
        if (settled) return;
        settled = true;
        if (failed) anyFail = true;
        cmdIdx++;
        if (entry.stopped) return finishRun();
        runNext();
      };

      proc.on('error', err => {
        const msg = `\n[31mx Failed to start process: ${err.message}[0m\n`;
        pushLine(entry, msg);
        process.stdout.write(msg);
        advance(true);
      });
      proc.stdout.on('data', chunk => fanout(entry, chunk));
      proc.stderr.on('data', chunk => fanout(entry, chunk));
      proc.on('close', code => advance(!!code));
    };

    runNext();
    send(res, 200, { runId: id });
  }).catch(err => send(res, 500, { error: String(err) }));
}

function pushLine(entry, text) {
  entry.buffer.push(text);
  if (entry.buffer.length > 5000) entry.buffer.splice(0, entry.buffer.length - 5000);
  // Persist to disk (synchronous append; fast and ordered).
  if (entry.logFd != null) { try { fs.writeSync(entry.logFd, text); } catch {} }
  for (const r of entry.listeners) writeSse(r, text);
}
function fanout(entry, chunk) {
  const text = chunk.toString();
  process.stdout.write(text);          // mirror to terminal (preserves existing UX)
  pushLine(entry, text);
}
function writeSse(res, text) {
  // Each SSE message: data:<line>\n\n  (split on newlines so multi-line chunks work)
  const safe = text.split('\n').map(l => 'data: ' + l).join('\n');
  res.write(safe + '\n\n');
}
function closeListeners(entry) {
  for (const r of entry.listeners) { try { r.write('event: end\ndata: {}\n\n'); r.end(); } catch {} }
  entry.listeners.clear();
  // Close log file once everything's done.
  if (entry.logFd != null) {
    try { fs.closeSync(entry.logFd); } catch {}
    entry.logFd = null;
    process.stdout.write(`\n  📁 Full log saved: ${entry.logFile}\n\n`);
  }
}

// ───────── /api/heartbeat — panel lifecycle sync ─────────
function heartbeatConnect(req, res) {
  res.writeHead(200, {
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');
  res.write('data: connected\n\n');
  heartbeatClients.add(res);

  // New client connected — cancel any pending shutdown
  if (panelShutdownTimer) { clearTimeout(panelShutdownTimer); panelShutdownTimer = null; }

  const keepAlive = setInterval(() => {
    try { res.write('data: ping\n\n'); } catch { clearInterval(keepAlive); }
  }, 15_000);

  req.on('close', () => {
    clearInterval(keepAlive);
    heartbeatClients.delete(res);
    // All panel tabs closed → start a delayed shutdown
    if (heartbeatClients.size === 0 && !panelShutdownTimer) {
      panelShutdownTimer = setTimeout(() => {
        console.log('\n  Panel tab closed — shutting down.\n');
        shutdownServer();
      }, 3000);
    }
  });
}

// ───────── /api/stream/:id ─────────
function streamRun(req, res, id) {
  const entry = runs.get(id);
  if (!entry) return send(res, 404, { error: 'unknown run' });
  res.writeHead(200, {
    'Content-Type':       'text/event-stream',
    'Cache-Control':      'no-cache',
    'Connection':         'keep-alive',
    'X-Accel-Buffering':  'no',
  });
  // Replay buffer
  for (const line of entry.buffer) writeSse(res, line);
  if (entry.done) {
    res.write('event: end\ndata: {}\n\n');
    return res.end();
  }
  entry.listeners.add(res);
  req.on('close', () => entry.listeners.delete(res));
}

// ───────── /api/stop/:id ─────────
function stopRun(req, res, id) {
  const entry = runs.get(id);
  if (!entry) return send(res, 404, { error: 'unknown run' });
  if (entry.proc && !entry.done) {
    if (process.platform === 'win32') {
      // On Windows with shell:true the proc PID is cmd.exe. Calling
      // proc.kill() would terminate cmd.exe first, orphaning the real
      // child processes (node/playwright/browsers). Use taskkill /T /F
      // instead — it walks the process tree and kills everything.
      try { spawn('taskkill', ['/pid', String(entry.proc.pid), '/T', '/F']); } catch {}
    } else {
      try { entry.proc.kill('SIGTERM'); } catch {}
    }
  }
  if (entry.allureProc) { try { entry.allureProc.kill(); } catch {} }
  send(res, 200, { stopped: true });
}

// ───────── Flex Issues DB + per-client coverage ─────────
// The dashboard behind the panel's "Issues & Coverage" card. Two sources:
//   • flex/issue-db/issues.json — COMMITTED, human-triaged issue database
//     (the suite's known-issue gate reads the same file — see
//     flex/configs/issueDb.ts). The panel auto-APPENDS newly-seen issues
//     (status 'new'; exploratory finds → 'candidate') but NEVER auto-triages —
//     only the buttons below change a status.
//   • flex/test-results/journey/*.json — per-facility journey reports; the
//     LATEST report per facility is the "current truth" for coverage and for
//     bumping lastSeen/occurrences on issues.
const FLEX_ISSUE_DB_FILE = path.join(ROOT, 'flex', 'issue-db', 'issues.json');
const FLEX_JOURNEY_DIR   = path.join(ROOT, 'flex', 'test-results', 'journey');
const ISSUE_STATUSES = ['new', 'candidate', 'false-flag', 'informed', 'acknowledged', 'fixed'];

// MUST stay identical to normalizeCheck()/issueSignature() in flex/configs/issueDb.ts.
function normalizeCheck(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function issueSignature(client, area, checkName) {
  return `${String(client || '').toLowerCase()}|${String(area || '').toLowerCase()}|${normalizeCheck(checkName)}`;
}

function readIssueDb() {
  const raw = readJsonSafe(FLEX_ISSUE_DB_FILE, { issues: [] });
  return { _comment: raw._comment, issues: Array.isArray(raw.issues) ? raw.issues : [] };
}
function writeIssueDb(db) {
  try {
    fs.mkdirSync(path.dirname(FLEX_ISSUE_DB_FILE), { recursive: true });
    writeJsonSafe(FLEX_ISSUE_DB_FILE, { _comment: db._comment, issues: db.issues });
  } catch (e) { console.log('  issue-db write failed:', String(e)); }
}

/** Latest journey report per facility id. */
function latestJourneyReports() {
  let files = [];
  try { files = fs.readdirSync(FLEX_JOURNEY_DIR).filter(f => f.endsWith('.json')); } catch { return []; }
  const byFacility = new Map();
  for (const f of files) {
    let rep;
    try { rep = JSON.parse(fs.readFileSync(path.join(FLEX_JOURNEY_DIR, f), 'utf8')); } catch { continue; }
    const id = rep && rep.facility && rep.facility.id;
    if (!id || !rep.timestamp) continue;
    const prev = byFacility.get(id);
    if (!prev || String(rep.timestamp) > String(prev.rep.timestamp)) byFacility.set(id, { rep, file: f });
  }
  return [...byFacility.values()];
}

const KNOWN_TAG_RE = /^\[known:(false-flag|informed|acknowledged)\s*#([a-z0-9-]+)/i;

/** One check → an "observation" (fail / known-tagged / exploratory FINDING) or null. */
function classifyCheck(client, area, name, passed, detail) {
  const d = String(detail || '');
  const known = d.match(KNOWN_TAG_RE);
  if (known) {
    return { kind: 'known', client, area, check: name, detail: d,
             sig: issueSignature(client, area, name), knownStatus: known[1].toLowerCase(), knownId: known[2] };
  }
  if (/^explore:\s*/i.test(name) && /^FINDING:/i.test(d)) {
    const probeId = name.replace(/^explore:\s*/i, '');
    return { kind: 'finding', client, area: 'exploratory', check: probeId,
             detail: d.replace(/^FINDING:\s*/i, ''), sig: issueSignature(client, 'exploratory', probeId) };
  }
  if (!passed) return { kind: 'fail', client, area, check: name, detail: d, sig: issueSignature(client, area, name) };
  return null;
}

/** Walk one report → observations, at sub-check granularity for sections. */
function observationsFromReport(rep) {
  const out = [];
  const client = (rep.facility && rep.facility.client) || '';
  for (const step of rep.steps || []) {
    if (step.status === 'skipped') continue;
    for (const ck of step.checks || []) {
      if (Array.isArray(ck.sub)) {
        for (const sub of ck.sub) {
          const obs = classifyCheck(client, ck.name, sub.name, sub.passed, sub.detail);
          if (obs) out.push(obs);
        }
      } else if (step.id === 'sections') {
        // Legacy report (pre-`sub` enrichment): section entries can't be
        // attributed at check level — skip for issue-filing (coverage still
        // shows them); the next run writes sub-checks and files precisely.
        continue;
      } else {
        const obs = classifyCheck(client, step.id, ck.name, ck.passed, ck.detail);
        if (obs) out.push(obs);
      }
    }
  }
  return out;
}

function uniqueIssueId(db, obs) {
  const base = normalizeCheck(`${obs.client}-${obs.area}-${obs.check}`).slice(0, 60) || 'issue';
  let id = base, n = 2;
  while (db.issues.some(i => i.id === id)) id = `${base}-${n++}`;
  return id;
}

/** Merge latest-report observations into the DB. Returns true when the DB changed. */
function syncIssuesFromReports(db, latest) {
  let changed = false;
  const bySig = new Map();
  for (const issue of db.issues) for (const s of issue.signatures || []) bySig.set(s, issue);

  for (const { rep } of latest) {
    const ts = String(rep.timestamp || '');
    const url = (rep.facility && rep.facility.url) || '';
    const bumped = new Set(); // one bump per issue per report
    for (const obs of observationsFromReport(rep)) {
      let issue = bySig.get(obs.sig);
      if (!issue) {
        issue = {
          id: uniqueIssueId(db, obs),
          signatures: [obs.sig],
          client: obs.client,
          area: obs.area,
          check: obs.check,
          title: obs.kind === 'finding'
            ? `[exploratory] ${obs.check}: ${obs.detail.slice(0, 90)}`
            : `${obs.area}: ${obs.check}`,
          detail: obs.detail.slice(0, 400),
          source: obs.kind === 'finding' ? 'exploratory' : 'suite',
          status: obs.kind === 'finding' ? 'candidate' : 'new',
          slackChannel: '',
          comments: [],
          firstSeen: ts, lastSeen: ts, occurrences: 1,
          urls: url ? [url] : [],
        };
        db.issues.push(issue);
        bySig.set(obs.sig, issue);
        changed = true;
      } else if (ts > String(issue.lastSeen || '') && !bumped.has(issue.id)) {
        bumped.add(issue.id);
        issue.lastSeen = ts;
        issue.occurrences = (issue.occurrences || 0) + 1;
        if (obs.detail) issue.detail = obs.detail.slice(0, 400);
        if (url && !(issue.urls || []).includes(url)) issue.urls = [...(issue.urls || []), url].slice(-6);
        changed = true;
      }
    }
  }
  return changed;
}

/** Per-facility coverage summary (the "passed log") from the latest report. */
function coverageFromReport(rep, file) {
  const steps = (rep.steps || []).map(s => ({
    id: s.id, label: s.label, status: s.status,
    passed: (s.checks || []).filter(c => c.passed).length,
    failed: (s.checks || []).filter(c => !c.passed).length,
    total: (s.checks || []).length,
    durationMs: s.durationMs || 0,
  }));
  const failing = [], known = [], exploratory = [];
  let anomalies = null;
  for (const step of rep.steps || []) {
    for (const ck of step.checks || []) {
      if (Array.isArray(ck.sub)) {
        if (ck.name === 'anomalies') {
          const info = ck.sub.find(s => /data anomalies surfaced/i.test(s.name));
          anomalies = (info && info.detail) || ck.detail || null;
        }
        for (const sub of ck.sub) {
          const d = String(sub.detail || '');
          if (KNOWN_TAG_RE.test(d)) known.push({ area: ck.name, check: sub.name, detail: d.slice(0, 220) });
          else if (!sub.passed) failing.push({ area: ck.name, check: sub.name, detail: d.slice(0, 220) });
          else if (/^explore:/i.test(sub.name) && /^FINDING:/i.test(d)) {
            exploratory.push({ probe: sub.name.replace(/^explore:\s*/i, ''), detail: d.slice(0, 220) });
          }
        }
      } else {
        const d = String(ck.detail || '');
        if (KNOWN_TAG_RE.test(d)) known.push({ area: step.id, check: ck.name, detail: d.slice(0, 220) });
        else if (!ck.passed) failing.push({ area: step.id, check: ck.name, detail: d.slice(0, 220) });
      }
    }
  }
  // Sibling cross-check verdicts (SYSTEMIC vs PAGE-SPECIFIC) — surfaced so the
  // dashboard + copy summaries can say whether a failure is template-level.
  const verdicts = [];
  for (const step of rep.steps || []) {
    if (step.id !== 'sibling') continue;
    for (const ck of step.checks || []) {
      const vm = String(ck.name || '').match(/^verdict:\s*(.+)$/i);
      if (vm) verdicts.push({ section: vm[1].trim(), detail: String(ck.detail || '').slice(0, 240) });
    }
  }
  // Rent step result — the captured payment error or handshake outcome.
  let rentResult = null;
  for (const step of rep.steps || []) {
    if (step.id !== 'rent') continue;
    if (step.status === 'skipped') { rentResult = { passed: null, detail: 'skipped' }; break; }
    for (const ck of step.checks || []) {
      if (/submit rent|yardi.*rent.*outcome/i.test(ck.name)) {
        rentResult = { passed: ck.passed, detail: String(ck.detail || '').slice(0, 300) };
        break;
      }
    }
    if (!rentResult) {
      const p = (step.checks || []).filter(c => c.passed).length;
      const f = (step.checks || []).filter(c => !c.passed).length;
      rentResult = { passed: step.status === 'passed', detail: `${p} passed, ${f} failed` };
    }
  }
  return {
    facilityId: rep.facility && rep.facility.id,
    name: rep.facility && rep.facility.name,
    client: (rep.facility && rep.facility.client) || '?',
    url: rep.facility && rep.facility.url,
    timestamp: rep.timestamp,
    durationMs: rep.totalDurationMs || 0,
    steps, failing, known, anomalies, exploratory, verdicts, rentResult,
    reportFile: file,
  };
}

/** GET /api/flex/issues payload: triaged DB (+liveness) and per-facility coverage. */
function aggregateFlexIssues() {
  const db = readIssueDb();
  const latest = latestJourneyReports();
  if (syncIssuesFromReports(db, latest)) writeIssueDb(db);

  const seenSigs = new Set();
  const latestByClient = {};
  for (const { rep } of latest) {
    for (const obs of observationsFromReport(rep)) seenSigs.add(obs.sig);
    const c = (rep.facility && rep.facility.client) || '?';
    if (!latestByClient[c] || String(rep.timestamp) > String(latestByClient[c])) latestByClient[c] = rep.timestamp;
  }
  const issues = db.issues.map(i => ({
    ...i,
    seenInLatest: (i.signatures || []).some(s => seenSigs.has(s)),
    clientLatestRunAt: latestByClient[i.client] || null,
  }));
  return { issues, coverage: latest.map(({ rep, file }) => coverageFromReport(rep, file)), statuses: ISSUE_STATUSES };
}

/** POST /api/flex/issue-update {id, status?, comment?, slackChannel?} */
function updateFlexIssue(req, res) {
  return readBody(req).then(raw => {
    try {
      const body = JSON.parse(raw || '{}');
      const db = readIssueDb();
      const issue = db.issues.find(i => i.id === body.id);
      if (!issue) return send(res, 404, { error: `no issue with id "${body.id}"` });
      if (body.status !== undefined) {
        if (!ISSUE_STATUSES.includes(body.status)) return send(res, 400, { error: `bad status "${body.status}"` });
        issue.status = body.status;
      }
      if (typeof body.slackChannel === 'string') issue.slackChannel = body.slackChannel.trim();
      if (typeof body.comment === 'string' && body.comment.trim()) {
        issue.comments = [...(issue.comments || []), { text: body.comment.trim(), at: new Date().toISOString() }];
      }
      writeIssueDb(db);
      send(res, 200, { ok: true, issue });
    } catch (e) { send(res, 400, { error: String(e) }); }
  });
}

// ───────── Static file serving ─────────
function serveStatic(req, res) {
  const p = req.url === '/' ? '/index.html' : req.url;
  const file = path.join(PANEL_DIR, p.replace(/^\//, ''));
  if (!file.startsWith(PANEL_DIR)) return send(res, 403, 'forbidden');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'not found');
    const ext = path.extname(file).toLowerCase();
    const ct = ext === '.html' ? 'text/html; charset=utf-8'
             : ext === '.css'  ? 'text/css; charset=utf-8'
             : ext === '.js'   ? 'application/javascript; charset=utf-8'
             : ext === '.json' ? 'application/json; charset=utf-8'
             : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(buf);
  });
}

// ───────── HTTP router ─────────
const server = http.createServer((req, res) => {
  const url = req.url || '';

  if (url === '/api/heartbeat' && req.method === 'GET') {
    return heartbeatConnect(req, res);
  }
  if (url === '/api/config' && req.method === 'GET') {
    return send(res, 200, buildConfigPayload());
  }
  if (url === '/api/run' && req.method === 'POST') {
    return startRun(req, res);
  }
  let m;
  if ((m = url.match(/^\/api\/stream\/([^/?]+)$/)) && req.method === 'GET') {
    return streamRun(req, res, m[1]);
  }
  if ((m = url.match(/^\/api\/stop\/([^/?]+)$/)) && req.method === 'POST') {
    return stopRun(req, res, m[1]);
  }
  if (url === '/api/presets' && req.method === 'GET') {
    return send(res, 200, readJsonSafe(PRESETS_FILE, []));
  }
  if (url === '/api/presets' && req.method === 'POST') {
    return readBody(req).then(raw => {
      try { writeJsonSafe(PRESETS_FILE, JSON.parse(raw || '[]')); send(res, 200, { ok: true }); }
      catch (e) { send(res, 400, { error: String(e) }); }
    });
  }
  if (url === '/api/extra-clients' && req.method === 'GET') {
    return send(res, 200, readJsonSafe(EXTRA_CLIENTS_FILE, { ui: [], spc: [], v1: [] }));
  }
  if (url === '/api/extra-clients' && req.method === 'POST') {
    return readBody(req).then(raw => {
      try { writeJsonSafe(EXTRA_CLIENTS_FILE, JSON.parse(raw || '{}')); send(res, 200, { ok: true }); }
      catch (e) { send(res, 400, { error: String(e) }); }
    });
  }
  // Flex Issues dashboard — triaged issue DB + per-client coverage.
  if (url === '/api/flex/issues' && req.method === 'GET') {
    try { return send(res, 200, aggregateFlexIssues()); }
    catch (e) { return send(res, 500, { error: String(e) }); }
  }
  if (url === '/api/flex/issue-update' && req.method === 'POST') {
    return updateFlexIssue(req, res);
  }
  if (url === '/api/flex/issue-delete' && req.method === 'POST') {
    return readBody(req).then(raw => {
      try {
        const body = JSON.parse(raw || '{}');
        const { id, client } = body;
        if (!id && !client) return send(res, 400, { error: 'missing id or client' });
        const db = readIssueDb();
        if (client) {
          const before = db.issues.length;
          const removed = db.issues.filter(i => (i.client || '').toLowerCase() === client.toLowerCase());
          db.issues = db.issues.filter(i => (i.client || '').toLowerCase() !== client.toLowerCase());
          writeIssueDb(db);
          return send(res, 200, { ok: true, deletedCount: before - db.issues.length, removed: removed.map(i => ({ id: i.id, title: i.title, area: i.area, check: i.check, status: i.status })) });
        }
        const idx = db.issues.findIndex(i => i.id === id);
        if (idx < 0) return send(res, 404, { error: `no issue with id "${id}"` });
        db.issues.splice(idx, 1);
        writeIssueDb(db);
        send(res, 200, { ok: true, deleted: id });
      } catch (e) { send(res, 400, { error: String(e) }); }
    });
  }
  // Full journey report for one facility (latest) — powers the detail modal.
  if (url.startsWith('/api/flex/report') && req.method === 'GET') {
    try {
      const fid = new URL(url, 'http://x').searchParams.get('facilityId') || '';
      const hit = latestJourneyReports().find(r => r.rep.facility && r.rep.facility.id === fid);
      if (!hit) return send(res, 404, { error: `no report for facility "${fid}"` });
      return send(res, 200, { report: hit.rep, file: hit.file });
    } catch (e) { return send(res, 500, { error: String(e) }); }
  }
  // Grow the Flex location pools from each client's sitemap (robots.txt-aware).
  // Writes flex/test-results/location-pools/<client>.json — the cache the
  // suite's FLEX_SAMPLE random sampling reads.
  if (url === '/api/flex/discover-locations' && req.method === 'POST') {
    return (async () => {
      try {
        const { discoverAll } = require(path.join(ROOT, 'flex', 'scripts', 'discover-locations.js'));
        send(res, 200, { results: await discoverAll() });
      } catch (e) { send(res, 500, { error: String(e) }); }
    })();
  }
  // Saved corp codes (slug → code), used by Build Instance Regression so the
  // user doesn't have to re-paste passwords on every run.
  if (url === '/api/corp-codes' && req.method === 'GET') {
    return send(res, 200, readJsonSafe(CORP_CODES_FILE, {}));
  }
  if (url === '/api/corp-codes' && req.method === 'POST') {
    return readBody(req).then(raw => {
      try { writeJsonSafe(CORP_CODES_FILE, JSON.parse(raw || '{}')); send(res, 200, { ok: true }); }
      catch (e) { send(res, 400, { error: String(e) }); }
    });
  }
  serveStatic(req, res);
});

function freePort(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port}"`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split('\n')) {
      const m = line.trim().match(/LISTENING\s+(\d+)/);
      if (m && m[1] !== '0') pids.add(m[1]);
    }
    for (const pid of pids) {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch {}
    }
    if (pids.size) console.log(`  Killed stale process(es) on port ${port}: PIDs ${[...pids].join(', ')}`);
  } catch {}
}

freePort(PORT);

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log('  🛰️  Storagely — Regression Control Panel running at ' + url);
  console.log('  (Ctrl+C to stop. Test output also streams here.)');
  console.log('');
  // Auto-open browser when not suppressed
  if (!process.env.PANEL_NO_OPEN) {
    const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
                 : process.platform === 'darwin' ? ['open', [url]]
                 : ['xdg-open', [url]];
    try { spawn(opener[0], opener[1], { detached: true, stdio: 'ignore' }).unref(); } catch {}
  }
});

// ───────── Graceful shutdown (Ctrl+C or panel tab closed) ─────────
function shutdownServer() {
  for (const [, entry] of runs) {
    if (entry.proc && !entry.done) {
      if (process.platform === 'win32') {
        try { spawn('taskkill', ['/pid', String(entry.proc.pid), '/T', '/F']); } catch {}
      } else {
        try { entry.proc.kill('SIGTERM'); } catch {}
      }
    }
    if (entry.allureProc) { try { entry.allureProc.kill(); } catch {} }
  }
  server.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  console.log('\n  Ctrl+C — notifying panel and shutting down…');
  for (const res of heartbeatClients) {
    try { res.write('event: shutdown\ndata: {}\n\n'); } catch {}
  }
  // Give the SSE event a moment to flush before exiting
  setTimeout(shutdownServer, 500);
});
