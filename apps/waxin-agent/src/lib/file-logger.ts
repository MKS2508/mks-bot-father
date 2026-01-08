/**
 * File Logger with rotation support.
 *
 * Writes log entries to files with automatic rotation when files exceed max size.
 */

import fs from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { fileLogger } from './logger.js'
import type { LogFileConfig } from '../types.js'

/**
 * Default log file configuration.
 */
export const DEFAULT_LOG_CONFIG: LogFileConfig = {
  directory: './logs',
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  pattern: 'tui-debug-YYYY-MM-DD.log'
}

/**
 * File Logger with automatic rotation.
 */
export class FileLogger {
  private currentFile: string | null = null
  private currentSize = 0
  private rotationCount = 0

  constructor(private config: LogFileConfig = DEFAULT_LOG_CONFIG) {}

  /**
   * Ensure the log directory exists.
   */
  async ensureDirectory(): Promise<void> {
    try {
      if (!existsSync(this.config.directory)) {
        await fs.mkdir(this.config.directory, { recursive: true })
        fileLogger.info(`Created log directory: ${this.config.directory}`)
      }
    } catch (error) {
      fileLogger.error(`Failed to create log directory: ${error}`)
      throw error
    }
  }

  /**
   * Get the current log file name based on date.
   */
  getFileName(): string {
    const date = new Date().toISOString().split('T')[0]
    return this.config.pattern.replace('YYYY-MM-DD', date)
  }

  /**
   * Get full path to the log file.
   */
  getFilePath(): string {
    return path.join(this.config.directory, this.getFileName())
  }

  /**
   * Get full path to a rotated log file.
   */
  getRotatedFilePath(timestamp: number): string {
    const fileName = this.getFileName().replace('.log', `.${timestamp}.log`)
    return path.join(this.config.directory, fileName)
  }

  /**
   * Write a log entry to the file.
   */
  async write(entry: string): Promise<void> {
    await this.ensureDirectory()

    const filePath = this.getFilePath()

    try {
      // Check current file size
      const stat = await fs.stat(filePath).catch(() => ({ size: 0 }))
      this.currentSize = stat.size

      // Rotate if needed
      if (this.currentSize > this.config.maxSize) {
        await this.rotate()
      }

      // Append log entry
      await fs.appendFile(filePath, entry + '\n')
      this.currentSize += entry.length + 1
    } catch (error) {
      fileLogger.error(`Failed to write log: ${error}`)
    }
  }

  /**
   * Rotate the current log file.
   */
  async rotate(): Promise<void> {
    if (!this.currentFile) {
      this.currentFile = this.getFilePath()
    }

    const timestamp = Date.now()
    const rotatedPath = this.getRotatedFilePath(timestamp)

    try {
      // Rename current file
      await fs.rename(this.currentFile, rotatedPath)
      fileLogger.info(`Rotated log file: ${this.currentFile} -> ${rotatedPath}`)

      // Reset size
      this.currentSize = 0
      this.rotationCount++

      // Clean up old files
      await this.cleanupOldFiles()
    } catch (error) {
      fileLogger.error(`Failed to rotate log: ${error}`)
    }
  }

  /**
   * Clean up old log files beyond maxFiles limit.
   */
  async cleanupOldFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.directory)
      const logFiles = files
        .filter(f => f.startsWith('tui-debug-') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.config.directory, f),
          mtime: 0
        }))

      // Get file stats
      for (const file of logFiles) {
        const stat = await fs.stat(file.path)
        file.mtime = stat.mtimeMs
      }

      // Sort by modification time (newest first)
      logFiles.sort((a, b) => b.mtime - a.mtime)

      // Keep only maxFiles
      if (logFiles.length > this.config.maxFiles) {
        const toDelete = logFiles.slice(this.config.maxFiles)

        for (const file of toDelete) {
          await fs.unlink(file.path)
          fileLogger.info(`Deleted old log file: ${file.name}`)
        }
      }
    } catch (error) {
      fileLogger.error(`Failed to cleanup old files: ${error}`)
    }
  }

  /**
   * Get current file size in bytes.
   */
  getCurrentSize(): number {
    return this.currentSize
  }

  /**
   * Get size formatted as human-readable string.
   */
  getFormattedSize(): string {
    const bytes = this.currentSize
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  /**
   * Read recent log entries from the current file.
   */
  async readRecent(lines = 100): Promise<string[]> {
    const filePath = this.getFilePath()

    try {
      if (!existsSync(filePath)) {
        return []
      }

      const content = await fs.readFile(filePath, 'utf-8')
      const allLines = content.split('\n').filter(line => line.trim())

      return allLines.slice(-lines)
    } catch (error) {
      fileLogger.error(`Failed to read log file: ${error}`)
      return []
    }
  }

  /**
   * Clear the current log file.
   */
  async clear(): Promise<void> {
    const filePath = this.getFilePath()

    try {
      if (existsSync(filePath)) {
        await fs.unlink(filePath)
        this.currentSize = 0
        fileLogger.info('Cleared log file')
      }
    } catch (error) {
      fileLogger.error(`Failed to clear log file: ${error}`)
    }
  }
}

/**
 * Singleton instance for global use.
 */
let globalFileLogger: FileLogger | null = null

/**
 * Get or create the global file logger instance.
 */
export function getGlobalFileLogger(config?: LogFileConfig): FileLogger {
  if (!globalFileLogger) {
    globalFileLogger = new FileLogger(config)
  }
  return globalFileLogger
}
