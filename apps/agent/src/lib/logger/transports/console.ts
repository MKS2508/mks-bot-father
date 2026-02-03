/**
 * Console Transport
 *
 * Writes log entries to console with optional colors.
 */

import type { LogTransport, JsonLogEntry, ConsoleTransportOptions } from '../types.js'

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
}

const LEVEL_COLORS: Record<string, string> = {
  'DBG': COLORS.gray,
  'INF': COLORS.blue,
  'WRN': COLORS.yellow,
  'ERR': COLORS.red
}

const ICONS: Record<string, string> = {
  'DBG': '·',
  'INF': '●',
  'WRN': '▸',
  'ERR': '✖'
}

/**
 * Format timestamp for console output
 */
function formatTimestamp(ts: string, showTime: boolean): string {
  if (!showTime) return ''
  const date = new Date(ts)
  const time = date.toTimeString().split(' ')[0] // HH:MM:SS
  return `${COLORS.dim}${time}${COLORS.reset} `
}

/**
 * Format source for console output
 */
function formatSource(src: string): string {
  return `${COLORS.cyan}[${src}]${COLORS.reset}`
}

/**
 * Format message with data
 */
function formatMessage(msg: string, data?: Record<string, unknown>): string {
  let output = msg
  if (data && Object.keys(data).length > 0) {
    const dataStr = Object.entries(data)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ')
    output += ` ${COLORS.dim}${dataStr}${COLORS.reset}`
  }
  return output
}

/**
 * Console transport for terminal logging
 */
export class ConsoleTransport implements LogTransport {
  name = 'console'
  private colors: boolean
  private timestamp: boolean

  constructor(options: ConsoleTransportOptions = {}) {
    this.colors = options.colors !== false
    this.timestamp = options.timestamp !== false
  }

  log(entry: JsonLogEntry): void {
    const { level, src, msg, data, metrics } = entry

    // Build log line
    let line = ''

    if (this.colors) {
      // Timestamp
      line += formatTimestamp(entry.ts, this.timestamp)

      // Level icon
      line += `${LEVEL_COLORS[level]}${ICONS[level]}${COLORS.reset} `

      // Source
      line += formatSource(src)

      // Message
      line += ' ' + formatMessage(msg, data)

      // Metrics
      if (metrics) {
        const metricsParts: string[] = []
        if (metrics.duration_ms) metricsParts.push(`${metrics.duration_ms}ms`)
        if (metrics.tokens) metricsParts.push(`${metrics.tokens.in + metrics.tokens.out}t`)
        if (metrics.cost_usd) metricsParts.push(`$${metrics.cost_usd}`)
        if (metrics.tool_count) metricsParts.push(`${metrics.tool_count} tools`)

        if (metricsParts.length > 0) {
          line += ` ${COLORS.dim}[${metricsParts.join(', ')}]${COLORS.reset}`
        }
      }
    } else {
      // Plain text without colors
      if (this.timestamp) {
        const date = new Date(entry.ts)
        line += date.toTimeString().split(' ')[0] + ' '
      }
      line += `[${level}] [${src}] ${msg}`

      if (data && Object.keys(data).length > 0) {
        line += ' ' + JSON.stringify(data)
      }

      if (metrics) {
        const metricsParts: string[] = []
        if (metrics.duration_ms) metricsParts.push(`${metrics.duration_ms}ms`)
        if (metrics.tokens) metricsParts.push(`${metrics.tokens.in + metrics.tokens.out}t`)
        if (metrics.cost_usd) metricsParts.push(`$${metrics.cost_usd}`)

        if (metricsParts.length > 0) {
          line += ` [${metricsParts.join(', ')}]`
        }
      }
    }

    // Write to appropriate console stream
    if (level === 'ERR') {
      console.error(line)
    } else {
      console.log(line)
    }
  }
}

/**
 * Create a console transport
 */
export function consoleTransport(options: ConsoleTransportOptions = {}): ConsoleTransport {
  return new ConsoleTransport(options)
}
