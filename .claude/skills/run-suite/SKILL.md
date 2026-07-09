---
name: run-suite
description: Run a Storagely test suite with the right command, environment, clients, and options. Use when asked to "run the SPC tests", "run UI components on staging", "run mini mall scan", "test data sync against prod", "run all locations", or to launch the control panel. Knows the npm run:* scripts and the STORAGELY_* env vars that the configs honor.
---

# Run a Storagely test suite

Pick the correct command and flags instead of guessing. Source of truth: [package.json](../../../package.json) scripts and [control-panel/README.md](../../../control-panel/README.md).

## Suite shortcuts (npm scripts)

| Ask | Command |
|-----|---------|
| V1 rent/reserve | `npm run run:v1` |
| SPC (single-page checkout) rent | `npm run run:spc` |
| UI Components (home/contact/faq/pricing/filter/sort/location) | `npm run run:uic` |
| Admin platform | `npm run run:admin` |
| Data Sync (FMS) | `npm run run:datasync` |
| Mini Mall full scan | `npm run run:minimall` |
| Mini Mall rental (headed) | `npm run run:minimallrent` |
| All locations scan | `npm run run:allpages` |
| Flex (all, headed) | `npm run run:flex` |
| Flex live / editor / e2e / health | `npm run run:flex:live` / `:editor` / `:e2e` / `:health` |
| Flex visual baseline (+ update) | `npm run run:flex:visual` (`:update` to re-baseline) |

A specific file: `npx playwright test <file> --project=chrome` (add `--headed` / `--debug`).

## Tuning a run with env vars (configs honor these)
- `STORAGELY_ENV=staging|production` — environment (overrides `CURRENT_ENVIRONMENT`)
- `STORAGELY_UI_CLIENTS` / `STORAGELY_SPC_CLIENTS` / `STORAGELY_V1_CLIENTS` — comma-sep client substrings to KEEP
- `STORAGELY_*_EXTRA` — comma-sep extra URLs to append
- `STORAGELY_DS_ENV=stage|prod`, `STORAGELY_DS_CLIENTS=SiteLink,storEDGE,SSM`, `STORAGELY_SITELINK_STAGE_PWD=...`
- Flex login: `FLEX_PASSWORD=...`

PowerShell example (run SPC on staging for two clients):
```powershell
$env:STORAGELY_ENV="staging"; $env:STORAGELY_SPC_CLIENTS="columbia,bluebird"; npm run run:spc
```

## Prefer the Control Panel for anything interactive
For toggling suites/clients/env without remembering flags, start the panel:
`npm run panel`  → http://localhost:5173  (or double-click `panel.bat`). Stop with Ctrl+C.

## Notes
- Local runs use the real **Chrome** channel and run **headed** (see playwright.config.ts).
- After a run, the clean reporter prints a consolidated summary (global teardown).
- Always confirm the env (staging vs production) before running rent/checkout flows.
