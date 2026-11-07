import fs from 'node:fs'

const path = 'dist/_worker.js/wrangler.json'
if (fs.existsSync(path)) {
  try {
    const json = JSON.parse(fs.readFileSync(path, 'utf8'))
    if (json.env) {
      delete json.env
      fs.writeFileSync(path, JSON.stringify(json, null, 2))
      console.log('✓ Cleaned preview environment from dist/_worker.js/wrangler.json for Wrangler v4 compatibility')
    }
  } catch (err) {
    console.warn('Could not clean dist/_worker.js/wrangler.json:', err)
  }
}

