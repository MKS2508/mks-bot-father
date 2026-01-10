/**
 * Coolify Service E2E Tests.
 *
 * Tests real Coolify API endpoints and validates response types.
 * Requires COOLIFY_URL and COOLIFY_TOKEN environment variables.
 *
 * Run with: vitest run --config vitest.e2e.config.ts
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { config } from 'dotenv'
import { resolve } from 'path'
import {
  createCoolifyClient,
  DebugClient,
  validateArrayType,
  validateType,
  formatValidationResult,
  CoolifySchemas,
} from './helpers/index.js'
import type {
  ICoolifyServer,
  ICoolifyApplication,
  ICoolifyDeployment,
  ICoolifyProject,
  ICoolifyTeam,
} from '../../../types/coolify.types.js'

config({ path: resolve(__dirname, '../../../../../../../apps/agent/.env') })
config({ path: resolve(__dirname, '../../../../../../../apps/agent/.env.test') })

const COOLIFY_URL = process.env.COOLIFY_URL?.replace(/\/$/, '')
const COOLIFY_TOKEN = process.env.COOLIFY_TOKEN

let client: DebugClient
let testServerUuid: string | null = null
let testAppUuid: string | null = null

describe.skipIf(!COOLIFY_URL || !COOLIFY_TOKEN)('Coolify E2E Tests', () => {
  beforeAll(() => {
    if (!COOLIFY_URL || !COOLIFY_TOKEN) {
      console.warn('⚠️ Skipping Coolify E2E tests: Missing COOLIFY_URL or COOLIFY_TOKEN')
      return
    }
    client = createCoolifyClient(COOLIFY_URL, COOLIFY_TOKEN)
  })

  describe('Server Operations', () => {
    it('should list all servers with correct type structure', async () => {
      const response = await client.get<ICoolifyServer[]>('/servers')

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)

      if (response.data.length > 0) {
        testServerUuid = response.data[0].uuid

        const validation = validateArrayType(response.data, CoolifySchemas.Server, {
          maxItems: 3,
        })

        if (!validation.valid) {
          console.log('Server type validation:', formatValidationResult(validation))
        }

        expect(validation.missingFields).toHaveLength(0)
        expect(validation.typeMismatches).toHaveLength(0)
      }
    })

    it('should get server details by UUID', async () => {
      if (!testServerUuid) {
        console.log('⚠️ Skipping: No server UUID available')
        return
      }

      const response = await client.get<ICoolifyServer>(`/servers/${testServerUuid}`)

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)

      const validation = validateType(response.data, CoolifySchemas.Server)

      if (!validation.valid) {
        console.log('Server detail type validation:', formatValidationResult(validation))
      }

      expect(validation.missingFields).toHaveLength(0)
      expect(validation.typeMismatches).toHaveLength(0)
      expect(response.data.uuid).toBe(testServerUuid)
    })

    it('should return 404 for non-existent server', async () => {
      const response = await client.get('/servers/non-existent-uuid-12345')

      expect(response.success).toBe(false)
      expect(response.status).toBe(404)
    })
  })

  describe('Application Operations', () => {
    it('should list all applications with correct type structure', async () => {
      const response = await client.get<ICoolifyApplication[]>('/applications')

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)

      if (response.data.length > 0) {
        testAppUuid = response.data[0].uuid

        const validation = validateArrayType(response.data, CoolifySchemas.Application, {
          maxItems: 3,
        })

        if (!validation.valid) {
          console.log('Application type validation:', formatValidationResult(validation))
        }

        expect(validation.missingFields).toHaveLength(0)
        expect(validation.typeMismatches).toHaveLength(0)
      }
    })

    it('should get application details by UUID', async () => {
      if (!testAppUuid) {
        console.log('⚠️ Skipping: No application UUID available')
        return
      }

      const response = await client.get<ICoolifyApplication>(`/applications/${testAppUuid}`)

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)

      const validation = validateType(response.data, CoolifySchemas.Application)

      if (!validation.valid) {
        console.log('Application detail type validation:', formatValidationResult(validation))
      }

      expect(validation.missingFields).toHaveLength(0)
      expect(validation.typeMismatches).toHaveLength(0)
      expect(response.data.uuid).toBe(testAppUuid)
    })

    it('should return 404 for non-existent application', async () => {
      const response = await client.get('/applications/non-existent-uuid-12345')

      expect(response.success).toBe(false)
      expect(response.status).toBe(404)
    })
  })

  describe('Project Operations', () => {
    it('should list all projects with correct type structure', async () => {
      const response = await client.get<ICoolifyProject[]>('/projects')

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)

      if (response.data.length > 0) {
        const validation = validateArrayType(response.data, CoolifySchemas.Project, {
          maxItems: 3,
        })

        if (!validation.valid) {
          console.log('Project type validation:', formatValidationResult(validation))
        }

        expect(validation.missingFields).toHaveLength(0)
        expect(validation.typeMismatches).toHaveLength(0)
      }
    })
  })

  describe('Team Operations', () => {
    it('should list all teams with correct type structure', async () => {
      const response = await client.get<ICoolifyTeam[]>('/teams')

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)

      if (response.data.length > 0) {
        const validation = validateArrayType(response.data, CoolifySchemas.Team, {
          maxItems: 3,
        })

        if (!validation.valid) {
          console.log('Team type validation:', formatValidationResult(validation))
        }

        expect(validation.missingFields).toHaveLength(0)
        expect(validation.typeMismatches).toHaveLength(0)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid endpoints gracefully', async () => {
      const response = await client.get('/invalid-endpoint-xyz')

      expect(response.success).toBe(false)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should include error information in failed responses', async () => {
      const response = await client.get('/applications/invalid-uuid')

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })
  })

  describe('Response Metadata', () => {
    it('should include timing information', async () => {
      const response = await client.get('/servers')

      expect(response.duration).toBeGreaterThan(0)
      expect(response.duration).toBeLessThan(30000)
    })

    it('should include response headers', async () => {
      const response = await client.get('/servers')

      expect(response.headers).toBeDefined()
      expect(typeof response.headers).toBe('object')
    })
  })
})
