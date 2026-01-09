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

  describe('Application Operations (Extended)', () => {
    let testAppUuid: string | null = null

    it('should list all applications with details', async () => {
      const response = await fetch(`${COOLIFY_URL}/api/v1/applications`, {
        headers: {
          Authorization: `Bearer ${COOLIFY_TOKEN}`,
          Accept: 'application/json',
        },
      })

      expect(response.ok).toBe(true)
      const apps = await response.json()
      expect(Array.isArray(apps)).toBe(true)

      if (apps.length > 0) {
        testAppUuid = apps[0].uuid
        console.log(`First app: ${apps[0].name} (${apps[0].uuid}) - Status: ${apps[0].status}`)
      }
    })

    it('should get application details if app exists', async () => {
      if (!testAppUuid) {
        console.log('Skipping: No applications available')
        return
      }

      const response = await fetch(`${COOLIFY_URL}/api/v1/applications/${testAppUuid}`, {
        headers: {
          Authorization: `Bearer ${COOLIFY_TOKEN}`,
          Accept: 'application/json',
        },
      })

      expect(response.ok).toBe(true)
      const app = await response.json()
      expect(app.uuid).toBe(testAppUuid)
      console.log(`App details: ${app.name}, Status: ${app.status}`)
    })

    it('should get application deployment history if app exists', async () => {
      if (!testAppUuid) {
        console.log('Skipping: No applications available')
        return
      }

      const response = await fetch(`${COOLIFY_URL}/api/v1/applications/${testAppUuid}/deployments`, {
        headers: {
          Authorization: `Bearer ${COOLIFY_TOKEN}`,
          Accept: 'application/json',
        },
      })

      if (response.ok) {
        const deployments = await response.json()
        expect(Array.isArray(deployments)).toBe(true)
        console.log(`Found ${deployments.length} deployment(s) for app ${testAppUuid}`)
      } else {
        console.log(`Deployments endpoint returned ${response.status}`)
      }
    })
  })

  describe('Application Control Endpoints (Read-Only Verification)', () => {
    it('should verify start endpoint responds (OPTIONS)', async () => {
      const response = await fetch(`${COOLIFY_URL}/api/v1/applications/test-uuid/start`, {
        method: 'OPTIONS',
        headers: {
          Authorization: `Bearer ${COOLIFY_TOKEN}`,
          Accept: 'application/json',
        },
      })

      // Should get a response (either 200, 404, or 405)
      expect([200, 204, 404, 405]).toContain(response.status)
    })

    it('should verify stop endpoint responds (OPTIONS)', async () => {
      const response = await fetch(`${COOLIFY_URL}/api/v1/applications/test-uuid/stop`, {
        method: 'OPTIONS',
        headers: {
          Authorization: `Bearer ${COOLIFY_TOKEN}`,
          Accept: 'application/json',
        },
      })

      expect([200, 204, 404, 405]).toContain(response.status)
    })

    it('should verify restart endpoint responds (OPTIONS)', async () => {
      const response = await fetch(`${COOLIFY_URL}/api/v1/applications/test-uuid/restart`, {
        method: 'OPTIONS',
        headers: {
          Authorization: `Bearer ${COOLIFY_TOKEN}`,
          Accept: 'application/json',
        },
      })

      expect([200, 204, 404, 405]).toContain(response.status)
    })

    it('should verify logs endpoint responds', async () => {
      const response = await fetch(`${COOLIFY_URL}/api/v1/applications/test-uuid/logs`, {
        headers: {
          Authorization: `Bearer ${COOLIFY_TOKEN}`,
          Accept: 'application/json',
        },
      })

      // Should respond with 404 for non-existent app or 200 if exists
      expect([200, 404]).toContain(response.status)
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for non-existent application', async () => {
      const response = await fetch(`${COOLIFY_URL}/api/v1/applications/non-existent-uuid-12345`, {
        headers: {
          Authorization: `Bearer ${COOLIFY_TOKEN}`,
          Accept: 'application/json',
        },
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })

    it('should return 404 for non-existent server', async () => {
      const response = await fetch(`${COOLIFY_URL}/api/v1/servers/non-existent-uuid-12345`, {
        headers: {
          Authorization: `Bearer ${COOLIFY_TOKEN}`,
          Accept: 'application/json',
        },
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })
})
