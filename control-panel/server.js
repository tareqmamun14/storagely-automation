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
const { spawn } = require('child_process');
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
  'first-storage':            'storEDGE',
  'firststorage':             'storEDGE',
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
  // External (Storerocket-fronted) — both run on SiteLink
  'ulok':                     'SiteLink',
  'almightystorage':          'SiteLink',
};
function fmsFor(id) { return FMS_BY_SLUG[id] || '—'; }

// ───────── Run registry (in-memory) ─────────
/** id → { proc, buffer:[], listeners:Set<res>, done:bool, exitCode } */
const runs = new Map();

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

// Friendly label for a URL (e.g. "https://bluebirdstorage.ca/..." → "Bluebird Storage")
function labelFor(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('staging')) {
      const slug = u.pathname.split('/').filter(Boolean)[0] || u.hostname;
      return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    let host = u.hostname.replace(/^www\./, '').replace(/^ww2\./, '');
    host = host.split('.')[0];
    return host.replace(/storage$/i, ' Storage').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  } catch { return url; }
}

// Stable ID for a URL (used in checkboxes)
function idFor(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('staging')) return u.pathname.split('/').filter(Boolean)[0] || u.hostname;
    return u.hostname.replace(/^www\./, '').replace(/^ww2\./, '').split('.')[0];
  } catch { return url; }
}

// ───────── Parse Helix client sites from helix/configs/urls.ts ─────────
function parseHelixSites() {
  try {
    const content = fs.readFileSync(path.join(ROOT, 'helix', 'configs', 'urls.ts'), 'utf8');
    const sites = [];
    const re = /url:\s*'([^']+)'[\s\S]*?label:\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(content))) sites.push({ url: m[1], label: m[2] });
    return sites;
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
    suites: ['ui', 'spc', 'v1', 'admin', 'datasync', 'minimallrent', 'minimall', 'allpages', 'build', 'helix'],
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
    helix: { sites: parseHelixSites() },
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
  if (req.helix?.password)              env.HELIX_PASSWORD                   = req.helix.password;
  if (req.helix?.customUrl)             env.HELIX_CUSTOM_URL                 = req.helix.customUrl;

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
      env.STORAGELY_SPC_CLIENTS = env.STORAGELY_SPC_CLIENTS || csv;
      env.STORAGELY_V1_CLIENTS  = env.STORAGELY_V1_CLIENTS  || csv;
      if (!suites.includes('spc')) suites.push('spc');
      if (!suites.includes('v1'))  suites.push('v1');
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

  // Helix suite — uses its own playwright config with project-based routing.
  // Modules map to Playwright projects: e2e/live → 'live' project, editor → 'editor' project.
  let helixCmd = null;
  if (suites.includes('helix')) {
    const hm = req.helix?.modules || ['e2e', 'live'];
    const projects = new Set();
    if (hm.includes('e2e') || hm.includes('live')) projects.add('live');
    if (hm.includes('editor')) projects.add('editor');
    if (projects.size > 0) {
      const args = ['playwright', 'test', '--config=helix/playwright.config.ts'];
      for (const p of projects) args.push('--project=' + p);
      if (req.headed) args.push('--headed');
      if (req.workers && Number(req.workers) > 0) args.push('--workers', String(req.workers));
      helixCmd = { cmd: 'npx', args, env, allure: 'off' };
    }
  }

  if (specs.length === 0 && !helixCmd) return null;

  // Helix has its own config — if selected, it takes priority.
  if (helixCmd) return helixCmd;

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

  return { cmd: 'npx', args, env, allure: req.allure || 'off' };
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
    const entry   = { proc: null, buffer: [], listeners: new Set(), done: false, exitCode: null, startedAt: Date.now(), logFile, logFd };
    runs.set(id, entry);

    // On win32 with shell:true, args are concatenated into a cmd.exe command
    // string. Args containing &, |, ^, <, >, spaces, etc. must be wrapped in
    // double quotes or cmd will treat them as command separators.
    const quoteWinShell = (a) => {
      if (process.platform !== 'win32') return a;
      if (a === '' || /[\s&|^<>"]/.test(a)) return '"' + a.replace(/"/g, '\\"') + '"';
      return a;
    };
    const safeArgs = built.args.map(quoteWinShell);

    // Header lines so the user sees the actual command being executed.
    const header =
      `[36m╭─ Storagely Test Run ──────────────────────────────────╮[0m\n` +
      `[36m│[0m env=${body.env || '(default)'}  headed=${!!body.headed}  workers=${body.workers || '(auto)'}  allure=${built.allure}\n` +
      `[36m│[0m suites: ${(body.suites || []).join(', ') || '(none)'}\n` +
      `[36m│[0m cmd: ${built.cmd} ${safeArgs.join(' ')}\n` +
      `[36m╰───────────────────────────────────────────────────────╯[0m\n`;
    pushLine(entry, header);
    process.stdout.write(header);

    const proc = spawn(built.cmd, safeArgs, {
      cwd: ROOT, env: built.env, shell: process.platform === 'win32',
    });
    entry.proc = proc;

    proc.on('error', err => {
      const msg = `\n[31m✖ Failed to start process: ${err.message}[0m\n`;
      pushLine(entry, msg);
      process.stdout.write(msg);
      entry.exitCode = -1;
      entry.done = true;
      closeListeners(entry);
    });
    proc.stdout.on('data', chunk => fanout(entry, chunk));
    proc.stderr.on('data', chunk => fanout(entry, chunk));
    proc.on('close', code => {
      entry.exitCode = code;
      entry.done = true;
      const tail =
`\n── RUN FINISHED — PLEASE REVIEW RESULTS (exit ${code}) ──\n`;
      pushLine(entry, tail);
      process.stdout.write(tail);
      // Optional Allure post-step
      if (built.allure === 'serve' || built.allure === 'deploy') {
        const post = built.allure === 'serve'
          ? { cmd: 'npm', args: ['run', 'allure:serve'] }
          : { cmd: 'npm', args: ['run', 'test:deploy'] };
        pushLine(entry, `\n[36m▶ Starting allure: ${post.cmd} ${post.args.join(' ')}[0m\n`);
        const allure = spawn(post.cmd, post.args, { cwd: ROOT, env: built.env, shell: process.platform === 'win32' });
        allure.stdout.on('data', c => fanout(entry, c));
        allure.stderr.on('data', c => fanout(entry, c));
        allure.on('close', () => closeListeners(entry));
        entry.allureProc = allure;
      } else {
        closeListeners(entry);
      }
    });

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

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log('  🎛️  Storagely Test Control Panel running at ' + url);
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
