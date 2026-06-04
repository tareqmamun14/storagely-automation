# Storagely Automation — working agreement

Playwright + TypeScript end-to-end test suite for Storagely's storage-client sites
(location/listing pages, SPC & V1 rent/checkout flows, admin, data sync, mini mall,
and the Helix/V4 builder under `helix/`). Local runs use real **Chrome**, headed.

## Use the project skills proactively — don't wait to be asked

`.claude/skills/` contains skills tailored to this repo. When a request matches one,
**invoke it automatically** as the first step, even if the user didn't name it. If a
task spans several, chain them. Pick by intent:

| If the work is… | Use |
|---|---|
| A test is failing / flaky / timing out / stale selector | **heal-test** |
| Running a suite, or "run X on staging/prod", or launching the panel | **run-suite** |
| Anything about listing pages, rent/reserve buttons, pricing rows, SPC vs V1, captcha, FMS quirks | **location-test** |
| Adding a new page object / flow / Helix section | **new-page-object** |
| Reviewing a diff before pushing | built-in **code-review** (use `ultra` for deep) |
| Confirming a change actually works in the app | built-in **verify** / **run** |

When unsure which fits, prefer the closest skill over improvising — it carries the
repo's conventions and live-page verification steps.

## Core conventions (apply even when no skill fires)
- **Selectors live in page objects** (`pages/**`, `helix/pages/**`) — never inline in spec files.
- Prefer **semantic locators** (role + text) over CSS classes; regex for dynamic text; `.first()` for repeated unit rows.
- Never `waitForNetworkIdle` or use deprecated/discouraged APIs; rely on auto-waiting + web-first assertions.
- Verify real selectors against the live page with the **Playwright MCP** (`browser_navigate` → `browser_snapshot` → `browser_generate_locator`) before committing them.
- Always confirm **environment** (staging vs production) before running rent/checkout flows. Env via `STORAGELY_*` vars; see `control-panel/README.md`.
- Client/URL truth: `configs/urls.ts`. Helix facilities/components manifest: `helix/configs/`.

## Cross-machine sync
This repo is developed on a desktop + laptop, kept in sync via GitHub. **Commit all
meaningful work** so it can reach the other machine. Pushing is done by the user via
**GitHub Desktop** (the terminal can't push — credentials live in GitHub Desktop).
Remind the user to push at the end of a task.

## Running tests (quick reference)
- Suites: `npm run run:v1 | run:spc | run:uic | run:admin | run:datasync | run:minimall | run:allpages`
- Helix: `npm run run:helix*` (see `package.json`)
- Single file: `npx playwright test <file> --project=chrome --headed`
- Control panel (toggles instead of flags): `npm run panel` → http://localhost:5173
