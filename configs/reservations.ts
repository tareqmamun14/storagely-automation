// configs/reservations.ts
// ============================================================================
// RESERVATION SUBMISSION — manifest + gating
// ============================================================================
// Real reservation submissions as part of the regression: open the reserve
// modal on a DESIGNATED location, fill tenant details, submit, and require a
// confirmation message (an error — or no confirmation — is a FAILURE).
//
// WHY: a prod bug once threw an error at reservation submit and the suite
// never caught it because we only ever OPENED the modal. Revenue impacting.
//
// Every submitted reservation is REAL — the customer must cancel it. Each
// submission is recorded (utils/reservationRecord.ts) with location + unit +
// tenant details and a ready-to-paste Slack message for Jacob so the customer
// can cancel the test reservation.
//
// HOW IT RUNS: the control panel's "📝 Reservation Submissions" toggles set
// STORAGELY_RESERVATION to a comma list of keys below. The owning suite then
// drives the submission on the designated location:
//   • driver 'legacy-spc' — tests/rentReserveSPC-validation.spec.ts, before
//     the usual rent flow (pages/StorageListingPage.submitReservation).
//   • driver 'flex'       — flex facility journey STEP 3 (reserve modal) on
//     the matching facility (flex/pages/LiveFacilityPage.submitReservation).
//
// TO ADD A CLIENT (e.g. Mini Mall when confirmed): add one entry below with
// its designated location URL(s) — the panel checkbox, env-var gating, run
// wiring, record file, and results row all pick it up automatically. If its
// modal differs from both existing drivers, add a driver variant in the
// owning page object.
// ============================================================================

export interface ReservationTarget {
  /** Panel checkbox id + STORAGELY_RESERVATION token. */
  key: string;
  /** Panel / log display name. */
  label: string;
  fms: string;
  /** Which suite drives the submission. */
  driver: 'legacy-spc' | 'flex';
  /** Designated reservation location per environment (reservations are only
   *  submitted on THESE pages — the customer knows where to cancel). */
  urls: { staging?: string; production?: string };
  /** Modal quirks. */
  captchaCheckbox?: boolean;   // hCaptcha checkbox inside the reserve modal (Bluebird)
  smsConsentToggle?: boolean;  // "By providing your phone number…" toggle (Safeguard)
}

/** Tenant details submitted on every test reservation — same for all clients. */
export const RESERVATION_TENANT = {
  firstName: 'TestReservation',
  lastName: 'Testing',
  email: 'tareq@storagely.io',
  phone: '2125556789',
};

export const RESERVATION_TARGETS: ReservationTarget[] = [
  {
    key: 'bluebird',
    label: 'Bluebird Storage — Calgary, Blackfoot (SPC)',
    fms: 'SiteLink',
    driver: 'legacy-spc',
    urls: {
      staging:    'https://test.staging.storagely-api.com/bluebirdstorage/storage-units/alberta/calgary/blackfoot',
      production: 'https://bluebirdstorage.ca/storage-units/alberta/calgary/blackfoot',
    },
    captchaCheckbox: true,
  },
  {
    // Legacy location page on app.storagely.io (NOT the Flex site) — same
    // #reservUnitFrom modal as Bluebird, verified live 2026-08-21. The custom
    // <sh_reservebtntext_…> tags are text wrappers INSIDE a.reserveBtnPop.
    key: 'safeguard',
    label: 'Safeguard — Clemmons, NC Test Ave (legacy)',
    fms: 'SiteLink',
    driver: 'legacy-spc',
    urls: {
      staging:    'https://test.staging.storagely-api.com/safeguard-self-storage/storage-units/north-carolina/clemmons/testave',
      production: 'https://app.storagely.io/safeguard-self-storage/storage-units/north-carolina/clemmons/testave',
    },
    captchaCheckbox: true,
  },
  // ONLY Bluebird + Safeguard are live (user decision 2026-08-21).
  // Mini Mall — pending customer confirmation; add its entry here when green-lit.
  // V1 clients work too (the V1 spec carries the same pre-step): one entry
  // here with driver 'legacy-spc' is all it takes — same #reservUnitFrom modal.
];

/** Keys enabled for this run (comma list from the panel). */
export function enabledReservationKeys(): string[] {
  const raw = process.env.STORAGELY_RESERVATION;
  if (!raw || !raw.trim()) return [];
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

export function reservationEnabled(key: string): boolean {
  return enabledReservationKeys().includes(key.toLowerCase());
}

/** Normalize a URL for matching (host + path, no www., no trailing slash). */
export function normalizeReservationUrl(u: string): string { return normUrl(u); }
function normUrl(u: string): string {
  try {
    const url = new URL(u);
    return (url.hostname.replace(/^www\./, '') + url.pathname).replace(/\/+$/, '').toLowerCase();
  } catch { return (u || '').toLowerCase(); }
}

/** The reservation target whose designated URL (any env) matches this page. */
export function reservationTargetForUrl(pageUrl: string): ReservationTarget | null {
  const n = normUrl(pageUrl);
  for (const t of RESERVATION_TARGETS) {
    for (const u of Object.values(t.urls)) {
      if (u && normUrl(u) === n) return t;
    }
  }
  return null;
}

/** Enabled targets for a driver — lets a suite know if it owes a reservation. */
export function enabledTargets(driver: ReservationTarget['driver']): ReservationTarget[] {
  return RESERVATION_TARGETS.filter(t => t.driver === driver && reservationEnabled(t.key));
}

/**
 * The FIXED reservation URL for the current environment (no rotation — ever).
 * Honors STORAGELY_BUILD_BASE so build-instance runs reserve on the build host.
 * Returns null when the target has no designated location for this env.
 */
export function designatedUrlFor(target: ReservationTarget): string | null {
  const env = process.env.STORAGELY_ENV === 'production' ? 'production'
    : process.env.STORAGELY_ENV === 'staging' ? 'staging'
    : 'staging'; // legacy default in configs/urls.ts is STAGING
  let url = target.urls[env] || null;
  const build = process.env.STORAGELY_BUILD_BASE?.trim();
  if (url && build && env === 'staging') {
    url = url.replace('https://test.staging.storagely-api.com', build.replace(/\/$/, ''));
  }
  return url;
}
