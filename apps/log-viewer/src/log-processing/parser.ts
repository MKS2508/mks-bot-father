/**
 * JSONL Log Parser
 *
 * Parses JSONL log files and handles legacy format fallback
 */

import { readdirSync, statSync } from 'fs'
import { resolve } from 'path'
import { readFile } from 'fs/promises'
import type { JsonLogEntry, LogFile } from '../types/index.js'

export interface ParseResult {
  entries: JsonLogEntry[]
  error?: string
}

export class LogParser {
  /**
   * Parse a JSONL log file
   */
  static async parseFile(filePath: string): Promise<ParseResult> {
    try {
      const content = await readFile(filePath, 'utf-8')
      const lines = content.split('\n').filter((l: string) => l.trim())
      const entries: JsonLogEntry[] = []

      for (const line of lines) {
        const result = LogParser.parseLine(line)
        if (result) {
          entries.push(result)
        }
      }

      return { entries }
    } catch (error) {
      return {
        entries: [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Parse a single log line
   */
  static parseLine(line: string): JsonLogEntry | null {
    if (!line.trim()) return null

    try {
      return JSON.parse(line) as JsonLogEntry
    } catch {
      // Try legacy format: [timestamp] [level] [component] message
      const match = line.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)/)
      if (match) {
        const [, timestamp, level, component, message] = match
        return {
          ts: timestamp,
          level: level.toUpperCase() as JsonLogEntry['level'],
          src: component || 'SYS',
          msg: message
        }
      }

      // Raw line (non-JSON, non-legacy)
      return {
        ts: new Date().toISOString(),
        level: 'INF',
        src: 'RAW',
        msg: line
      }
    }
  }

  /**
   * Discover all log files matching the pattern
   */
  static discoverLogFiles(logDir: string, pattern: string = 'waxin-*.jsonl'): LogFile[] {
    try {
      const files = readdirSync(logDir)
      const regex = new RegExp(pattern.replace('*', '.*'))

      return files
        .filter((f) => regex.test(f))
        .map((f) => {
          const dateMatch = f.match(/\d{4}-\d{2}-\d{2}/)
          const date = dateMatch ? new Date(dateMatch[0]) : new Date()
          const filePath = resolve(logDir, f)

          let entryCount: number | undefined
          try {
            const stats = statSync(filePath)
            // Rough estimate: 200 bytes per log entry average
            entryCount = Math.floor(stats.size / 200)
          } catch {}

          return {
            name: f,
            date,
            path: filePath,
            entryCount
          }
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime())
    } catch {
      return []
    }
  }

  /**
   * Get today's log file path
   */
  static getTodayLogPath(logDir: string): string {
    const today = new Date().toISOString().split('T')[0]
    return resolve(logDir, `waxin-${today}.jsonl`)
  }

  /**
   * Get default log file (today's if exists, otherwise newest)
   */
  static getDefaultLogFile(logDir: string): string {
    const todayPath = LogParser.getTodayLogPath(logDir)
    const files = LogParser.discoverLogFiles(logDir)

    // Prefer today's file
    if (files.some((f) => f.path === todayPath)) {
      return todayPath
    }

    // Otherwise return newest
    return files[0]?.path || todayPath
  }
}
