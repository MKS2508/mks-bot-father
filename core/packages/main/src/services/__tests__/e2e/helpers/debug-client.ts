/**
 * Debug HTTP Client for E2E Tests.
 *
 * HTTP client with detailed logging and response capture for debugging.
 *
 * @module
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export interface IRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
}

export interface IDebugResponse<T = unknown> {
  success: boolean
  status: number
  statusText: string
  headers: Record<string, string>
  data: T
  duration: number
  error?: string
  rawText?: string
}

export interface ILogEntry {
  ts: string
  level: 'DBG' | 'INF' | 'WRN' | 'ERR'
  src: string
  msg: string
  data?: Record<string, unknown>
}

const LOG_DIR = join(homedir(), '.config', 'mks-bot-father', 'logs')

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true })
  }
}

function getLogFile(prefix: string): string {
  ensureLogDir()
  return join(LOG_DIR, `e2e-${prefix}-${new Date().toISOString().split('T')[0]}.jsonl`)
}

function logToFile(
  prefix: string,
  level: ILogEntry['level'],
  msg: string,
  data?: Record<string, unknown>
): void {
  try {
    const entry: ILogEntry = {
      ts: new Date().toISOString(),
      level,
      src: `E2E_${prefix.toUpperCase()}`,
      msg,
      data,
    }
    appendFileSync(getLogFile(prefix), JSON.stringify(entry) + '\n')
  } catch {
    // Silent fail
  }
}

export class DebugClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  private logPrefix: string

  constructor(
    baseUrl: string,
    options: {
      headers?: Record<string, string>
      logPrefix?: string
    } = {}
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    }
    this.logPrefix = options.logPrefix || 'debug'
  }

  private log(level: ILogEntry['level'], msg: string, data?: Record<string, unknown>): void {
    logToFile(this.logPrefix, level, msg, data)
  }

  async request<T = unknown>(
    endpoint: string,
    options: IRequestOptions = {}
  ): Promise<IDebugResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const method = options.method || 'GET'
    const startTime = Date.now()

    this.log('INF', `${method} ${endpoint}`, {
      url,
      hasBody: !!options.body,
    })

    try {
      const controller = new AbortController()
      const timeout = options.timeout || 30000

      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const duration = Date.now() - startTime
      const rawText = await response.text()
      let data: T

      try {
        data = JSON.parse(rawText) as T
      } catch {
        data = rawText as unknown as T
      }

      const headers = Object.fromEntries(response.headers.entries())

      const result: IDebugResponse<T> = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers,
        data,
        duration,
        rawText: response.ok ? undefined : rawText,
      }

      if (response.ok) {
        this.log('INF', `${method} ${endpoint} - ${response.status} (${duration}ms)`, {
          status: response.status,
          duration,
        })
      } else {
        result.error =
          typeof data === 'object' && data !== null && 'message' in data
            ? String((data as { message: unknown }).message)
            : rawText

        this.log('ERR', `${method} ${endpoint} - ${response.status}`, {
          status: response.status,
          error: result.error,
          duration,
        })
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMsg = error instanceof Error ? error.message : String(error)

      this.log('ERR', `${method} ${endpoint} - NETWORK ERROR`, {
        error: errorMsg,
        duration,
      })

      return {
        success: false,
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: null as T,
        duration,
        error: errorMsg,
      }
    }
  }

  async get<T = unknown>(
    endpoint: string,
    options?: Omit<IRequestOptions, 'method'>
  ): Promise<IDebugResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: Omit<IRequestOptions, 'method' | 'body'>
  ): Promise<IDebugResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body })
  }

  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: Omit<IRequestOptions, 'method' | 'body'>
  ): Promise<IDebugResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body })
  }

  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: Omit<IRequestOptions, 'method' | 'body'>
  ): Promise<IDebugResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body })
  }

  async delete<T = unknown>(
    endpoint: string,
    options?: Omit<IRequestOptions, 'method'>
  ): Promise<IDebugResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export function createCoolifyClient(url: string, token: string): DebugClient {
  return new DebugClient(`${url}/api/v1`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    logPrefix: 'coolify',
  })
}

export function createGitHubClient(token: string): DebugClient {
  return new DebugClient('https://api.github.com', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    logPrefix: 'github',
  })
}
