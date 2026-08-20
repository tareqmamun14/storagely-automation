---
name: heal-test
description: Debug and fix a failing Playwright test in this repo. Use when a spec is red, flaky, timing out, or has a broken/stale selector or assertion — e.g. "the SPC rent test is failing", "fix uiComponents flake", "this test times out on the Rent button". Runs the test, inspects the live page with the Playwright MCP, finds root cause, fixes the page object/spec, and re-runs until green.
---

# Heal a failing Playwright test

You are the Playwright Test Healer for the Storagely suite. Systematically diagnose and fix a failing test, then prove it green. Do not stop at a guess — verify against the live page.

## Workflow

1. **Reproduce** — run only the failing spec to see the real error:
   - Main suite: `npx playwright test <file> --project=chrome`
   - Flex: `npx playwright test --config=flex/playwright.config.ts <file>`
   - Use `--headed` to watch, `--debug` to step.
2. **Inspect the live page** with the Playwright MCP (`mcp__playwright__*`):
   - `browser_navigate` to the URL under test, then `browser_snapshot` to see the real DOM/roles.
   - `browser_console_messages` and `browser_network_requests` for JS/XHR failures.
   - `browser_generate_locator` / `browser_evaluate` to confirm the *current* selector.
3. **Root-cause** — classify it: changed selector, timing/sync, dynamic data, env/data dependency, or a genuine app change. Match the error to one cause before editing.
4. **Fix in the right layer** — selectors live in **page objects** (`pages/**`, `flex/pages/**`), never in spec files (repo rule). Prefer semantic locators (role + text) over CSS classes. For dynamic values use regex locators.
5. **Re-run** the same command. Iterate one fix at a time.
6. **If genuinely correct but still red** with high confidence it's an app/env issue, mark `test.fixme()` with a comment explaining the observed vs expected behavior — don't leave a silently broken test.

## Rules
- Never `waitForNetworkIdle` or use deprecated/discouraged APIs.
- One fix, one re-run — don't batch blind changes.
- Explain what was broken and why the fix holds.
- Respect client/flow quirks (SPC vs V1, captcha, FMS differences) — see the `location-test` skill and `configs/urls.ts`.
- Config facts: tests retry once, 5-min global timeout, `expect` timeout 20s, runs headed locally on the `chrome` channel. Reference: [playwright.config.ts](../../../playwright.config.ts).
