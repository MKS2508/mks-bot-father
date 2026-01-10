/**
 * File Transport
 *
 * Writes log entries to JSONL files with daily rotation.
 */

import type { LogTransport, JsonLogEntry, FileTransportOptions } from '../types.js'
import { mkdirSync, existsSync, appendFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

/**
 * File transport for JSONL logging
 */
export class FileTransport implements LogTransport {
  name = 'file'
  private logDir: string
  private prefix: string
  private currentLogPath: string
  private currentDate: string

  constructor(options: FileTransportOptions) {
    this.logDir = options.dir
    this.prefix = options.prefix || 'app'
    this.currentDate = this.getToday()
    this.currentLogPath = this.getLogPath()

    // Ensure log directory exists
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true })
    }
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0]
  }

  private getLogPath(): string {
    return resolve(this.logDir, `${this.prefix}-${this.getToday()}.jsonl`)
  }

  log(entry: JsonLogEntry): void {
    // Check if we need to rotate to a new file
    const today = this.getToday()
    if (today !== this.currentDate) {
      this.currentDate = today
      this.currentLogPath = this.getLogPath()
    }

    try {
      appendFileSync(this.currentLogPath, JSON.stringify(entry) + '\n')
    } catch (err) {
      // Fallback to console if file write fails
      console.error('[FileTransport] Write failed:', err)
    }
  }

  /**
   * Get the current log file path
   */
  getPath(): string {
    return this.currentLogPath
  }
}

/**
 * Create a file transport
 */
export function fileTransport(options: FileTransportOptions): FileTransport {
  return new FileTransport(options)
}
