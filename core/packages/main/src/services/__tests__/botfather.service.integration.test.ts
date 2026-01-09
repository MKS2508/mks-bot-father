/**
 * BotFather Service Integration Tests
 *
 * Tests Telegram API credentials.
 * Run with: bun run test:integration
 *
 * Note: Full BotFather tests require manual 2FA/phone verification
 * so only credential validation is tested here.
 */

import { describe, it, expect } from 'vitest'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../../../.env.test') })

const TG_API_ID = process.env.TG_API_ID
const TG_API_HASH = process.env.TG_API_HASH
const hasCredentials = !!(TG_API_ID && TG_API_HASH)

describe.skipIf(!hasCredentials)('Telegram API Integration Tests', () => {
  describe('Credentials Validation', () => {
    it('should have valid API ID format', () => {
      const apiId = parseInt(TG_API_ID!, 10)
      expect(Number.isInteger(apiId)).toBe(true)
      expect(apiId).toBeGreaterThan(1000000)
      console.log(`API ID: ${apiId}`)
    })

    it('should have valid API Hash format', () => {
      expect(TG_API_HASH).toMatch(/^[a-f0-9]{32}$/)
      console.log(`API Hash: ${TG_API_HASH!.substring(0, 8)}...`)
    })

    it('should have both credentials configured', () => {
      expect(TG_API_ID).toBeDefined()
      expect(TG_API_HASH).toBeDefined()
      expect(TG_API_ID!.length).toBeGreaterThan(0)
      expect(TG_API_HASH!.length).toBe(32)
    })
  })

  describe('API Endpoint Check', () => {
    it('should reach Telegram API endpoint', async () => {
      const response = await fetch('https://api.telegram.org/', {
        method: 'GET',
      })

      expect(response.ok).toBe(true)
    })
  })
})
