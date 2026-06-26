# DEPLOY.md — Gas Supplier Management PWA

Complete end-to-end deployment guide for Cloudflare Pages + D1 + Workers.
Follow steps **in order**. Do not skip any step.

----

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Phase 0: Local Verification](#2-phase-0-local-verification)
3. [Phase 1: Cloudflare Account Setup](#3-phase-1-cloudflare-account-setup)
4. [Phase 2: Create D1 Database](#4-phase-2-create-d1-database)
5. [Phase 3: GitHub Integration](#5-phase-3-github-integration)
6. [Phase 4: Create Pages Project](#6-phase-4-create-pages-project)
7. [Phase 5: Environment Variables](#7-phase-5-environment-variables)
8. [Phase 6: Database Migrations](#8-phase-6-database-migrations)
9. [Phase 7: First Deployment](#9-phase-7-first-deployment)
10. [Phase 8: Post-Deployment Verification](#10-phase-8-post-deployment-verification)
11. [Phase 9: Custom Domain (Optional)](#11-phase-9-custom-domain-optional)
12. [Phase 10: Monitoring & Logs](#12-phase-10-monitoring--logs)
13. [Rollback Procedures](#13-rollback-procedures)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Prerequisites

Before starting, verify you have:

```bash
✅ Node.js v20+ (run: node --version)
✅ pnpm v9+ (run: pnpm --version)
✅ wrangler CLI v3+ (run: npm install -g wrangler@latest)
✅ Git configured (run: git config --global user.email && git config --global user.name)
✅ Cloudflare account (free or paid, doesn't matter for this project)
✅ GitHub account with this repo pushed to origin
```

### Install wrangler globally (if not already)

```bash
npm install -g wrangler@latest
wrangler --version  # Should show 3.x.x
```

### Verify project builds locally

```bash
cd D:\NVPs\Gas\ Supplier\ Management
pnpm install
pnpm build
# Should complete without errors
```

---

## 2. Phase 0: Local Verification

### Step 0.1 — Test local dev server

```bash
pnpm dev
# Visit http://localhost:3000 in browser
# Should show login page + no errors in terminal
```

### Step 0.2 — Test D1 locally

```bash
npx wrangler d1 execute DB --local --command="SELECT 1 as test"
# Should return: ✅ Query executed successfully
```

### Step 0.3 — Clean git state

```bash
git status
# Should show "working tree clean" (no uncommitted changes)
# If changes exist: git add . && git commit -m "pre-deploy: final checks"
```

### Step 0.4 — Verify wrangler.toml exists

```bash
# Should exist at project root
ls -la wrangler.toml

# Contents must have:
# - name = "gas-supplier-pwa"
# - compatibility_date = "2024-09-23"
# - pages_build_output_dir = ".output/public"
# - [[d1_databases]] binding = "DB"
```

---

## 3. Phase 1: Cloudflare Account Setup

### Step 1.1 — Login to Cloudflare dashboard

```
URL: https://dash.cloudflare.com/
Login with your email/password
Accept terms if prompted
```

### Step 1.2 — Verify account type

After login, you're on the **Home** page.
- Look for "Account Home" in the top-left breadcrumb
- Your account name shows in top-right (e.g., "John Doe")
- You can use free plan (no billing needed for this project)

### Step 1.3 — Create API token (for local CLI auth)

```
Left sidebar → Settings → API Tokens & Keys (or "Account")
Look for "API Tokens" section (different from "Global API Key")
Click: "Create Token" button
```

**Configure token:**
```
Name: wrangler-deployment
Permissions:
  - Zone: [All zones] → Edit
  - Account: [All accounts] → Edit
  - Cloudflare Pages: [All accounts] → Edit
  - D1: [All accounts] → Edit
TTL: 3 months (or "Never expires" if available)
Click: "Continue to summary"
Review settings
Click: "Create Token"
```

**Copy token immediately** — you won't see it again.

Store it locally (temporarily):

```bash
# Terminal (temporary, do NOT commit)
export CLOUDFLARE_API_TOKEN="<your-token-here>"

# Verify
wrangler auth login
# Paste token when prompted
# Should show: ✅ Successfully authenticated
```

### Step 1.4 — Get account ID

```bash
wrangler whoami
# Shows:
#   Account: your-account-name
#   Account ID: 1234567890abcdef
```

**Save the Account ID** — you'll need it for `wrangler.toml`.

---

## 4. Phase 2: Create D1 Database

### Step 2.1 — Create database via Cloudflare dashboard

```
Left sidebar → Workers & Pages → D1
Click: "Create database"
```

**Form:**
```
Database name: gas-supplier-db
(Note: slug will auto-generate as "gas-supplier-db")
Billing plan: Free (unless you expect high volume)
Click: "Create"
```

Wait 30–60 seconds for creation. You'll see:
```
Database ID: <your-database-id>
Status: Ready
```

**Save the Database ID** — you'll need it next.

### Step 2.2 — Update wrangler.toml with D1 binding

```toml
# wrangler.toml (in project root)

name = "gas-supplier-pwa"
compatibility_date = "2024-09-23"
pages_build_output_dir = ".output/public"
account_id = "<paste-your-account-id-from-step-1.4>"

[[d1_databases]]
binding = "DB"
database_name = "gas-supplier-db"
database_id = "<paste-your-database-id-from-step-2.1>"

[env.production]
# Can override database for prod vs. staging if needed
# For now, keep same database for both
```

### Step 2.3 — Verify D1 binding locally

```bash
npx wrangler d1 execute DB --local --command="SELECT 1 as connection_test"
# Should show: ✅ Query executed successfully
```

---

## 5. Phase 3: GitHub Integration

### Step 5.1 — Push repo to GitHub (if not already)

```bash
git remote -v
# Should show: origin https://github.com/yourusername/gas-supplier-pwa.git

# If no remote:
git remote add origin https://github.com/yourusername/gas-supplier-pwa.git
git branch -M main
git push -u origin main
```

### Step 5.2 — Create GitHub Personal Access Token

```
GitHub → Settings → Developer settings (or click profile icon → Settings → Developer settings)
Left sidebar → Personal access tokens → Tokens (classic)
Click: "Generate new token (classic)"
```

**Configure token:**
```
Note: Cloudflare Pages Deployment
Scopes:
  ☑ repo (full control of private repositories)
  ☑ workflow (update GitHub Actions and workflows)
Expiration: 90 days
Click: "Generate token"
```

**Copy token immediately.**

(Note: Save this for later reference; Cloudflare will ask for it in Step 6.1)

---

## 6. Phase 4: Create Pages Project

### Step 6.1 — Create Pages project via Cloudflare dashboard

```
Left sidebar → Workers & Pages → Pages
Click: "Create application" → "Connect to Git"
```

**Authorize Cloudflare app:**
```
GitHub will ask permission to access your repos.
Click: "Authorize cloudflare"
Select your organization/account
Click: "Install & Authorize"
Return to Cloudflare dashboard
```

### Step 6.2 — Select repository

```
You'll see a list of your repos.
Find: gas-supplier-pwa
Click: "Begin setup"
```

### Step 6.3 — Configure Pages build

**Project name:**
```
Suggested: gas-supplier-pwa (auto-filled)
Can change if desired, but keep it short
```

**Production branch:**
```
main (correct)
```

**Framework preset:**
```
Select: Nuxt
(Cloudflare will auto-detect package.json and suggest Nuxt)
```

**Build settings** (verify auto-filled values):
```
Build command:        pnpm build
Build output dir:     .output/public
Environment:          Node.js 20.x (or latest)
```

**Click: "Save and deploy"**

Cloudflare will now build and deploy. Wait 2–5 minutes.

You'll see:
```
Deployment status: Building...
→ Installing dependencies
→ Running build script
→ Uploading artifacts
→ Deployment complete
```

**Once complete**, you'll get a **deployment URL**:
```
https://gas-supplier-pwa.<random-hash>.pages.dev
```

### Step 6.4 — Save deployment URL

```
This is your production URL for now.
Test it in a browser (you should see login page).
```

---

## 7. Phase 5: Environment Variables

### Step 7.1 — Generate session password and backup secret

```bash
# Generate two random 32+ character strings
# Use: openssl, python, or online generator

python3 -c "import secrets; print(secrets.token_hex(16))"
# Output: 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d

# Generate another for backup secret:
python3 -c "import secrets; print(secrets.token_hex(16))"
# Output: 2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e
```

Save these two values locally (NOT in git).

### Step 7.2 — Add environment variables to Cloudflare Pages

```
Cloudflare dashboard → Workers & Pages → Pages
Click: gas-supplier-pwa project
Left sidebar → Settings → Environment variables
```

**For Production environment:**

```
Click: "Add variable"

Variable 1:
  Name:  NUXT_SESSION_PASSWORD
  Value: <paste-the-first-random-string-from-7.1>
  Click: "Encrypt" (toggle to encrypt the value)
  Click: "Save"

Variable 2:
  Name:  BACKUP_SECRET
  Value: <paste-the-second-random-string-from-7.1>
  Click: "Encrypt"
  Click: "Save"
```

**Verify both variables are listed** under "Production" section.

### Step 7.3 — Update .env (local development only, NOT committed)

```bash
# .env (git-ignored, never commit)
NUXT_SESSION_PASSWORD=<same-first-string-from-7.1>
BACKUP_SECRET=<same-second-string-from-7.1>
```

Verify `.env` is in `.gitignore`:

```bash
grep "\.env" .gitignore
# Should show: *.env, .env, .env.local, etc.
```

---

## 8. Phase 6: Database Migrations

### Step 8.1 — Generate migrations (local)

```bash
npx drizzle-kit generate
# Generates server/database/migrations/0000_*.sql
# (may show schema unchanged if no changes since last generation)
```

### Step 8.2 — Apply migrations locally

```bash
npx wrangler d1 migrations apply DB --local
# Shows: ✅ Applied N migrations successfully
```

### Step 8.3 — Apply migrations to production D1

```bash
npx wrangler d1 migrations apply DB --remote
# Cloudflare will prompt:
# "This will modify your remote database. Continue? (y/n)"
# Type: y

# Shows: ✅ Applied N migrations successfully
```

### Step 8.4 — Seed initial data (production)

```bash
# Only if this is the first deployment and database is empty
# Run the seed queries from CLAUDE.md §27.3

npx wrangler d1 execute DB --remote --command="
INSERT INTO cylinder_stock (size_kg, full_count, empty_count) VALUES
  (12, 0, 0),
  (17, 0, 0),
  (33, 0, 0);
"

# Should show: ✅ Query executed successfully

# Similarly insert default products, admin user, etc.
# See CLAUDE.md §27.3 for full seed script
```

### Step 8.5 — Verify production database

```bash
npx wrangler d1 execute DB --remote --command="SELECT COUNT(*) as table_count FROM sqlite_master WHERE type='table'"
# Should show: ✅ Query executed successfully with result showing table count
```

---

## 9. Phase 7: First Deployment

### Step 9.1 — Verify local build one more time

```bash
pnpm build
# Should complete without errors
```

### Step 9.2 — Commit all changes

```bash
git status
# Should show no uncommitted changes (all CLAUDE.md, wrangler.toml, etc. committed)

# If changes exist:
git add .
git commit -m "chore(deploy): configure D1 binding and environment variables"
```

### Step 9.3 — Push to main branch

```bash
git push origin main
# Cloudflare will automatically detect the push and start a deployment
```

### Step 9.4 — Monitor deployment in Cloudflare dashboard

```
Cloudflare → Workers & Pages → Pages → gas-supplier-pwa
Click: "Deployments" tab
You'll see a new deployment in progress:

Commit: <your-commit-hash>
Status: Building → Uploading → Deployed
```

Wait 3–5 minutes for "✅ Deployed" status.

### Step 9.5 — Test production deployment

```
Once "Deployed" shows, visit:
https://gas-supplier-pwa.<random-hash>.pages.dev/

Expected:
  ✅ Page loads (login form visible)
  ✅ No 500 errors in browser console
  ✅ Network tab shows successful API calls
```

If you see errors:
- Check **Logs** in Cloudflare dashboard (see §10.1 below)
- Jump to §14 Troubleshooting

---

## 10. Phase 8: Post-Deployment Verification

### Step 10.1 — Access deployment logs

```
Cloudflare → Workers & Pages → Pages → gas-supplier-pwa
Click: "Deployments" tab
Click the latest deployment
```

You'll see:
```
Build logs:
  - Installing dependencies
  - Running: pnpm build
  - Build output: .output/public
  - Deployment status: ✅ Success

Build status: ✅ Success
```

If status is ❌ Failed, click to expand logs and see error. Jump to §14.

### Step 10.2 — Test login flow

```
1. Visit production URL
2. Try login with:
   Username: admin
   Password: (whatever you seeded in §8.4)
3. Expected: Login succeeds, redirects to dashboard
4. If 401: Check session password in Cloudflare env vars (§7.2)
```

### Step 10.3 — Test offline banner

```
1. In browser DevTools → Network tab → Throttle to Offline
2. Refresh page
3. Expected: Offline banner appears at top
4. Some data should still load (cached)
```

### Step 10.4 — Test API connectivity

```
1. Login successfully
2. Navigate to Customers page
3. Open DevTools → Network tab
4. Expected: GET /api/customers shows 200 response
5. If 404 or 500: Check server route files exist
```

### Step 10.5 — Check PWA manifest

```
1. Open DevTools → Application tab
2. Left sidebar → Manifest
3. Expected: Shows manifest.webmanifest with app name "Gas Supplier Management"
4. Install button should appear in Chrome address bar
```

### Step 10.6 — Monitor real-time logs

```
Cloudflare → Workers & Pages → Pages → gas-supplier-pwa
Left sidebar → Analytics
You'll see:
  - Requests over time
  - Error rate (should be 0% or near 0%)
  - Top paths
  - Browser/device info
```

---

## 11. Phase 9: Custom Domain (Optional)

Only do this after verifying §8–10 are all passing.

### Step 11.1 — Buy domain (if needed)

Purchase a domain from any registrar:
- Namecheap
- GoDaddy
- Google Domains
- Cloudflare Registrar

### Step 11.2 — Add domain to Cloudflare

```
Cloudflare → Home (top-left)
Click: "Add site"
Enter: yourdomain.com
Select: Free plan (if desired)
Click: "Continue"
```

Cloudflare will show nameserver instructions.
Go to your domain registrar and update nameservers to Cloudflare's.
(Process varies by registrar; registrar support can help.)

Wait 24–48 hours for DNS propagation.

### Step 11.3 — Connect domain to Pages project

```
Cloudflare → Workers & Pages → Pages → gas-supplier-pwa
Left sidebar → Custom domains
Click: "Set up a custom domain"
Enter: gas-supplier-pwa.yourdomain.com (or yourdomain.com)
Click: "Continue"
```

Cloudflare will create DNS records automatically.
Status should show ✅ Active within a few minutes.

### Step 11.4 — Test custom domain

```
Visit: https://gas-supplier-pwa.yourdomain.com
Expected: Same deployment loads (via CNAME)
SSL certificate auto-issued (green lock in browser)
```

---

## 12. Phase 10: Monitoring & Logs

### 12.1 — Real-time request logs

```
Cloudflare → Workers & Pages → Pages → gas-supplier-pwa
Left sidebar → Analytics
View: Requests, errors, bandwidth
```

### 12.2 — Database query inspection

```
Cloudflare → Workers & Pages → D1
Click: "gas-supplier-db"
Left sidebar → Query console
```

Run ad-hoc queries:
```sql
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as delivery_count FROM deliveries WHERE DATE(delivery_date) = DATE('now');
```

### 12.3 — Enable detailed error logging

In `server/middleware/01.auth.ts` or error handlers:

```typescript
// Only enable in dev, not production (too noisy)
if (process.env.NODE_ENV === 'development') {
  console.error('Request error:', {
    path: event.node.req.url,
    method: event.node.req.method,
    error: err.message,
  })
}
```

**Note:** Cloudflare Workers have a ~50ms CPU limit per request.
Long-running queries will timeout. Check logs for timeout errors.

### 12.4 — Set up alert (optional)

```
Cloudflare → Account → Notifications (or settings → Notifications)
Click: "Create"
Type: Page Rules / Alerts
Condition: Error rate > 5%
Action: Email notification
Click: "Save"
```

---

## 13. Rollback Procedures

### Scenario A: Need to revert to previous deployment

```
Cloudflare → Workers & Pages → Pages → gas-supplier-pwa
Click: "Deployments" tab
Find the deployment you want to revert to
Click: "..." menu → "Rollback to this version"
Confirm: "Rollback"
```

Cloudflare will re-deploy the old version immediately.
Your git history is NOT affected (this is a Cloudflare operation only).

### Scenario B: Need to revert git commits (if deployment config changed)

```bash
# Find the commit to revert to
git log --oneline | head -5

# Reset to that commit (loses all commits after)
git reset --hard <commit-hash>

# Force push to main (only if you're sure)
git push origin main --force-with-lease

# Cloudflare will auto-deploy the new main
```

⚠️ **Warning:** Force push can cause data loss if multiple people are pushing.
Only do this if you're the sole deployer.

### Scenario C: Database corrupted (emergency rollback)

```bash
# Export current data (if possible)
npx wrangler d1 export DB

# Delete database
# Cloudflare → D1 → gas-supplier-db → Settings → Delete
# (WARNING: This is permanent)

# Re-create database (Phase 2, Step 2.1)
# Re-apply migrations (Phase 6, Step 8.1–8.3)
# Re-seed data (Phase 6, Step 8.4)

# Re-deploy
git push origin main
```

---

## 14. Troubleshooting

### Issue: "Command failed: pnpm build"

**Check:**
```bash
# Local build works?
pnpm build

# pnpm version correct?
pnpm --version  # Should be 9+

# Lock file corrupted?
rm pnpm-lock.yaml
pnpm install
pnpm build
```

**Fix in Cloudflare:**
```
Pages → gas-supplier-pwa → Settings → Build & deployments
Build command: pnpm install && pnpm build
Build output: .output/public
Click: Save
Re-trigger deployment via: git push origin main
```

### Issue: "D1 binding not found" or "Cannot read property 'env' of undefined"

**Cause:** `wrangler.toml` missing D1 binding or environment not configured.

**Fix:**
```bash
# Verify wrangler.toml has:
# [[d1_databases]]
# binding = "DB"
# database_name = "gas-supplier-db"
# database_id = "<id>"

# Test locally:
npx wrangler d1 execute DB --local --command="SELECT 1"

# If still fails, restart dev server:
npm run dev
# (not pnpm dev — sometimes helps with binding caching)
```

### Issue: "401 Unauthorized" on /api/customers

**Cause:** Session password mismatch or cookie encryption broken.

**Fix:**
```bash
# Verify env vars in Cloudflare match local .env
Cloudflare → Pages → gas-supplier-pwa → Settings → Environment
Check: NUXT_SESSION_PASSWORD and BACKUP_SECRET present

# If changed, re-deploy:
git push origin main

# Clear browser cookies:
DevTools → Application → Cookies → Delete all
Reload page
```

### Issue: "404 Not Found" on `/api/deliveries`

**Cause:** Server route file missing or route file named incorrectly.

**Check:**
```bash
ls -la server/routes/api/deliveries/
# Should show:
# index.get.ts
# index.post.ts
```

**Fix:**
```bash
# Ensure file exists and is named correctly (NOT index.ts, must have HTTP method)
# Re-build locally: pnpm build
# Test: pnpm dev → curl http://localhost:3000/api/deliveries
# If works locally, check Cloudflare build output (logs)
```

### Issue: "Database is locked" or "disk I/O error"

**Cause:** D1 has a queue limit per account. Too many concurrent writes.

**Fix:**
```bash
# Space out writes in code (use db.batch() instead of multiple inserts)
# Reduce migration complexity if migrating large dataset

# Check D1 usage:
Cloudflare → D1 → gas-supplier-db → Analytics
Look for error spike
```

### Issue: "Service Worker not registering" or offline features not working

**Cause:** PWA manifest or service worker config broken.

**Check:**
```bash
# Verify manifest.webmanifest exists in public/
ls -la public/manifest.webmanifest

# Verify PWA config in nuxt.config.ts:
# export default defineNuxtConfig({
#   modules: ['@vite-pwa/nuxt'],
#   pwa: { ... }
# })

# Local test:
pnpm build
pnpm preview
# Visit http://localhost:3000, check DevTools → Application → Service Workers
```

**Fix:**
```bash
# Rebuild and re-deploy
pnpm build
git add .
git commit -m "fix(pwa): rebuild manifest"
git push origin main
```

### Issue: "Cloudflare Workers CPU time exceeded"

**Cause:** Route is doing expensive computation (loops, crypto, etc.) exceeding ~50ms limit.

**Fix:**
```typescript
// ❌ Wrong — too slow
async function processDeliveries() {
  for (const delivery of deliveries) {
    for (const item of delivery.items) {
      await db.insert(...).values(...)  // N×M queries = slow
    }
  }
}

// ✅ Right — use db.batch() for bulk insert
async function processDeliveries() {
  const allInserts = deliveries.flatMap(d =>
    d.items.map(i => ({ ...i, deliveryId: d.id }))
  )
  await db.batch([...allInserts])  // Single operation
}
```

### Issue: "Cannot find module '@vite-pwa/nuxt'"

**Cause:** pnpm lock file out of sync or dependency not installed.

**Fix:**
```bash
# Rebuild lock file
rm pnpm-lock.yaml
pnpm install

# Verify packages installed
ls -la node_modules/@vite-pwa/

# Rebuild locally
pnpm build

# Commit and push
git add pnpm-lock.yaml
git commit -m "chore: rebuild pnpm lock"
git push origin main
```

---

## Deployment Checklist (Pre-Go-Live)

Before marking deployment as complete:

```
PHASE 0 — LOCAL VERIFICATION
  [ ] pnpm build succeeds locally
  [ ] pnpm dev works, login functional
  [ ] No console errors

PHASE 1 — CLOUDFLARE ACCOUNT
  [ ] Account created and logged in
  [ ] wrangler CLI authenticated (wrangler whoami works)
  [ ] Account ID saved to wrangler.toml

PHASE 2 — D1 DATABASE
  [ ] Database created (gas-supplier-db)
  [ ] Database ID saved to wrangler.toml
  [ ] D1 binding works locally (wrangler d1 execute DB --local)

PHASE 3 — GITHUB
  [ ] Repo pushed to GitHub on main branch
  [ ] All commits include CLAUDE.md, wrangler.toml, drizzle.config.ts

PHASE 4 — PAGES PROJECT
  [ ] Pages project created (gas-supplier-pwa)
  [ ] GitHub repo connected via Cloudflare OAuth
  [ ] First deployment status: ✅ Success

PHASE 5 — ENVIRONMENT
  [ ] NUXT_SESSION_PASSWORD set in Cloudflare
  [ ] BACKUP_SECRET set in Cloudflare
  [ ] .env file created locally (NOT committed)

PHASE 6 — DATABASE
  [ ] Migrations generated and applied locally
  [ ] Migrations applied to production (--remote)
  [ ] Seed data inserted (admin user, products, cylinder stock)
  [ ] Database verified (SELECT COUNT(*) returns expected results)

PHASE 7 — FIRST DEPLOYMENT
  [ ] git push origin main successful
  [ ] Cloudflare build status: ✅ Success
  [ ] Deployment URL working: https://gas-supplier-pwa.*.pages.dev

PHASE 8 — POST-DEPLOYMENT
  [ ] Login works (admin user seeded in Phase 6)
  [ ] API calls return 200 (GET /api/customers)
  [ ] Offline banner appears in DevTools → Throttle to Offline
  [ ] PWA manifest loads (DevTools → Application → Manifest)
  [ ] No 500 errors in browser console
  [ ] Production logs show no errors (Cloudflare → Analytics)

PHASE 9 — CUSTOM DOMAIN (OPTIONAL)
  [ ] Domain purchased
  [ ] Domain added to Cloudflare
  [ ] Custom domain connected to Pages project
  [ ] DNS propagated and working (24–48 hours)

MONITORING
  [ ] Cloudflare Analytics page bookmarked
  [ ] Error alerts configured (optional)
  [ ] Team trained on rollback procedure
```

---

## Quick Reference: Common Commands

```bash
# Local testing
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm preview                # Preview prod build locally

# Database
npx wrangler d1 migrations apply DB --local   # Apply migrations locally
npx wrangler d1 migrations apply DB --remote  # Apply to production
npx wrangler d1 execute DB --local --command="SELECT 1"  # Query locally
npx wrangler d1 execute DB --remote --command="SELECT 1" # Query production

# Deployment
git push origin main        # Trigger Cloudflare auto-deploy
wrangler whoami             # Verify CLI auth
wrangler pages project list # List all Pages projects
```

---

## Support & Resources

| Resource | Link |
|----------|------|
| Cloudflare Pages docs | https://developers.cloudflare.com/pages/ |
| Cloudflare D1 docs | https://developers.cloudflare.com/d1/ |
| Nuxt + Cloudflare | https://nuxt.com/docs/getting-started/deployment#cloudflare-pages |
| Wrangler CLI docs | https://developers.cloudflare.com/workers/wrangler/ |
| Drizzle ORM docs | https://orm.drizzle.team/docs/get-started |

---

*Last updated: 2026-06-25*
*Maintained by: deployment team*
*Next review: After first production deployment*
