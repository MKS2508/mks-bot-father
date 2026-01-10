#!/usr/bin/env bun
/**
 * Coolify Debug Script.
 *
 * Tests all Coolify API endpoints and validates type correctness.
 * Captures real API responses for type analysis.
 *
 * Usage: bun run src/debug/coolify-debug.ts
 *
 * Required environment variables (in .env.test or exported):
 * - COOLIFY_URL: Coolify instance URL
 * - COOLIFY_TOKEN: Coolify API token
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

const log = component('CoolifyDebug')

const COOLIFY_URL = process.env.COOLIFY_URL?.replace(/\/$/, '')
const COOLIFY_TOKEN = process.env.COOLIFY_TOKEN
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
    expectedFields: string[]
    actualFields: string[]
    missingFields: string[]
    extraFields: string[]
    typeInfo: Record<string, string>
  }
}

interface ITypeSchema {
  [key: string]: string | ITypeSchema
}

interface ILogEntry {
  ts: string
  level: 'DBG' | 'INF' | 'WRN' | 'ERR'
  src: string
  msg: string
  data?: Record<string, unknown>
}

function getLogFile(): string {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true })
  }
  return join(LOG_DIR, `debug-coolify-${new Date().toISOString().split('T')[0]}.jsonl`)
}

function logToFile(level: ILogEntry['level'], msg: string, data?: Record<string, unknown>): void {
  try {
    const entry: ILogEntry = {
      ts: new Date().toISOString(),
      level,
      src: 'COOLIFY_DEBUG',
      msg,
      data
    }
    appendFileSync(getLogFile(), JSON.stringify(entry) + '\n')
  } catch {
    // Silently fail
  }
}

const EXPECTED_TYPES: Record<string, ITypeSchema> = {
  ICoolifyServer: {
    uuid: 'string',
    name: 'string',
    'description?': 'string',
    'ip?': 'string',
    'user?': 'string',
    'port?': 'number',
  },
  ICoolifyDestination: {
    uuid: 'string',
    name: 'string',
    'network?': 'string',
    'server_uuid?': 'string',
  },
  ICoolifyApplication: {
    uuid: 'string',
    name: 'string',
    'description?': 'string',
    status: 'string',
    'fqdn?': 'string',
    'git_repository?': 'string',
    'git_branch?': 'string',
    'build_pack?': 'string',
    'ports_exposes?': 'string',
  },
  ICoolifyDeployment: {
    id: 'number',
    uuid: 'string',
    status: 'string',
    created_at: 'string',
    'finished_at?': 'string',
    'commit?': 'string',
    'application_id?': 'string',
  },
  ICoolifyDeployResult: {
    deployment_uuid: 'string',
    resource_uuid: 'string',
  },
  ICoolifyLogs: {
    logs: 'array',
  },
  ICoolifyProject: {
    uuid: 'string',
    name: 'string',
    'description?': 'string',
  },
  ICoolifyTeam: {
    id: 'number',
    name: 'string',
    'description?': 'string',
  },
}

const results: IDebugResult[] = []

function analyzeFields(
  data: unknown,
  expectedType: string
): IDebugResult['fieldAnalysis'] | undefined {
  if (!data || typeof data !== 'object') return undefined

  const items = Array.isArray(data) ? data : [data]
  if (items.length === 0) return undefined

  const sample = items[0] as Record<string, unknown>
  const schema = EXPECTED_TYPES[expectedType]

  if (!schema) {
    return {
      expectedFields: [],
      actualFields: Object.keys(sample),
      missingFields: [],
      extraFields: Object.keys(sample),
      typeInfo: Object.fromEntries(
        Object.entries(sample).map(([k, v]) => [
          k,
          Array.isArray(v) ? 'array' : typeof v,
        ])
      ),
    }
  }

  const expectedFields = Object.keys(schema).map((k) => k.replace('?', ''))
  const requiredFields = Object.keys(schema).filter((k) => !k.endsWith('?'))
  const actualFields = Object.keys(sample)
  const missingFields = requiredFields.filter((f) => !actualFields.includes(f))
  const allExpected = expectedFields
  const extraFields = actualFields.filter((f) => !allExpected.includes(f))
  const typeInfo = Object.fromEntries(
    Object.entries(sample).map(([k, v]) => [
      k,
      Array.isArray(v) ? 'array' : typeof v,
    ])
  )

  return {
    expectedFields,
    actualFields,
    missingFields,
    extraFields,
    typeInfo,
  }
}

async function debugRequest(
  name: string,
  endpoint: string,
  options: RequestInit = {},
  expectedType?: string
): Promise<IDebugResult> {
  const startTime = Date.now()
  const url = `${COOLIFY_URL}/api/v1${endpoint}`

  log.info(`[${name}] ${options.method || 'GET'} ${endpoint}`)
  logToFile('INF', `Request: ${name}`, { endpoint, method: options.method || 'GET' })

  if (options.body) {
    log.debug(`Body: ${options.body}`)
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${COOLIFY_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
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

    if (expectedType && response.ok) {
      result.fieldAnalysis = analyzeFields(body, expectedType)
    }

    if (response.ok) {
      log.success(`${name}: ${response.status} (${duration}ms)`)
      logToFile('INF', `Response OK: ${name}`, {
        status: response.status,
        duration_ms: duration,
        fieldsCount: result.fieldAnalysis?.actualFields.length
      })

      if (result.fieldAnalysis) {
        if (result.fieldAnalysis.missingFields.length > 0) {
          log.warn(`Missing expected fields: ${result.fieldAnalysis.missingFields.join(', ')}`)
          logToFile('WRN', `Type mismatch: missing fields`, {
            method: name,
            missing: result.fieldAnalysis.missingFields
          })
        }
        if (result.fieldAnalysis.extraFields.length > 0) {
          log.info(`Extra fields from API: ${result.fieldAnalysis.extraFields.join(', ')}`)
          logToFile('INF', `Extra API fields`, {
            method: name,
            extra: result.fieldAnalysis.extraFields
          })
        }
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

  const withMissingFields = results.filter(
    (r) => r.fieldAnalysis && r.fieldAnalysis.missingFields.length > 0
  )
  const withExtraFields = results.filter(
    (r) => r.fieldAnalysis && r.fieldAnalysis.extraFields.length > 0
  )

  if (withMissingFields.length > 0) {
    log.warn('Type mismatches (missing expected fields):')
    for (const r of withMissingFields) {
      log.warn(`  - ${r.method}: missing [${r.fieldAnalysis!.missingFields.join(', ')}]`)
    }
  }

  if (withExtraFields.length > 0) {
    log.info('API returns extra fields (not in our types):')
    for (const r of withExtraFields) {
      log.info(`  - ${r.method}: extra [${r.fieldAnalysis!.extraFields.join(', ')}]`)
    }
  }
}

function generateTypeReport() {
  log.info('═'.repeat(60))
  log.info('TYPE ANALYSIS - Actual API Response Structure')
  log.info('═'.repeat(60))

  const typeReports: Record<string, Record<string, string>> = {}

  for (const r of results) {
    if (r.fieldAnalysis && r.responseStatus >= 200 && r.responseStatus < 300) {
      typeReports[r.method] = r.fieldAnalysis.typeInfo
    }
  }

  for (const [method, fields] of Object.entries(typeReports)) {
    log.info(`\n${method}:`)
    for (const [field, type] of Object.entries(fields)) {
      log.debug(`  ${field}: ${type}`)
    }
  }

  logToFile('INF', 'Type analysis complete', { methods: Object.keys(typeReports) })
}

async function main() {
  log.info('═'.repeat(60))
  log.info('COOLIFY API DEBUG SCRIPT')
  log.info('═'.repeat(60))

  logToFile('INF', 'Debug session started', { timestamp: new Date().toISOString() })

  if (!COOLIFY_URL || !COOLIFY_TOKEN) {
    log.error('Missing COOLIFY_URL or COOLIFY_TOKEN')
    log.info('Set these in .env.test or export them:')
    log.info('  export COOLIFY_URL=https://your-coolify.com')
    log.info('  export COOLIFY_TOKEN=your-token')
    logToFile('ERR', 'Missing credentials', { hasCoolifyUrl: !!COOLIFY_URL, hasCoolifyToken: !!COOLIFY_TOKEN })
    process.exit(1)
  }

  log.info(`URL: ${COOLIFY_URL}`)
  log.info(`Token: ${COOLIFY_TOKEN.slice(0, 10)}...`)

  log.info('\n--- Server Operations ---')
  await debugRequest('listServers', '/servers', {}, 'ICoolifyServer')

  const serversResult = results.find((r) => r.method === 'listServers')
  let firstServerUuid: string | null = null

  if (serversResult?.responseStatus === 200) {
    const servers = serversResult.responseBody as Array<{ uuid: string }>
    if (servers && servers.length > 0) {
      firstServerUuid = servers[0].uuid
      log.info(`Found ${servers.length} server(s)`)

      await debugRequest(
        'getServer',
        `/servers/${firstServerUuid}`,
        {},
        'ICoolifyServer'
      )
    } else {
      log.warn('No servers found')
    }
  }

  log.info('\n--- Application Operations ---')
  await debugRequest('listApplications', '/applications', {}, 'ICoolifyApplication')

  const appsResult = results.find((r) => r.method === 'listApplications')
  let firstAppUuid: string | null = null

  if (appsResult?.responseStatus === 200) {
    const apps = appsResult.responseBody as Array<{ uuid: string }>
    if (apps && apps.length > 0) {
      firstAppUuid = apps[0].uuid
      log.info(`Found ${apps.length} application(s)`)

      await debugRequest(
        'getApplication',
        `/applications/${firstAppUuid}`,
        {},
        'ICoolifyApplication'
      )

      await debugRequest(
        'getDeploymentHistory',
        `/applications/${firstAppUuid}/deployments`,
        {},
        'ICoolifyDeployment'
      )

      await debugRequest(
        'getApplicationLogs',
        `/applications/${firstAppUuid}/logs?tail=10`,
        {},
        'ICoolifyLogs'
      )
    } else {
      log.warn('No applications found')
    }
  }

  log.info('\n--- Error Handling ---')
  await debugRequest('getInvalidApp', '/applications/non-existent-uuid-12345')
  await debugRequest('getInvalidServer', '/servers/non-existent-uuid-12345')

  log.info('\n--- Projects & Teams ---')
  await debugRequest('listProjects', '/projects', {}, 'ICoolifyProject')
  await debugRequest('listTeams', '/teams', {}, 'ICoolifyTeam')

  printSummary()
  generateTypeReport()

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const reportPath = join(OUTPUT_DIR, `coolify-debug-${timestamp}.json`)
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        coolifyUrl: COOLIFY_URL,
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
