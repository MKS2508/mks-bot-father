#!/usr/bin/env bun
/**
 * GitHub Debug Script.
 *
 * Tests GitHub API endpoints and validates type correctness.
 * Captures real API responses for type analysis.
 *
 * Usage: bun run src/debug/github-debug.ts
 *
 * Required environment variables:
 * - GITHUB_TOKEN: GitHub personal access token
 */

import { config } from 'dotenv'
import { resolve, join } from 'path'
import { mkdirSync, writeFileSync, existsSync, appendFileSync } from 'fs'
import { homedir } from 'os'
import logger, { component } from '@mks2508/better-logger'

config({ path: resolve(__dirname, '../../../../core/packages/main/.env.test') })
config({ path: resolve(__dirname, '../../../.env.test') })
config({ path: resolve(__dirname, '../../../.env') })

logger.preset('cyberpunk')
logger.showTimestamp()

const log = component('GitHubDebug')

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_API = 'https://api.github.com'
const OUTPUT_DIR = resolve(__dirname, '../../../debug-output')
const LOG_DIR = join(homedir(), '.config', 'mks-bot-father', 'logs')

interface IDebugResult {
  method: string
  endpoint: string
  httpMethod: string
  requestBody?: unknown
  responseStatus: number
  responseHeaders: Record<string, string>
  responseBody: unknown
  duration: number
  error?: string
  fieldAnalysis?: {
    actualFields: string[]
    typeInfo: Record<string, string>
  }
}

interface ILogEntry {
  ts: string
  level: 'DBG' | 'INF' | 'WRN' | 'ERR'
  src: string
  msg: string
  data?: Record<string, unknown>
}

const results: IDebugResult[] = []

function getLogFile(): string {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true })
  }
  return join(LOG_DIR, `debug-github-${new Date().toISOString().split('T')[0]}.jsonl`)
}

function logToFile(level: ILogEntry['level'], msg: string, data?: Record<string, unknown>): void {
  try {
    const entry: ILogEntry = {
      ts: new Date().toISOString(),
      level,
      src: 'GITHUB_DEBUG',
      msg,
      data
    }
    appendFileSync(getLogFile(), JSON.stringify(entry) + '\n')
  } catch {
    // Silently fail
  }
}

function analyzeFields(data: unknown): IDebugResult['fieldAnalysis'] | undefined {
  if (!data || typeof data !== 'object') return undefined

  const items = Array.isArray(data) ? data : [data]
  if (items.length === 0) return undefined

  const sample = items[0] as Record<string, unknown>

  return {
    actualFields: Object.keys(sample),
    typeInfo: Object.fromEntries(
      Object.entries(sample).map(([k, v]) => [
        k,
        v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v,
      ])
    ),
  }
}

async function debugRequest(
  name: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<IDebugResult> {
  const startTime = Date.now()
  const url = `${GITHUB_API}${endpoint}`

  log.info(`[${name}] ${options.method || 'GET'} ${endpoint}`)
  logToFile('INF', `Request: ${name}`, { endpoint, method: options.method || 'GET' })

  if (options.body) {
    log.debug(`Body: ${options.body}`)
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const duration = Date.now() - startTime
    const text = await response.text()
    let body: unknown

    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }

    const result: IDebugResult = {
      method: name,
      endpoint,
      httpMethod: options.method || 'GET',
      requestBody: options.body ? JSON.parse(options.body as string) : undefined,
      responseStatus: response.status,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBody: body,
      duration,
    }

    if (response.ok) {
      result.fieldAnalysis = analyzeFields(body)
      log.success(`${name}: ${response.status} (${duration}ms)`)
      logToFile('INF', `Response OK: ${name}`, {
        status: response.status,
        duration_ms: duration,
        fieldsCount: result.fieldAnalysis?.actualFields.length
      })

      const rateLimit = response.headers.get('x-ratelimit-remaining')
      if (rateLimit) {
        log.info(`Rate limit remaining: ${rateLimit}`)
      }
    } else {
      result.error =
        typeof body === 'object' && body !== null && 'message' in body
          ? (body as { message: string }).message
          : text
      log.error(`${name}: ${response.status} - ${result.error}`)
      logToFile('ERR', `Request failed: ${name}`, {
        status: response.status,
        error: result.error,
        duration_ms: duration
      })
    }

    results.push(result)
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    const result: IDebugResult = {
      method: name,
      endpoint,
      httpMethod: options.method || 'GET',
      responseStatus: 0,
      responseHeaders: {},
      responseBody: null,
      duration,
      error: error instanceof Error ? error.message : String(error),
    }

    log.error(`${name}: NETWORK ERROR - ${result.error}`)
    logToFile('ERR', `Network error: ${name}`, { error: result.error, duration_ms: duration })
    results.push(result)
    return result
  }
}

function printSummary() {
  log.info('═'.repeat(60))
  log.info('SUMMARY')
  log.info('═'.repeat(60))

  const successful = results.filter(
    (r) => r.responseStatus >= 200 && r.responseStatus < 300
  )
  const failed = results.filter(
    (r) => r.responseStatus >= 400 || r.responseStatus === 0
  )

  log.info(`Total requests: ${results.length}`)
  log.success(`Successful: ${successful.length}`)
  if (failed.length > 0) {
    log.error(`Failed: ${failed.length}`)
  }

  logToFile('INF', 'Debug session summary', {
    total: results.length,
    successful: successful.length,
    failed: failed.length
  })

  if (failed.length > 0) {
    log.error('Failed requests:')
    for (const f of failed) {
      log.error(`  - ${f.method}: ${f.error || `HTTP ${f.responseStatus}`}`)
    }
  }
}

function generateTypeReport() {
  log.info('═'.repeat(60))
  log.info('TYPE ANALYSIS - Actual API Response Structure')
  log.info('═'.repeat(60))

  for (const r of results) {
    if (r.fieldAnalysis && r.responseStatus >= 200 && r.responseStatus < 300) {
      log.info(`\n${r.method}:`)
      const fields = r.fieldAnalysis.typeInfo
      const sortedFields = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b))
      for (const [field, type] of sortedFields.slice(0, 15)) {
        log.debug(`  ${field}: ${type}`)
      }
      if (sortedFields.length > 15) {
        log.debug(`  ... and ${sortedFields.length - 15} more fields`)
      }
    }
  }

  logToFile('INF', 'Type analysis complete', {
    methods: results.filter(r => r.fieldAnalysis).map(r => r.method)
  })
}

async function main() {
  log.info('═'.repeat(60))
  log.info('GITHUB API DEBUG SCRIPT')
  log.info('═'.repeat(60))

  logToFile('INF', 'Debug session started', { timestamp: new Date().toISOString() })

  if (!GITHUB_TOKEN) {
    log.error('Missing GITHUB_TOKEN')
    log.info('Set this in .env.test or export it:')
    log.info('  export GITHUB_TOKEN=ghp_xxx')
    logToFile('ERR', 'Missing credentials', { hasGithubToken: !!GITHUB_TOKEN })
    process.exit(1)
  }

  log.info(`Token: ${GITHUB_TOKEN.slice(0, 10)}...`)

  log.info('\n--- User Operations ---')
  await debugRequest('getAuthenticatedUser', '/user')

  const userResult = results.find((r) => r.method === 'getAuthenticatedUser')
  let username: string | null = null

  if (userResult?.responseStatus === 200) {
    const user = userResult.responseBody as { login: string }
    username = user.login
    log.success(`Authenticated as: ${username}`)
    logToFile('INF', 'Authenticated user', { username })
  }

  log.info('\n--- Repository Operations ---')

  if (username) {
    await debugRequest('listUserRepos', `/users/${username}/repos?per_page=5&sort=updated`)
    await debugRequest('checkUserType', `/users/${username}`)
  }

  await debugRequest('listOrgs', '/user/orgs?per_page=5')

  const orgsResult = results.find((r) => r.method === 'listOrgs')
  if (orgsResult?.responseStatus === 200) {
    const orgs = orgsResult.responseBody as Array<{ login: string }>
    if (orgs && orgs.length > 0) {
      const firstOrg = orgs[0].login
      log.info(`Found ${orgs.length} organization(s)`)
      await debugRequest('listOrgRepos', `/orgs/${firstOrg}/repos?per_page=5`)
    }
  }

  log.info('\n--- Error Handling ---')
  await debugRequest('getInvalidRepo', '/repos/non-existent-owner-xyz/non-existent-repo-123')
  await debugRequest('getInvalidUser', '/users/non-existent-user-xyz-123456')

  log.info('\n--- Rate Limit Info ---')
  await debugRequest('getRateLimit', '/rate_limit')

  printSummary()
  generateTypeReport()

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const reportPath = join(OUTPUT_DIR, `github-debug-${timestamp}.json`)
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        authenticatedUser: username,
        results,
        summary: {
          total: results.length,
          successful: results.filter(
            (r) => r.responseStatus >= 200 && r.responseStatus < 300
          ).length,
          failed: results.filter(
            (r) => r.responseStatus >= 400 || r.responseStatus === 0
          ).length,
        },
      },
      null,
      2
    )
  )

  log.success(`Full report saved to: ${reportPath}`)
  log.info(`JSONL logs: ${getLogFile()}`)
  logToFile('INF', 'Debug session complete', { reportPath })
}

main().catch((error) => {
  log.error(`Script error: ${error}`)
  logToFile('ERR', 'Script crashed', { error: String(error) })
  process.exit(1)
})
