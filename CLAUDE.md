# CLAUDE.md — Gas Supplier Management PWA

> This file is the single source of truth for development standards, architecture decisions,
> and conventions for this project. Read this fully before writing any code or investigating
> any bug. Every section is mandatory — not advisory.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Core Development Principles](#4-core-development-principles)
5. [Vue & Nuxt Patterns](#5-vue--nuxt-patterns)
6. [Server Routes & API Design](#6-server-routes--api-design)
7. [Database & Drizzle ORM](#7-database--drizzle-orm)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [TypeScript Guidelines](#9-typescript-guidelines)
10. [Error Handling](#10-error-handling)
11. [State Management](#11-state-management)
12. [PWA & Offline Patterns](#12-pwa--offline-patterns)
13. [Cloudflare Edge Constraints](#13-cloudflare-edge-constraints)
14. [Security Checklist](#14-security-checklist)
15. [Feature Development Workflow](#15-feature-development-workflow)
16. [Bug Investigation Guide](#16-bug-investigation-guide)
17. [Git Commit Convention](#17-git-commit-convention)
18. [Pre-commit Code Review Checklist](#18-pre-commit-code-review-checklist)
19. [Environment Variables](#19-environment-variables)
20. [Anti-patterns & Common Pitfalls](#20-anti-patterns--common-pitfalls)
21. [Data Architecture Clarifications](#21-data-architecture-clarifications)
22. [Delivery Card — 3-Level Identity Pattern](#22-delivery-card--3-level-identity-pattern)
23. [Cylinder Stock Module](#23-cylinder-stock-module)
24. [Purchase Module](#24-purchase-module)
25. [Reports Module](#25-reports-module)
26. [Navigation Structure Update](#26-navigation-structure-update)
27. [Schema Corrections & Complete Table List](#27-schema-corrections--complete-table-list)
28. [Backup Endpoint Update](#28-backup-endpoint-update)
29. [UI Design System — Aura Gas Management](#29-ui-design-system--aura-gas-management)
30. [Orders & Delivery Payment Status](#30-orders--delivery-payment-status)

---

## 1. Project Overview

**App:** Gas cylinder supplier management system for a local B2B business in Kerala, India.

**Business context:**
- Supplier serves up to 500 restaurants with LPG cylinders (12kg, 17kg, 21kg, 33kg)
- Also sells accessories: regulators, adapters, connectors, cooktops
- Daily operations: log deliveries → track payments → manage outstanding balances
- 99% of users are on mobile; app must feel native
- Multiple staff users with different permission levels
- Daily Google Sheets backup via Apps Script + GET endpoint

**Core data flows:**
```
Procurement (stock in) → Inventory
Delivery (stock out)   → Customer Ledger → Outstanding Balance
Customer Payment       → Customer Ledger → Reduces Balance
Price changes          → Price history table (non-destructive)
```

**Who uses the app:**
| Role     | Primary task                        | Device  |
|----------|-------------------------------------|---------|
| admin    | Full control, reports, user mgmt    | Mobile + desktop |
| delivery | Log daily deliveries in the field   | Mobile only |
| viewer   | Read reports and ledger             | Mobile + desktop |

---

## 2. Tech Stack

| Layer       | Technology                  | Version / Notes                         |
|-------------|-----------------------------|-----------------------------------------|
| Framework   | Nuxt 3                      | SSR disabled (SPA mode for Cloudflare)  |
| UI          | Vue 3 (Composition API)     | `<script setup lang="ts">` always       |
| Styling     | Tailwind CSS v3             | Mobile-first utility classes            |
| Components  | shadcn-vue                  | `~/components/ui/` — never edit these  |
| PWA         | @vite-pwa/nuxt              | Workbox + manifest                      |
| Hosting     | Cloudflare Pages            | Edge deployment, global CDN             |
| Runtime     | Cloudflare Workers          | Nuxt server routes run here             |
| Database    | Cloudflare D1 (SQLite)      | Binding name: `DB`                      |
| ORM         | Drizzle ORM                 | drizzle-orm + drizzle-kit               |
| Auth        | nuxt-auth-utils             | Session cookie, PBKDF2 passwords        |
| HTTP client | $fetch / useFetch           | Nuxt built-in, no axios                 |
| Icons       | Material Symbols Outlined   | Google icon font, via `<Icon name="..."/>` (§29.4). `components/ui/select/*` vendor files still use Lucide internally — never touch those |
| Font        | Hanken Grotesk              | Google Fonts, single weight family (§29) |
| Language    | TypeScript 5+               | Strict mode on                          |
| Package mgr | pnpm                        | `pnpm-lock.yaml` is the lockfile — never run `npm install`, it'll regenerate `package-lock.json` and drift from the lockfile in git. Version overrides go under `pnpm.overrides` in package.json, not root `overrides` (that key is npm/yarn-only and is silently ignored by pnpm). |

---

## 3. Project Structure

```
gas-supplier-pwa/
├── CLAUDE.md                         ← you are here
├── nuxt.config.ts                    ← Nuxt + PWA + Tailwind config
├── wrangler.toml                     ← Cloudflare Pages + D1 binding
├── drizzle.config.ts                 ← Drizzle ORM config
├── tsconfig.json                     ← strict: true always
│
├── types/
│   ├── index.ts                      ← shared domain types (User, Customer, etc.)
│   ├── api.ts                        ← API request/response types
│   └── database.ts                   ← Drizzle inferred types (InferSelectModel)
│
├── utils/
│   ├── formatters.ts                 ← currency, date, phone formatters (pure fns)
│   ├── validators.ts                 ← zod schemas for shared validation
│   └── whatsapp.ts                   ← wa.me link builder
│
├── composables/
│   ├── useAuth.ts                    ← session state, login/logout
│   ├── useCustomers.ts               ← customer CRUD + search
│   ├── useDeliveries.ts              ← delivery CRUD + today's list
│   ├── usePayments.ts                ← payment recording + history
│   ├── useInventory.ts               ← stock levels + movements
│   ├── useReports.ts                 ← monthly/outstanding/stock reports
│   ├── usePricing.ts                 ← price resolution + history
│   └── useToast.ts                   ← app-wide toast notifications
│
├── middleware/
│   └── auth.ts                       ← client-side route guard (redirects to /login)
│
├── layouts/
│   ├── default.vue                   ← bottom nav + header for authenticated pages
│   └── auth.vue                      ← bare layout for /login
│
├── pages/
│   ├── index.vue                     ← dashboard (today's summary)
│   ├── login.vue                     ← login form
│   ├── customers/
│   │   ├── index.vue                 ← customer list + search
│   │   └── [id].vue                  ← customer detail + ledger
│   ├── deliveries/
│   │   ├── index.vue                 ← delivery list (admin: all, delivery: own)
│   │   └── new.vue                   ← create delivery form
│   ├── payments/
│   │   └── index.vue                 ← record payment + payment history
│   ├── reports/
│   │   ├── index.vue                 ← reports landing
│   │   ├── monthly.vue               ← monthly summary
│   │   ├── outstanding.vue           ← who owes what
│   │   └── stock.vue                 ← inventory status
│   └── settings/
│       ├── index.vue                 ← settings landing
│       ├── products.vue              ← product add/edit + pricing
│       ├── users.vue                 ← user management (admin only)
│       └── account.vue               ← change own password
│
├── components/
│   ├── ui/                           ← shadcn-vue — DO NOT EDIT
│   ├── shared/                       ← reusable across the whole app
│   │   ├── AppHeader.vue
│   │   ├── BottomNav.vue
│   │   ├── LoadingSpinner.vue
│   │   ├── EmptyState.vue
│   │   ├── ConfirmDialog.vue
│   │   └── OfflineBanner.vue
│   ├── customers/
│   │   ├── CustomerCard.vue
│   │   ├── CustomerForm.vue
│   │   └── CustomerLedger.vue
│   ├── deliveries/
│   │   ├── DeliveryCard.vue
│   │   ├── DeliveryForm.vue          ← product picker + qty + auto-price
│   │   └── WhatsAppButton.vue
│   ├── payments/
│   │   ├── PaymentForm.vue
│   │   └── PaymentHistory.vue
│   ├── reports/
│   │   ├── KpiCard.vue
│   │   ├── CylinderSummaryChart.vue
│   │   ├── OutstandingList.vue
│   │   └── MonthlyStatement.vue
│   └── settings/
│       ├── ProductForm.vue
│       ├── PriceForm.vue
│       └── UserForm.vue
│
├── server/
│   ├── database/
│   │   ├── schema.ts                 ← Drizzle table definitions (single source of truth)
│   │   ├── index.ts                  ← useDB() helper — always use this, never raw D1
│   │   └── migrations/               ← generated by drizzle-kit generate
│   ├── middleware/
│   │   └── 01.auth.ts                ← server-side session guard for all /api routes
│   ├── utils/
│   │   ├── password.ts               ← PBKDF2 hash + verify (Web Crypto, no bcrypt)
│   │   ├── validate.ts               ← zod parse helpers for request body
│   │   ├── price-resolver.ts         ← get active price for product+customer
│   │   └── response.ts               ← standard success/error response builders
│   └── routes/
│       └── api/
│           ├── auth/
│           │   ├── login.post.ts
│           │   ├── logout.post.ts
│           │   └── me.get.ts
│           ├── customers/
│           │   ├── index.get.ts      ← list all
│           │   ├── index.post.ts     ← create
│           │   └── [id]/
│           │       ├── index.get.ts  ← get one
│           │       ├── index.patch.ts← update
│           │       └── ledger.get.ts ← customer ledger + balance
│           ├── deliveries/
│           │   ├── index.get.ts
│           │   └── index.post.ts
│           ├── payments/
│           │   ├── index.get.ts
│           │   └── index.post.ts
│           ├── inventory/
│           │   ├── index.get.ts
│           │   └── stock-in.post.ts
│           ├── products/
│           │   ├── index.get.ts
│           │   ├── index.post.ts
│           │   └── [id].patch.ts
│           ├── prices/
│           │   ├── index.get.ts
│           │   └── index.post.ts
│           ├── reports/
│           │   ├── monthly.get.ts
│           │   ├── outstanding.get.ts
│           │   └── stock.get.ts
│           ├── settings/
│           │   └── users/
│           │       ├── index.get.ts
│           │       ├── index.post.ts
│           │       └── [id].patch.ts
│           └── backup.get.ts         ← Google Sheets backup endpoint
│
└── public/
    ├── icons/                        ← PWA icons (192x192, 512x512, maskable)
    └── manifest.webmanifest
```

**Rule:** Never create files outside this structure without a strong documented reason.

---

## 4. Core Development Principles

### 4.1 Absolute rules

- **TypeScript everywhere.** No `.js` files. No `any` type except in documented exceptional cases with a `// TODO: type this` comment.
- **Mobile first, always.** Write Tailwind classes for mobile first (`text-sm` not `md:text-sm`). Every UI must be fully functional and comfortable on a 375px screen.
- **Server is the authority.** Never trust client-side data without server validation. All business logic (price calculation, balance, stock deduction) runs in server routes, not composables.
- **One concern per file.** A component displays things. A composable manages state and API calls. A server route handles one HTTP operation. A util is a pure function.
- **Never mutate props.** Use `defineEmits` to communicate up or use a shared composable.
- **No magic numbers.** Currency, cylinder sizes, role names — extract to `constants/` or `types/index.ts`.

### 4.2 The 3-layer rule

Every feature must have exactly these 3 layers and nothing else:

```
Page / Component  →  Composable  →  Server Route
(display + UX)       (state + API)   (business logic + DB)
```

Business logic belongs **only** in the server route. The composable only calls the API and manages local reactive state. The component only renders what the composable provides.

### 4.3 Naming conventions

| Thing              | Convention           | Example                          |
|--------------------|----------------------|----------------------------------|
| Components         | PascalCase           | `DeliveryForm.vue`               |
| Composables        | camelCase, `use` prefix | `useDeliveries.ts`            |
| Server routes      | HTTP method as suffix | `index.get.ts`, `index.post.ts` |
| DB tables          | snake_case plural    | `delivery_items`                 |
| DB columns         | snake_case           | `created_by`, `total_amount`     |
| TS types/interfaces| PascalCase           | `DeliveryItem`, `ApiResponse`    |
| TS enums           | PascalCase enum, UPPER values | `Role.ADMIN`            |
| Constants          | UPPER_SNAKE_CASE     | `MAX_CUSTOMERS`, `CYLINDER_SIZES`|
| CSS classes        | Tailwind only — no custom class names unless absolutely necessary |

### 4.4 File length limits

| File type          | Soft limit  | Hard limit  |
|--------------------|-------------|-------------|
| Vue SFC            | 200 lines   | 350 lines   |
| Composable         | 100 lines   | 200 lines   |
| Server route       | 60 lines    | 100 lines   |
| Utility function   | 30 lines    | 80 lines    |

If you exceed these, split the file. Large files are a code smell.

---

## 5. Vue & Nuxt Patterns

### 5.1 SFC structure — always in this order

```vue
<script setup lang="ts">
// 1. Nuxt/Vue auto-imports (no import needed for ref, computed, useRoute, etc.)
// 2. Type imports (import type only — no runtime imports from Vue)
// 3. Third-party imports
// 4. Internal composable imports
// 5. Internal component imports (usually auto-imported)
// 6. Props
// 7. Emits
// 8. Composable calls
// 9. Reactive state (refs, computeds)
// 10. Methods / handlers
// 11. Lifecycle hooks (onMounted last)
</script>

<template>
  <!-- Single root element always -->
</template>
```

### 5.2 Props and emits — always typed with generics

```typescript
// ✅ CORRECT
const props = defineProps<{
  customerId: number
  readonly?: boolean
}>()

const emit = defineEmits<{
  saved: [customer: Customer]
  cancelled: []
}>()

// ❌ WRONG — runtime object syntax
defineProps({
  customerId: { type: Number, required: true }
})
```

### 5.3 withDefaults for optional props

```typescript
const props = withDefaults(defineProps<{
  label?: string
  loading?: boolean
  variant?: 'primary' | 'ghost'
}>(), {
  label: '',
  loading: false,
  variant: 'primary',
})
```

### 5.4 useFetch vs useAsyncData vs $fetch

| Scenario                          | Use                    |
|-----------------------------------|------------------------|
| Page-level data fetch (SSR-aware) | `useAsyncData`         |
| Reactive URL params               | `useFetch`             |
| Imperative fetch (form submit, button click) | `$fetch`  |
| Inside a composable called from a page | `useAsyncData` with a unique key |

```typescript
// ✅ Page data — useAsyncData
const { data: customers, refresh } = await useAsyncData(
  'customers-list',
  () => $fetch('/api/customers')
)

// ✅ Imperative — $fetch in an async function
async function submitDelivery() {
  await $fetch('/api/deliveries', {
    method: 'POST',
    body: form.value,
  })
}

// ❌ WRONG — calling useFetch inside a function (breaks reactivity rules)
function loadCustomers() {
  const { data } = useFetch('/api/customers') // don't do this
}
```

### 5.5 Computed vs method

```typescript
// ✅ Use computed for derived reactive values
const totalAmount = computed(() =>
  items.value.reduce((sum, item) => sum + item.subtotal, 0)
)

// ✅ Use methods only for event handlers and side effects
function handleSubmit() { ... }

// ❌ WRONG — method used as a derived value in template
function getTotal() { return items.value.reduce(...) } // recalculates on every render
```

### 5.6 watch vs watchEffect

```typescript
// ✅ watchEffect — when you want to run immediately and track automatically
watchEffect(() => {
  console.log('customer changed:', selectedCustomer.value)
})

// ✅ watch — when you need old/new values or want lazy execution
watch(selectedCustomerId, async (newId) => {
  if (newId) await loadCustomerPrices(newId)
}, { immediate: false })

// ❌ WRONG — watchEffect with side effects that can loop
watchEffect(() => {
  selectedCustomer.value = customers.value.find(c => c.id === id.value) // can cause loops
})
```

### 5.7 Template rules

```html
<!-- ✅ Always use key on v-for -->
<DeliveryCard
  v-for="delivery in deliveries"
  :key="delivery.id"
  :delivery="delivery"
/>

<!-- ✅ v-if and v-for never on the same element — use template wrapper -->
<template v-for="item in items" :key="item.id">
  <ItemRow v-if="item.active" :item="item" />
</template>

<!-- ✅ Event handler naming — handle prefix -->
<button @click="handleSaveDelivery">Save</button>

<!-- ❌ WRONG — inline logic in template -->
<button @click="delivery.status = 'delivered'; emit('saved')">Save</button>
```

### 5.8 definePageMeta — always set on every page

```typescript
definePageMeta({
  layout: 'default',         // or 'auth' for login page
  middleware: ['auth'],      // always, except login page
})
```

### 5.9 Navigation — always use navigateTo

```typescript
// ✅ Correct
await navigateTo('/deliveries')
await navigateTo({ name: 'customers-id', params: { id: customer.id } })

// ❌ Wrong
useRouter().push('/deliveries')
```

---

## 6. Server Routes & API Design

### 6.1 Route file naming convention

```
server/routes/api/
  [resource]/
    index.get.ts      ← GET /api/[resource]       (list)
    index.post.ts     ← POST /api/[resource]      (create)
    [id]/
      index.get.ts    ← GET /api/[resource]/:id   (single)
      index.patch.ts  ← PATCH /api/[resource]/:id (update, partial)
      index.delete.ts ← DELETE /api/[resource]/:id (rarely needed)
```

### 6.2 Every server route follows this template

```typescript
// server/routes/api/deliveries/index.post.ts
import { z } from 'zod'

const CreateDeliverySchema = z.object({
  customerId: z.number().int().positive(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().positive(),
  })).min(1),
  notes: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  // 1. Auth check — always first
  const user = requireUser(event)           // throws 401 if not authed
  requireRole(event, ['admin', 'delivery']) // throws 403 if wrong role

  // 2. Parse and validate body
  const body = await parseBody(event, CreateDeliverySchema) // throws 422 if invalid

  // 3. Business logic — always in server route, never in composable
  const db = useDB(event)
  
  // Use transaction for multi-table writes
  const delivery = await db.transaction(async (tx) => {
    // ... insert delivery, items, update inventory
  })

  // 4. Standard response
  return { data: delivery }
})
```

### 6.3 Response format — always consistent

```typescript
// Success
return { data: delivery }                          // single resource
return { data: deliveries, total: count }          // list with pagination
return { data: null, message: 'Deleted' }          // action with no return

// Error — throw, never return errors
throw createError({ statusCode: 404, message: 'Customer not found' })
throw createError({ statusCode: 403, message: 'Insufficient permissions' })
throw createError({ statusCode: 422, message: 'Validation failed', data: errors })
```

### 6.4 Query parameters — always typed

```typescript
const query = getQuery(event) as { month?: string; customerId?: string }
const month = query.month ?? new Date().toISOString().slice(0, 7)
const customerId = query.customerId ? parseInt(query.customerId) : undefined
```

### 6.5 Access Cloudflare D1 binding

```typescript
// server/database/index.ts — single helper, use everywhere
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export function useDB(event: H3Event) {
  const { cloudflare } = event.context
  return drizzle(cloudflare.env.DB, { schema })
}

// In any server route:
const db = useDB(event)
```

---

## 7. Database & Drizzle ORM

### 7.1 Schema conventions

```typescript
// server/database/schema.ts

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ✅ All tables have these 3 columns minimum
const timestamps = {
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
}

// ✅ Always add indexes on foreign keys and frequently queried columns
export const deliveries = sqliteTable('deliveries', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  customerId:      integer('customer_id').references(() => customers.id).notNull(),
  deliveryDate:    text('delivery_date').notNull(),          // YYYY-MM-DD
  status:          text('status', { enum: ['pending', 'delivered', 'cancelled'] })
                     .default('pending').notNull(),
  totalAmount:     real('total_amount').notNull(),
  whatsappSent:    integer('whatsapp_sent').default(0).notNull(),
  notes:           text('notes'),
  createdBy:       integer('created_by').references(() => users.id).notNull(),
  createdByName:   text('created_by_name').notNull(),        // snapshot — see CLAUDE.md §4.1
  ...timestamps,
}, (table) => ({
  customerIdx: index('deliveries_customer_idx').on(table.customerId),
  dateIdx:     index('deliveries_date_idx').on(table.deliveryDate),
  createdByIdx:index('deliveries_created_by_idx').on(table.createdBy),
}))
```

### 7.2 Drizzle query patterns

```typescript
import { eq, and, gte, lte, desc, isNull, sql } from 'drizzle-orm'

// ✅ SELECT with conditions
const customer = await db.select()
  .from(customers)
  .where(and(eq(customers.id, id), eq(customers.isActive, 1)))
  .get()  // .get() for single row, .all() for multiple

// ✅ INSERT and return the created row
const [created] = await db.insert(deliveries).values(data).returning()

// ✅ UPDATE
await db.update(deliveries)
  .set({ status: 'delivered', whatsappSent: 1 })
  .where(eq(deliveries.id, id))

// ✅ Transaction for atomic multi-table writes (ALWAYS use for delivery creation)
const result = await db.transaction(async (tx) => {
  const [delivery] = await tx.insert(deliveries).values(deliveryData).returning()
  await tx.insert(deliveryItems).values(items.map(i => ({ ...i, deliveryId: delivery.id })))
  await tx.update(inventory)
    .set({ quantity: sql`quantity - ${totalQty}` })
    .where(eq(inventory.productId, productId))
  return delivery
})

// ✅ Aggregate / ledger query
const ledger = await db
  .select({
    customerId: customers.id,
    name:       customers.name,
    totalBilled: sql<number>`coalesce(sum(${deliveries.totalAmount}), 0)`,
    totalPaid:   sql<number>`coalesce(sum(${customerPayments.amount}), 0)`,
    balance:     sql<number>`coalesce(sum(${deliveries.totalAmount}), 0) - coalesce(sum(${customerPayments.amount}), 0)`,
  })
  .from(customers)
  .leftJoin(deliveries, and(eq(deliveries.customerId, customers.id), eq(deliveries.status, 'delivered')))
  .leftJoin(customerPayments, eq(customerPayments.customerId, customers.id))
  .where(eq(customers.isActive, 1))
  .groupBy(customers.id)

// ❌ WRONG — never use raw SQL strings for values (SQL injection risk)
db.run(`SELECT * FROM customers WHERE id = ${userId}`)  // NEVER
```

### 7.3 Migrations workflow

```bash
# After changing schema.ts:
npx drizzle-kit generate          # generates migration SQL in server/database/migrations/
npx wrangler d1 migrations apply DB --local   # apply locally for dev
npx wrangler d1 migrations apply DB           # apply to production

# Never manually edit migration files after they've been applied
```

### 7.4 Type exports from schema

```typescript
// types/database.ts — always derive types from schema, not manually
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type { customers, deliveries, users } from '~/server/database/schema'

export type Customer        = InferSelectModel<typeof customers>
export type NewCustomer     = InferInsertModel<typeof customers>
export type Delivery        = InferSelectModel<typeof deliveries>
export type NewDelivery     = InferInsertModel<typeof deliveries>
export type User            = Omit<InferSelectModel<typeof users>, 'passwordHash'>
```

---

## 8. Authentication & Authorization

### 8.1 Session shape

```typescript
// What is stored in the encrypted session cookie
interface UserSession {
  user: {
    id:        number
    username:  string
    full_name: string
    role:      'admin' | 'delivery' | 'viewer'
  }
}
```

### 8.2 Server-side helpers — always use these, never inline session checks

```typescript
// server/utils/auth.ts

export function requireUser(event: H3Event) {
  const session = event.context.session
  if (!session?.user) throw createError({ statusCode: 401, message: 'Unauthorised' })
  return session.user
}

export function requireRole(event: H3Event, roles: Array<'admin' | 'delivery' | 'viewer'>) {
  const user = requireUser(event)
  if (!roles.includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  return user
}

// Usage in every protected route:
const user = requireRole(event, ['admin'])          // admin only
const user = requireRole(event, ['admin', 'delivery']) // admin + delivery
```

### 8.3 Client-side auth middleware

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) return navigateTo('/login')
})
```

### 8.4 Role-based UI — use this pattern

```typescript
// In a composable or page
const { user } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'admin')
const canRecordPayments = computed(() => user.value?.role === 'admin')
const canDeliverOnly = computed(() => user.value?.role === 'delivery')
```

```html
<!-- In template -->
<button v-if="isAdmin" @click="handleDeleteCustomer">Delete</button>
```

### 8.5 Delivery role data scoping — server enforces this

```typescript
// In deliveries list route:
const user = requireRole(event, ['admin', 'delivery', 'viewer'])

const whereClause = user.role === 'delivery'
  ? and(eq(deliveries.createdBy, user.id), dateFilter)  // own only
  : dateFilter                                           // admin/viewer sees all
```

### 8.6 Password rules

- Minimum 8 characters, enforced server-side with zod
- Hashed with PBKDF2, 100,000 iterations, SHA-256 (see `server/utils/password.ts`)
- Never log passwords even partially
- Admin can reset any user's password; all users can change their own

---

## 9. TypeScript Guidelines

### 9.1 Always strict

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 9.2 Type imports

```typescript
// ✅ Always use 'import type' for types — keeps bundle clean
import type { Customer, Delivery } from '~/types/database'
import type { ApiResponse } from '~/types/api'

// ❌ Wrong — importing types as values
import { Customer } from '~/types/database'
```

### 9.3 Avoid `any` — use these instead

```typescript
unknown    // when type is truly unknown — force narrowing before use
never      // for exhaustive checks
Record<string, unknown>  // for dynamic objects
z.infer<typeof Schema>   // for zod-validated data
```

### 9.4 API response type pattern

```typescript
// types/api.ts
export interface ApiResponse<T> {
  data: T
}

export interface ApiListResponse<T> {
  data: T[]
  total: number
}

// Usage in composable
const { data } = await $fetch<ApiResponse<Customer>>(`/api/customers/${id}`)
```

### 9.5 Enum-like constants (not TypeScript enums — they have runtime issues)

```typescript
// types/index.ts
export const ROLES = {
  ADMIN:    'admin',
  DELIVERY: 'delivery',
  VIEWER:   'viewer',
} as const
export type Role = typeof ROLES[keyof typeof ROLES]

export const CYLINDER_SIZES = [12, 17, 21, 33] as const
export type CylinderSize = typeof CYLINDER_SIZES[number]

export const PAYMENT_MODES = ['cash', 'upi', 'bank', 'cheque'] as const
export type PaymentMode = typeof PAYMENT_MODES[number]
```

---

## 10. Error Handling

### 10.1 Server route errors — always throw, never return

```typescript
// ✅ Throw structured errors
throw createError({ statusCode: 404, message: 'Customer not found' })
throw createError({ statusCode: 422, message: 'Invalid data', data: zodError.flatten() })
throw createError({ statusCode: 409, message: 'Username already taken' })

// ❌ Never return errors
return { error: 'Not found', status: 404 }  // breaks the API contract
```

### 10.2 Client-side error handling in composables

```typescript
// composables/useDeliveries.ts
const error = ref<string | null>(null)
const loading = ref(false)

async function createDelivery(data: NewDelivery) {
  error.value = null
  loading.value = true
  try {
    const result = await $fetch<ApiResponse<Delivery>>('/api/deliveries', {
      method: 'POST',
      body: data,
    })
    return result.data
  } catch (err: unknown) {
    if (err instanceof FetchError) {
      error.value = err.data?.message ?? 'Something went wrong'
    } else {
      error.value = 'Network error. Please check your connection.'
    }
    return null
  } finally {
    loading.value = false
  }
}
```

### 10.3 Component error display

```html
<!-- Always show errors clearly — never silently fail -->
<p v-if="error" class="text-sm text-destructive mt-2">
  {{ error }}
</p>

<!-- Loading state on every async action -->
<button :disabled="loading" @click="handleSave">
  <LoadingSpinner v-if="loading" class="h-4 w-4 mr-2" />
  {{ loading ? 'Saving...' : 'Save Delivery' }}
</button>
```

### 10.4 Global error page

```typescript
// error.vue at root — handles 404, 500, and auth errors gracefully
// Never show raw error objects to the user
```

---

## 11. State Management

### 11.1 Local state — ref/reactive in composable

Use `ref` and `computed` in composables for per-page state. No global store needed for most features.

### 11.2 Shared state — useState (Nuxt SSR-safe)

```typescript
// For state shared between components on the same page or across navigation
const customers = useState<Customer[]>('customers', () => [])
```

### 11.3 When to use Pinia

Only use Pinia if:
- State must persist across multiple unrelated page navigations
- Multiple composables need the same reactive state
- Currently: **not needed** — useState covers all use cases for this app

### 11.4 Form state — always local to component

Form state lives in the component, not a composable. The composable handles API calls and returns results.

```typescript
// In component — form state is local
const form = reactive({
  customerId: 0,
  deliveryDate: new Date().toISOString().split('T')[0],
  items: [] as DeliveryFormItem[],
  notes: '',
})

// From composable — API state
const { createDelivery, loading, error } = useDeliveries()
```

---

## 12. PWA & Offline Patterns

### 12.1 What must work offline

| Feature                    | Offline support needed |
|----------------------------|------------------------|
| Create delivery entry      | ✅ Yes — queued in IndexedDB |
| View customer list         | ✅ Yes — cached on last visit |
| View today's deliveries    | ✅ Yes — cached |
| Submit payment             | ❌ No — requires real-time balance |
| View reports               | ❌ No — needs fresh data |

### 12.2 Service worker cache strategy

```typescript
// nuxt.config.ts — vite-pwa config
pwa: {
  strategies: 'injectManifest',
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /\/api\/customers/,
        handler: 'StaleWhileRevalidate',  // serve cache, update in background
        options: { cacheName: 'api-customers', expiration: { maxAgeSeconds: 3600 } }
      },
      {
        urlPattern: /\/api\/products/,
        handler: 'CacheFirst',            // products rarely change
        options: { cacheName: 'api-products', expiration: { maxAgeSeconds: 86400 } }
      },
    ]
  }
}
```

### 12.3 Offline delivery queue

```typescript
// composables/useOfflineQueue.ts
// When POST /api/deliveries fails due to network:
// 1. Store the delivery object in IndexedDB under 'pending_deliveries'
// 2. Register a background sync tag 'sync-deliveries'
// 3. Show user: "Saved offline — will sync when connected"
// 4. On sync event, replay all pending_deliveries against the API
// 5. On success, remove from IndexedDB and refresh delivery list
```

### 12.4 Offline indicator

```typescript
// composables/useNetworkStatus.ts
const isOnline = ref(navigator.onLine)
window.addEventListener('online', () => isOnline.value = true)
window.addEventListener('offline', () => isOnline.value = false)
```

Always show `<OfflineBanner />` when `!isOnline`. Never let the user think the app is broken.

---

## 13. Cloudflare Edge Constraints

These are hard limits — violating them causes silent failures or crashes in production.

### 13.1 What is NOT available in Cloudflare Workers

```typescript
// ❌ These DO NOT EXIST on Cloudflare Workers — will crash at runtime
import fs from 'fs'
import path from 'path'
process.env.MY_VAR              // use useRuntimeConfig() instead
new URL(x, import.meta.url)     // no __dirname equivalent
setTimeout with long delays     // CPU time limit ~50ms per request
```

### 13.2 Runtime config — correct way to access env vars

```typescript
// In server routes
const config = useRuntimeConfig(event)
const secret = config.backupSecret          // from .env / Cloudflare secret

// In nuxt.config.ts
runtimeConfig: {
  backupSecret: process.env.BACKUP_SECRET,  // server-only
  public: {
    appName: 'Gas Supplier App'             // exposed to client
  }
}
```

### 13.3 D1 binding — must come from event.context

```typescript
// ✅ Correct — binding from request context
const db = useDB(event)  // event.context.cloudflare.env.DB

// ❌ Wrong — can't access Cloudflare env from module scope
const db = drizzle(process.env.DB)  // undefined — bindings are per-request
```

### 13.4 CPU time limits

Each request has a ~50ms CPU budget. Avoid:
- Nested loops over large arrays
- Synchronous crypto (use async Web Crypto API)
- Multiple sequential awaits that can be parallelised

```typescript
// ✅ Parallel where possible
const [customers, products] = await Promise.all([
  db.select().from(customers).all(),
  db.select().from(products).all(),
])

// ❌ Unnecessary sequential
const customers = await db.select().from(customers).all()
const products  = await db.select().from(products).all()  // waited for no reason
```

---

## 14. Security Checklist

Run through this for every route that handles writes.

- [ ] Session validated with `requireUser(event)` or `requireRole(event, [...])`
- [ ] Input validated with Zod schema — no raw body access
- [ ] Foreign key inputs verified to belong to the correct account (no IDOR)
- [ ] Sensitive fields (passwordHash, backup secret key) never returned in API response
- [ ] `created_by` always stamped from `event.context.session.user`, never from request body
- [ ] SQL uses Drizzle parameterised queries — no string interpolation
- [ ] Backup endpoint validates `x-backup-key` header against `config.backupSecret`
- [ ] Error messages don't reveal internal structure (no stack traces to client)
- [ ] Passwords hashed before storage, never logged

---

## 15. Feature Development Workflow

Follow these steps in order when implementing any new feature. Tick each one before moving to the next.

```
PHASE 1 — Schema & Migration
  [ ] Identify which tables are affected or need to be created
  [ ] Update server/database/schema.ts with new columns/tables
  [ ] Add indexes for any new foreign key or filter column
  [ ] Run: npx drizzle-kit generate
  [ ] Run: npx wrangler d1 migrations apply DB --local
  [ ] Export new TypeScript types in types/database.ts

PHASE 2 — Server Route
  [ ] Create the appropriate .get.ts / .post.ts / .patch.ts file
  [ ] Define Zod schema for request body (if write route)
  [ ] Add requireRole() check — decide which roles can access this
  [ ] Write the DB query using Drizzle (transaction if multi-table)
  [ ] Stamp created_by and created_by_name from session on all write ops
  [ ] Return { data: result } or throw createError(...)
  [ ] Test the endpoint with curl or Postman before writing the UI

PHASE 3 — Composable
  [ ] Create or update the relevant composable in composables/
  [ ] Add loading ref and error ref
  [ ] Wrap $fetch call in try/catch
  [ ] Return { data, loading, error, [action functions] }
  [ ] Handle offline scenario if this feature needs offline support

PHASE 4 — Component & Page
  [ ] Build mobile-first layout — check at 375px width
  [ ] All form inputs have labels (not just placeholders)
  [ ] Show loading state during async operations
  [ ] Show error message when composable returns an error
  [ ] Show empty state when list is empty
  [ ] Add definePageMeta with correct layout and middleware
  [ ] If feature has role restrictions, hide buttons/sections with v-if + role check

PHASE 5 — Polish & Commit
  [ ] Run through Security Checklist (§14) for any new write routes
  [ ] Check mobile on actual device or 375px devtools viewport
  [ ] Check dark mode if applicable
  [ ] Remove all console.log statements
  [ ] Check no hardcoded strings that should be constants
  [ ] Commit with conventional commit message (§17)
```

---

## 16. Bug Investigation Guide

When a bug is reported or found, work through this guide in order. Do not skip steps.

### Step 1 — Classify the bug

| Symptom | Likely layer |
|---------|-------------|
| UI renders wrong / missing data | Component or composable |
| API returns wrong data | Server route or DB query |
| Auth error (401/403) on a valid session | Server middleware or requireRole args |
| Data not saved correctly | Transaction bug or wrong FK |
| Balance/amount wrong | Price resolver or ledger SQL |
| App crashes offline | Missing offline handling or cache issue |
| Backup not working | Apps Script trigger or backup endpoint auth |
| Delivery not showing for delivery user | Role scoping bug in server route |

### Step 2 — Check the data at each layer

```bash
# Check what's actually in D1
npx wrangler d1 execute DB --local --command="SELECT * FROM deliveries WHERE id = X"
npx wrangler d1 execute DB --local --command="SELECT * FROM prices WHERE product_id = Y ORDER BY effective_from DESC"

# Check the ledger SQL
npx wrangler d1 execute DB --local --command="
  SELECT c.name,
    coalesce(sum(d.total_amount),0) as billed,
    coalesce(sum(p.amount),0) as paid
  FROM customers c
  LEFT JOIN deliveries d ON d.customer_id = c.id AND d.status = 'delivered'
  LEFT JOIN customer_payments p ON p.customer_id = c.id
  WHERE c.id = X GROUP BY c.id"
```

### Step 3 — Check the session

If auth-related: log `event.context.session` at the top of the failing route. Is `session.user` present? Is the `role` correct?

### Step 4 — Check the price resolver

If amounts are wrong: check `server/utils/price-resolver.ts`. The resolver queries with `customer_id IS NULL` as fallback. Verify the effective_from date logic is correct. Check if the delivery was created before or after a price change.

### Step 5 — Check offline sync

If a delivery was created offline: check IndexedDB in browser DevTools → Application → IndexedDB → `pending_deliveries`. Is the record there? Was the sync event fired? Check the service worker logs.

### Step 6 — Document the fix

After fixing, add a comment near the fix if the bug was non-obvious:
```typescript
// FIX: price resolver must check effective_from <= delivery_date, not <= today
// Bug: deliveries created before a price change showed the new price
// Commit: fix(prices): use delivery_date not current date in price resolver
```

---

## 17. Git Commit Convention

All commits must follow **Conventional Commits** format:

```
<type>(<scope>): <short description in sentence case>

[optional body — explain WHY not WHAT, if not obvious]

[optional footer: BREAKING CHANGE or closes #issue]
```

### 17.1 Types

| Type       | When to use                                        |
|------------|----------------------------------------------------|
| `feat`     | New feature or user-facing functionality           |
| `fix`      | Bug fix                                            |
| `refactor` | Code restructure, no behavior change               |
| `perf`     | Performance improvement                            |
| `style`    | Formatting, whitespace — no logic change           |
| `chore`    | Build config, dependencies, tooling                |
| `docs`     | Documentation only (including CLAUDE.md)           |
| `db`       | Schema changes, migrations, Drizzle config         |
| `pwa`      | Service worker, manifest, offline behavior         |
| `security` | Security fixes or hardening                        |
| `wip`      | Work in progress — only on feature branches, never on main |

### 17.2 Scopes

Use the feature module name as scope:

`auth` `customers` `deliveries` `payments` `inventory` `reports` `products` `prices` `users` `backup` `pwa` `settings` `dashboard` `schema` `deps`

### 17.3 Examples

```bash
feat(deliveries): add WhatsApp button after delivery is marked as delivered
fix(prices): use delivery date instead of today for price resolution
feat(auth): add PBKDF2 password hashing and login endpoint
db(schema): add whatsapp_number column to customers table
fix(deliveries): scope delivery list to own records for delivery role
feat(backup): add Google Sheets backup endpoint with secret key auth
chore(deps): update drizzle-orm to 0.32.0
pwa: configure Workbox cache for customers and products API routes
refactor(composables): split useCustomers into list and detail composables
perf(reports): add index on deliveries.delivery_date for monthly report query
feat(reports): add monthly summary with cylinder count by size
fix(auth): redirect to login when session cookie is expired
security: never return password_hash field in user API responses
docs: update CLAUDE.md with offline queue pattern
```

### 17.4 Rules

- Description is **sentence case**, no capital first letter (it's part of the format)
- No period at the end of the description
- Max 72 characters for the first line
- **Never commit directly to main** — always use a branch + merge
- **Branch naming:** `feat/delivery-whatsapp`, `fix/price-resolver-date`, `chore/drizzle-upgrade`
- Atomic commits — one logical change per commit. Don't mix feature + refactor in one commit.
- `wip` commits are allowed on feature branches but must be squashed before merging to main

---

## 18. Pre-commit Code Review Checklist

Before every commit, check:

```
CODE QUALITY
  [ ] No console.log, console.error, debugger statements
  [ ] No commented-out code blocks
  [ ] No hardcoded credentials, secrets, or API keys
  [ ] No hardcoded user IDs or customer IDs
  [ ] TypeScript has no `any` (unless pre-existing with TODO comment)
  [ ] No TODO comments left without a GitHub issue reference

VUE / NUXT
  [ ] All components use <script setup lang="ts">
  [ ] No Options API used
  [ ] All v-for have :key
  [ ] No v-if and v-for on same element
  [ ] definePageMeta set on every page

SERVER ROUTES
  [ ] requireRole() called at the top of every non-auth route
  [ ] Input validated with Zod — no raw body
  [ ] created_by stamped from session, not from body
  [ ] No raw SQL string interpolation

DATABASE
  [ ] Multi-table writes use db.transaction()
  [ ] New FK columns have an index
  [ ] Migration file generated and applied locally

MOBILE / UX
  [ ] Tested at 375px viewport width
  [ ] All buttons have loading state
  [ ] All errors surfaced to user — nothing silently fails
  [ ] Empty states handled

SECURITY
  [ ] passwordHash never appears in API response
  [ ] No IDOR — verify ownership before returning data
```

---

## 19. Environment Variables

### Local development (`.env` — git-ignored)

```bash
NUXT_SESSION_PASSWORD=a-random-32-char-string-for-cookie-encryption
BACKUP_SECRET=another-random-secret-for-backup-endpoint
```

### Cloudflare Pages (set in dashboard → Settings → Environment variables)

```
NUXT_SESSION_PASSWORD   ← mark as "Secret"
BACKUP_SECRET           ← mark as "Secret"
```

### wrangler.toml

```toml
name = "gas-supplier-pwa"
compatibility_date = "2024-09-23"
pages_build_output_dir = ".output/public"

[[d1_databases]]
binding = "DB"
database_name = "gas-supplier-db"
database_id = "<your-d1-database-id>"
```

### nuxt.config.ts

```typescript
runtimeConfig: {
  sessionPassword: process.env.NUXT_SESSION_PASSWORD,
  backupSecret:    process.env.BACKUP_SECRET,
  public: {}
}
```

---

## 20. Anti-patterns & Common Pitfalls

### 20.1 Never do these in Vue

```typescript
// ❌ Mutating props
props.customer.name = 'New name'  // emit an event instead

// ❌ Accessing $refs in setup before mount
const el = ref<HTMLElement>()
el.value.focus()  // crashes — use onMounted

// ❌ Reactive inside reactive (causes unwrapping issues)
const state = reactive({ items: ref([]) })  // just use ref([]) directly

// ❌ Destructuring reactive — loses reactivity
const { name } = reactive(customer)  // name is no longer reactive
const { name } = toRefs(customer)    // ✅ correct
```

### 20.2 Never do these in server routes

```typescript
// ❌ Returning sensitive data
return db.select().from(users).all()  // includes passwordHash!

// ❌ Trusting client-supplied IDs for ownership
const id = body.createdBy  // user could send someone else's ID
const id = event.context.session.user.id  // ✅ always from session

// ❌ Missing await on DB operations
db.insert(deliveries).values(data)  // silent failure — not awaited

// ❌ Forgetting to return from route
export default defineEventHandler(async (event) => {
  const data = await db.select()...
  // forgot: return { data }  — returns undefined
})
```

### 20.3 Never do these with Drizzle / D1

```typescript
// ❌ Using .get() on a query expecting multiple rows
const rows = await db.select().from(deliveries).get()  // returns only first row

// ❌ Forgetting .all() — returns a query builder, not the results
const rows = db.select().from(deliveries)  // NOT awaited, NOT .all()

// ❌ Inserting without returning — then trying to use the result
await db.insert(deliveries).values(data)
const id = data.id  // undefined — you need .returning()
const [row] = await db.insert(deliveries).values(data).returning()  // ✅
```

### 20.4 Cloudflare-specific traps

```typescript
// ❌ Using process.env in server routes
const secret = process.env.BACKUP_SECRET  // undefined at runtime on Workers

// ❌ Using bcrypt (CPU limit exceeded)
import bcrypt from 'bcrypt'
await bcrypt.hash(password, 10)  // crashes on Workers

// ❌ Importing Node.js built-ins
import { createHash } from 'crypto'  // not available — use crypto.subtle
```

### 20.5 Price calculation traps

```typescript
// ❌ Floating point for currency
0.1 + 0.2 === 0.30000000000000004  // JavaScript float issue

// ✅ Round to 2 decimal places before storing
const total = Math.round((qty * price) * 100) / 100

// ❌ Calculating price from current price table at report time
// Past reports must use the price that was active WHEN the delivery was made
// That's why unit_price is stored on each delivery_item at creation time
```

---

## 21. Data Architecture Clarifications

### 21.1 Single brand — all staff see all data

This is a single-agency app. There is no multi-tenant separation.
All staff (admin, delivery, viewer) access the same business data.

```
✅ Every user sees all customers
✅ Every user sees all deliveries
✅ Every user sees all payments and balances
✅ Every user sees all stock levels
```

The **only** personal filter is "My Deliveries" — a convenience
filter on the delivery list that shows only entries logged by the
currently logged-in staff member. This is a UI convenience,
not a data access restriction.

```typescript
// server/routes/api/deliveries/index.get.ts
const query = getQuery(event)
const user  = requireRole(event, ['admin', 'delivery', 'viewer'])

// "mine" query param = convenience filter, not a security gate
const mine = query.mine === 'true'

const whereClause = mine
  ? eq(deliveries.createdBy, user.id)   // filter to own deliveries
  : undefined                            // show all — same table, no restriction

const result = await db.select().from(deliveries)
  .where(whereClause)
  .orderBy(desc(deliveries.deliveryDate))
  .all()
```

**Never** build server-side role-based data scoping for the
deliveries list. All staff are trusted employees of the same
business. Scope only the "My Deliveries" convenience filter
via an explicit `?mine=true` query param from the client.

---

## 22. Delivery Card — 3-Level Identity Pattern

Every delivery record displayed in a card or list item across
the entire app **must** show three distinct identity levels.
This is a non-negotiable UI consistency rule.

### 22.1 The three levels

```
Level 1 — Business name (PRIMARY)
  The restaurant or shop name.
  Most prominent. Largest text. Bold.
  e.g. "Malabar Biriyani House"

Level 2 — Contact person (SECONDARY)
  The individual at that business.
  Smaller, secondary color, below the shop name.
  e.g. "Mohammed Riyas"

Level 3 — Delivered by (META)
  The staff member who logged this delivery.
  Smallest. Tertiary color. Bottom of card.
  Shown as a chip: tiny 20px avatar + "Delivered by Rajan K"
  e.g. tiny circle "RK" + "Delivered by Rajan K"
```

### 22.2 Component implementation

```vue
<!-- components/deliveries/DeliveryCard.vue -->
<script setup lang="ts">
import type { DeliveryWithRelations } from '~/types/database'

defineProps<{
  delivery: DeliveryWithRelations
}>()
</script>

<template>
  <div class="delivery-card">
    <!-- Level 1: Business name — always most prominent -->
    <p class="text-[15px] font-medium text-foreground">
      {{ delivery.customer.name }}
    </p>

    <!-- Level 2: Contact person — always below business name -->
    <p class="text-[12px] text-muted-foreground mt-0.5">
      {{ delivery.customer.contactPerson }}
    </p>

    <!-- ... items, amount, status badge ... -->

    <!-- Level 3: Delivered by — always at bottom of card, smallest -->
    <div class="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
      <UserAvatar
        :name="delivery.createdByName"
        :size="20"
      />
      <span class="text-[11px] text-muted-foreground">
        Delivered by {{ delivery.createdByName }}
      </span>
    </div>
  </div>
</template>
```

### 22.3 Where this pattern applies

Apply the 3-level pattern consistently on every delivery card in:

- Dashboard → Today's delivery list
- Deliveries page → full list and "My Deliveries" tab
- Customer detail → Ledger tab delivery entries
- Reports → any delivery list within report sections

Do not abbreviate or drop any level, even on smaller cards.
If space is very constrained, shrink font size — never remove a level.

### 22.4 Type to support this pattern

```typescript
// types/database.ts — extend the base Delivery type
export type DeliveryWithRelations = Delivery & {
  customer: Pick<Customer, 'id' | 'name' | 'contactPerson' | 'area'>
  items: Array<DeliveryItem & { product: Product }>
}
```

```typescript
// server/routes/api/deliveries/index.get.ts
// Always JOIN customer and items when returning deliveries for display
const deliveries = await db.query.deliveries.findMany({
  with: {
    customer: {
      columns: { id: true, name: true, contactPerson: true, area: true }
    },
    items: {
      with: { product: true }
    }
  },
  orderBy: [desc(schema.deliveries.deliveryDate)]
})
```

---

## 23. Cylinder Stock Module

### 23.1 Business context

The agency tracks two states for each cylinder size at all times:

```
Full cylinders  — filled, ready to deliver to restaurants
Empty cylinders — collected back from restaurants, waiting
                  to be returned to the main supplier
```

Stock changes happen in exactly three scenarios:

| Event            | Full stock  | Empty stock |
|------------------|-------------|-------------|
| Delivery made    | − qty       | + qty       |
| Purchase from supplier | + received  | − returned  |
| Manual adjustment| ± adj       | ± adj       |

All three scenarios must trigger automatic stock updates
inside a database transaction. **Never** update stock manually
outside of these three controlled paths.

### 23.2 Cylinder sizes

The business uses exactly **3 cylinder sizes**: `12kg · 17kg · 33kg`

```typescript
// types/index.ts
export const CYLINDER_SIZES = [12, 17, 33] as const
export type CylinderSize = typeof CYLINDER_SIZES[number]
```

Note: The earlier plan mentioned 12kg, 17kg, 21kg, 33kg (4 sizes).
**This is now corrected to 3 sizes: 12kg, 17kg, 33kg.**
Remove 21kg from all schema enums, form options, and UI.

### 23.3 Schema

```typescript
// server/database/schema.ts

// Single row per cylinder size — source of truth for current stock
export const cylinderStock = sqliteTable('cylinder_stock', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  sizeKg:       integer('size_kg').notNull().unique(), // 12, 17, or 33
  fullCount:    integer('full_count').notNull().default(0),
  emptyCount:   integer('empty_count').notNull().default(0),
  updatedAt:    text('updated_at').default(sql`(datetime('now'))`).notNull(),
})

// Immutable log of every stock change — never delete from this table
export const stockMovements = sqliteTable('stock_movements', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  sizeKg:          integer('size_kg').notNull(),
  movementType:    text('movement_type', {
    enum: ['delivery', 'purchase', 'adjustment']
  }).notNull(),
  fullChange:      integer('full_change').notNull(),  // negative = decrease
  emptyChange:     integer('empty_change').notNull(), // negative = decrease
  referenceId:     integer('reference_id'),           // delivery.id or purchase.id
  referenceType:   text('reference_type'),            // 'delivery' or 'purchase'
  notes:           text('notes'),
  createdBy:       integer('created_by').references(() => users.id).notNull(),
  createdByName:   text('created_by_name').notNull(),
  createdAt:       text('created_at').default(sql`(datetime('now'))`).notNull(),
}, (table) => ({
  sizeIdx:      index('stock_movements_size_idx').on(table.sizeKg),
  typeIdx:      index('stock_movements_type_idx').on(table.movementType),
  refIdx:       index('stock_movements_ref_idx').on(table.referenceId, table.referenceType),
}))
```

### 23.4 Stock update helper — always use this, never update directly

```typescript
// server/utils/stock.ts

interface StockChange {
  sizeKg:      12 | 17 | 33
  fullChange:  number   // positive = increase, negative = decrease
  emptyChange: number
}

export async function applyStockChanges(
  db:            ReturnType<typeof useDB>,
  changes:       StockChange[],
  movementType:  'delivery' | 'purchase' | 'adjustment',
  referenceId:   number,
  referenceType: string,
  user:          { id: number; fullName: string },
  notes?:        string
) {
  for (const change of changes) {
    // 1. Read current stock
    const current = await db.select()
      .from(cylinderStock)
      .where(eq(cylinderStock.sizeKg, change.sizeKg))
      .get()

    if (!current) {
      throw createError({
        statusCode: 500,
        message: `Stock record not found for ${change.sizeKg}kg`
      })
    }

    // 2. Validate — never go below zero
    const newFull  = current.fullCount  + change.fullChange
    const newEmpty = current.emptyCount + change.emptyChange

    if (newFull < 0) {
      throw createError({
        statusCode: 422,
        message: `Insufficient full cylinders for ${change.sizeKg}kg. ` +
                 `Available: ${current.fullCount}`
      })
    }
    if (newEmpty < 0) {
      throw createError({
        statusCode: 422,
        message: `Insufficient empty cylinders for ${change.sizeKg}kg. ` +
                 `Available: ${current.emptyCount}`
      })
    }

    // 3. Update stock
    await db.update(cylinderStock)
      .set({
        fullCount:  newFull,
        emptyCount: newEmpty,
        updatedAt:  new Date().toISOString(),
      })
      .where(eq(cylinderStock.sizeKg, change.sizeKg))

    // 4. Log the movement — always, never skip
    await db.insert(stockMovements).values({
      sizeKg:       change.sizeKg,
      movementType,
      fullChange:   change.fullChange,
      emptyChange:  change.emptyChange,
      referenceId,
      referenceType,
      notes,
      createdBy:    user.id,
      createdByName: user.fullName,
    })
  }
}
```

> **D1 note:** Cloudflare D1's Drizzle driver does not support `db.transaction()`
> (it issues raw `BEGIN`/`COMMIT`, which D1 rejects). `applyStockChanges` takes a
> plain `useDB(event)` handle and runs sequential awaited statements instead of a
> `tx` callback — read-validate-write per size, in order, no rollback on partial
> failure. Stock writes happen *after* the parent record (delivery/purchase) and
> its line items are inserted via `db.batch()`, so a stock failure still leaves
> a valid delivery/purchase row; surface the error to the user so they can retry
> the now-mismatched stock manually via the adjustment endpoint. This mirrors the
> existing pattern in `server/routes/api/deliveries/index.post.ts`.

### 23.5 How delivery creation must handle stock

```typescript
// server/routes/api/deliveries/index.post.ts (excerpt)

// Create the delivery record
const [delivery] = await db.insert(deliveries).values({...}).returning()

// Insert delivery items + decrement accessory inventory via db.batch()
await db.batch([...itemInserts, ...accessoryInventoryUpdates])

// Auto-update cylinder stock per size — sequential, after the batch (see §23.4 D1 note)
// Delivery: full cylinders go out, empty cylinders come back
const cylinderChanges = groupBySizeKg(items).map(({ sizeKg, qty }) => ({
  sizeKg,
  fullChange:  -qty,  // full cylinders decrease
  emptyChange: +qty,  // empty cylinders increase
}))

await applyStockChanges(
  db,
  cylinderChanges,
  'delivery',
  delivery.id,
  'delivery',
  user
)
```

### 23.6 API routes for cylinder stock

```
GET  /api/inventory/cylinders          — current full + empty per size
GET  /api/inventory/movements          — stock movement history (paginated)
POST /api/inventory/adjustment         — manual stock correction (admin only)
```

---

## 24. Purchase Module

### 24.1 Business context

The agency periodically drives to the main LPG supplier company
(e.g. HP Gas, Indane, Bharat Gas) to exchange empty cylinders
for full ones. One purchase record captures the entire exchange:

```
→ Empties returned to supplier (per size)
← Full cylinders received from supplier (per size)
₹  Payment made to supplier
```

Stock is automatically updated on purchase save:
```
Full stock  += received per size
Empty stock -= returned per size
```

### 24.2 Schema

```typescript
// server/database/schema.ts

export const purchases = sqliteTable('purchases', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  supplier:         text('supplier').notNull(),      // HP Gas / Indane / Bharat Gas
  purchaseDate:     text('purchase_date').notNull(), // YYYY-MM-DD
  invoiceNo:        text('invoice_no'),              // optional
  totalAmount:      real('total_amount').notNull(),
  amountPaid:       real('amount_paid').notNull().default(0),
  paymentMode:      text('payment_mode', {
    enum: ['cash', 'upi', 'bank', 'credit']
  }),
  paymentStatus:    text('payment_status', {
    enum: ['paid', 'partial', 'pending']
  }).notNull().default('pending'),
  paymentReference: text('payment_reference'),       // UTR / cheque no
  dueDate:          text('due_date'),                // for credit payments
  notes:            text('notes'),
  createdBy:        integer('created_by').references(() => users.id).notNull(),
  createdByName:    text('created_by_name').notNull(),
  ...timestamps,
}, (table) => ({
  dateIdx:     index('purchases_date_idx').on(table.purchaseDate),
  statusIdx:   index('purchases_status_idx').on(table.paymentStatus),
}))

// One row per cylinder size per purchase
export const purchaseItems = sqliteTable('purchase_items', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  purchaseId:   integer('purchase_id').references(() => purchases.id).notNull(),
  sizeKg:       integer('size_kg').notNull(),        // 12, 17, or 33
  receivedQty:  integer('received_qty').notNull().default(0), // full cylinders in
  returnedQty:  integer('returned_qty').notNull().default(0), // empty cylinders out
  unitPrice:    real('unit_price'),                  // price per cylinder (optional)
}, (table) => ({
  purchaseIdx: index('purchase_items_purchase_idx').on(table.purchaseId),
}))
```

### 24.3 Purchase creation — server route

```typescript
// server/routes/api/purchases/index.post.ts

const CreatePurchaseSchema = z.object({
  supplier:         z.string().min(1).max(100),
  purchaseDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  invoiceNo:        z.string().max(50).optional(),
  totalAmount:      z.number().positive(),
  amountPaid:       z.number().min(0),
  paymentMode:      z.enum(['cash', 'upi', 'bank', 'credit']),
  paymentReference: z.string().optional(),
  dueDate:          z.string().optional(),
  notes:            z.string().max(500).optional(),
  items: z.array(z.object({
    sizeKg:       z.union([z.literal(12), z.literal(17), z.literal(33)]),
    receivedQty:  z.number().int().min(0),
    returnedQty:  z.number().int().min(0),
    unitPrice:    z.number().positive().optional(),
  })).min(1),
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['admin'])          // admin only
  const body = await parseBody(event, CreatePurchaseSchema)
  const db = useDB(event)

  // Determine payment status
  const paymentStatus =
    body.amountPaid >= body.totalAmount ? 'paid'    :
    body.amountPaid > 0                 ? 'partial' : 'pending'

  // 1. Create purchase record
  const [purchase] = await db.insert(purchases).values({
    ...body,
    paymentStatus,
    createdBy:     user.id,
    createdByName: user.fullName,
  }).returning()
  if (!purchase) throw createError({ statusCode: 500, message: 'Failed to create purchase' })

  // 2. Insert purchase items
  await db.insert(purchaseItems).values(
    body.items.map(i => ({ ...i, purchaseId: purchase.id }))
  )

  // 3. Auto-update cylinder stock (sequential — see §23.4 D1 note)
  // Purchase: full cylinders come in, empty cylinders go out
  const changes = body.items
    .filter(i => i.receivedQty > 0 || i.returnedQty > 0)
    .map(i => ({
      sizeKg:      i.sizeKg,
      fullChange:  +i.receivedQty,  // received full → increases full stock
      emptyChange: -i.returnedQty,  // returned empty → decreases empty stock
    }))

  await applyStockChanges(db, changes, 'purchase', purchase.id, 'purchase', user)

  return { data: purchase }
})
```

### 24.4 Live stock impact preview — client-side

The New Purchase form must show a real-time stock impact preview
as the user enters received and returned quantities.
This runs entirely on the client using current stock data fetched
on form load. Never round-trip to the server for the preview.

```typescript
// composables/usePurchaseForm.ts

const currentStock = ref<CylinderStockMap>({})  // fetched on mount

const stockPreview = computed(() => {
  return CYLINDER_SIZES.map(size => {
    const current = currentStock.value[size] ?? { fullCount: 0, emptyCount: 0 }
    const item = form.items.find(i => i.sizeKg === size)

    const receivedQty = item?.receivedQty ?? 0
    const returnedQty = item?.returnedQty ?? 0

    const newFull  = current.fullCount  + receivedQty
    const newEmpty = current.emptyCount - returnedQty

    return {
      size,
      before:       current,
      fullChange:   +receivedQty,
      emptyChange:  -returnedQty,
      after:        { fullCount: newFull, emptyCount: newEmpty },
      fullValid:    newFull  >= 0,
      emptyValid:   newEmpty >= 0,   // false = trying to return more than available
      isValid:      newFull  >= 0 && newEmpty >= 0,
    }
  })
})

// Disable submit button if any size has invalid preview
const formIsValid = computed(() => stockPreview.value.every(s => s.isValid))
```

Show this preview in the form at all times — not only on error.
The user should see the before → change → after for every
cylinder size, even sizes not touched in this purchase (show no change).

### 24.5 API routes for purchases

```
GET    /api/purchases              — list, newest first, with summary stats
POST   /api/purchases              — create (admin only)
GET    /api/purchases/:id          — full detail with items
PATCH  /api/purchases/:id          — edit (admin only; reverses old stock, applies new)
DELETE /api/purchases/:id          — delete (admin only; reverses stock changes)
```

**Editing and deleting purchases** requires reversing the original
stock movement before applying the new one. Use this pattern:

```typescript
// On PATCH:
// 1. Reverse the original purchase's stock impact
// 2. Apply the new purchase's stock impact
// 3. Update the purchase record and items
// Never update stock_movements — add new entries for the reversal
```

### 24.6 Permission for purchases

```typescript
// Purchases are admin-only — delivery staff do not create purchases
// Viewers can read purchase history
requireRole(event, ['admin'])          // POST, PATCH, DELETE
requireRole(event, ['admin', 'viewer']) // GET list and detail
```

### 24.7 Role permission matrix (authoritative)

**Admin-only actions** — only `admin` can do these:
- Add / edit / delete users (`/settings/users`)
- Danger zone: clear all deliveries / customers / stock data (full wipe only)

**Admin + Delivery** — both roles can do ALL other operations:
- Create/view/edit deliveries, mark paid
- Add / edit customers
- Record payments (manual + mark-paid on delivery)
- Create purchases from supplier, view purchase history
- Add / edit products
- Set / update prices
- Adjust cylinder stock, stock-in accessories
- View all reports

**Viewer** — read-only. Can view everything but cannot write anything.

| Action                       | Admin | Delivery | Viewer |
|------------------------------|-------|----------|--------|
| View deliveries / customers  | ✅    | ✅       | ✅     |
| Add / edit customers         | ✅    | ✅       | ❌     |
| Create delivery              | ✅    | ✅       | ❌     |
| Mark delivery paid           | ✅    | ✅       | ❌     |
| Record payment (manual)      | ✅    | ✅       | ❌     |
| Add / edit / delete products | ✅    | ✅       | ❌     |
| Set / update prices          | ✅    | ✅       | ❌     |
| View cylinder stock          | ✅    | ✅       | ✅     |
| Manual stock adjustment      | ✅    | ✅       | ❌     |
| Stock-in accessories         | ✅    | ✅       | ❌     |
| View stock movement log      | ✅    | ✅       | ✅     |
| View purchase history        | ✅    | ✅       | ✅     |
| Create purchase              | ✅    | ✅       | ❌     |
| Edit / delete purchase       | ✅    | ✅       | ❌     |
| View reports                 | ✅    | ✅       | ✅     |
| Add / edit / delete users    | ✅    | ❌       | ❌     |
| Danger zone (clear data)     | ✅    | ❌       | ❌     |

---

## 25. Reports Module

### 25.1 Date filter — the foundation of all reports

Every report query accepts `from` and `to` date params.
The client sends ISO date strings (YYYY-MM-DD).
The server never infers dates — always explicit.

```typescript
// Zod schema for all report routes
const ReportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
```

### 25.2 Date presets — computed on client only, never on server

```typescript
// utils/datePresets.ts
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth,
         subMonths, startOfYear, format } from 'date-fns'

export type DatePreset =
  | 'this_week' | 'this_month' | '3_months'
  | '6_months'  | 'this_year'  | 'custom'

export function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date()
  const fmt   = (d: Date) => format(d, 'yyyy-MM-dd')

  switch (preset) {
    case 'this_week':
      return { from: fmt(startOfWeek(today, { weekStartsOn: 1 })),
               to:   fmt(endOfWeek(today,   { weekStartsOn: 1 })) }
    case 'this_month':
      return { from: fmt(startOfMonth(today)), to: fmt(endOfMonth(today)) }
    case '3_months':
      return { from: fmt(subMonths(today, 3)), to: fmt(today) }
    case '6_months':
      return { from: fmt(subMonths(today, 6)), to: fmt(today) }
    case 'this_year':
      return { from: fmt(startOfYear(today)), to: fmt(today) }
    case 'custom':
      return { from: '', to: '' }   // user fills manually
  }
}
```

### 25.3 Report API routes

```
GET /api/reports/summary     — revenue (billed, collected, outstanding)
GET /api/reports/cylinders   — cylinders delivered by size
GET /api/reports/empties     — empty cylinders collected by size
GET /api/reports/payments    — payment mode breakdown
GET /api/reports/customers   — top customers by billing
GET /api/reports/staff       — deliveries per staff member
GET /api/reports/procurement — purchases vs deliveries comparison
```

All routes accept `?from=YYYY-MM-DD&to=YYYY-MM-DD`.

### 25.4 Report query examples

```typescript
// GET /api/reports/cylinders
// Cylinders delivered per size in date range
const cylinderReport = await db
  .select({
    sizeKg:        products.cylinderSize,
    totalDelivered: sql<number>`sum(${deliveryItems}.quantity)`,
    totalRevenue:   sql<number>`sum(${deliveryItems}.subtotal)`,
  })
  .from(deliveryItems)
  .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
  .innerJoin(products,   eq(products.id,   deliveryItems.productId))
  .where(and(
    eq(deliveries.status, 'delivered'),
    eq(products.type, 'cylinder'),
    gte(deliveries.deliveryDate, from),
    lte(deliveries.deliveryDate, to),
  ))
  .groupBy(products.cylinderSize)
  .all()

// GET /api/reports/staff
// Deliveries logged per staff member in date range
const staffReport = await db
  .select({
    createdBy:     deliveries.createdBy,
    createdByName: deliveries.createdByName,
    deliveryCount: sql<number>`count(*)`,
    totalValue:    sql<number>`sum(${deliveries}.total_amount)`,
  })
  .from(deliveries)
  .where(and(
    eq(deliveries.status, 'delivered'),
    gte(deliveries.deliveryDate, from),
    lte(deliveries.deliveryDate, to),
  ))
  .groupBy(deliveries.createdBy)
  .orderBy(desc(sql`count(*)`))
  .all()
```

### 25.5 Comparison with previous period

Every report section should optionally return "vs previous period" data.
The previous period has the same duration, immediately before the from date.

```typescript
// server/utils/report-helpers.ts
export function getPreviousPeriod(from: string, to: string) {
  const fromDate = new Date(from)
  const toDate   = new Date(to)
  const duration = toDate.getTime() - fromDate.getTime()

  const prevTo   = new Date(fromDate.getTime() - 1)      // day before from
  const prevFrom = new Date(prevTo.getTime() - duration) // same span before

  return {
    from: format(prevFrom, 'yyyy-MM-dd'),
    to:   format(prevTo,   'yyyy-MM-dd'),
  }
}

// Usage: fetch both periods in parallel
const [current, previous] = await Promise.all([
  fetchReportData(from, to),
  fetchReportData(prevFrom, prevTo),
])

// Return delta percentage
const delta = previous.total > 0
  ? ((current.total - previous.total) / previous.total) * 100
  : null
```

### 25.6 Report composable pattern

```typescript
// composables/useReports.ts
export function useReports() {
  const preset    = ref<DatePreset>('this_month')
  const customFrom = ref('')
  const customTo   = ref('')

  const dateRange = computed(() =>
    preset.value === 'custom'
      ? { from: customFrom.value, to: customTo.value }
      : getPresetRange(preset.value)
  )

  // Only fetch when we have valid dates
  const canFetch = computed(() =>
    Boolean(dateRange.value.from && dateRange.value.to)
  )

  const { data: summary, refresh: refreshSummary } = useAsyncData(
    () => `report-summary-${dateRange.value.from}-${dateRange.value.to}`,
    () => $fetch('/api/reports/summary', { query: dateRange.value }),
    { watch: [dateRange] }   // auto-refetch when date range changes
  )

  function setPreset(p: DatePreset) { preset.value = p }
  function setCustomRange(from: string, to: string) {
    customFrom.value = from
    customTo.value   = to
    preset.value     = 'custom'
  }

  return { preset, dateRange, summary, setPreset, setCustomRange, canFetch }
}
```

---

## 26. Navigation Structure Update

### 26.1 Bottom navigation — 5 tabs (revised)

```
Tab 1: Home       → /                     Dashboard
Tab 2: Deliveries → /deliveries            All deliveries + My Deliveries tab
Tab 3: Customers  → /customers             Customer list
Tab 4: Stock      → /stock                 Cylinder stock + Purchases
Tab 5: Reports    → /reports               Reports with date filter
```

Settings is moved to a gear icon in the top-right header on the
Dashboard — not a primary nav tab. It is accessed less frequently.

Payments is no longer a bottom-nav tab. Reach it via the "Record
Payment" action on a customer's ledger (`/customers/[id]`) or a
dashboard shortcut. The `/payments` page itself still exists for
full payment history — just not pinned to the bottom nav.

### 26.2 Stock section structure

```
/stock
  ├── /stock          → Cylinder Stock (full + empty counts, all sizes)
  └── /stock/purchases
        ├── index     → Purchase history list
        ├── new       → New purchase form
        └── [id]      → Purchase detail view
```

The `/stock` page shows:
- Cylinder stock card (12kg, 17kg, 33kg — full + empty)
- "Record Purchase" shortcut card
- Recent stock movement list (last 10 entries)
- Link to full purchase history

### 26.3 Dashboard additions

Add these two sections to the dashboard below the KPI row:

```
Section A — Cylinder Stock (compact)
  Quick read: 3 rows (12kg / 17kg / 33kg)
  Each row: size · full count (filled dot) · empty count (hollow dot)
  Low stock warning inline if full count < threshold
  Tap → goes to /stock

Section B — Record Purchase shortcut
  Subtle outlined card: "+ Record new purchase from supplier →"
  Tap → goes to /stock/purchases/new
  Only visible to admin role
```

---

## 27. Schema Corrections & Complete Table List

### 27.1 Cylinder size correction

**Correct sizes: 12kg, 17kg, 33kg** (3 sizes)
**Remove 21kg from all code** — it was in the earlier plan but
the client confirmed only these 3 sizes are in use.

Run a search for `21` in schema files and remove it everywhere.

### 27.2 Complete schema table list

```
users               — staff accounts
customers           — restaurant/shop customers
products            — cylinders (12/17/33kg) + accessories
prices              — default + per-customer prices with effective dates
deliveries          — delivery header records
delivery_items      — line items per delivery
customer_payments   — payments received from customers
procurements        — purchases from main supplier (alias: purchases table)
purchase_items      — cylinder quantities per purchase
cylinder_stock      — current full + empty counts per size (3 rows only)
stock_movements     — immutable log of every stock change
```

### 27.3 Seed data on first deploy

```sql
-- Seed cylinder_stock with 3 rows (must exist before any operations)
INSERT INTO cylinder_stock (size_kg, full_count, empty_count) VALUES
  (12, 0, 0),
  (17, 0, 0),
  (33, 0, 0);

-- Seed default products
INSERT INTO products (name, type, size_kg, sku, display_order, is_active) VALUES
  ('17kg Cylinder', 'cylinder', 17, 'CYL-17', 1, 1),
  ('12kg Cylinder', 'cylinder', 12, 'CYL-12', 2, 1),
  ('33kg Cylinder', 'cylinder', 33, 'CYL-33', 3, 1),
  ('Regulator',     'accessory', null, 'ACC-REG', 4, 1),
  ('Adapter',       'accessory', null, 'ACC-ADP', 5, 1),
  ('Connector',     'accessory', null, 'ACC-CON', 6, 1),
  ('Cooktop',       'accessory', null, 'ACC-CTK', 7, 1);
```

---

## 28. Backup Endpoint Update

Add cylinder stock and purchase data to the Google Sheets backup:

```typescript
// server/routes/api/backup.get.ts — add to return object
return {
  customers:       await db.select().from(customers).all(),
  products:        await db.select().from(products).all(),
  deliveries:      await db.select().from(deliveries).all(),
  deliveryItems:   await db.select().from(deliveryItems).all(),
  payments:        await db.select().from(customerPayments).all(),
  purchases:       await db.select().from(purchases).all(),       // NEW
  purchaseItems:   await db.select().from(purchaseItems).all(),   // NEW
  cylinderStock:   await db.select().from(cylinderStock).all(),   // NEW
  stockMovements:  await db.select().from(stockMovements).all(),  // NEW
  ledger:          await db.execute(LEDGER_SQL),
  exported_at:     new Date().toISOString(),
}
```

Google Sheet tabs to add:
```
Sheet 8: Purchases       — one row per purchase
Sheet 9: PurchaseItems   — one row per purchase line item
Sheet 10: CylinderStock  — current stock snapshot (3 rows)
Sheet 11: StockMovements — full stock movement log
```

---

## 29. UI Design System — Aura Gas Management

Sourced from a Stitch design project ("Gas Agency Manager", project ID
`17743013945297294290`) and adopted wholesale 2026-06-25. This is now
the single visual language for the app — **single fixed dark theme,
no light/dark toggle.**

### 29.1 Colors

Full M3-style token set, ported as flat hex values directly into
`tailwind.config.ts` `theme.extend.colors` (not CSS vars — this app
has one theme, so no runtime toggling is needed). Use these tokens
directly in templates, e.g. `bg-surface-container-high`,
`text-on-surface-variant`, `border-outline-variant/30`.

| Token | Hex | Use |
|---|---|---|
| `surface` / `background` | `#1d100c` | App background |
| `surface-container-low` | `#261813` | Subtle nested surface |
| `surface-container` | `#2a1c17` | Default card background |
| `surface-container-high` | `#352721` | Elevated card / active nav item bg |
| `surface-container-highest` | `#41312c` | Most elevated surface, input fields |
| `on-surface` | `#f7ddd5` | Primary text |
| `on-surface-variant` | `#e2bfb3` | Secondary text |
| `outline` / `outline-variant` | `#a98a7f` / `#594139` | Borders, dividers |
| `primary-container` | `#ff6b2c` | Solid CTA buttons, active nav pill (Aura Orange) |
| `on-primary-container` | `#5c1c00` | Text/icon on `primary-container` |
| `primary` / `primary-fixed-dim` | `#ffb59a` | Accent text/icons on dark surfaces (headings, links) |
| `tertiary-container` | `#00a6d6` | Secondary accent (e.g. fleet/progress bars) |
| `error-container` | `#93000a` | Destructive surfaces |

Semantic status colors (Clear/Delivered = green, Outstanding = red,
low-stock warning = amber) use **plain Tailwind palette classes**
directly (`emerald-500`, `red-500`/`error`, `amber-500`) — no custom
tokens needed for these, matching the Stitch reference markup exactly.

The pre-existing shadcn semantic slots (`bg-primary`,
`text-foreground`, `border-input`, etc., used internally by
`components/ui/*` vendor files) still work — their CSS vars in
`assets/css/main.css` `:root` were repointed to HSL equivalents of
this same palette, so vendor components render correctly without
being edited.

### 29.2 Typography

**Hanken Grotesk** (Google Fonts) is the only typeface, loaded via
`@import` in `assets/css/main.css`. Named font-size utilities ported
into `tailwind.config.ts` `theme.extend.fontSize` — use these instead
of raw `text-[Npx]`:

| Class | Size / weight | Use |
|---|---|---|
| `text-display-lg` | 48px/700 | Page-level hero numbers |
| `text-headline-md` | 24px/600 | Page titles |
| `text-data-primary` | 16px/600 | Card titles, primary data values |
| `text-data-secondary` | 12px/500 | Secondary labels, metadata |
| `text-data-tertiary` | 11px/400 | Smallest supporting text |
| `text-body-base` | 14px/400 | Body copy, form inputs |
| `text-label-caps` | 10px/700, uppercase tracking | Nav labels, status chip text |

There is no separate `font-*` family utility needed (single font) —
don't port the Stitch `font-data-primary` etc. family classes, only
the `text-*` size ones above.

### 29.3 Spacing

`tailwind.config.ts` `theme.extend.spacing` adds the named scale used
throughout the reference screens: `xs` (4px) · `sm` (8px) · `md`
(16px) · `lg` (24px) · `xl` (32px) · `gutter`/`margin-mobile` (16px).
Use `p-md`, `gap-lg`, etc. alongside standard Tailwind spacing.

Radius: standard Tailwind `rounded-xl` (0.75rem) already matches the
design's `xl` token — no override needed there. `--radius` stays
`0.5rem` (matches the design's `lg` token) for shadcn vendor
components.

### 29.4 Icons — Material Symbols Outlined

Replaces Lucide Vue Next everywhere **except** inside
`components/ui/select/*` (shadcn vendor files — never edit, leave
their internal Lucide icons as-is).

```vue
<!-- components/shared/Icon.vue — the only way to render an icon now -->
<Icon name="local_shipping" />
<Icon name="groups" class="text-xl text-primary" />
<Icon name="home" :filled="true" />  <!-- filled variant for active nav state -->
```

Size is controlled via Tailwind `text-*` font-size utilities (the
icon font's glyph scales with `font-size`), not `h-*`/`w-*` like
Lucide. Icon names are Google's Material Symbols identifiers
(`local_shipping`, `inventory_2`, `groups`, `analytics`, `home`,
`add`, `chevron_right`, `arrow_forward`, `edit`, `delete`, `search`,
`notifications`, `payments`, `wifi_off`, `inbox`, `chat`, etc.) — look
up exact names at fonts.google.com/icons before inventing one.

### 29.5 Component patterns

- **Data card:** `bg-surface-container rounded-xl p-4 border border-outline-variant/30`
- **Bento KPI card:** same as above, `col-span-2` for the hero metric, half-width siblings for secondary metrics
- **Status chip:** `px-sm py-xs rounded-full font-label-caps text-label-caps border` with a 10% opacity tint background of the semantic color + a small leading dot (`w-1.5 h-1.5 rounded-full`)
- **Stepper input (qty +/-):** two `w-8 h-8 rounded-full` circular buttons flanking a numeric value, decrement ghost-bordered, increment filled `bg-primary-container`
- **Sticky bottom action bar:** `fixed bottom-0` with `backdrop-blur` or solid `bg-surface-container-high`, used on forms (New Delivery, New Purchase) instead of an inline submit button
- **3-level delivery card** (§22) keeps its meaning but now renders as: business name (`text-data-primary text-on-surface`) → contact person (`text-data-secondary text-on-surface-variant`) → "Delivered by" chip (`bg-surface-container-highest rounded-full` with small avatar + `text-data-tertiary`)

### 29.6 Source reference

Original Stitch screens + extracted HTML/CSS live in the session
scratchpad during the migration (not checked into the repo). Re-fetch
via the `stitch` MCP server (`get_project`/`get_screen` on project ID
above) if pixel-level re-verification is ever needed.

---

## 30. Orders & Delivery Payment Status

### 30.1 Orders — customer call-in booking

A customer calls in to book a cylinder before it's actually delivered. This
is tracked separately from `deliveries` — **orders have zero stock/price
impact until confirmed delivered.**

```
orders        — id, customerId, orderDate, status (pending/delivered/cancelled),
                notes, deliveryId (set once converted), deliveredAt, createdBy/Name
order_items   — orderId, productId, quantity (no price — resolved at deliver time)
```

`POST /api/orders/:id/deliver` is the only way an order becomes a real
delivery: it resolves prices, validates + commits cylinder stock changes
(same `validateStockChanges`/`commitStockChanges` helpers as regular
deliveries, §23.4), inserts the `deliveries`/`delivery_items` rows, and
updates the order to `status: 'delivered'` with `deliveryId` pointing at the
new delivery. Never write to `deliveries` directly when converting an
order — always go through this endpoint so stock/price logic stays in one
place.

### 30.2 Delivery payment status — cash-in-hand vs. pay-later

Most customers settle on the weekend; some pay on the spot. `deliveries`
has a `paymentStatus` column (`'paid' | 'pending'`, default `'pending'`)
captured explicitly at creation time (or at order-deliver time) via a
clear/pending toggle in the UI — **this is a separate concern from
`status` (fulfillment)**, which stays `'delivered'` for every row today
(no partial-fulfillment workflow exists outside Orders).

When the toggle is `'paid'`, the server **auto-creates a matching
`customer_payments` row** (`server/utils/payment.ts` →
`recordDeliveryPayment`), linked back via `customer_payments.deliveryId`.
This is the key design decision: **the existing ledger/outstanding-balance
math (sum of `customer_payments` vs sum of `deliveries.totalAmount`) never
needed to change** — marking a delivery "paid" is just a trigger that
inserts the payment row a human would otherwise have entered manually via
`/payments`. Never compute "pending amount" from `deliveries.paymentStatus`
directly — always go through the existing balance calculation; the flag is
a UI/workflow convenience, not a second source of truth.

`customer_payments.deliveryId` being non-null is also how "today's
collections" (`/payments/today`, dashboard's "Today's Amount Collected"
card) can show an itemized cylinder breakdown for that payment — manual
settle-up payments recorded via `/payments` (paying off an old pending
balance) leave `deliveryId` null and show no item breakdown, which is
correct: that payment isn't tied to one specific delivery.

### 30.3 Dashboard card semantics (don't conflate these)

| Card | Source | Why |
|---|---|---|
| Today's Deliveries | count of deliveries with `deliveryDate = today` | fulfillment activity today |
| Today's Amount Collected | sum of `customer_payments` with `paymentDate = today` | actual cash collected today — **not** sum of today's delivery totals, since a delivery made today might not be paid today, and an old pending delivery might get settled today |
| Total Pending | existing ledger `outstanding` (billed − paid, all-time) | unchanged from §25 |
| Orders | count of `orders` with `status = 'pending'` | bookings awaiting delivery |

### 30.4 Favorite item prefill

`GET /api/customers/:id/favorite-product` returns the single most-ordered
product for that customer (groupBy `delivery_items.productId`, count desc,
limit 1). `DeliveryForm.vue`/`OrderForm.vue` call this when a customer is
selected and prefill quantity 1 for that product — still fully removable
and more items can be added. This is a convenience default only, never
enforced.

### 30.5 Single shared team — no per-staff data silos

Per CLAUDE.md §21, this remains a single-agency app: any staff member can
collect payment for a delivery another staff member made. Nothing in §30
changes that — `createdBy`/`createdByName` are recorded purely for
reporting/activity-trail purposes (§30.6), never as an access boundary.
`GET /api/reports/staff/:userId/activity` is a reporting convenience filter
(see deliveries `?mine=true` precedent in §21.1), not a security gate.

---

*Last updated: 2026-06-25 — added cylinder stock, purchase module, reports overhaul, nav restructure (§21-28), Aura Gas Management dark UI redesign (§29), Orders module + delivery payment status (§30)*
<br>*Maintained by: project author — update this file whenever architecture decisions change*
