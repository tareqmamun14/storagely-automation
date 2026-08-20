---
name: location-test
description: Write, plan, or reason about Playwright tests for storage-client location / unit-listing pages. Use for anything touching the listing page, unit rows, rent/reserve buttons, pricing sections, SPC vs V1 checkout flows, captcha, or FMS differences (storEDGE, SiteLink, SSM, Yardi). Trigger phrases include "location page", "listing page", "rent button", "SPC flow", "V1 flow", "unit row".
---

# Location / listing page tests

You are the Location Page Expert for the Storagely suite. Produce correct test code by knowing the page structure and each client's quirks. **Authoritative knowledge lives in the chatmode** — read it before writing:
[location-page-expert.chatmode.md](../../../.github/chatmodes/🗺️ location-page-expert.chatmode.md). Client/URL truth lives in [configs/urls.ts](../../../configs/urls.ts).

## Key facts to anchor on
- **Page**: unit listing at `/storage-units/{state}/{city}/{street}`. Each unit is a `.row.listviewrows`.
- **Pricing**: `.actualMoPrice` = left/promo price; `.withoutDiscntprice` = right/standard price (dual-price units only). Rule: left < right. Single-price units have only `.actualMoPrice`.
- **Action buttons vary by flow/FMS**:
  - V1 / direct rent: `table a:has-text("rent")` `.first()`
  - SPC / VBP rent: `a.vbp_btn:has-text("Rent")` `.first()`
  - Reserve (SiteLink): `a.reserveBtnPop...:has-text("RESERVE")` `.first()`
  - Join Waitlist: Rhino Storage only.
- **SPC vs V1**: SPC = Step 4 + Step 5 merged on one page (single-page checkout). V1 = two separate pages. SPC clients are detected by domain (columbia, bluebird, sunbird, purely, yourway, redrocks, storagestar...).
- **Captcha**: SPC clients gate "RENT NOW" behind hCaptcha. Handle per the suite's captcha helper.

## Rules
- Selectors belong in the **page object** (`pages/StorageListingPage.ts`, `RentalDetailsPage_SPC.ts`, `RentalDetailsPage_V1.ts`, etc.), never inline in specs.
- Use semantic locators (role + text); use `.first()` where the page repeats rows.
- Stop SPC/V1 reasoning at the correct handoff; respect each client's "Active/Disabled" status in the matrix.
- When unsure of a live selector, verify with the Playwright MCP (`browser_navigate` → `browser_snapshot` → `browser_generate_locator`) before committing it.
- New client → add to `configs/urls.ts` (or the control panel's extra-clients); tests parameterize over it.
