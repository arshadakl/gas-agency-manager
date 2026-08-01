<script setup lang="ts">
import { FetchError } from 'ofetch'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import type { ApiResponse } from '~/types/api'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
if (user.value?.role !== 'admin') await navigateTo('/settings')

interface ImportRow {
  name: string
  phone: string
  contactPerson?: string
  area?: string
  openingBalance: number
  connectionDeposit?: number
}

interface RowIssue {
  line: number
  reason: string
}

interface ImportResult {
  inserted: number
  skipped: Array<{ name: string; phone: string; reason: string }>
  total: number
}

interface RestoreResult {
  mode: 'wipe' | 'merge'
  restored: Record<string, { table: string; restored: number; skipped: number }>
}

const raw = ref('')
const rows = ref<ImportRow[]>([])
const issues = ref<RowIssue[]>([])
const result = ref<ImportResult | null>(null)
const submitting = ref(false)
const { showToast } = useToast()

// ── Restore state ────────────────────────────────────────────────────
const restoreRaw = ref('')
const restoreData = ref<Record<string, unknown[]> | null>(null)
const restoreParseError = ref('')
const restoreMode = ref<'wipe' | 'merge'>('merge')
const restoreSubmitting = ref(false)
const restoreResult = ref<RestoreResult | null>(null)
const restoreConfirm = ref(false)

const PHONE = /^[6-9]\d{9}$/

// Handles quoted fields ("Hotel, The Grand") and escaped quotes ("") — plain
// split(',') breaks on every Excel/Sheets export that quotes commas.
function splitCsvLine(line: string): string[] {
  const cols: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cols.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  cols.push(cur.trim())
  return cols
}

// CSV columns: name, phone, contact person, area, opening balance, deposit
function parseCsv() {
  result.value = null
  const parsed: ImportRow[] = []
  const problems: RowIssue[] = []
  const seenPhones = new Set<string>()

  const lines = raw.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  lines.forEach((line, idx) => {
    const cols = splitCsvLine(line)
    const [name, phone, contactPerson, area, opening, deposit] = cols
    const cleanPhone = (phone ?? '').replace(/\D/g, '')

    // Skip the first line ONLY if it clearly looks like a header — a bad first
    // data row must surface as an error, not vanish silently.
    if (idx === 0 && !PHONE.test(cleanPhone) && /name|phone|customer|balance|deposit/i.test(line)) return

    if (!name || name.length < 2) {
      problems.push({ line: idx + 1, reason: 'Name missing or too short' })
      return
    }
    if (!PHONE.test(cleanPhone)) {
      problems.push({ line: idx + 1, reason: `Invalid phone "${phone ?? ''}"` })
      return
    }
    if (seenPhones.has(cleanPhone)) {
      problems.push({ line: idx + 1, reason: `Duplicate phone ${cleanPhone} in this file` })
      return
    }
    seenPhones.add(cleanPhone)

    const openingBalance = opening ? Number(opening.replace(/[₹,\s]/g, '')) : 0
    const connectionDeposit = deposit ? Number(deposit.replace(/[₹,\s]/g, '')) : undefined
    if (Number.isNaN(openingBalance) || openingBalance < 0) {
      problems.push({ line: idx + 1, reason: `Invalid opening balance "${opening}"` })
      return
    }
    if (connectionDeposit !== undefined && (Number.isNaN(connectionDeposit) || connectionDeposit < 0)) {
      problems.push({ line: idx + 1, reason: `Invalid deposit "${deposit}"` })
      return
    }

    parsed.push({
      name,
      phone: cleanPhone,
      contactPerson: contactPerson || undefined,
      area: area || undefined,
      openingBalance,
      connectionDeposit,
    })
  })

  rows.value = parsed
  issues.value = problems
}

function handleFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    raw.value = String(reader.result ?? '')
  }
  reader.readAsText(file)
  // Reset so picking the same file again still fires change.
  input.value = ''
}

watch(raw, parseCsv)

const totalOpening = computed(() => rows.value.reduce((sum, r) => sum + r.openingBalance, 0))

async function handleImport() {
  if (rows.value.length === 0) return
  submitting.value = true

  // Server caps a request at 1000 rows — send in chunks of 500 and aggregate,
  // so a 2000-line notebook import just works.
  const CHUNK = 500
  const combined: ImportResult = { inserted: 0, skipped: [], total: rows.value.length }
  const pending = [...rows.value]

  try {
    for (let i = 0; i < pending.length; i += CHUNK) {
      const res = await $fetch<ApiResponse<ImportResult>>('/api/admin/import/customers', {
        method: 'POST',
        body: { rows: pending.slice(i, i + CHUNK) },
      })
      combined.inserted += res.data.inserted
      combined.skipped.push(...res.data.skipped)
      // Show progress so far even if a later chunk fails.
      result.value = { ...combined }
    }
    rows.value = []
    raw.value = ''
  } catch (err: unknown) {
    const msg = err instanceof FetchError
      ? (err.data?.message ?? 'Import failed partway.')
        + ` ${combined.inserted} customers were already saved — fix the file and re-import; saved phones will be skipped automatically.`
      : 'Network error. Some customers may already be saved — re-import is safe, duplicates are skipped by phone.'
    showToast(msg, 'destructive')
  } finally {
    submitting.value = false
  }
}

// ── Restore from backup ──────────────────────────────────────────────
function parseRestoreJson() {
  restoreResult.value = null
  restoreParseError.value = ''
  restoreData.value = null
  const text = restoreRaw.value.trim()
  if (!text) return
  try {
    const parsed = JSON.parse(text)
    const d = parsed.data ?? parsed
    if (!d || typeof d !== 'object') throw new Error('Invalid backup format')
    restoreData.value = d
  } catch (e: unknown) {
    restoreParseError.value = e instanceof Error ? e.message : 'Invalid JSON'
  }
}

watch(restoreRaw, parseRestoreJson)

const restoreTableNames: Record<string, string> = {
  customers: 'Customers', products: 'Products', inventory: 'Inventory',
  deliveries: 'Deliveries', deliveryItems: 'Delivery Items',
  customerPayments: 'Payments', purchases: 'Purchases',
  purchaseItems: 'Purchase Items', purchasePayments: 'Purchase Payments',
  orders: 'Orders', orderItems: 'Order Items', expenses: 'Expenses',
  accounts: 'Accounts', accountTransactions: 'Account Transactions',
  cylinderStock: 'Cylinder Stock',
}

const restorePreview = computed(() => {
  if (!restoreData.value) return []
  return Object.entries(restoreTableNames)
    .map(([key, label]) => ({ key, label, count: Array.isArray(restoreData.value![key]) ? restoreData.value![key].length : 0 }))
    .filter((r) => r.count > 0)
})

const restoreTotalRows = computed(() => restorePreview.value.reduce((s, r) => s + r.count, 0))

const restoreBackupDate = computed(() => {
  if (!restoreData.value) return null
  const ts = restoreData.value.exportedAt
  if (typeof ts === 'string') {
    try { return new Date(ts).toLocaleString('en-IN') } catch { return ts }
  }
  return null
})

function handleRestoreFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    restoreRaw.value = String(reader.result ?? '')
  }
  reader.readAsText(file)
  input.value = ''
}

async function handleRestore() {
  if (!restoreData.value) return
  if (restoreMode.value === 'wipe') {
    restoreConfirm.value = true
    return
  }
  await doRestore()
}

async function doRestore() {
  restoreConfirm.value = false
  if (!restoreData.value) return
  restoreSubmitting.value = true
  try {
    const res = await $fetch<ApiResponse<RestoreResult>>('/api/admin/import/restore', {
      method: 'POST',
      body: { mode: restoreMode.value, data: restoreData.value },
    })
    restoreResult.value = res.data
    showToast(`Restore complete — ${res.data.mode} mode`)
  } catch (err: unknown) {
    const msg = err instanceof FetchError
      ? err.data?.message ?? 'Restore failed'
      : 'Network error during restore'
    showToast(msg, 'destructive')
  } finally {
    restoreSubmitting.value = false
  }
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-24">
    <div>
      <h1 class="text-headline-md text-on-surface">Import Customers</h1>
      <p class="text-data-secondary text-on-surface-variant mt-1">
        Bring the notebook data in. One customer per line:
      </p>
      <p class="text-data-secondary text-primary-fixed-dim mt-1 font-mono">
        name, phone, contact person, area, opening balance, deposit
      </p>
      <p class="text-data-tertiary text-on-surface-variant mt-1">
        Only name and phone are required. Opening balance = what they owe today. Rows with a phone number already in the app are skipped.
      </p>
    </div>

    <section class="bg-surface-container rounded-xl p-4 border border-outline-variant/30 flex flex-col gap-md">
      <label class="text-data-secondary text-on-surface-variant">Paste CSV rows or choose a file</label>
      <Textarea
        v-model="raw"
        rows="8"
        placeholder="Malabar Biriyani House, 9876543210, Riyas, Tuvvur, 4500, 2000&#10;Hotel Green Park, 9123456780, , Perinthalmanna, 1200,"
        class="font-mono text-sm"
      />
      <input type="file" accept=".csv,.txt" class="text-data-secondary text-on-surface-variant" @change="handleFile">
    </section>

    <!-- Parse issues -->
    <section v-if="issues.length" class="bg-error-container/10 border border-error/30 rounded-xl p-4">
      <p class="text-data-primary text-error mb-2">{{ issues.length }} line(s) will be skipped</p>
      <ul class="flex flex-col gap-1">
        <li v-for="issue in issues" :key="issue.line" class="text-data-tertiary text-on-surface-variant">
          Line {{ issue.line }}: {{ issue.reason }}
        </li>
      </ul>
    </section>

    <!-- Preview -->
    <section v-if="rows.length" class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
      <div class="flex items-center justify-between mb-md">
        <p class="text-data-primary text-on-surface">{{ rows.length }} customers ready</p>
        <p class="text-data-secondary text-on-surface-variant">Opening total: {{ formatCurrency(totalOpening) }}</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-surface-container-highest">
              <th class="py-2 pr-3 text-label-caps text-on-surface-variant uppercase">Name</th>
              <th class="py-2 pr-3 text-label-caps text-on-surface-variant uppercase">Phone</th>
              <th class="py-2 pr-3 text-label-caps text-on-surface-variant uppercase text-right">Opening</th>
              <th class="py-2 text-label-caps text-on-surface-variant uppercase text-right">Deposit</th>
            </tr>
          </thead>
          <tbody class="text-body-base">
            <tr v-for="row in rows" :key="row.phone" class="border-b border-surface-container-highest/50">
              <td class="py-2 pr-3 text-on-surface">{{ row.name }}<span v-if="row.area" class="text-on-surface-variant text-data-tertiary"> · {{ row.area }}</span></td>
              <td class="py-2 pr-3 text-on-surface-variant">{{ row.phone }}</td>
              <td class="py-2 pr-3 text-right text-on-surface">{{ formatCurrency(row.openingBalance) }}</td>
              <td class="py-2 text-right text-on-surface-variant">{{ row.connectionDeposit != null ? formatCurrency(row.connectionDeposit) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Button class="w-full mt-md" :disabled="submitting" @click="handleImport">
        <LoadingSpinner v-if="submitting" class="h-4 w-4 mr-2" />
        {{ submitting ? 'Importing...' : `Import ${rows.length} Customers` }}
      </Button>
    </section>

    <!-- Result -->
    <section v-if="result" class="bg-success/10 border border-success/30 rounded-xl p-4">
      <p class="text-data-primary text-success flex items-center gap-2">
        <Icon name="check_circle" /> {{ result.inserted }} customers imported
      </p>
      <template v-if="result.skipped.length">
        <p class="text-data-secondary text-on-surface-variant mt-2">{{ result.skipped.length }} skipped:</p>
        <ul class="flex flex-col gap-1 mt-1">
          <li v-for="(s, i) in result.skipped" :key="`${s.phone}-${i}`" class="text-data-tertiary text-on-surface-variant">
            {{ s.name }} ({{ s.phone }}) — {{ s.reason }}
          </li>
        </ul>
      </template>
      <Button variant="outline" class="mt-md" as-child>
        <NuxtLink to="/customers">View Customers</NuxtLink>
      </Button>
    </section>

    <EmptyState v-if="!rows.length && !result && !raw" title="Nothing to preview yet" description="Paste rows above or pick a CSV file exported from Excel/Sheets." />

    <!-- ═══ RESTORE FROM BACKUP ═══════════════════════════════════════ -->
    <div class="mt-lg pt-lg border-t border-outline-variant/20">
      <h2 class="text-headline-md text-on-surface mb-1">Restore from Backup</h2>
      <p class="text-data-secondary text-on-surface-variant mb-sm">
        Paste a backup JSON or upload a <span class="font-mono">.json</span> file exported from the backup endpoint.
      </p>

      <div class="flex flex-col gap-sm">
        <!-- Mode selector -->
        <div class="flex gap-sm">
          <button
            class="flex-1 rounded-xl p-3 border text-left transition-colors"
            :class="restoreMode === 'merge'
              ? 'border-primary-container bg-primary-container/10 text-on-surface'
              : 'border-outline-variant/30 bg-surface-container text-on-surface-variant'"
            @click="restoreMode = 'merge'"
          >
            <p class="text-data-primary font-medium flex items-center gap-1.5">
              <Icon name="merge" class="text-base" /> Merge
            </p>
            <p class="text-data-tertiary text-on-surface-variant mt-0.5">Skip duplicates, keep existing data</p>
          </button>
          <button
            class="flex-1 rounded-xl p-3 border text-left transition-colors"
            :class="restoreMode === 'wipe'
              ? 'border-error bg-error/10 text-on-surface'
              : 'border-outline-variant/30 bg-surface-container text-on-surface-variant'"
            @click="restoreMode = 'wipe'"
          >
            <p class="text-data-primary font-medium flex items-center gap-1.5">
              <Icon name="delete_forever" class="text-base text-error" /> Wipe &amp; Restore
            </p>
            <p class="text-data-tertiary text-on-surface-variant mt-0.5">Delete everything first, then import</p>
          </button>
        </div>

        <!-- Paste / upload -->
        <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30 flex flex-col gap-md">
          <label class="text-data-secondary text-on-surface-variant">Paste backup JSON or choose a file</label>
          <Textarea
            v-model="restoreRaw"
            rows="6"
            placeholder='{"data":{"customers":[...],"products":[...],...}}'
            class="font-mono text-sm"
          />
          <input type="file" accept=".json" class="text-data-secondary text-on-surface-variant" @change="handleRestoreFile">
        </div>

        <!-- Parse error -->
        <div v-if="restoreParseError" class="bg-error-container/10 border border-error/30 rounded-xl p-3">
          <p class="text-data-secondary text-error">{{ restoreParseError }}</p>
        </div>

        <!-- Preview -->
        <div v-if="restorePreview.length" class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
          <div class="flex items-center justify-between mb-3">
            <p class="text-data-primary text-on-surface font-medium">
              {{ restoreTotalRows.toLocaleString() }} rows across {{ restorePreview.length }} tables
            </p>
            <p v-if="restoreBackupDate" class="text-data-tertiary text-on-surface-variant">
              Backup: {{ restoreBackupDate }}
            </p>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="t in restorePreview" :key="t.key" class="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2">
              <span class="text-data-secondary text-on-surface-variant">{{ t.label }}</span>
              <span class="text-data-primary text-on-surface font-medium">{{ t.count }}</span>
            </div>
          </div>

          <div v-if="restoreMode === 'wipe'" class="mt-3 rounded-lg bg-error-container/10 border border-error/20 px-3 py-2">
            <p class="text-data-secondary text-error flex items-center gap-1.5">
              <Icon name="warning" class="text-base" />
              This will permanently delete all current data before restoring.
            </p>
          </div>

          <Button
            class="w-full mt-4"
            :class="restoreMode === 'wipe' ? 'bg-error text-on-error' : ''"
            :disabled="restoreSubmitting"
            @click="handleRestore"
          >
            <LoadingSpinner v-if="restoreSubmitting" class="h-4 w-4 mr-2" />
            {{ restoreSubmitting ? 'Restoring...' : restoreMode === 'wipe' ? 'Wipe & Restore' : 'Merge & Restore' }}
          </Button>
        </div>

        <!-- Result -->
        <div v-if="restoreResult" class="bg-success/10 border border-success/30 rounded-xl p-4">
          <p class="text-data-primary text-success flex items-center gap-2 mb-3">
            <Icon name="check_circle" />
            Restore complete ({{ restoreResult.mode }} mode)
          </p>
          <div class="grid grid-cols-2 gap-2">
            <template v-for="(entry, key) in restoreResult.restored" :key="key">
              <div v-if="entry.restored > 0 || entry.skipped > 0" class="flex items-center justify-between rounded-lg bg-surface-container px-3 py-2">
                <span class="text-data-secondary text-on-surface-variant">{{ entry.table }}</span>
                <span class="text-data-primary text-on-surface text-sm">
                  {{ entry.restored }}<span v-if="entry.skipped" class="text-on-surface-variant"> / {{ entry.skipped }} skip</span>
                </span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Wipe confirm dialog -->
    <ConfirmDialog
      :open="restoreConfirm"
      title="Wipe all data and restore?"
      message="This will permanently delete ALL current data (customers, deliveries, purchases, expenses, accounts) and replace it with the backup. This cannot be undone."
      confirm-text="Yes, Wipe & Restore"
      :destructive="true"
      :loading="restoreSubmitting"
      @confirm="doRestore"
      @cancel="restoreConfirm = false"
    />
  </div>
</template>
