# Ticket Pricing Pipeline Analysis

**Date:** 2026-07-02  
**Scope:** Investigation of `net_rate`, `face_value`, and `category_type` handling across the pricing pipeline — triggered by client screenshot highlighting raw XS2Event ticket data.

---

## 1. The Ticket in Question

The screenshot shows a raw XS2Event API response for a single hospitality ticket:

| Field | Value | Interpreted As |
|---|---|---|
| `ticket_title` | `"Nursery Pavilion Platinum"` | Cricket hospitality section (likely Lord's or similar venue) |
| `currency_code` | `"GBP"` | British Pounds |
| `net_rate` | `84200` | Supplier wholesale price: 84,200 pence = **£842.00** |
| `face_value` | `84200` | Public ticket price: 84,200 pence = **£842.00** |
| `category_type` | `"hospitality"` | XS2Event's venue-defined hospitality category |
| `category_name` | `"Nursery Pavilion Platinum"` | The seating area label |
| `category_id` | `"de853b9902d049bfb12389d73d205278_ctg"` | Stable identifier used for hospitality assignments |
| `ticket_validfrom` | `"2026-06-06T11:00:00"` | Ticket entry window start |
| `ticket_validuntil` | `"2026-06-06T12:45:00"` | Ticket entry window end (morning session) |
| `created` | `"2025-12-04T16:05:49"` | Listed in XS2Event: December 2025 (6 months before event) |

Note: `net_rate == face_value` (both 84200) means no supplier discount — Rondo pays the full face price.

---

## 2. Complete Pricing Pipeline Trace

### 2.1 Events Listing Page — "FROM" Price

**Backend** (`api/src/Controller/EventsController.php:264`):
- Endpoint: `GET /v1/events/min-ticket-prices?event_ids=...`
- Queries XS2Event for `available` tickets with `stock gt:0`
- Selects the **minimum `face_value`** per currency (NOT `net_rate`)
- Returns the raw integer: `{ "GBP": 84200 }` (pence, not divided)

**Frontend** (`frontend/src/hooks/useEventMinPrices.ts:48`):
```typescript
normalized[currency] = (cents as number) / 100;  // 84200 → 842.00
```

**Display** (`frontend/src/pages/EventsPage.tsx` — `formatPrice()`):
- Uses native GBP price (£842.00) → converts to selected currency → adds markup
- Shows: **"FROM GBP 842.00"** (or equivalent in selected currency) ✓

---

### 2.2 Ticket Detail Page — Individual Ticket Price

**Frontend** (`frontend/src/hooks/useTickets.ts:38–42`):
```typescript
// API returns prices in cents. Normalize to standard currency units here.
face_value: ticket.face_value != null ? ticket.face_value / 100 : ticket.face_value,  // 842.00
net_rate:   ticket.net_rate   != null ? ticket.net_rate   / 100 : ticket.net_rate,    // 842.00
```

**Display** (`frontend/src/pages/EventTicketsPage.tsx:269`):
```typescript
const price = ticket.face_value || 0;  // 842.00 (already normalized)
// → convert to selected currency → add markup → display
```

Shows: **"GBP 842.00 + markup"** ✓

---

### 2.3 Cart Panel

`frontend/src/components/CartPanel.tsx:134`:
```typescript
const price = ticket.face_value || 0;  // 842.00 (from useTickets, already normalized)
```

Identical calculation to `EventTicketsPage.formatPrice()` — guaranteed by design. ✓

---

### 2.4 Checkout

`frontend/src/pages/EventTicketsPage.tsx:408`:
```typescript
const faceValue = item.ticket.face_value || 0;  // 842.00
```

Three-branch logic mirrors CartPanel exactly to guarantee the same price is charged as displayed. ✓

---

## 3. Key Distinction: `net_rate` vs `face_value`

| Field | Meaning | Used for display? |
|---|---|---|
| `face_value` | The public/retail ticket price | **Yes** — all price displays and cart/checkout |
| `net_rate` | Rondo's wholesale cost from the supplier | **No** — normalized by `useTickets` but never rendered |

`net_rate` is fetched and normalized so it's available on the `Ticket` object, but no UI component reads it for display. Only `face_value` drives the pricing pipeline.

For this specific ticket: `net_rate == face_value` (84200 = 84200), so there is no margin between Rondo's cost and the listed price.

---

## 4. XS2Event `category_type: "hospitality"` vs Rondo Hospitality System

This is a critical conceptual distinction.

### XS2Event `category_type`

XS2Event uses `category_type` to classify the physical seating area of a ticket:
- `"standard"` — regular seated area
- `"grandstand"` — grandstand seating
- `"hospitality"` — venue-defined hospitality section (the venue itself includes food/drink/lounge access with the ticket)

When `category_type === "hospitality"`, the **ticket already includes hospitality as part of what the venue sells**. "Nursery Pavilion Platinum" is a venue hospitality package.

### Rondo Hospitality System

Rondo's admin panel assigns hospitality *services* (e.g., "Welcome Drink", "Gourmet Lunch Package") to tickets via the hierarchical assignment system (sport → tournament → team → category → event → ticket). These are Rondo-curated add-ons, separate from what the venue provides.

### The Gap

`EventTicketsPage.tsx:717` checks `category_type` for the grandstand icon only:
```typescript
{ticket.category_type === 'grandstand' && (
  <div className={styles.featureIcon} data-tooltip="This place offers you a seat on a grandstand">
    <Building2 size={16} />
  </div>
)}
// No equivalent check for category_type === 'hospitality'
```

The chef hat icon (`ChefHat`) **only appears** when Rondo's admin has explicitly assigned hospitality services via the admin panel:
```typescript
{ticketHasHospitalities(ticket.ticket_id) && (
  <div className={styles.featureIcon} ...>
    <ChefHat size={16} />
  </div>
)}
```

**Result:** A ticket with `category_type === "hospitality"` (venue-defined hospitality) shows **no visual indicator** on the ticket page unless Rondo has also separately assigned its own hospitality services. The guest cannot tell from the UI that the ticket already includes venue hospitality.

---

## 5. Verification Summary

| Check | Result | Evidence |
|---|---|---|
| `net_rate: 84200` correctly shown as £842.00 on events page | ✅ Correct | `useEventMinPrices` ÷ 100 (uses `face_value` not `net_rate`) |
| `net_rate: 84200` correctly shown as £842.00 on ticket page | ✅ Correct | `useTickets` ÷ 100; `formatPrice()` uses `face_value` |
| Currency conversion (GBP → selected) | ✅ Correct | `useMultiCurrencyConversion` + module-level rate cache |
| Markup applied to GBP base price | ✅ Correct | `calculateEffectiveMarkupAmount()` after conversion |
| Cart price matches ticket page price | ✅ Correct | Both use `ticket.face_value` with identical 3-branch logic |
| Checkout price matches cart price | ✅ Correct | Mirror logic in `handleCheckout()` documented explicitly |
| `category_id` used in Rondo hospitality lookup | ✅ Correct | `categoryIds` passed to `usePublicEventHospitalities` |
| Visual indicator for XS2Event `category_type: "hospitality"` | ⚠️ Gap | No icon/badge — only `"grandstand"` has a dedicated icon |
| `net_rate` used for any display price | ✅ Correct (not used) | Only `face_value` drives all display paths |

---

## 6. Recommended Action (if required)

If the client wants guests to see that a ticket is already a venue hospitality package (XS2Event `category_type: "hospitality"`), add a feature icon for it in `EventTicketsPage.tsx` similar to the grandstand indicator:

```typescript
{ticket.category_type === 'hospitality' && (
  <div className={styles.featureIcon} data-tooltip="This ticket includes venue hospitality">
    <Sparkles size={16} />  {/* or a suitable icon */}
  </div>
)}
```

This is a **product decision** — if the venue's hospitality is already bundled into the ticket price (as implied by `category_type: "hospitality"`), communicating this visually helps guests understand what's included before purchase.

No changes are required to the pricing pipeline — all calculations and normalizations are correct.

---

## 7. File References

| File | Role | Key Lines |
|---|---|---|
| `api/src/Controller/EventsController.php` | `batchMinTicketPrices` — uses `face_value`, returns pence | 218–289 |
| `frontend/src/hooks/useEventMinPrices.ts` | Normalizes min prices ÷ 100 | 46–51 |
| `frontend/src/hooks/useTickets.ts` | Normalizes `face_value` + `net_rate` ÷ 100 | 38–42 |
| `frontend/src/pages/EventsPage.tsx` | Events listing "FROM" price calculation | 185–221 |
| `frontend/src/pages/EventTicketsPage.tsx` | Ticket page price + cart/checkout price | 267–288, 406–444 |
| `frontend/src/components/CartPanel.tsx` | Cart price display | 129–177 |
| `frontend/src/services/ticketEnhancementsService.ts` | `calculateEffectiveMarkupAmount()` | — |
