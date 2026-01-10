/**
 * Bot Manager Agent TUI - Entry Point.
 *
 * Debugging and testing interface for the Bot Manager Agent.
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Resolve .env path relative to this file
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = resolve(__dirname, '../.env')

// Load .env
const dotenvResult = config({ path: envPath })

if (dotenvResult.error) {
  console.error('❌ Error loading .env:', dotenvResult.error.message)
} else {
  console.log(`✅ Loaded .env from: ${envPath}`)
  console.log(`📊 Variables loaded: ${Object.keys(dotenvResult.parsed || {}).length}`)
  console.log(`🔧 MODE=${process.env.MODE}`)
}

// Verify API key is configured (supports ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN)
const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN
if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY o ANTHROPIC_AUTH_TOKEN no están configuradas')
  console.error('Configura: ANTHROPIC_API_KEY=sk-ant-... o ANTHROPIC_AUTH_TOKEN=...')
  process.exit(1)
}

import { startTUI } from './app.js'

// Start the TUI
await startTUI()
