/**
 * Configuration management for mks-bot-father.
 *
 * @module
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { component } from '@mks2508/better-logger'
import { type } from 'arktype'
import { type Config, ConfigSchema } from '../types.js'

const log = component('Config')

/** Configuration directory path */
export const CONFIG_DIR = join(homedir(), '.config', 'mks-bot-father')

/** Configuration file path */
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

/**
 * Configuration manager for persistent settings.
 *
 * @example
 * ```typescript
 * const config = new ConfigManager()
 * config.set('github.token', 'ghp_xxx')
 * const token = config.getGitHubToken()
 * ```
 */
export class ConfigManager {
  private config: Config = {}

  constructor() {
    this.ensureConfigDir()
    this.load()
  }

  /**
   * Ensures the configuration directory exists.
   */
  private ensureConfigDir(): void {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true })
      log.info(`Created config directory: ${CONFIG_DIR}`)
    }
  }

  /**
   * Loads configuration from disk.
   *
   * @returns The loaded configuration
   */
  load(): Config {
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
    return this.config
  }

  /**
   * Saves configuration to disk.
   */
  save(): void {
    try {
      writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2))
      log.success('Config saved')
    } catch (error) {
      log.error('Failed to save config:', error)
      throw error
    }
  }

  /**
   * Gets the full configuration object.
   *
   * @returns The configuration object
   */
  get(): Config {
    return this.config
  }

  /**
   * Sets a configuration value by dot-notation key.
   *
   * @param key - The configuration key (e.g., 'github.token')
   * @param value - The value to set
   *
   * @example
   * ```typescript
   * config.set('coolify.url', 'https://coolify.example.com')
   * ```
   */
  set(key: string, value: unknown): void {
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
    this.save()
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
   * @returns The token from gh CLI or undefined
   */
  async getGitHubTokenFromCli(): Promise<string | undefined> {
    try {
      const proc = Bun.spawn(['gh', 'auth', 'token'], {
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const output = await new Response(proc.stdout).text()
      const exitCode = await proc.exited
      if (exitCode === 0 && output.trim()) {
        return output.trim()
      }
    } catch {
      log.debug('gh CLI not available or not authenticated')
    }
    return undefined
  }

  /**
   * Resolves GitHub token from config, CLI, or environment.
   *
   * @returns The resolved token or undefined
   */
  async resolveGitHubToken(): Promise<string | undefined> {
    if (this.config.github?.token) {
      return this.config.github.token
    }

    if (this.config.github?.useGhCli !== false) {
      const cliToken = await this.getGitHubTokenFromCli()
      if (cliToken) {
        log.debug('Using GitHub token from gh CLI')
        return cliToken
      }
    }

    const envToken = process.env['GITHUB_TOKEN']
    if (envToken) {
      log.debug('Using GitHub token from environment')
      return envToken
    }

    return undefined
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

let instance: ConfigManager | null = null

/**
 * Gets the singleton ConfigManager instance.
 *
 * @returns The ConfigManager instance
 */
export function getConfigManager(): ConfigManager {
  if (!instance) {
    instance = new ConfigManager()
  }
  return instance
}
