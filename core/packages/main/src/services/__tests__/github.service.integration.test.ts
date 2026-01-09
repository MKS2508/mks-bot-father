/**
 * GitHub Service Integration Tests
 *
 * Tests real GitHub API connectivity.
 * Run with: bun run test:integration
 */

import { describe, it, expect } from 'vitest'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../../../.env.test') })

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const hasCredentials = !!GITHUB_TOKEN

describe.skipIf(!hasCredentials)('GitHub API Integration Tests', () => {
  describe('Authentication', () => {
    it('should authenticate with valid token', async () => {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.login).toBeDefined()
      console.log(`Authenticated as: ${data.login}`)
    })

    it('should reject invalid token', async () => {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: 'Bearer invalid_token_12345',
          Accept: 'application/vnd.github.v3+json',
        },
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })
  })

  describe('Repository Operations', () => {
    it('should fetch public repo info', async () => {
      const response = await fetch('https://api.github.com/repos/MKS2508/mks-telegram-bot', {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.name).toBe('mks-telegram-bot')
      expect(data.is_template).toBe(true)
      console.log(`Repo: ${data.full_name}, template: ${data.is_template}`)
    })

    it('should list user repos', async () => {
      const response = await fetch('https://api.github.com/user/repos?per_page=5', {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      expect(response.ok).toBe(true)
      const repos = await response.json()
      expect(Array.isArray(repos)).toBe(true)
      console.log(`Found ${repos.length} repos (showing max 5)`)
    })

    it('should check if MKS2508 is user not org', async () => {
      const response = await fetch('https://api.github.com/users/MKS2508', {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.type).toBe('User')
    })
  })

  describe('Rate Limiting', () => {
    it('should have remaining API quota', async () => {
      const response = await fetch('https://api.github.com/rate_limit', {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.rate.remaining).toBeGreaterThan(0)
      console.log(`Rate limit: ${data.rate.remaining}/${data.rate.limit}`)
    })
  })
})
