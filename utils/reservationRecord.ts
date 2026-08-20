// utils/reservationRecord.ts
// Every SUBMITTED test reservation is real — the customer has to cancel it.
// This records exactly what was submitted (location, unit, tenant, when) so
// Jacob can forward it to the customer:
//   1. Appends the record to control-panel/reservations/reservations.jsonl
//      (NOT under test-results/ — Playwright wipes that dir on every run,
//      and these records are a durable audit trail)
//   2. Prints the record + a ready-to-paste Slack message in the run log
//   3. If STORAGELY_SLACK_WEBHOOK is set, posts the message automatically.
import * as fs from 'fs';
import * as path from 'path';

export interface ReservationRecord {
  client: string;        // manifest key, e.g. 'bluebird'
  label: string;         // display label
  locationUrl: string;
  unit: string;          // whatever identifies the unit (label/size/price/id)
  tenant: { firstName: string; lastName: string; email: string; phone: string };
  confirmation: string;  // the confirmation text captured from the page
  env: string;
  submittedAt: string;   // ISO timestamp
}

const OUT_DIR = path.join(__dirname, '..', 'control-panel', 'reservations');

export function recordReservation(rec: ReservationRecord): void {
  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.appendFileSync(path.join(OUT_DIR, 'reservations.jsonl'), JSON.stringify(rec) + '\n', 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, `latest-${rec.client}.json`), JSON.stringify(rec, null, 2), 'utf8');
  } catch (e) {
    console.warn(`⚠️ Could not write reservation record: ${(e as Error).message}`);
  }

  const local = new Date(rec.submittedAt).toLocaleString();
  console.log('\n📝 ══════════ TEST RESERVATION SUBMITTED — CUSTOMER MUST CANCEL ══════════');
  console.log(`📝  Client:     ${rec.label} (${rec.env})`);
  console.log(`📝  Location:   ${rec.locationUrl}`);
  console.log(`📝  Unit:       ${rec.unit}`);
  console.log(`📝  Tenant:     ${rec.tenant.firstName} ${rec.tenant.lastName} · ${rec.tenant.email} · ${rec.tenant.phone}`);
  console.log(`📝  Confirmed:  ${rec.confirmation}`);
  console.log(`📝  Submitted:  ${local}`);
  console.log('📝  Record:     control-panel/reservations/reservations.jsonl');
  console.log('📝 ── Slack message (copy-paste, tag Jacob) ─────────────────────────────');
  console.log(slackMessage(rec));
  console.log('📝 ═══════════════════════════════════════════════════════════════════════\n');

  // Default = the published "Test Reservation Alerts" Slack workflow, posting
  // into #test-reservation-notification-for-cancellation (verified live
  // 2026-08-21). The panel's Slack-webhook field (STORAGELY_SLACK_WEBHOOK)
  // overrides it, e.g. to switch channels.
  const DEFAULT_SLACK_WEBHOOK = 'https://hooks.slack.com/triggers/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';
  const webhook = process.env.STORAGELY_SLACK_WEBHOOK?.trim() || DEFAULT_SLACK_WEBHOOK;
  if (webhook) {
    // Two payload fields so BOTH webhook kinds work:
    //  • text    — full message incl. <@mention> tokens (classic incoming
    //              webhooks parse these into real pings)
    //  • details — same message WITHOUT mention tokens (Slack Workflow
    //              Builder escapes variables, so the workflow message types
    //              the mentions itself and inserts {{details}} below them)
    fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: slackMessage(rec), details: slackDetails(rec) }),
    }).then(r => console.log(`📤 Slack webhook: ${r.status}`))
      .catch(e => console.warn(`⚠️ Slack webhook failed: ${e.message}`));
  }
}

/** The message without mention tokens — for Slack Workflow Builder variables
 *  (the workflow types the mentions itself around the {{details}} variable). */
export function slackDetails(rec: ReservationRecord): string {
  return messageBody(rec);
}

// Slack destination: #channel C0BRQ9W55KK (storagely-workspace).
// Real member IDs so the mentions actually ping (looked up 2026-08-21):
//   Jacob U08DH49J27Q · Brice Collins U0B16S9FBPC · Nahid Rahman Ontu U06E6GYJ5RA
export const RESERVATION_SLACK_CHANNEL = 'C0BRQ9W55KK';
const MENTION_JACOB = '<@U08DH49J27Q>';
const MENTION_CC = '<@U0B16S9FBPC> <@U06E6GYJ5RA>';

/** Pull just the human confirmation sentence(s) out of the raw page capture
 *  (the raw capture keeps unit chrome + a trailing "Close" button label). */
function confirmationSnippet(raw: string): string {
  const cleaned = (raw || '').replace(/\s+/g, ' ').trim();
  const m = cleaned.match(/your (?:unit|reservation)|has been reserved|reservation (?:is )?(?:confirmed|received|complete)|thank you/i);
  const fromMatch = m && m.index !== undefined ? cleaned.slice(m.index) : cleaned;
  return fromMatch
    .replace(/\s*close\s*$/i, '')
    .replace(/([!.?])(?=[A-Za-z])/g, '$1 ') // page text often squashes sentences together
    .trim().slice(0, 400);
}

/**
 * The message body — CAPS labels + clean sentences for readability. Kept
 * PLAIN TEXT on purpose: Slack workflow variables render literally (no
 * markdown, no underline), so caps + spacing are the formatting tools.
 */
function messageBody(rec: ReservationRecord): string {
  const when = new Date(rec.submittedAt).toLocaleString();
  const customer = rec.label.split(' — ')[0];
  const unit = rec.unit.replace(/^SELECTED UNIT · /i, '').replace(/\$([\d.]+) · \/mo/g, '$$$1/mo');
  return [
    `Hey, we submitted a TEST RESERVATION on ${customer.toUpperCase()} as part of our regression run — please let the customer know so they can cancel it.`,
    '',
    `LOCATION: ${rec.locationUrl}`,
    `UNIT: ${unit}`,
    '',
    `NAME ON THE RESERVATION: ${rec.tenant.firstName} ${rec.tenant.lastName}`,
    `EMAIL: ${rec.tenant.email}`,
    `PHONE: ${rec.tenant.phone}`,
    `SUBMITTED: ${when} (QA automation) — the reservation went through fine.`,
    '',
    `CONFIRMATION — fetched from the page right after submitting:`,
    `"${confirmationSnippet(rec.confirmation)}"`,
    '',
    `ACTION NEEDED: inform ${customer} and cancel this test reservation.`,
  ].join('\n');
}

/** Full message incl. mention tokens — classic incoming webhooks parse these. */
export function slackMessage(rec: ReservationRecord): string {
  return `${MENTION_JACOB}\n${messageBody(rec)}\n\ncc ${MENTION_CC}`;
}
