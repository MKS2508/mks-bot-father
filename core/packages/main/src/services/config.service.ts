/**
 * Configuration service for mks-bot-father.
 *
 * @module
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { ok, tryCatch, isOk, type Result, type ResultError } from '@mks2508/no-throw'
import { type } from 'arktype'
import { createLogger, log as fileLog } from '../utils/index.js'
import { ConfigSchema, type IConfig } from '../types/index.js'
import { AppErrorCode } from '../types/errors.js'

const log = createLogger('ConfigService')

/** Configuration directory path */
export const CONFIG_DIR = join(homedir(), '.config', 'mks-bot-father')

/** Configuration file path */
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

/**
 * Configuration service for persistent settings.
 *
 * @example
 * ```typescript
 * const config = getConfigService()
 * const result = config.set('github.token', 'ghp_xxx')
 * if (isErr(result)) {
 *   console.error(result.error.message)
 * }
 * ```
 */
export class ConfigService {
  private config: IConfig = {}

  constructor() {
    this.ensureConfigDir()
    this.loadSync()
  }

  /**
   * Ensures the configuration directory exists.
   */
  private ensureConfigDir(): void {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true })
      log.info(`Created config directory: ${CONFIG_DIR}`)
      fileLog.info('CONFIG', 'Config directory created', { path: CONFIG_DIR })
    }
  }

  /**
   * Loads configuration from disk synchronously (used in constructor).
   */
  private loadSync(): void {
    try {
      if (existsSync(CONFIG_FILE)) {
        const raw = readFileSync(CONFIG_FILE, 'utf-8')
        const parsed = JSON.parse(raw)
        const result = ConfigSchema(parsed)

        if (result instanceof type.errors) {
          log.warn('Invalid config file, using defaults')
          this.config = {}
        } else {
          this.config = result
          log.debug('Config loaded successfully')
        }
      } else {
        log.debug('No config file found, using defaults')
        this.config = {}
      }
    } catch {
      log.warn('Failed to load config, using defaults')
      this.config = {}
    }
  }

  /**
   * Loads configuration from disk.
   *
   * @returns Result with the loaded configuration or error
   */
  load(): Result<IConfig, ResultError<typeof AppErrorCode.CONFIG_ERROR>> {
    const result = tryCatch(() => {
      if (existsSync(CONFIG_FILE)) {
        const raw = readFileSync(CONFIG_FILE, 'utf-8')
        const parsed = JSON.parse(raw)
        const schemaResult = ConfigSchema(parsed)

        if (schemaResult instanceof type.errors) {
          log.warn('Invalid config file, using defaults')
          this.config = {}
        } else {
          this.config = schemaResult
          log.debug('Config loaded successfully')
        }
      } else {
        log.debug('No config file found, using defaults')
        this.config = {}
      }
      return this.config
    }, AppErrorCode.CONFIG_ERROR)

    return result
  }

  /**
   * Saves configuration to disk.
   *
   * @returns Result indicating success or error
   */
  save(): Result<void, ResultError<typeof AppErrorCode.CONFIG_ERROR>> {
    const result = tryCatch(() => {
      writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2))
      log.success('Config saved')
      fileLog.info('CONFIG', 'Config saved', {
        hasGitHub: !!this.config.github?.token,
        hasCoolify: !!this.config.coolify?.token,
        hasTelegram: !!(this.config.telegram?.apiId && this.config.telegram?.apiHash)
      })
    }, AppErrorCode.CONFIG_ERROR)

    return result
  }

  /**
   * Gets the full configuration object.
   *
   * @returns The configuration object
   */
  get(): IConfig {
    return this.config
  }

  /**
   * Sets a configuration value by dot-notation key.
   *
   * @param key - The configuration key (e.g., 'github.token')
   * @param value - The value to set
   * @returns Result indicating success or error
   *
   * @example
   * ```typescript
   * const result = config.set('coolify.url', 'https://coolify.example.com')
   * if (isOk(result)) {
   *   console.log('Config saved')
   * }
   * ```
   */
  set(key: string, value: unknown): Result<void, ResultError<typeof AppErrorCode.CONFIG_ERROR>> {
    const keys = key.split('.')
    let current: Record<string, unknown> = this.config as Record<string, unknown>

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]!
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {}
      }
      current = current[k] as Record<string, unknown>
    }

    const lastKey = keys[keys.length - 1]!
    current[lastKey] = value

    fileLog.info('CONFIG', 'Config value set', { key, valueType: typeof value })
    return this.save()
  }

  /**
   * Gets the configured GitHub token.
   *
   * @returns The GitHub token or undefined
   */
  getGitHubToken(): string | undefined {
    return this.config.github?.token
  }

  /**
   * Gets GitHub token from the gh CLI.
   *
   * @returns Result with the token or error
   */
  async getGitHubTokenFromCli(): Promise<Result<string | undefined, ResultError<typeof AppErrorCode.CONFIG_ERROR>>> {
    try {
      const proc = Bun.spawn(['gh', 'auth', 'token'], {
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const output = await new Response(proc.stdout).text()
      const exitCode = await proc.exited
      if (exitCode === 0 && output.trim()) {
        return ok(output.trim())
      }
      return ok(undefined)
    } catch {
      return ok(undefined)
    }
  }

  /**
   * Resolves GitHub token from config, CLI, or environment.
   *
   * @returns Result with the resolved token or undefined
   */
  async resolveGitHubToken(): Promise<Result<string | undefined, ResultError<typeof AppErrorCode.CONFIG_ERROR>>> {
    if (this.config.github?.token) {
      return ok(this.config.github.token)
    }

    if (this.config.github?.useGhCli !== false) {
      const cliResult = await this.getGitHubTokenFromCli()
      if (isOk(cliResult) && cliResult.value) {
        log.debug('Using GitHub token from gh CLI')
        return ok(cliResult.value)
      }
    }

    const envToken = process.env['GITHUB_TOKEN']
    if (envToken) {
      log.debug('Using GitHub token from environment')
      return ok(envToken)
    }

    return ok(undefined)
  }

  /**
   * Gets the configured Coolify URL.
   *
   * @returns The Coolify URL or undefined
   */
  getCoolifyUrl(): string | undefined {
    return this.config.coolify?.url
  }

  /**
   * Gets the configured Coolify token.
   *
   * @returns The Coolify token or undefined
   */
  getCoolifyToken(): string | undefined {
    return this.config.coolify?.token
  }

  /**
   * Gets the configured Telegram API credentials.
   *
   * @returns Object with apiId and apiHash
   */
  getTelegramCredentials(): { apiId?: number; apiHash?: string } {
    return {
      apiId: this.config.telegram?.apiId,
      apiHash: this.config.telegram?.apiHash,
    }
  }

  /**
   * Gets the configuration file path.
   *
   * @returns The full path to the config file
   */
  static getConfigPath(): string {
    return CONFIG_FILE
  }
}

let instance: ConfigService | null = null

/**
 * Gets the singleton ConfigService instance.
 *
 * @returns The ConfigService instance
 */
export function getConfigService(): ConfigService {
  if (!instance) {
    instance = new ConfigService()
  }
  return instance
}
