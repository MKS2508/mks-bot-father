/**
 * Log Line Formatter
 *
 * Formats log lines with proper ANSI-aware width calculation to fix layout issues
 * Uses 256-bit colors from original log-viewer for authentic look
 */

import type { JsonLogEntry, LogLevel, ThemeColors } from '../types/index.js'

export interface FormatOptions {
  maxWidth: number
  showLineNumbers: boolean
  wrapLines: boolean
  theme: ThemeColors
}

export interface FormattedLine {
  text: string
  visibleWidth: number
  hasData: boolean
  hasMetrics: boolean
}

// 256-bit color codes from original log-viewer
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  white: '\x1b[38;5;15m',
  black: '\x1b[38;5;0m',
  gray: '\x1b[38;5;244m',
  purple: '\x1b[38;5;141m',
  magenta: '\x1b[38;5;213m',
  cyan: '\x1b[38;5;87m',
  cyanNeon: '\x1b[38;5;45m', // #36f9f6 equivalent
  blue: '\x1b[38;5;75m',
  green: '\x1b[38;5;84m',
  lime: '\x1b[38;5;154m',
  yellow: '\x1b[38;5;221m',
  red: '\x1b[38;5;203m',
  coral: '\x1b[38;5;208m',
  pink: '\x1b[38;5;218m',
  orange: '\x1b[38;5;208m',

  // Background colors
  bgGray: '\x1b[48;5;239m',
  bgPurple: '\x1b[48;5;53m',
  bgCyan: '\x1b[48;5;30m',
  bgBlue: '\x1b[48;5;24m',
  bgGreen: '\x1b[48;5;22m',
  bgYellow: '\x1b[48;5;136m',
  bgRed: '\x1b[48;5;52m',
  bgOrange: '\x1b[48;5;130m',
  bgMagenta: '\x1b[48;5;125m',
}

/**
 * Strip ANSI and OSC 8 sequences for visible width calculation
 */
function stripAll(str: string): string {
  let result = str

  // Strip CSI sequences (ESC [ ... letter)
  result = result.replace(/\x1b\[.*?[a-zA-Z]/g, '')

  // Strip OSC 8 hyperlink sequences (ESC ] 8 ;; ... ESC \ or BEL)
  result = result.replace(/\x1b\]8;;[^\x07]*\x07/g, '')
  result = result.replace(/\x1b\]8;;[^\x1b]*\x1b\\/g, '')

  // Strip other OSC sequences
  result = result.replace(/\x1b\][^\x07\x1b]*[\x07\x1b]/g, '')

  return result
}

export class LogFormatter {
  private options: FormatOptions

  constructor(options: FormatOptions) {
    this.options = options
  }

  /**
   * Calculate visible width (ignoring ANSI and OSC 8 codes)
   */
  static calculateVisibleWidth(str: string): number {
    return stripAll(str).length
  }

  /**
   * Truncate string to max width while preserving ANSI codes
   * Only truncates plain text, preserves all ANSI codes
   */
  static truncateWithAnsi(str: string, maxWidth: number): string {
    if (LogFormatter.calculateVisibleWidth(str) <= maxWidth) {
      return str
    }

    // Simple: truncate the stripped version and add ellipsis
    // This is safer than trying to preserve ANSI codes during truncation
    const stripped = stripAll(str)
    const ellipsis = '...'
    const targetLen = maxWidth - ellipsis.length

    if (targetLen <= 0) {
      return ellipsis
    }

    return stripped.slice(0, targetLen) + ellipsis
  }

  /**
   * Create level badge - using exact 256-bit colors from original
   */
  private createLevelBadge(level: LogLevel): string {
    const configs: Record<string, { bg: string; fg: string; bold: string }> = {
      DBG: { bg: C.bgGray, fg: C.white, bold: '' },
      INF: { bg: C.bgBlue, fg: C.white, bold: C.bold },
      WRN: { bg: C.bgYellow, fg: C.black, bold: C.bold },
      ERR: { bg: C.bgRed, fg: C.white, bold: C.bold },
    }

    const config = configs[level] || configs.INF
    const padded = ` ${level} `
    return `${config.bg}${config.fg}${config.bold}${padded}${C.reset}`
  }

  /**
   * Create source badge - using exact 256-bit colors from original
   */
  private createSourceBadge(source: string): string {
    const configs: Record<string, { bg: string; fg: string; bold: string }> = {
      TUI: { bg: C.bgPurple, fg: C.white, bold: C.bold },
      AGENT: { bg: C.bgCyan, fg: C.black, bold: C.bold },
      TOOL: { bg: C.bgMagenta, fg: C.white, bold: C.bold },
      STATS: { bg: C.bgGreen, fg: C.black, bold: C.bold },
      CONFIG: { bg: C.bgOrange, fg: C.black, bold: C.bold },
    }

    const config = configs[source] || { bg: C.bgGray, fg: C.white, bold: '' }
    const padded = source.slice(0, 5).padEnd(6)
    return `${config.bg}${config.fg}${config.bold}${padded}${C.reset}`
  }

  /**
   * Format timestamp with cyan neon color from original
   */
  private formatTimestamp(ts: string): string {
    const timePart = ts.split('T')[1]
    const time = timePart ? timePart.slice(0, 12) : ts.slice(0, 12)
    return `${C.cyanNeon}${time}${C.reset}`
  }

  /**
   * Create OSC 8 clickable link for file location
   */
  private createFileLink(loc: string): string {
    const buttonText = `${C.bgPurple}${C.white} [${loc}] ${C.reset}`
    // Using a simple file:// URL that terminals can open
    return `\x1b]8;;file://${loc}\x07${buttonText}\x1b]8;;\x07`
  }

  /**
   * Format metrics with color coding based on values
   */
  private formatMetrics(entry: JsonLogEntry): string {
    if (!entry.metrics) return ''

    const parts: string[] = []

    if (entry.metrics.duration_ms !== undefined) {
      const dur = entry.metrics.duration_ms
      const durStr = dur > 1000 ? `${(dur / 1000).toFixed(1)}s` : `${dur.toFixed(0)}ms`
      // Green (<2s), Yellow (2-5s), Red (>5s)
      let color = C.green
      if (dur > 5000) color = C.red
      else if (dur > 2000) color = C.yellow
      parts.push(`${color}⏱ ${durStr}${C.reset}`)
    }

    if (entry.metrics.tokens) {
      const total = entry.metrics.tokens.in + entry.metrics.tokens.out
      parts.push(`${C.cyan}◆ ${entry.metrics.tokens.in}→${entry.metrics.tokens.out}${C.dim}(${total})${C.reset}`)
    }

    if (entry.metrics.cost_usd !== undefined) {
      const cost = entry.metrics.cost_usd
      // Green (<0.01), Yellow (0.01-0.1), Red (>0.1)
      let color = C.green
      if (cost > 0.1) color = C.red
      else if (cost > 0.01) color = C.yellow
      parts.push(`${color}$ ${cost.toFixed(4)}${C.reset}`)
    }

    if (entry.metrics.tool_count !== undefined && entry.metrics.tool_count > 0) {
      parts.push(`${C.magenta}⚡ ${entry.metrics.tool_count}${C.reset}`)
    }

    return parts.length > 0 ? `${C.dim}│${C.reset} ${parts.join(' ')}` : ''
  }

  /**
   * Format data object as colored badges (small datasets) or key=value (large)
   */
  private formatData(data: Record<string, unknown>): string {
    const entries = Object.entries(data)
    if (entries.length === 0) return ''

    // For small datasets (<= 3 items), use inline badges
    if (entries.length <= 3) {
      const badges = entries.map(([k, v]) => this.createDataBadge(k, v))
      return badges.join(' ')
    }

    // For larger datasets, use key=value format
    const formatted = entries.map(([key, value]) => {
      let keyColor = C.pink
      if (key.includes('error') || key.includes('fail')) keyColor = C.red
      else if (key.includes('success') || key === 'success') keyColor = C.lime
      else if (key.includes('token')) keyColor = C.cyan
      else if (key.includes('cost') || key.includes('duration')) keyColor = C.yellow

      let formattedValue: string
      if (value === null) {
        formattedValue = `${C.dim}null${C.reset}`
      } else if (value === undefined) {
        formattedValue = `${C.dim}undef${C.reset}`
      } else if (typeof value === 'boolean') {
        formattedValue = value ? `${C.lime}✓${C.reset}` : `${C.red}✗${C.reset}`
      } else if (typeof value === 'number') {
        formattedValue = `${C.cyan}${value}${C.reset}`
      } else if (typeof value === 'string') {
        formattedValue = `${C.white}"${value.slice(0, 30)}${value.length > 30 ? '...' : ''}"${C.reset}`
      } else if (Array.isArray(value)) {
        formattedValue = `${C.purple}[${value.length}]${C.reset}`
      } else if (typeof value === 'object') {
        formattedValue = `${C.purple}{${Object.keys(value).length}}${C.reset}`
      } else {
        formattedValue = String(value)
      }

      return `${keyColor}${key}${C.reset}${C.dim}=${C.reset}${formattedValue}`
    })

    return formatted.join(' ')
  }

  /**
   * Create a data badge with background color
   */
  private createDataBadge(key: string, value: unknown): string {
    let bgColor = C.bgGray
    let fgColor = C.white

    if (key.includes('success') || key === 'success') {
      bgColor = C.bgGreen
      fgColor = C.black
    } else if (key.includes('error') || key.includes('fail')) {
      bgColor = C.bgRed
      fgColor = C.white
    } else if (key.includes('token')) {
      bgColor = C.bgCyan
      fgColor = C.black
    } else if (key.includes('cost') || key.includes('duration')) {
      bgColor = C.bgYellow
      fgColor = C.black
    }

    const formatted = this.formatValueSimple(value)
    const padded = ` ${key}=${formatted} `
    return `${bgColor}${fgColor}${padded}${C.reset}`
  }

  /**
   * Simple value formatter for badges
   */
  private formatValueSimple(value: unknown): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undef'
    if (typeof value === 'boolean') return value ? '✓' : '✗'
    if (typeof value === 'number') return String(value)
    if (typeof value === 'string') return value.slice(0, 20)
    if (Array.isArray(value)) return `[${value.length}]`
    if (typeof value === 'object') return `{${Object.keys(value).length}}`
    return String(value)
  }

  /**
   * Create dot separator for spacing
   */
  private createDots(leftLen: number, rightLen: number): string {
    const dotsLen = Math.max(0, this.options.maxWidth - leftLen - rightLen - 2)
    if (dotsLen <= 0) return ' '
    return `${C.dim}${'·'.repeat(dotsLen)}${C.reset}`
  }

  /**
   * Format a complete log line
   */
  formatEntry(entry: JsonLogEntry, lineNumber?: number): FormattedLine {
    const timestamp = this.formatTimestamp(entry.ts)
    const LOC_WIDTH = 25 // Width reserved for location
    const TIME_WIDTH = 12 // Width for timestamp "HH:MM:SS.mmm"
    const SEP = '│ '

    // Build left part (everything except location and timestamp)
    const parts: string[] = []

    // Line number
    if (lineNumber !== undefined && this.options.showLineNumbers) {
      parts.push(`${C.dim}${String(lineNumber).padStart(4)}${C.reset}`)
    }

    // Level and source badges
    parts.push(this.createLevelBadge(entry.level))
    parts.push(this.createSourceBadge(entry.src))

    // Calculate fixed badge widths (visible only)
    const fixedWidths = (lineNumber !== undefined && this.options.showLineNumbers ? 4 : 0) +
                        5 + // level badge " DBG "
                        6   // source badge "AGENT "

    // Message - truncate if too long (reserve space for right side)
    const rightSideWidth = LOC_WIDTH + SEP.length + TIME_WIDTH
    const maxMsgWidth = this.options.maxWidth - rightSideWidth - fixedWidths - 20 // safety margin

    let msg = entry.msg
    if (maxMsgWidth > 0 && LogFormatter.calculateVisibleWidth(msg) > maxMsgWidth) {
      msg = LogFormatter.truncateWithAnsi(msg, maxMsgWidth - 3)
    }
    if (entry.level === 'ERR') {
      msg = `${C.red}${msg}${C.reset}`
    } else if (entry.level === 'WRN') {
      msg = `${C.yellow}${msg}${C.reset}`
    }
    parts.push(msg)

    // Metrics
    const metrics = this.formatMetrics(entry)
    if (metrics) {
      parts.push(metrics)
    }

    // Build left part
    const leftPart = parts.join(' ')
    const leftWidth = LogFormatter.calculateVisibleWidth(leftPart)

    // Build right part (location + timestamp)
    let rightPart = ''
    if (entry.loc) {
      const locPadded = entry.loc.padEnd(LOC_WIDTH, ' ')
      const locLink = this.createFileLink(locPadded)
      rightPart = `${locLink}${C.dim}${SEP}${C.reset}${timestamp}`
    } else {
      const locSpaces = ' '.repeat(LOC_WIDTH)
      rightPart = `${locSpaces}${C.dim}${SEP}${C.reset}${timestamp}`
    }

    // Calculate right part visible width (location without OSC link)
    const rightWidth = LOC_WIDTH + SEP.length + TIME_WIDTH

    // Create dot separator and build final line
    const dots = this.createDots(leftWidth, rightWidth)
    const finalLine = `${leftPart} ${dots} ${rightPart}`

    // Add data on next line if present
    const hasData = !!(entry.data && Object.keys(entry.data).length > 0)
    let finalLineWithText = finalLine
    if (hasData) {
      const dataStr = this.formatData(entry.data || {})
      const indent = ' '.repeat(7)
      finalLineWithText += `\n${indent}${C.dim}└──${C.reset} ${dataStr}`
    }

    return {
      text: finalLineWithText,
      visibleWidth: LogFormatter.calculateVisibleWidth(finalLine),
      hasData,
      hasMetrics: !!entry.metrics
    }
  }

  /**
   * Format multiple entries
   */
  formatEntries(entries: JsonLogEntry[]): string[] {
    return entries.map((entry, index) => this.formatEntry(entry, index + 1).text)
  }
}
