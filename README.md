# Gas Supplier Management — System Architecture

A cloud-native, edge-deployed business application built on Cloudflare's zero-server infrastructure. The entire stack runs within Cloudflare's network — no VPS, no container orchestration, no traditional hosting costs.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Cloudflare Edge                     │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │   Pages CDN  │───▶│    Workers    │───▶│  D1 (SQL) │  │
│  │  (SPA host)  │    │ (API routes)  │    │ (SQLite)  │  │
│  └─────────────┘    └──────────────┘    └───────────┘  │
│         │                                        │      │
│         ▼                                        │      │
│  ┌─────────────┐                        ┌───────┴───┐  │
│  │  PWA Cache   │                        │ Durable   │  │
│  │  (Workbox)   │                        │ Objects   │  │
│  └─────────────┘                        └───────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Key principle:** The application has no always-on server process. Every API request spins up an isolated Cloudflare Worker, executes, and terminates. There are zero idle costs.

---

## Why Cloudflare Edge

| Traditional Setup | This Architecture |
|---|---|
| VPS ($5–20/mo) always running | Workers: $0 when idle, pennies per request |
| Managed database ($15–50/mo) | D1: 5 GB free tier, pay-per-row-read |
| SSL cert management | Automatic edge SSL on every domain |
| CDN setup + cache headers | Built-in global CDN with Pages |
| Deployment scripts + SSH | `git push` → automatic build + deploy |
| Server monitoring + restarts | Zero operations — Cloudflare manages it |

**Estimated production cost:** Under $5/month for a business serving ~500 customers with moderate daily usage. Likely within Cloudflare's free tier for lighter workloads.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Vue 3 + Nuxt 3 (SPA mode) | Single-page app served from edge CDN, near-instant load on mobile |
| **Styling** | Tailwind CSS + shadcn-vue | Utility-first, no runtime CSS overhead, consistent design system |
| **API** | Nuxt Server Routes (Nitro) | File-based routing compiles to Cloudflare Workers — zero separate backend |
| **Database** | Cloudflare D1 (SQLite) | Edge-replicated SQLite, zero-connection management, migrations via Drizzle |
| **ORM** | Drizzle ORM | Type-safe queries, schema-as-code, lightweight for edge runtimes |
| **Auth** | nuxt-auth-utils | Encrypted session cookies, PBKDF2 passwords via Web Crypto API |
| **Validation** | Zod 4 | Runtime schema validation on every API boundary |
| **PWA** | @vite-pwa/nuxt + Workbox | Offline caching, install prompt, native-app feel on mobile |
| **Deployment** | Cloudflare Pages | Git-integrated CI/CD, preview deploys on branches |

---

## Edge Runtime Constraints

Cloudflare Workers have hard limits that shaped every design decision:

- **No filesystem** — All state lives in D1 or external storage. No `fs`, no `path`.
- **No long-running processes** — ~50ms CPU time per request. Sequential DB calls are minimized via `Promise.all` and `db.batch()`.
- **No Node.js APIs** — Passwords hashed with Web Crypto (`crypto.subtle`), not bcrypt. No `process.env` — use `useRuntimeConfig()`.
- **No true transactions (D1)** — Multi-table writes use sequential operations with application-level validation. Stock changes validate-before-commit to prevent orphans.

---

## Data Architecture

```
Procurement (stock in)          Inventory (source of truth)
        │                              │
        ▼                              ▼
   Purchases ──────────────▶ Cylinder Stock (full/empty per size)
        │                              │
        │                              ▼
        │                     Stock Movements (immutable log)
        │
Delivery (stock out) ──────▶ Customer Ledger ──▶ Outstanding Balance
        │
        ▼
   Customer Payments ───────▶ Reduces Balance (FIFO allocation)
```

**Design decisions:**
- `unit_price` stored per delivery item at creation time — historical reports use the price that was active, not the current price.
- `paymentStatus` on deliveries is a UI signal only — ledger math always sums `customer_payments` directly.
- Stock movements are append-only — corrections add reversal entries, never delete.

---

## Deployment Pipeline

```
git push origin dev
        │
        ▼
Cloudflare Pages (preview deploy)
  ──▶ Separate D1 database (isolated testing)
  ──▶ Accessible via *.pages.dev URLs

git push origin main (or merge)
        │
        ▼
Cloudflare Pages (production deploy)
  ──▶ Production D1 database
  ──▶ Custom domain with SSL
```

Branch-based environment isolation: `dev` branch deploys to a preview environment with its own database. Production uses the main branch with a separate D1 instance.

---

## Project Structure

```
├── server/
│   ├── routes/api/          # File-based API routes → Cloudflare Workers
│   ├── database/            # Drizzle schema + migrations
│   └── utils/               # Stock logic, payment allocation, auth helpers
├── composables/             # Vue composables (API client layer)
├── components/              # UI components by domain
├── pages/                   # File-based routing (Nuxt)
├── types/                   # Shared TypeScript types
├── utils/                   # Pure functions (formatters, validators)
└── public/                  # Static assets, PWA manifest, icons
```

The three-layer rule: **Page → Composable → Server Route**. Business logic lives only in server routes. Composables manage state and API calls. Components render.
