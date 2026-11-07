# Developer Guide

This project is a Nuxt 3 PWA for gas supplier management. It runs mostly as a browser app, but it also has Nuxt server API routes that run on Cloudflare Pages Functions/Workers and talk to Cloudflare D1.

## Big Picture

```text
Browser UI
  pages/*.vue
  components/*.vue
  composables/use*.ts
        |
        | $fetch('/api/...')
        v
Nuxt Nitro server routes
  server/routes/api/**/*.ts
        |
        | useDB(event)
        v
Cloudflare D1 database
  server/database/schema.ts
  server/database/migrations/*.sql
```

Key idea: `pages/` and `components/` are frontend. `server/routes/api/` is backend. `server/database/` defines and migrates the database.

## Tech Stack

- Nuxt 3: app framework, routing, layouts, server API routes.
- Vue 3: UI components and reactivity.
- Tailwind CSS: styling utility classes.
- Nuxt Nitro: server engine behind `/server`.
- Cloudflare Pages: deployment target for the built app.
- Cloudflare Workers/Pages Functions: runtime for server API routes.
- Cloudflare D1: SQLite-like database hosted by Cloudflare.
- Drizzle ORM: typed database queries and schema.
- `nuxt-auth-utils`: cookie/session auth.
- `@vite-pwa/nuxt`: PWA manifest, service worker, offline caching.

## Important Config Files

### `package.json`

Common commands:

```bash
pnpm dev
pnpm build
pnpm preview
pnpm typecheck
pnpm db:generate
pnpm db:migrate:local
pnpm db:migrate
pnpm deploy
```

`pnpm dev` runs Nuxt locally.

`pnpm build` builds app into `dist/` for Cloudflare Pages.

`pnpm preview` runs built `dist/` through Wrangler Pages dev.

`pnpm db:migrate:local` applies D1 migrations to local Wrangler database.

`pnpm db:migrate` applies D1 migrations to remote production database.

### `nuxt.config.ts`

Important settings:

- `ssr: false`: app is rendered in browser as SPA.
- `modules`: Tailwind, PWA, auth utilities.
- `nitro.preset: 'cloudflare-pages'`: build server routes for Cloudflare Pages.
- `nitro.cloudflare.nodeCompat: true`: enable Node compatibility in Cloudflare runtime.
- `runtimeConfig`: private server config such as session password and backup secret.
- `pwa`: manifest and API runtime cache rules.

### `wrangler.toml`

Cloudflare deployment/runtime config:

- `pages_build_output_dir = "dist"` tells Cloudflare Pages where Nuxt build output lives.
- `[[d1_databases]]` binds production D1 database to `DB`.
- `[env.preview]` binds separate preview D1 database to `DB`.

Backend code reads this binding through:

```ts
event.context.cloudflare.env.DB
```

That happens inside `server/database/index.ts`.

### `DEPLOY.md` and `CLAUDE.md`

These files contain useful history and rules, but they are partly stale.

Known conflicts with current code:

- `DEPLOY.md` mentions `.output/public` in several places, but current `wrangler.toml` and deploy script use `dist`.
- `DEPLOY.md` says Wrangler v3+, but current `package.json` uses Wrangler `4.104.0`.
- `CLAUDE.md` mentions older routes such as prices/monthly/outstanding reports that are not present in the current repo.
- Current source of truth is actual code plus `package.json`, `nuxt.config.ts`, and `wrangler.toml`.

Use `CLAUDE.md` for business intent, but verify against files before changing code.

## Folder Map

### `pages/`

Nuxt file-based frontend routes.

Examples:

- `pages/index.vue` -> `/`
- `pages/login.vue` -> `/login`
- `pages/customers/index.vue` -> `/customers`
- `pages/customers/[id].vue` -> `/customers/:id`
- `pages/orders/new.vue` -> `/orders/new`

Most private pages include:

```ts
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})
```

This means page uses `layouts/default.vue` and checks login before opening.

### `layouts/`

Page shells.

- `layouts/default.vue`: main mobile app shell with header, bottom nav, offline banner, toasts.
- `layouts/auth.vue`: likely login/auth shell.

`app.vue` wraps every page with `<NuxtLayout>` and `<NuxtPage>`.

### `components/`

Reusable UI pieces, grouped by feature:

- `components/customers`
- `components/deliveries`
- `components/orders`
- `components/payments`
- `components/reports`
- `components/settings`
- `components/stock`
- `components/shared`
- `components/ui`

`components/ui` contains lower-level UI building blocks like `Button`, `Card`, `Input`, `Select`.

### `composables/`

Reusable frontend logic. In Nuxt, files named `useSomething.ts` are auto-imported.

Examples:

- `useAuth.ts`: login, logout, user management.
- `useCustomers.ts`: fetch/create/update customers.
- `useDeliveries.ts`: delivery API calls.
- `useInventory.ts`: stock API calls.
- `useOfflineQueue.ts`: stores offline delivery work and syncs later.
- `useToast.ts`: toast state.
- `useTheme.ts`: theme setup.

Pattern:

```ts
export function useCustomers() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCustomers() {
    const result = await $fetch('/api/customers')
    return result.data
  }

  return { fetchCustomers, loading, error }
}
```

Pages use composables instead of calling `$fetch` everywhere.

### `server/routes/api/`

Backend API routes. Nuxt maps file names to URLs and HTTP methods.

Examples:

- `server/routes/api/customers/index.get.ts` -> `GET /api/customers`
- `server/routes/api/customers/index.post.ts` -> `POST /api/customers`
- `server/routes/api/customers/[id]/index.get.ts` -> `GET /api/customers/:id`
- `server/routes/api/orders/[id]/deliver.post.ts` -> `POST /api/orders/:id/deliver`

Each API route usually does this:

1. Check auth/role.
2. Parse query or body.
3. Get DB connection.
4. Run Drizzle query.
5. Return `{ data: ... }` or `{ data: [...], total }`.

Example:

```ts
export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])
  const body = await parseBody(event, CustomerSchema)
  const db = useDB(event)
  const [created] = await db.insert(customers).values(body).returning()
  return { data: created }
})
```

Current API surface:

```text
/api/auth: login, logout, me
/api/customers: list, create, detail, update, ledger, opening balance, favorite product
/api/deliveries: list, create, update, collect payment
/api/orders: list, create, detail, deliver, cancel
/api/payments: list, create
/api/products: list, create, update, delete
/api/inventory: product inventory, cylinder stock, movements, stock-in, adjustment, collect empties
/api/purchases: list, create, detail, update, delete
/api/reports: summary, cylinders, customers, empties, payments, procurement, staff, staff activity
/api/admin/clear: clear customers, deliveries, purchases, stock
/api/backup: full backup snapshot
```

### `server/database/`

Database layer.

- `schema.ts`: Drizzle table definitions.
- `index.ts`: creates DB client from Cloudflare D1 binding.
- `migrations/*.sql`: real SQL migrations that change D1 database.

`schema.ts` is TypeScript description of tables. Migrations are what actually update database.

Important tables:

- `users`: app users and roles.
- `customers`: customer records.
- `products`: cylinder/accessory products.
- `deliveries` and `delivery_items`: delivered products.
- `customer_payments`: customer payment records.
- `cylinder_stock`: current full/empty stock by cylinder size.
- `stock_movements`: immutable stock audit log.
- `purchases` and `purchase_items`: supplier purchases.
- `orders` and `order_items`: bookings before delivery.

Important schema notes:

- Cylinder sizes are only `12`, `17`, and `33`.
- `cylinder_stock` is source of truth for full/empty cylinders.
- `stock_movements` is the stock audit log.
- `inventory` still exists for product/accessory quantity tracking.
- `deliveries.paymentStatus` is workflow state, not ledger source of truth.
- `deliveries.amountCollected` tracks how much of that specific delivery has been allocated/settled.
- Ledger balance comes from opening balance + delivered totals - customer payments.

### `server/utils/`

Backend helpers:

- `auth.ts`: `requireUser`, `requireRole`.
- `validate.ts`: Zod body/query parsing.
- `password.ts`: password hashing/verification.
- `stock.ts`: stock mutations.
- `payment.ts`: payment allocation/status logic.
- `response.ts`, `report-helpers.ts`, `id.ts`: shared helpers.

Critical backend helpers:

`server/utils/stock.ts`:

- `validateStockChanges`: checks current `cylinder_stock` before writes.
- `commitStockChanges`: updates `cylinder_stock` and inserts `stock_movements`.
- `applyStockChanges`: validate + commit wrapper for simple stock actions.

Cloudflare D1 with this Drizzle setup does not provide normal transaction rollback in these routes. That is why delivery and purchase routes validate stock before inserting parent records.

Stock movement meanings:

```text
Delivery:        full decreases, empty increases
Purchase:        full increases, empty decreases
Collect empties: full unchanged, empty increases
Adjustment:      manual full/empty delta
```

`server/utils/payment.ts`:

- `deriveStatus`: converts amount collected vs total into `pending`, `partial`, or `paid`.
- `allocatePaymentFifo`: applies money oldest-delivery-first.
- `allocatePaymentToDelivery`: applies money to one delivery only, capped by remaining due.
- `recordCustomerPayment`: one entry point for inserting payment and allocating it.

Do not calculate customer balance directly from `paymentStatus`; use payment rows.

### `utils/`

Frontend/shared helpers:

- `validators.ts`: Zod schemas used by routes/forms.
- `formatters.ts`: display formatting.
- `i18n.ts`: translations.
- `outstanding.ts`: customer outstanding severity.
- `whatsapp.ts`: WhatsApp URL/message helpers.

### `types/`

Shared TypeScript types:

- `api.ts`: standard API response shapes.
- `database.ts`: app/domain database types.
- `auth.d.ts`: auth session typing.
- `index.ts`: common domain types.

## Request Flow Example: Customers List

User opens `/customers`.

1. `pages/customers/index.vue` renders screen and calls `useCustomers()`.
2. On mount, page calls `fetchCustomers()`.
3. `composables/useCustomers.ts` calls:

   ```ts
   $fetch('/api/customers')
   ```

4. Nuxt sends request to `server/routes/api/customers/index.get.ts`.
5. Server route calls:

   ```ts
   await requireRole(event, ['admin', 'delivery', 'viewer'])
   ```

6. Server route gets DB:

   ```ts
   const db = useDB(event)
   ```

7. Drizzle queries `customers`, `deliveries`, and `customerPayments`.
8. Server returns:

   ```ts
   { data, total: data.length }
   ```

9. Composable returns `result.data`.
10. Page stores customers in `customers.value`.
11. Template renders `<CustomerCard>` for each customer.

## Request Flow Example: New Delivery

User creates a direct delivery from `/deliveries/new`.

1. Page/component builds payload with customer, date, items, total amount, optional collected amount.
2. `useDeliveries().createDelivery()` calls `POST /api/deliveries`.
3. Server route checks role `admin` or `delivery`.
4. Body is parsed with `DeliverySchema`.
5. Server loads products and calculates cylinder stock changes.
6. `validateStockChanges()` runs before delivery insert.
7. Server inserts delivery and delivery items.
8. Accessory product quantities update `inventory`.
9. `commitStockChanges()` updates `cylinder_stock` and inserts `stock_movements`.
10. If amount was collected, `recordCustomerPayment()` inserts payment and allocates FIFO.

Direct deliveries are created as `status: 'delivered'`. Current code has no draft delivery workflow.

## Request Flow Example: Order To Delivery

Orders are bookings. They do not affect stock or ledger until delivered.

`POST /api/orders/:id/deliver`:

1. Checks role `admin` or `delivery`.
2. Optimistically claims pending order by setting `status = 'delivered'`.
3. Loads order items and products.
4. Validates stock changes.
5. Creates delivery and delivery items.
6. Updates accessory inventory.
7. Commits cylinder stock changes.
8. Optionally records customer payment.
9. Links order to delivery using `deliveryId`.

Because D1 rollback is not available here, the route has a best-effort catch block that resets the order back to pending if later work fails.

## Request Flow Example: Purchase

User records supplier purchase from `/stock/purchases/new`.

1. `usePurchases()` calls `POST /api/purchases`.
2. Server validates body with `PurchaseSchema`.
3. Payment status is derived from `amountPaid` and `totalAmount`.
4. Stock changes are calculated:

   ```text
   receivedQty -> fullChange positive
   returnedQty -> emptyChange negative
   ```

5. Stock validates before purchase row insert.
6. Server inserts purchase and purchase items.
7. Server commits stock movement.

## Auth Flow

Frontend:

- `middleware/auth.ts` protects pages.
- `useAuth.ts` performs login/logout and reads session with `useUserSession()`.

Backend:

- `server/middleware/01.auth.ts` protects `/api/*` routes.
- Public API paths are currently `/api/auth/login` and `/api/backup`.
- `server/utils/auth.ts` provides `requireUser` and `requireRole`.

Login flow:

1. Login page calls `useAuth().login(username, password)`.
2. `POST /api/auth/login` looks up user in D1.
3. Password is verified.
4. `setUserSession()` writes session cookie.
5. Browser calls `refreshSession()`.
6. App now has `user` and `loggedIn`.

Roles:

- `admin`
- `delivery`
- `viewer`

Server routes decide what each role can do.

Role summary from current code:

- `admin`: full access, including user management and admin clear endpoints.
- `delivery`: can create operational records like customers, deliveries, orders, payments, purchases, stock adjustments.
- `viewer`: mostly read-only, but exact access depends route-by-route.

Always check server `requireRole(...)`; frontend role checks only hide/show UI.

## PWA And Offline Flow

PWA config lives in `nuxt.config.ts`.

Runtime API caching:

- `/api/customers`: `StaleWhileRevalidate`
- `/api/products`: `CacheFirst`
- `/api/deliveries`: `StaleWhileRevalidate`

Offline delivery queue lives in `composables/useOfflineQueue.ts`.

How it works:

1. `useDeliveries().createDelivery()` tries `POST /api/deliveries`.
2. If failure is not an HTTP `FetchError`, it queues payload in IndexedDB.
3. `layouts/default.vue` watches online status.
4. When app comes online, `syncPendingDeliveries()` posts queued deliveries one by one.
5. Synced items are removed from IndexedDB.

Queue storage:

```text
IndexedDB database: gas-supplier-offline
Object store: pending_deliveries
```

Risk note: queued delivery payload must match current `DeliverySchema`. If delivery schema changes, update offline queue too.

## Cloudflare Workers / Pages Functions Basics

You are not writing a separate `worker.ts` file. Nuxt Nitro generates Cloudflare-compatible server output during build.

In this project:

- Frontend assets go into `dist/`.
- Server API routes become Cloudflare Pages Functions.
- Wrangler provides Cloudflare runtime locally/for deploy.
- D1 is available as binding name `DB`.

This line in `wrangler.toml` creates binding:

```toml
[[d1_databases]]
binding = "DB"
```

This line in code reads binding:

```ts
cloudflare.env.DB
```

So if you see `useDB(event)`, think: "connect this API request to Cloudflare D1".

## Database Change Workflow

When changing database structure:

1. Edit `server/database/schema.ts`.
2. Generate migration:

   ```bash
   pnpm db:generate
   ```

3. Check generated SQL in `server/database/migrations/`.
4. Apply locally:

   ```bash
   pnpm db:migrate:local
   ```

5. Test app.
6. Apply remote when ready:

   ```bash
   pnpm db:migrate
   ```

Do not edit production DB manually unless you know exact impact.

## How To Add A New Feature

Example: add "suppliers" feature.

1. Add table in `server/database/schema.ts`.
2. Generate and apply migration.
3. Add API routes:

   ```text
   server/routes/api/suppliers/index.get.ts
   server/routes/api/suppliers/index.post.ts
   server/routes/api/suppliers/[id]/index.patch.ts
   ```

4. Add validation schema in `utils/validators.ts`.
5. Add types in `types/database.ts` if needed.
6. Add composable:

   ```text
   composables/useSuppliers.ts
   ```

7. Add pages:

   ```text
   pages/suppliers/index.vue
   pages/suppliers/[id].vue
   ```

8. Add components:

   ```text
   components/suppliers/SupplierForm.vue
   components/suppliers/SupplierCard.vue
   ```

9. Add nav link if users need access from main UI.
10. Run typecheck/build.

## Common Nuxt Concepts In This Codebase

### `ref`

Reactive single value:

```ts
const loading = ref(false)
loading.value = true
```

Template can read `loading` directly.

### `computed`

Derived reactive value:

```ts
const filteredCustomers = computed(() => customers.value.filter(...))
```

### `onMounted`

Runs after page/component loads in browser:

```ts
onMounted(load)
```

### `watch`

Runs when value changes:

```ts
watch(search, () => load())
```

### `$fetch`

Nuxt wrapper around fetch:

```ts
await $fetch('/api/customers')
```

### `definePageMeta`

Per-page layout/middleware config:

```ts
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})
```

### Auto Imports

Nuxt auto-imports composables and many framework functions. That is why files can use `ref`, `useRoute`, `useCustomers`, or `defineEventHandler` without explicit imports in many places.

## Local Development Checklist

```bash
pnpm install
pnpm db:migrate:local
pnpm dev
```

Open Nuxt dev URL shown in terminal.

For Cloudflare-like preview:

```bash
pnpm build
pnpm preview
```

Use preview when debugging D1/Cloudflare runtime behavior.

Use `pnpm dev` for fast Nuxt development. Use `pnpm build && pnpm preview` when debugging Cloudflare/D1 runtime behavior.

## Production Deploy Checklist

```bash
pnpm typecheck
pnpm build
pnpm db:migrate
pnpm deploy
```

Check environment variables in Cloudflare:

- `NUXT_SESSION_PASSWORD`
- `BACKUP_SECRET`

Never commit real secrets from `.env`.

Current deploy command is:

```bash
nuxt build && wrangler pages deploy dist
```

So current build output expectation is `dist`, not `.output/public`.

## Backup Endpoint

`GET /api/backup` bypasses normal session auth but requires:

```text
x-backup-key: BACKUP_SECRET_VALUE
```

It exports customers, products, inventory, deliveries, delivery items, customer payments, users without password hash, purchases, purchase items, cylinder stock, stock movements, orders, order items, and `exportedAt`.

This endpoint is intended for Google Sheets or external backup automation.

## Design System Notes

Current app is mobile-first and built around a fixed dark "Aura Gas" design.

- Max app width is `480px` in default layout.
- Bottom nav has five tabs: Home, Deliveries, Stock, Customers, Reports.
- Settings is in header gear on top-level routes.
- Icons use `components/shared/Icon.vue`, backed by Material Symbols.
- `components/ui/select/*` still uses Lucide internally; treat those files as vendor UI.
- Color tokens live in `tailwind.config.ts`.
- Main font is Hanken Grotesk from `assets/css/main.css`.

Prefer existing design tokens:

```text
bg-surface
bg-surface-container
text-on-surface
text-on-surface-variant
text-primary-fixed-dim
border-outline-variant/30
```

## Current Feature Areas

- Dashboard: `pages/index.vue`, KPI cards, today's deliveries, today's collection, pending total, stock summary.
- Customers: customer CRUD, ledger, opening balance, outstanding filter, favorite product lookup.
- Deliveries: direct delivered records, stock changes, optional payment, per-delivery collection.
- Orders: pending bookings converted into deliveries.
- Payments: ledger source of truth, FIFO allocation, today's payments page.
- Stock: cylinder stock, movement log, adjustments, collect empties.
- Purchases: supplier purchase history and stock updates.
- Reports: summary, cylinders, customers, payments, empties, procurement, staff.
- Settings: user management, products, account password.

## Files To Read First

Read in this order:

1. `nuxt.config.ts`
2. `wrangler.toml`
3. `app.vue`
4. `layouts/default.vue`
5. `middleware/auth.ts`
6. `server/middleware/01.auth.ts`
7. `composables/useAuth.ts`
8. `server/routes/api/auth/login.post.ts`
9. `server/database/schema.ts`
10. `pages/customers/index.vue`
11. `composables/useCustomers.ts`
12. `server/routes/api/customers/index.get.ts`

That path teaches config, layout, auth, frontend data loading, API route, and database access.
