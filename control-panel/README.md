# 🛰️ Storagely — Regression Control Panel

A local, zero-dependency web UI that is the single command center for the whole
regression system: launch any suite with toggles instead of CLI flags, watch
runs stream live, and triage findings in the built-in Issues & Coverage
dashboard (backed by the committed `flex/issue-db/issues.json`).

Three views, one topbar (▶ Run / ■ Stop always available):

| View | What lives there |
|---|---|
| 🚀 **Launch** | Environment, global options, every suite (Flex pipeline first: journey steps, checkout depth, 🔄 rotation, random sampling, 🌐 sitemap pool growth, sections, clients, facilities, ad-hoc URL) + command preview |
| 🐞 **Issues & Coverage** | Per-client issue triage (Informed / Acknowledge / False flag / Fixed, comments, Slack channel) + per-facility pass log from the latest journey reports — feeds the suite's known-issue gate |
| 📟 **Live Console** | Streamed run output (auto-opens on ▶ Run) |

## Start it

Double-click **`panel.bat`** at the repo root. The server starts and your default
browser opens to `http://localhost:5173`.

Or from a terminal:

```bash
npm run panel
```

Stop the server with `Ctrl+C` in that terminal (or close `panel.bat`).

## What you get

- **Environment** toggle (Staging / Production)
- **Suite** toggles for: UI Components, SPC Rent, V1 Rent, Admin Platform, Data Sync, Mini Mall Scan
- **Per-suite client checkboxes** — pick which clients to run for THIS run
- **UI Components sub-modules** — Home, Contact, FAQ, Pricing, Filter, Sort, Location, Feature Conflicts
- **Headed / Workers / Allure** options
- **Data Sync** has its own env toggle and SiteLink-Stage corp-password field
- **Presets** — bundled defaults match your current commands; save/delete your own
- **Run / Stop** with **live output** in the page (also streams to the terminal where the server runs)
- **Dark mode** by default; toggle in the header
- **Add ad-hoc URLs** for one-off runs (paste into the textarea inside a suite)
- **Add saved extra clients** via the "Add / manage extra clients" card — these persist in `extra-clients.json` and auto-include in every run

## How it works (no scary magic)

The panel never edits your test files. It runs the same `npx playwright test ...`
commands you run today, with a few **environment variables** the configs honor:

| Env var                          | Effect                                                  |
| -------------------------------- | ------------------------------------------------------- |
| `STORAGELY_ENV`                  | `staging` or `production` (overrides `CURRENT_ENVIRONMENT`) |
| `STORAGELY_UI_CLIENTS`           | comma-sep client substrings to KEEP (UI Components)     |
| `STORAGELY_UI_EXTRA`             | comma-sep extra URLs to APPEND                          |
| `STORAGELY_SPC_CLIENTS`          | …same, for SPC                                          |
| `STORAGELY_SPC_EXTRA`            | …                                                       |
| `STORAGELY_V1_CLIENTS`           | …same, for V1                                           |
| `STORAGELY_V1_EXTRA`             | …                                                       |
| `STORAGELY_DS_ENV`               | `stage` or `prod` (Data Sync env)                       |
| `STORAGELY_DS_CLIENTS`           | comma-sep FMS types: `SiteLink,storEDGE,SSM`            |
| `STORAGELY_SITELINK_STAGE_PWD`   | overrides the SiteLink stage corp password             |

If none of these are set (e.g. you run `npm test` the old way), the configs
behave exactly like before.

## Adding a new client

Two ways — pick whichever you like:

1. **In the panel** — open *Add / manage extra clients*, paste the URL into the
   right suite, click **Save extras**. The next run includes it automatically.
2. **In code (the existing way)** — edit `configs/urls.ts` like before. The panel
   re-discovers it on the next browser refresh.

## Adding a new test suite

Open `control-panel/server.js`, find the `specMap` object (there are two — one
in `buildRunCommand`, one in `index.html`'s `refreshCmdPreview`), add an entry
like `mynew: 'tests/myNew.spec.ts'`, and add the suite to the `suites` array
in `buildConfigPayload`. Then add a matching `<details class="suite" id="suite-mynew">`
block in `index.html`. ~5 lines per place.

## Files

| File                                        | Purpose                                     |
| ------------------------------------------- | ------------------------------------------- |
| `control-panel/server.js`                   | Tiny HTTP + SSE server                      |
| `control-panel/index.html`                  | The UI                                      |
| `control-panel/presets.default.json`        | Bundled presets (don't edit by hand)        |
| `control-panel/presets.user.json`           | Your saved presets (created on first save)  |
| `control-panel/extra-clients.json`          | Extra client URLs you've saved              |
| `panel.bat`                                 | Windows launcher                            |
