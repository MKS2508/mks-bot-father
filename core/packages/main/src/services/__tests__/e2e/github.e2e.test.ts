/**
 * GitHub Service E2E Tests.
 *
 * Tests real GitHub API endpoints and validates response types.
 * Requires GITHUB_TOKEN environment variable.
 *
 * Run with: vitest run --config vitest.e2e.config.ts
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { config } from 'dotenv'
import { resolve } from 'path'
import {
  createGitHubClient,
  DebugClient,
  validateArrayType,
  validateType,
  formatValidationResult,
  GitHubSchemas,
} from './helpers/index.js'

interface IGitHubUser {
  login: string
  id: number
  type: string
  name?: string | null
  email?: string | null
}

interface IGitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  description?: string | null
  default_branch: string
}

interface IGitHubOrg {
  login: string
  id: number
  description?: string | null
}

interface IGitHubRateLimit {
  resources: {
    core: { limit: number; remaining: number; reset: number }
    search: { limit: number; remaining: number; reset: number }
  }
}

config({ path: resolve(__dirname, '../../../../../../../apps/agent/.env') })
config({ path: resolve(__dirname, '../../../../../../../apps/agent/.env.test') })

const GITHUB_TOKEN = process.env.GITHUB_TOKEN

let client: DebugClient
let authenticatedUser: string | null = null

describe.skipIf(!GITHUB_TOKEN)('GitHub E2E Tests', () => {
  beforeAll(() => {
    if (!GITHUB_TOKEN) {
      console.warn('⚠️ Skipping GitHub E2E tests: Missing GITHUB_TOKEN')
      return
    }
    client = createGitHubClient(GITHUB_TOKEN)
  })

  describe('User Operations', () => {
    it('should get authenticated user with correct type structure', async () => {
      const response = await client.get<IGitHubUser>('/user')

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)

      const validation = validateType(response.data, GitHubSchemas.User)

      if (!validation.valid) {
        console.log('User type validation:', formatValidationResult(validation))
      }

      expect(validation.missingFields).toHaveLength(0)
      expect(validation.typeMismatches).toHaveLength(0)

      if (response.data.login) {
        authenticatedUser = response.data.login
      }
    })

    it('should return 401 for invalid token', async () => {
      const badClient = createGitHubClient('invalid-token-xyz')
      const response = await badClient.get('/user')

      expect(response.success).toBe(false)
      expect(response.status).toBe(401)
    })
  })

  describe('Repository Operations', () => {
    it('should list user repositories with correct type structure', async () => {
      if (!authenticatedUser) {
        console.log('⚠️ Skipping: No authenticated user available')
        return
      }

      const response = await client.get<IGitHubRepo[]>(
        `/users/${authenticatedUser}/repos?per_page=5&sort=updated`
      )

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)

      if (response.data.length > 0) {
        const validation = validateArrayType(response.data, GitHubSchemas.Repository, {
          maxItems: 3,
        })

        if (!validation.valid) {
          console.log('Repository type validation:', formatValidationResult(validation))
        }

        expect(validation.missingFields).toHaveLength(0)
        expect(validation.typeMismatches).toHaveLength(0)
      }
    })

    it('should return 404 for non-existent repository', async () => {
      const response = await client.get('/repos/non-existent-owner-xyz/non-existent-repo-123')

      expect(response.success).toBe(false)
      expect(response.status).toBe(404)
    })
  })

  describe('Organization Operations', () => {
    it('should list user organizations with correct type structure', async () => {
      const response = await client.get<IGitHubOrg[]>('/user/orgs?per_page=5')

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)

      if (response.data.length > 0) {
        const validation = validateArrayType(response.data, GitHubSchemas.Organization, {
          maxItems: 3,
        })

        if (!validation.valid) {
          console.log('Organization type validation:', formatValidationResult(validation))
        }

        expect(validation.missingFields).toHaveLength(0)
        expect(validation.typeMismatches).toHaveLength(0)
      }
    })
  })

  describe('Rate Limit', () => {
    it('should get rate limit information', async () => {
      const response = await client.get<IGitHubRateLimit>('/rate_limit')

      expect(response.success).toBe(true)
      expect(response.status).toBe(200)
      expect(response.data.resources).toBeDefined()
      expect(response.data.resources.core).toBeDefined()
      expect(typeof response.data.resources.core.remaining).toBe('number')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid endpoints gracefully', async () => {
      const response = await client.get('/invalid-endpoint-xyz')

      expect(response.success).toBe(false)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle non-existent user', async () => {
      const response = await client.get('/users/non-existent-user-xyz-123456')

      expect(response.success).toBe(false)
      expect(response.status).toBe(404)
    })
  })

  describe('Response Metadata', () => {
    it('should include timing information', async () => {
      const response = await client.get('/user')

      expect(response.duration).toBeGreaterThan(0)
      expect(response.duration).toBeLessThan(30000)
    })

    it('should include response headers', async () => {
      const response = await client.get('/user')

      expect(response.headers).toBeDefined()
      expect(typeof response.headers).toBe('object')
    })

    it('should include rate limit headers', async () => {
      const response = await client.get('/user')

      expect(response.headers['x-ratelimit-remaining']).toBeDefined()
    })
  })
})
