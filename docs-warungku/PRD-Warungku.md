# Warungku — Product Requirements Document (MVP)

*Stock + cashier PWA for small Indonesian toko kelontong, offered as a multi-tenant SaaS.*

---

## 1. Summary

Warungku lets a small shop (toko kelontong / warung) run checkout and basic stock status from a phone, with no dedicated computer. It's built and run by one admin (you), who onboards individual warungs by hand. Each warung is fully isolated from the others. You take a small, editable commission on each warung's sales, collected manually for now.

## 2. Background & problem

Toko kelontong owners currently track stock by memory or notebook and take payment in cash or via a static GoPay QR sticker, with no record of what sold or when. There's no shared computer at the counter — everything has to work from a phone. The goal isn't to build a full retail ERP; it's to replace the notebook with something faster and give the owner (and family members helping out) a shared, simple source of truth.

## 3. Goals (MVP v1)

- A family member can log in, ring up a sale (barcode scan or search), and take cash or QR payment in well under a minute.
- Products can be marked in-stock / out-of-stock with one tap — no counting required.
- Every sale is logged with who made it, so the store has a record without any extra effort.
- Sales are shareable as a WhatsApp receipt.
- You can onboard a new warung yourself in a few minutes: create their space, upload their QR image, set their commission rate.
- You can see, per warung, how much commission is owed for a period.
- The entire user interface is in Bahasa Indonesia (both store PWA and admin console) to match the target users' native language.

## 4. Non-goals (explicitly out for v1)

- Numeric stock quantities or low-stock alerts
- Purchase / restock logging (supplier, cost batches)
- Automatic commission collection or payment splitting
- Self-serve warung signup
- Multi-language UI (the platform is built exclusively in Bahasa Indonesia)
- Bluetooth/printed receipts
- Analytics beyond simple totals

These are listed in the roadmap (§12) so the data model doesn't actively block them later — they're just not being built now.

## 5. Users & roles

| Role | Where they work | Can do |
|---|---|---|
| Platform admin (you) | Admin console, desktop-first | Create/edit warungs, upload their QR, set commission %, view commission owed, view all warungs' status |
| Store owner / family member | Store PWA, mobile-first | Log in with a PIN, add/edit products, toggle stock, run checkout, view their store's own sales history |

No permission tiers within a store for v1 — anyone logged in can do anything in their store. The PIN just identifies *who* did it.

PIN is **6 digits**. If a person forgets their PIN, the **store owner can reset it themselves** from within the store app — no need to contact the platform admin.

## 6. Scope

### 6.1 Store app (PWA) — mobile-first

- **Auth** — 6-digit PIN login per person, scoped to one store. Fast enough to use one-handed at the counter. Store owner can reset any person's PIN (self-serve, no admin involvement).
- **Products** — add/edit: name, price, cost price (for future margin reporting), barcode/SKU (scanned or typed), optional category. In-stock / out-of-stock toggle.
- **Checkout (Kasir)** — scan barcode via phone camera or search by name (for loose items like rice/sugar), build a cart, adjust quantities, see a running total, choose Cash or QR.
  - Cash: mark paid immediately.
  - QR: show the store's saved GoPay QR image, cashier taps "confirm paid" once the customer's payment shows up on their phone.
- **Transaction history** — list of past sales for that store, filterable by date and by who made the sale.
- **Receipt** — after a sale, a shareable summary (WhatsApp share link / Web Share API).
- **Installable** — PWA manifest, icon, splash screen, add-to-home-screen.

### 6.2 Admin console — desktop-first, not mobile-optimized

- **Auth** — separate admin login, not the store PIN system.
- **Warung management** — add a new warung (name, address, GoPay QR image, starting commission %), edit or deactivate one.
- **Commission dashboard** — per warung, per period: total sales, computed commission owed, mark as collected.
- **Overview** — list of all warungs with basic activity status.

## 7. Key user flows

**A — You onboard a new warung**
1. Log into admin console.
2. Create a new warung: name, address.
3. Upload their GoPay QR image.
4. Set their commission rate (defaults to 1%, editable, can be 0%).
5. Create the first 6-digit PIN login for the owner. They add family members' PINs themselves later.

**B — Cashier makes a sale**
1. Open the app (already installed to home screen), enter PIN.
2. Scan a barcode, or search by name for items without one.
3. Adjust quantity if needed, repeat for more items.
4. Tap Charge, choose Cash or QR.
5. If QR: show the code, wait for customer, tap "confirm paid."
6. Sale saved. Optionally share the receipt to WhatsApp.

**C — Marking something out of stock**
1. From the product list or straight after selling the last one, tap the stock pill on that product.
2. It flips to "out of stock" and is flagged in the checkout search until someone flips it back.

**D — Monthly commission collection**
1. Open the commission dashboard.
2. See each warung's total sales × their rate for the period.
3. Contact the warung and collect manually (transfer, cash, whatever works).
4. Mark the period as collected.

## 8. Data model (conceptual)

Not a schema — just the entities and what they hold, so implementation can pick the exact fields/types.

| Entity | Purpose | Key fields |
|---|---|---|
| Store | One warung / tenant | name, address, GoPay QR image, commission rate, active flag |
| Person | A login inside one store | name, 6-digit PIN (hashed), store reference, is_owner flag (for PIN reset permissions) |
| Product | Something a store sells | store reference, name, price, cost price, barcode/SKU (nullable), in-stock flag |
| Transaction | One completed sale | store reference, person reference (who sold it), timestamp, payment method, total |
| TransactionItem | A line in a sale | transaction reference, product reference, quantity, price at time of sale |
| CommissionRecord | A billing period for a store | store reference, period, total sales, rate applied, amount owed, collected flag |

Note the **price snapshot on TransactionItem** — always store the price *at the time of sale* on the line item, not just a reference to the current product price. Otherwise editing a product's price later silently rewrites historical sales totals.

## 9. Payment & commission logic

- A sale's payment method is either `cash` or `qr`. Both are **manually confirmed by the cashier** — the app has no way to verify either happened, since money never passes through the platform.
- **Commission applies to every transaction, regardless of payment method** (cash and QR alike). It is calculated per-transaction: each sale's total × the store's commission rate. The commission dashboard aggregates these per period.
- Commission is a **calculated figure, not an automatic deduction.** You still have to actually collect it (see Flow D).
- Worth being honest with yourself about this: cash sales are entirely self-reported. A store could under-report cash sales to lower what they owe you. This isn't fixable in software without a payment gateway sitting in the middle of every transaction — it's a trust relationship, same as any small-business partnership. Not a blocker for v1, just don't build anything that assumes the numbers are independently verified.

## 10. Tech approach

- **Framework**: Next.js (App Router).
- **Database**: SQLite for now, as you specified. One practical flag: SQLite needs a **persistent disk** — standard serverless hosting (e.g. Vercel's default deployment) doesn't persist file writes between requests, so it'll silently lose data. You'll want either a VPS/always-on host (Fly.io, Railway, a basic droplet) with a mounted volume, or a hosted SQLite-compatible service like Turso. Worth deciding before you write real data to it.
- **Multi-tenancy pattern**: simplest is one shared database with a `store_id` column on every table, filtered on every query. Fine at your current scale (a handful of warungs, low transaction volume). If you ever grow to many dozens of active warungs, a "one SQLite file per store" pattern (which Turso supports natively) gives stronger isolation and easier per-store backups — worth knowing about, not worth building now.
- **Barcode scanning**: browser camera access + a barcode-detection library. Some browsers support a native `BarcodeDetector` API; others need a JS fallback library. Confirm target-phone browser support before committing to one approach.
- **Auth**: lightweight PIN-based session for store users (fast entry, shared device); normal admin auth (even just a single hardcoded admin login is fine at your current scale) for the console.
- **PWA**: manifest + service worker scoped to the store app only. The admin console doesn't need to be installable or offline-tolerant.

## 11. Non-functional requirements

- Store app: mobile-first, installable, usable one-handed.
- Admin console: desktop-first, doesn't need to work well on a phone.
- A familiar cashier should be able to complete an average sale in well under 30 seconds.
- One store must never be able to see another store's data, under any circumstance — this is the one thing that must never regress.
- Should run acceptably on mid-range Android phones — keep JS bundles lean.
- Reliable internet is the norm for your stores, but the checkout flow should tolerate a few seconds of dropped connection without losing a sale in progress (e.g. don't clear the cart until the save is confirmed).
- Localized language: The application uses Bahasa Indonesia throughout, ensuring high readability and ease of use for Indonesian warung owners and cashiers.

## 12. Roadmap after MVP

- Real stock quantities, optionally with low-stock thresholds
- Payment gateway integration (e.g. Midtrans, Xendit) enabling automatic commission splitting
- Self-serve warung signup
- Purchase/restock logging with supplier and cost tracking
- Printed receipts via Bluetooth thermal printer
- Basic reporting: best sellers, profit margin, day-over-day trends

## 13. Resolved questions

- **PIN length & reset**: 6-digit PIN. Store owner can reset any person's PIN themselves (self-serve) — no admin involvement needed.
- **Commission scope**: Commission applies to **every transaction regardless of payment method** (cash and QR). Calculated per-transaction.
- **QR images**: **Single QR image per warung** for v1. Multiple e-wallet QR support (GoPay, DANA, etc.) deferred to roadmap.
