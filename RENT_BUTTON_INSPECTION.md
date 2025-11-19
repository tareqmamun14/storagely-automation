# Rent Button HTML Structure Inspection Results

## Overview
This document contains the HTML structure and attributes for rent buttons found on two storage facility websites.

---

## Site 1: BestBox Storage

**URL:** https://www.bestboxstorage.com/storage-units/florida/pensacola/north-palafox

### Rent Button Details

**Button Type:** HTML `<a>` (link) element  
**Button Text:** "rent" (lowercase)

**HTML Structure:**
```html
<a href="https://www.bestboxstorage.com/storage-units/florida/pensacola/north-palafox/step_four?location=9DEA4CB7-32A0-46A7-AAAD-DAF6D889BBB2&unit=4622544&type=rent&con=-999&is_sitelink=1&site_locations_id=1201&bestbox-storage">rent</a>
```

**Key Attributes:**
- `href`: Points to the rental form page (`/step_four`) with query parameters
- **Parameters included:**
  - `location`: Facility location ID (UUID: 9DEA4CB7-32A0-46A7-AAAD-DAF6D889BBB2)
  - `unit`: Unit ID (4622544)
  - `type`: "rent" (indicates this is a rental action, not reservation)
  - `con`: Conversation ID or constraint (-999)
  - `is_sitelink`: Boolean flag (1)
  - `site_locations_id`: Location identifier (1201)

**CSS Classes:** None visible (appears to be unstyled or using default styling)

**Parent Structure:**
The link appears inside a generic container that also includes:
- A tooltip/help text: "Pay, sign lease, get access code, and move in. All online. All contact-free."
- Adjacent "reserve" option (which is a generic/button element, not a link)

**Navigation Behavior:**
- Clicking this link navigates directly to the rental completion form (step_four)
- This is a full rental completion flow, not a reservation/waitlist

**Location in Page:**
- Found in the storage units pricing table
- Specifically in rows with units that have "available immediately" status
- Appears alongside a "reserve" option in the same row

### Example Usage in Playwright
```typescript
// Find the rent link by text content
const rentLink = page.locator('a:has-text("rent")').first();

// Click to proceed with rental
await rentLink.click();

// Get the destination URL
const href = await rentLink.getAttribute('href');

// Verify it's a rent link (not a reserve/waitlist action)
const url = page.url();
expect(url).toContain('/step_four');
expect(url).toContain('type=rent');
```

---

## Site 2: Rhino Storage Solutions

**URL:** https://rhino-storage.com/storage-units/louisiana/covington/philip-drive

### Rent Button Details (Not Found - Waitlist Instead)

**Button Type:** HTML `<button>` element  
**Button Text:** "Join Waitlist"

**HTML Structure:**
```html
<button>Join Waitlist</button>
```

**Key Attributes:**
- No `href` attribute (it's a button, not a link)
- No visible classes
- Appears to be a clickable button that likely triggers a reservation/waitlist modal

**Key Difference from BestBox:**
- **Rhino Storage does NOT have "Rent" buttons**
- Instead, all units show "Join Waitlist" buttons
- This facility appears to use a waitlist/reservation system rather than direct online rental
- No direct rental flow available

**Navigation Behavior:**
- Clicking triggers an action (likely showing a form or modal)
- Not a direct link to rental form
- Appears to be for reserving units when available

---

## Comparison Summary

| Aspect | BestBox Storage | Rhino Storage |
|--------|-----------------|---------------|
| **Button Element** | `<a>` (link) | `<button>` |
| **Button Text** | "rent" | "Join Waitlist" |
| **Direct Rental** | Yes | No |
| **Location/Setup Page** | /step_four | N/A |
| **Query Parameters** | Yes (location, unit, type, etc.) | N/A |
| **Locator Strategy** | `a:has-text("rent")` | `button:has-text("Join Waitlist")` |

---

## Recommended Locators for Test Code

### BestBox Storage
```typescript
// Primary locator for rent button
const rentButton = page.locator('a:has-text("rent")');

// More specific if needed (with parent context)
const rentButton = page.locator('table a:has-text("rent")');

// By role
const rentButton = page.locator('a[href*="type=rent"]');

// By href pattern
const rentButton = page.locator('a[href*="/step_four"]');
```

### Rhino Storage
```typescript
// Waitlist button (no rent button available)
const waitlistButton = page.locator('button:has-text("Join Waitlist")');

// In table context
const waitlistButton = page.locator('table button:has-text("Join Waitlist")');
```

---

## Important Notes

1. **BestBox Storage** uses dynamic JavaScript links styled as buttons - the href contains all necessary parameters for the rental flow
2. **Rhino Storage** does not have a "Rent" button; instead offers a "Join Waitlist" option, indicating a different business model
3. URL parameters in BestBox include facility location UUID, unit ID, and constraint values that should be extracted from the URL
4. The `type=rent` parameter distinguishes rental requests from `type=reserve` (waitlist/hold) requests

---

## Additional Observations

### BestBox Storage:
- Has two action buttons per row: "rent" and "reserve"
- "rent" = immediate online rental completion (full booking)
- "reserve" = holding the unit (partial booking, must complete later)
- Rent links include comprehensive query parameters pre-populated with unit details

### Rhino Storage:
- Simpler flow with only "Join Waitlist" option
- No immediate rental available
- Likely uses manual approval after waitlist signup

