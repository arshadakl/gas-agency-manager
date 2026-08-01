/**
 * Gas Supplier Management — Daily Backup to Google Sheets
 *
 * Setup:
 *   1. Open Google Sheets → Extensions → Apps Script
 *   2. Paste this code
 *   3. Set BACKUP_URL and BACKUP_KEY in Script Properties (File → Project Properties)
 *   4. Run setupTrigger() once to create the daily 2 AM trigger
 *
 * Script Properties (set via File → Project Properties → Script Properties):
 *   BACKUP_URL  — your app's backup endpoint, e.g. https://your-app.pages.dev/api/backup
 *   BACKUP_KEY  — the same BACKUP_SECRET env var value
 *   SHEET_ID    — (optional) existing Google Sheet ID; if blank, creates a new sheet
 */

const SCRIPT_PROPS = PropertiesService.getScriptProperties()

const BACKUP_URL = SCRIPT_PROPS.getProperty('BACKUP_URL') || 'https://your-app.pages.dev/api/backup'
const BACKUP_KEY = SCRIPT_PROPS.getProperty('BACKUP_KEY') || ''

// Table keys from the backup endpoint → tab names in the sheet
const TAB_MAP = [
  { key: 'customers',          tab: 'Customers' },
  { key: 'products',           tab: 'Products' },
  { key: 'inventory',          tab: 'Inventory' },
  { key: 'deliveries',         tab: 'Deliveries' },
  { key: 'deliveryItems',      tab: 'DeliveryItems' },
  { key: 'customerPayments',   tab: 'Payments' },
  { key: 'purchases',          tab: 'Purchases' },
  { key: 'purchaseItems',      tab: 'PurchaseItems' },
  { key: 'purchasePayments',   tab: 'PurchasePayments' },
  { key: 'orders',             tab: 'Orders' },
  { key: 'orderItems',         tab: 'OrderItems' },
  { key: 'expenses',           tab: 'Expenses' },
  { key: 'accounts',           tab: 'Accounts' },
  { key: 'accountTransactions', tab: 'AccountTransactions' },
  { key: 'cylinderStock',      tab: 'CylinderStock' },
  { key: 'users',              tab: 'Users' },
]

/**
 * Main entry point — called by the time trigger daily at 2 AM IST.
 * Also runnable manually from the Apps Script editor for testing.
 */
function runBackup() {
  const startTime = new Date()

  // ── 1. Fetch backup data from the app ─────────────────────────────
  const options = {
    method: 'get',
    headers: { 'x-backup-key': BACKUP_KEY },
    muteHttpExceptions: true,
  }

  const response = UrlFetchApp.fetch(BACKUP_URL, options)
  const statusCode = response.getResponseCode()

  if (statusCode !== 200) {
    logError('Backup fetch failed', `HTTP ${statusCode}: ${response.getContentText().substring(0, 500)}`)
    return
  }

  const payload = JSON.parse(response.getContentText())
  const data = payload.data || payload

  // ── 2. Get or create the spreadsheet ──────────────────────────────
  const ss = getOrCreateSpreadsheet()

  // ── 3. Write each table to its own tab ────────────────────────────
  let totalRows = 0

  for (const { key, tab } of TAB_MAP) {
    const rows = data[key]
    if (!Array.isArray(rows) || rows.length === 0) {
      // Clear the tab if it has data but backup is empty
      clearTab(ss, tab)
      continue
    }

    totalRows += rows.length
    writeTableToTab(ss, tab, rows)
  }

  // ── 4. Write export info ──────────────────────────────────────────
  writeExportInfo(ss, data.exportedAt, totalRows, startTime)

  // ── 5. Log success ────────────────────────────────────────────────
  const duration = Math.round((new Date().getTime() - startTime.getTime()) / 1000)
  console.log(`Backup complete: ${totalRows} rows across ${TAB_MAP.length} tabs in ${duration}s`)
}

/**
 * Returns the spreadsheet to write to.
 * Uses SHEET_ID if set, otherwise creates a new one in the Drive root.
 */
function getOrCreateSpreadsheet() {
  const sheetId = SCRIPT_PROPS.getProperty('SHEET_ID')

  if (sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId)
    } catch (e) {
      console.warn(`SHEET_ID "${sheetId}" not found, creating new spreadsheet`)
    }
  }

  // Create a new spreadsheet
  const ss = SpreadsheetApp.create('Gas Supplier Backup')
  const newId = ss.getId()
  SCRIPT_PROPS.setProperty('SHEET_ID', newId)
  console.log(`Created new spreadsheet: ${ss.getUrl()} (ID: ${newId})`)
  return ss
}

/**
 * Writes an array of row objects to a tab.
 * Headers are derived from the keys of the first object.
 * If the tab doesn't exist, it's created.
 * Old data is cleared before writing (full refresh each backup).
 */
function writeTableToTab(ss, tabName, rows) {
  if (!rows.length) return

  const sheet = getOrCreateTab(ss, tabName)

  // Extract headers from all row keys (union of all keys)
  const headerSet = new Set()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      headerSet.add(key)
    }
  }
  const headers = Array.from(headerSet)

  // Build the 2D array: headers + data rows
  const sheetRows = [headers]
  for (const row of rows) {
    const r = []
    for (const h of headers) {
      let val = row[h]
      if (val === null || val === undefined) val = ''
      r.push(val)
    }
    sheetRows.push(r)
  }

  // Clear old data and write new
  sheet.clearContents()
  if (sheetRows.length > 0) {
    sheet.getRange(1, 1, sheetRows.length, headers.length).setValues(sheetRows)
  }

  // Auto-resize columns (best effort)
  for (let i = 1; i <= headers.length; i++) {
    try { sheet.autoResizeColumn(i) } catch (e) { /* ignore */ }
  }

  // Freeze header row
  sheet.setFrozenRows(1)
}

/**
 * Gets a tab by name, or creates it with a default color.
 */
function getOrCreateTab(ss, tabName) {
  let sheet = ss.getSheetByName(tabName)
  if (sheet) return sheet

  sheet = ss.insertSheet(tabName)

  // Color-code tabs
  const colors = {
    'Customers': '#4285f4',
    'Products': '#34a853',
    'Deliveries': '#ea4335',
    'Payments': '#fbbc04',
    'Purchases': '#ff6d01',
    'Expenses': '#a142f4',
    'Accounts': '#24c1e0',
    'CylinderStock': '#e8710a',
    'Users': '#9334e6',
  }
  if (colors[tabName]) {
    sheet.setTabColor(colors[tabName])
  }

  return sheet
}

/**
 * Clears a tab's contents (used when backup has no data for that table).
 */
function clearTab(ss, tabName) {
  const sheet = ss.getSheetByName(tabName)
  if (sheet) sheet.clearContents()
}

/**
 * Writes export metadata to an "ExportInfo" tab.
 */
function writeExportInfo(ss, exportedAt, totalRows, startTime) {
  const sheet = getOrCreateTab(ss, 'ExportInfo')

  sheet.clearContents()
  sheet.getRange('A1').setValue('Gas Supplier Backup — Export Info').setFontSize(14).setFontWeight('bold')
  sheet.getRange('A3').setValue('Exported At').setFontWeight('bold')
  sheet.getRange('B3').setValue(exportedAt || 'N/A')
  sheet.getRange('A4').setValue('Backup Run At').setFontWeight('bold')
  sheet.getRange('B4').setValue(startTime.toLocaleString('en-IN'))
  sheet.getRange('A5').setValue('Total Rows').setFontWeight('bold')
  sheet.getRange('B5').setValue(totalRows)
  sheet.getRange('A6').setValue('Tables').setFontWeight('bold')
  sheet.getRange('B6').setValue(TAB_MAP.length)

  sheet.autoResizeColumn(1)
  sheet.autoResizeColumn(2)
}

/**
 * Logs errors to the Apps Script console and optionally sends an email.
 */
function logError(title, details) {
  console.error(`${title}: ${details}`)

  // Optional: send email notification on failure
  // MailApp.sendEmail(Session.getActiveUser().getEmail(), `Backup Failed: ${title}`, details)
}

/**
 * Creates a daily trigger at 2 AM IST (8:30 PM UTC).
 * Run this ONCE from the Apps Script editor to set up the schedule.
 *
 * To change the time, modify the hour/minute below.
 * IST = UTC + 5:30, so 2:00 AM IST = 20:30 UTC (previous day).
 */
function setupTrigger() {
  // Delete any existing triggers for this function
  const triggers = ScriptApp.getProjectTriggers()
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'runBackup') {
      ScriptApp.deleteTrigger(trigger)
    }
  }

  // Create a daily trigger at 2:00 AM IST
  // Cloudflare Pages deploy in UTC, so we use UTC time
  ScriptApp.newTrigger('runBackup')
    .timeBased()
    .everyDays(1)
    .atHour(2)   // 2 AM IST = 8:30 PM UTC — Apps Script runs in project timezone
    .nearMinute(0)
    .create()

  console.log('Daily backup trigger created: runs at 2:00 AM IST every day')
}

/**
 * Removes all triggers for this script.
 * Run if you want to stop automatic backups.
 */
function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers()
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'runBackup') {
      ScriptApp.deleteTrigger(trigger)
    }
  }
  console.log('All backup triggers removed')
}

/**
 * Manual test function — fetches backup and writes to sheet.
 * Run this first to verify everything works before setting up the trigger.
 */
function testBackup() {
  if (!BACKUP_KEY) {
    console.error('BACKUP_KEY not set in Script Properties')
    return
  }
  runBackup()
}
