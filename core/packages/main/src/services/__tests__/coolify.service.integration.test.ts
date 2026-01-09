/**
 * Coolify Service Integration Tests
 *
 * Tests real Coolify API connectivity.
 * Run with: bun run test:integration
 */

import { describe, it, expect } from 'vitest'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../../../.env.test') })

const COOLIFY_URL = process.env.COOLIFY_URL?.replace(/\/$/, '')
const COOLIFY_TOKEN = process.env.COOLIFY_TOKEN
const hasCredentials = !!(COOLIFY_URL && COOLIFY_TOKEN)

describe.skipIf(!hasCredentials)('Coolify API Integration Tests', () => {
  describe('Authentication', () => {
    it('should connect to Coolify API', async () => {
      const response = await fetch(`${COOLIFY_URL}/api/v1/servers`, {
        headers: {
          Authorization: `Bearer ${COOLIFY_TOKEN}`,
          Accept: 'application/json',
        },
      })

      expect(response.ok).toBe(true)
      console.log(`Connected to Coolify at: ${COOLIFY_URL}`)
    })

    it('should reject invalid token', async () => {
      const response = await fetch(`${COOLIFY_URL}/api/v1/servers`, {
        headers: {
          Authorization: 'Bearer invalid_token_12345',
          Accept: 'application/json',
        },
      })

      expect(response.ok).toBe(false)
    })
  })

  describe('Server Operations', () => {
    it('should list servers', async () => {
      const response = await fetch(`${COOLIFY_URL}/api/v1/servers`, {
        headers: {
          Authorization: `Bearer ${COOLIFY_TOKEN}`,
          Accept: 'application/json',
        },
      })

      expect(response.ok).toBe(true)
      const servers = await response.json()
      expect(Array.isArray(servers)).toBe(true)
      console.log(`Found ${servers.length} server(s)`)

      if (servers.length > 0) {
        console.log(`First server: ${servers[0].name || servers[0].uuid}`)
      }
    })

    it('should list applications', async () => {
      const response = await fetch(`${COOLIFY_URL}/api/v1/applications`, {
        headers: {
          Authorization: `Bearer ${COOLIFY_TOKEN}`,
          Accept: 'application/json',
        },
      })

      expect(response.ok).toBe(true)
      const apps = await response.json()
      expect(Array.isArray(apps)).toBe(true)
      console.log(`Found ${apps.length} application(s)`)
    })
  })

  describe('Project Operations', () => {
    it('should list projects', async () => {
      const response = await fetch(`${COOLIFY_URL}/api/v1/projects`, {
        headers: {
          Authorization: `Bearer ${COOLIFY_TOKEN}`,
          Accept: 'application/json',
        },
      })

      expect(response.ok).toBe(true)
      const projects = await response.json()
      expect(Array.isArray(projects)).toBe(true)
      console.log(`Found ${projects.length} project(s)`)
    })
  })
})
