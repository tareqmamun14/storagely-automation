# Test Case: Data Sync Validation

**Spec file:** `tests/data-sync-validation.spec.ts`  
**Status:** Active  
**Config file:** `configs/data-sync-config.ts`  
**Environments:** Staging (`stage`) / Production (`prod`) — toggled in `data-sync-config.ts`  
**Timeout per test:** 10 minutes  
**Mode:** Serial (no parallel workers), 0 retries

---

## Overview

Verifies that the Storagely data sync is working for each FMS (Facility Management System) client. The test logs in once, then navigates to each client's Data Sync admin page, triggers a sync, polls until it completes, and reads the **Last Update** timestamp. A non-empty, non-"Not yet synced" timestamp is a PASS.

---

## Clients Tested

| Client Name | FMS Type | Notes |
|---|---|---|
| SiteLink Client | SiteLink | Stage requires special corp password setup on Integrations page |
| storEDGE Client | storEDGE | — |
| SSM Client | SSM | — |

> Active clients are configured in `DATA_SYNC_CLIENTS` array inside `configs/data-sync-config.ts`. Comment/uncomment entries to enable or disable specific clients.

---

## Test Cases

### TC-DS-01 — Shared Login (beforeAll)

| Field | Value |
|---|---|
| **Test ID** | TC-DS-01 |
| **Type** | Setup / beforeAll |
| **Priority** | Critical |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Open browser context and new page | Context created |
| 2 | Navigate to the first client's admin login URL | Login page loads |
| 3 | Fill credentials from `CREDENTIALS[env]` and submit | Successful login |
| 4 | (Stage + SiteLink only) Navigate to Integrations and set corp password | Corp password saved |

**Pass Criteria:** Login completes and session is available for subsequent tests.

---

### TC-DS-02 — Data Sync: SiteLink Client

| Field | Value |
|---|---|
| **Test ID** | TC-DS-02 |
| **FMS** | SiteLink |
| **Priority** | High |

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to client's Data Sync admin URL | Page loads |
| 2 | Click the sync trigger button | Sync starts (status shows Working / In Queue) |
| 3 | Poll sync status until complete | Status resolves |
| 4 | Read **Last Update** timestamp from the sync row | Non-empty, non-"Not yet synced" value |

**Pass Criteria:** `lastUpdate` is a non-empty string that is not `"Not yet synced"`.

---

### TC-DS-03 — Data Sync: storEDGE Client

| Field | Value |
|---|---|
| **Test ID** | TC-DS-03 |
| **FMS** | storEDGE |
| **Priority** | High |

Same steps as TC-DS-02, applied to the storEDGE client.

---

### TC-DS-04 — Data Sync: SSM Client

| Field | Value |
|---|---|
| **Test ID** | TC-DS-04 |
| **FMS** | SSM |
| **Priority** | High |

Same steps as TC-DS-02, applied to the SSM client.

---

## Final Summary (afterAll)

After all clients have been tested, the suite prints a consolidated summary table showing:
- Client name and FMS type
- Environment (STAGE / PROD)
- Sync row description
- Last Update value
- Pass / Fail status

Browser context is closed after the summary.

---

## How to Run

```bash
# Run with current environment setting in data-sync-config.ts
npx playwright test tests/data-sync-validation.spec.ts --headed

# Switch environment: open configs/data-sync-config.ts and toggle:
export const CURRENT_ENV: 'stage' | 'prod' = 'stage';
# or
export const CURRENT_ENV: 'stage' | 'prod' = 'prod';
```

---

## Notes

- Playwright artifact recording (trace, video, screenshot) is disabled to avoid file-lock conflicts with OneDrive.
- Failed clients do **not** stop the run; the next client continues and the failure is recorded in the summary.
- SiteLink in staging requires a corp password to be set on the Integrations page before sync can be triggered — this is handled automatically in the `beforeAll`.
