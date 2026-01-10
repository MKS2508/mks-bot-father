/**
 * Instance management with PID-based locking.
 */

import { writeFile, readFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ok, type Result, err } from '../types/result.js'
import { botLogger, badge, kv, colors, colorText } from '../middleware/logging.js'
import type { BotConfig } from '../types/bot.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface BotError {
  code: string
  message: string
}

function botError(code: string, message: string): BotError {
  return { code, message }
}

export interface LockData {
  pid: number
  instanceId: string
  environment: string
  instanceName: string
  startTime: string
  nodeVersion: string
  cwd: string
}

export interface InstanceInfo extends LockData {
  running: boolean
  uptime: string
}

export class InstanceManager {
  private pidFile: string
  private lockFile: string
  private instanceId: string

  constructor(private config: BotConfig) {
    this.instanceId = config.instanceId || this.generateInstanceId()

    // tmp is at apps/telegram-bot/tmp relative to this file
    const tmpDir = resolve(__dirname, '../tmp')
    this.pidFile = resolve(tmpDir, `${config.instanceName}.pid`)
    this.lockFile = resolve(tmpDir, `${config.instanceName}.lock`)
  }

  async acquireLock(): Promise<Result<void, BotError>> {
    // Skip if instance check disabled
    if (!this.config.instanceCheck) {
      return ok(undefined)
    }

    botLogger.debug(
      `${badge('INSTANCE', 'rounded')} ${kv({
        action: 'check',
        lockFile: this.lockFile,
      })}`
    )

    // Check if lock file exists
    if (existsSync(this.lockFile)) {
      const existingInstance = await this.readLockFile()

      // Check if process is still running
      if (this.isProcessRunning(existingInstance.pid)) {
        // CONFLICT DETECTED
        return err(
          botError(
            'INSTANCE_CONFLICT',
            `Another instance is already running:\n` +
              `  Name: ${existingInstance.instanceName}\n` +
              `  PID: ${existingInstance.pid}\n` +
              `  Environment: ${existingInstance.environment}\n` +
              `  Started: ${existingInstance.startTime}\n` +
              `  Uptime: ${this.calculateUptime(existingInstance.startTime)}`
          )
        )
      }

      // Stale lock file, remove it
      botLogger.warn(
        `${badge('INSTANCE', 'rounded')} ${kv({
          action: colorText('stale lock', colors.warning),
          pid: existingInstance.pid,
        })}`
      )
      await this.cleanup()
    }

    // Write lock files
    await this.writeLockFile()
    botLogger.success(
      `${badge('INSTANCE', 'rounded')} ${kv({
        action: colorText('locked', colors.success),
        id: this.instanceId,
      })}`
    )

    return ok(undefined)
  }

  async releaseLock(): Promise<void> {
    try {
      await this.cleanup()
      botLogger.debug(
        `${badge('INSTANCE', 'rounded')} ${kv({
          action: colorText('released', colors.dim),
        })}`
      )
    } catch (error) {
      botLogger.error('Failed to release lock:', error)
    }
  }

  async getLockData(): Promise<LockData | null> {
    try {
      return await this.readLockFile()
    } catch {
      return null
    }
  }

  private async writeLockFile(): Promise<void> {
    const lockData: LockData = {
      pid: process.pid,
      instanceId: this.instanceId,
      environment: this.config.environment,
      instanceName: this.config.instanceName,
      startTime: new Date().toISOString(),
      nodeVersion: process.version,
      cwd: process.cwd(),
    }

    await writeFile(this.pidFile, process.pid.toString())
    await writeFile(this.lockFile, JSON.stringify(lockData, null, 2))
  }

  private async readLockFile(): Promise<LockData> {
    const content = await readFile(this.lockFile, 'utf-8')
    return JSON.parse(content)
  }

  private isProcessRunning(pid: number): boolean {
    try {
      // Signal 0 checks if process exists without killing it
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }

  private calculateUptime(startTime: string): string {
    const start = new Date(startTime)
    const now = new Date()
    const diff = now.getTime() - start.getTime()

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  private async cleanup(): Promise<void> {
    if (existsSync(this.pidFile)) {
      await unlink(this.pidFile)
    }
    if (existsSync(this.lockFile)) {
      await unlink(this.lockFile)
    }
  }

  private generateInstanceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}

let instanceManagerInstance: InstanceManager | null = null

export function getInstanceManager(config?: BotConfig): InstanceManager {
  if (!instanceManagerInstance) {
    if (!config) {
      throw new Error('InstanceManager requires config on first initialization')
    }
    instanceManagerInstance = new InstanceManager(config)
  }
  return instanceManagerInstance
}

export function resetInstanceManager(): void {
  instanceManagerInstance = null
}
