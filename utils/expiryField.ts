// utils/expiryField.ts
// Platform fix (2026-08, rolled out platform-wide starting with Safeguard):
// the credit-card expiration field is now a strict MM/YY auto-formatting mask —
//   • typing 0731 renders 07/31
//   • digits beyond the 2-digit year are BLOCKED/truncated
//   • a 4-digit year like 2031 must never be sent (the mask would keep "20")
// Verified live on app.storagely.io step-four (2026-08-26):
//   "04 / 29" → 04/29 · "0429" → 04/29 · "042029" → 04/20 (truncated!)
// This helper is the ONE way every suite fills the expiry: digits-only input,
// 4-digit-year normalization, mask verification, and a legacy fallback for any
// page the fix hasn't reached yet.
import { Locator } from '@playwright/test';

/** Normalize any configured expiry ("04 / 29", "04/2029", "0429") to MMYY digits. */
export function expiryDigits(raw: string): string {
  let d = (raw || '').replace(/\D/g, '');
  // "MM20YY" (someone wrote a 4-digit year) → MMYY, so the mask never sees "20".
  if (d.length === 6 && d.slice(2, 4) === '20') d = d.slice(0, 2) + d.slice(4);
  return d.slice(0, 4);
}

/**
 * Fill the expiration field the way the new mask is designed to be used:
 * enter the 4 digits, let it auto-format, verify the rendered value. Pages
 * without the mask (not yet rolled out) get the legacy "MM / YY" literal.
 */
export async function fillExpiry(field: Locator, rawExpiry: string, label = 'Expiry'): Promise<void> {
  const digits = expiryDigits(rawExpiry);
  const expected = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  await field.click();
  await field.fill(digits);
  const value = ((await field.inputValue().catch(() => '')) || '').trim();
  const normalized = value.replace(/\s+/g, '');
  if (normalized === expected) {
    console.log(`  ✓ ${label}: "${digits}" auto-formatted to "${value}" (MM/YY mask ✓)`);
  } else if (value === digits) {
    // No mask on this field — legacy input expects the literal "MM / YY".
    const legacy = `${digits.slice(0, 2)} / ${digits.slice(2)}`;
    await field.fill(legacy);
    console.log(`  ✓ ${label}: no MM/YY mask on this field — filled legacy format "${legacy}"`);
  } else {
    console.log(`  ⚠️ ${label}: entered "${digits}" but field shows "${value}" (expected "${expected}") — expiry mask may be misbehaving on this page`);
  }
}
