/**
 * File Watcher
 *
 * Efficient file watching using chokidar instead of polling
 */

import chokidar from 'chokidar'
import { statSync } from 'fs'
import type { JsonLogEntry } from '../types/index.js'

export interface WatcherOptions {
  persistent?: boolean
  ignoreInitial?: boolean
  stabilityThreshold?: number
}

export type WatchCallback = (newEntries: JsonLogEntry[]) => void
export type ErrorCallback = (error: Error) => void

export class LogWatcher {
  private watcher: any = null
  private filePath: string
  private lastSize: number = 0
  private lastPosition: number = 0
  private options: WatcherOptions
  private onNewEntries: WatchCallback
  private onError?: ErrorCallback

  constructor(
    filePath: string,
    onNewEntries: WatchCallback,
    options: WatcherOptions = {},
    onError?: ErrorCallback
  ) {
    this.filePath = filePath
    this.onNewEntries = onNewEntries
    this.options = {
      persistent: true,
      ignoreInitial: true,
      stabilityThreshold: 100,
      ...options
    }
    this.onError = onError
  }

  /**
   * Start watching the file
   */
  start(): void {
    if (this.watcher) {
      return
    }

    // Get initial file size
    try {
      const stats = statSync(this.filePath)
      this.lastSize = stats.size
      this.lastPosition = stats.size
    } catch {
      // File doesn't exist yet, that's ok
      this.lastSize = 0
      this.lastPosition = 0
    }

    // Create watcher
    this.watcher = chokidar.watch(this.filePath, {
      persistent: this.options.persistent,
      ignoreInitial: this.options.ignoreInitial,
      awaitWriteFinish: {
        stabilityThreshold: this.options.stabilityThreshold,
        pollInterval: 50
      }
    })

    this.watcher.on('change', async () => {
      await this.handleFileChange()
    })

    this.watcher.on('error', (error: Error) => {
      this.onError?.(error)
    })
  }

  /**
   * Stop watching the file
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  /**
   * Handle file change event
   */
  private async handleFileChange(): Promise<void> {
    try {
      const stats = statSync(this.filePath)

      // Check if file grew
      if (stats.size <= this.lastSize) {
        return
      }

      // Read only the new content
      const { readFile } = await import('fs/promises')
      const buffer = await readFile(this.filePath)
      const newContent = buffer.toString('utf-8', this.lastPosition, stats.size)

      // Parse new lines
      const { LogParser } = await import('./parser.js')
      const lines = newContent.split('\n').filter((l) => l.trim())
      const newEntries: JsonLogEntry[] = []

      for (const line of lines) {
        const entry = LogParser.parseLine(line)
        if (entry) {
          newEntries.push(entry)
        }
      }

      // Update position
      this.lastPosition = stats.size
      this.lastSize = stats.size

      // Notify callback
      if (newEntries.length > 0) {
        this.onNewEntries(newEntries)
      }
    } catch (error) {
      this.onError?.(error as Error)
    }
  }

  /**
   * Get current file size
   */
  getFileSize(): number {
    return this.lastSize
  }

  /**
   * Reset watcher position (e.g., after file reload)
   */
  resetPosition(): void {
    try {
      const stats = statSync(this.filePath)
      this.lastSize = stats.size
      this.lastPosition = stats.size
    } catch {
      this.lastSize = 0
      this.lastPosition = 0
    }
  }

  /**
   * Check if watcher is active
   */
  isActive(): boolean {
    return this.watcher !== null
  }
}
