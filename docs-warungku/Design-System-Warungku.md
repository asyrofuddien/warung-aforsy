# Warungku — Design System

## 1. Principles

- **Glanceable over beautiful.** A cashier checks this screen for half a second between handling goods and talking to a customer. Every important number (total, stock state) must be readable at arm's length under fluorescent shop lighting.
- **Thumb-first.** Assume one hand on the phone, the other busy. Primary actions live at the bottom, within thumb reach, not tucked into a top corner.
- **Feels like a till, not a hobby app.** Family members need to trust it the way they trust a cash register — calm, sturdy, no cute flourishes that slow anything down.
- **Exclusively in Bahasa Indonesia.** The interface is built entirely using local Indonesian terms (e.g., *Kasir*, *Produk*, *Riwayat*, *Tunai*, *Bayar*, *Ada*, *Habis*). This ensures that store owners and their family members, who might have limited familiarity with English UI terms, can operate the app with absolute confidence and speed.
- **Admin is a different animal.** The console is a desktop dashboard for one person (you) managing several stores. It can be denser and more conventional — it doesn't need the mobile discipline of the store app.

## 2. Visual concept

The reference point is the physical objects already on every warung counter: a stack of receipt paper, a hand-written price tag, the cash drawer itself. The palette is warm and paper-toned rather than stark white or corporate blue. Prices and totals are set in a monospace face — deliberately evoking a register display or a printed nota — while everything else uses a warm, humanist sans. The one moment of personality in the whole app is the receipt-stub confirmation on a completed sale (§6); everywhere else stays quiet and fast.

## 3. Color tokens

| Token | Hex | Usage |
|---|---|---|
| `paper` (background) | `#FAF6EE` | App background — warm off-white, easier on the eyes than stark white under shop lighting |
| `ink` (primary text) | `#1E1B16` | Primary text, high contrast on paper |
| `muted-ink` (secondary text) | `#756F62` | Timestamps, hints, secondary labels |
| `warung-green` (primary) | `#0F7A5C` | Primary actions, "paid," in-stock state |
| `warung-green-dark` | `#0B5943` | Pressed/active state for primary green |
| `marigold` (attention) | `#E8A33D` | Out-of-stock badges, pending states, edited flags |
| `signal-red` (danger) | `#C6402F` | Errors, delete actions, failed payment |
| `line` (borders) | `#DCD4C2` | Dividers, card borders, input outlines |

Colors are chosen for strong contrast against the `paper` background specifically because the app will often be read in bright or uneven retail lighting — don't swap `paper` for pure white or a darker tone without re-checking contrast. No dark mode for v1; it's a functional counter tool, not something used at night in a dim room.

## 4. Typography

Two faces, each with one job:

- **Plus Jakarta Sans** — UI and body text. A genuinely Jakarta-named face, which makes it a real fit rather than a default pick. Weights: 400 (body), 500 (labels), 700 (headings, buttons).
- **IBM Plex Mono** — reserved *only* for numbers that matter: prices, totals, SKUs/barcodes, timestamps. Never used for body copy. This is what gives the app its "register display" feel.

| Role | Size | Weight | Face |
|---|---|---|---|
| Big total / price display | 32px | 700 | Plex Mono |
| Section heading | 20px | 700 | Jakarta Sans |
| Product name / body | 16px | 500 | Jakarta Sans |
| Secondary / meta text | 13px | 400 | Jakarta Sans |
| Button label | 16px | 700 | Jakarta Sans |
| Small numerals (SKU, time) | 13px | 500 | Plex Mono |

## 5. Layout & spacing

- Spacing scale: `4 / 8 / 12 / 16 / 24 / 32 / 48` px.
- Single-column, mobile-first. No multi-column layouts in the store app at any width.
- **Bottom zone** is the thumb zone: cart total + the main "Bayar" (charge) button live in a sticky footer, always reachable.
- **Top zone**: store name + search/scan entry point.
- **Bottom nav** (3 tabs max, icon + label): Kasir (checkout) / Produk (products) / Riwayat (history).
- Minimum tap target: 48×48px, no exceptions — this is a counter tool used in a hurry.
- Minimum supported viewport: 320px wide, for older/budget Android phones.

## 6. Signature element — the receipt stub

When a sale completes, a card slides up styled like a torn receipt: a dashed/scalloped edge along the top, the total set large in Plex Mono, and a "Share to WhatsApp" action below it. It's a direct, literal reference to the paper nota a customer would get handed at any warung, translated into one screen moment. This is the single place the design allows itself some personality — everywhere else stays calm and fast on purpose.

## 7. Components — store app

- **Buttons**
  - Primary: solid `warung-green`, white text, 48px min height, 10px corner radius.
  - Secondary: outline in `ink`, transparent fill.
  - Danger: solid `signal-red`, white text — used only for destructive actions (delete product, void sale).
- **Stock pill**: a toggle switch/pill labeled "Ada" (available, green) / "Habis" (out, gray-red) — icon + text + color together, never color alone.
- **Payment tabs**: two large tappable tabs, "Tunai" (cash) and "QRIS," icon + label, selected tab filled `warung-green`.
- **Product card**: name in Jakarta Sans, price in Plex Mono, stock pill, whole card tappable to add to cart.
- **Cart/total footer**: sticky bottom bar — item count, total in Plex Mono, the "Bayar" button.
- **PIN pad**: large numeric keypad, 6-dot indicator, the logged-in person's name shown above it so it's obvious whose sales are being recorded.

*(Since the platform is exclusively in Bahasa Indonesia, labels like "Ada," "Habis," "Tunai," and "Bayar" are used here to match what the family actually reads day-to-day at the counter.)*

## 8. Components — admin console

Desktop-first, standard dashboard conventions — same color tokens and type for brand consistency, but no mobile constraints:

- Left sidebar navigation: Warung (stores), Komisi (commission), reserved space for future Laporan (reports).
- Data table for the warung list: name, status, today's sales, commission owed.
- Standard form patterns for creating/editing a warung (name, address, QR upload, commission rate).

## 9. Iconography

A single outline icon set used consistently — Tabler Icons or Phosphor both work well with Next.js and cover everything needed (scan, search, wallet, share, plus, trash). Consistent 1.5–2px stroke weight. Filled icons reserved only for active/selected state indicators, not general use.

## 10. Motion

Minimal, on purpose — this app needs to feel fast, not impressive:

- Receipt-stub entrance on sale completion: short slide/fade, under 300ms.
- Toggle switch transition on the stock pill.
- Nothing else animates. Respect `prefers-reduced-motion`.

## 11. Accessibility & real-world constraints

- Contrast is tuned for bright/fluorescent retail lighting, not just a dim screen-in-hand scenario — treat WCAG AA as a floor, not a target.
- Tap targets stay large throughout (48px+) since cashiers are often moving fast or one-handed.
- Stock state and payment state are never conveyed by color alone — always paired with an icon and a text label.
- Layout holds up at 320px width without horizontal scrolling.
