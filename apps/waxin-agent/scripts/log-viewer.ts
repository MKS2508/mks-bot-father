#!/usr/bin/env bun
/**
 * Real-time JSON Log Viewer - Synthwave84 style
 *
 * Parses JSONL logs and displays with badges, colors, and key-value formatting.
 * Features: clickable file links, full-width layout, color-coded output
 */

import { readFile, stat } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import figures from 'figures'
import Table from 'cli-table3'
import type { JsonLogEntry, LogMetrics } from '../src/lib/json-logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const LOG_DIR = resolve(__dirname, '../logs')
const LINES_TO_SHOW = 30
const POLL_INTERVAL = 200

// Dynamic terminal width - always fresh
function getWidth(): number {
  // Try to get width from tmux environment variable first
  const tmuxWidth = parseInt(process.env.TMUX_PANE_WIDTH || '', 10)
  if (tmuxWidth > 0) return tmuxWidth

  // Then try standard TTY
  if (process.stdout.isTTY && process.stdout.columns) {
    return process.stdout.columns
  }

  // Then try COLUMNS env var
  const envCols = parseInt(process.env.COLUMNS || '', 10)
  if (envCols > 0) return envCols

  // Final fallback
  return 120
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANSI COLORS - Synthwave84 Palette
// ═══════════════════════════════════════════════════════════════════════════════

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground - Synthwave84 inspired
  black: '\x1b[30m',
  white: '\x1b[97m',
  purple: '\x1b[38;5;141m',       // Soft purple
  magenta: '\x1b[38;5;213m',      // Hot pink
  cyan: '\x1b[38;5;87m',          // Neon cyan
  blue: '\x1b[38;5;75m',          // Electric blue
  green: '\x1b[38;5;84m',         // Neon green
  yellow: '\x1b[38;5;221m',       // Warm yellow
  red: '\x1b[38;5;203m',          // Coral red
  gray: '\x1b[38;5;244m',         // Medium gray
  orange: '\x1b[38;5;208m',       // Bright orange
  pink: '\x1b[38;5;218m',         // Light pink
  lime: '\x1b[38;5;154m',         // Lime green
  teal: '\x1b[38;5;44m',          // Teal

  // Background - Rich colors
  bgBlack: '\x1b[48;5;235m',      // Dark gray (not pure black)
  bgPurple: '\x1b[48;5;53m',      // Deep purple
  bgMagenta: '\x1b[48;5;125m',    // Magenta
  bgCyan: '\x1b[48;5;30m',        // Dark cyan
  bgBlue: '\x1b[48;5;24m',        // Dark blue
  bgGreen: '\x1b[48;5;22m',       // Dark green
  bgYellow: '\x1b[48;5;136m',     // Dark yellow/gold
  bgRed: '\x1b[48;5;52m',         // Dark red
  bgGray: '\x1b[48;5;239m',       // Gray
  bgOrange: '\x1b[48;5;130m'      // Dark orange
}

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════════

const levelBadge: Record<string, string> = {
  DBG: `${c.bgGray}${c.white} DBG ${c.reset}`,
  INF: `${c.bgBlue}${c.white}${c.bold} INF ${c.reset}`,
  WRN: `${c.bgYellow}${c.black}${c.bold} WRN ${c.reset}`,
  ERR: `${c.bgRed}${c.white}${c.bold} ERR ${c.reset}`
}

const levelIcon: Record<string, string> = {
  DBG: chalk.gray(figures.circle),
  INF: chalk.blue(figures.circleFilled),
  WRN: chalk.yellow(figures.warning),
  ERR: chalk.red(figures.cross)
}

const srcBadge: Record<string, string> = {
  TUI: `${c.bgPurple}${c.white}${c.bold} TUI   ${c.reset}`,
  AGENT: `${c.bgCyan}${c.black}${c.bold} AGENT ${c.reset}`,
  TOOL: `${c.bgMagenta}${c.white}${c.bold} TOOL  ${c.reset}`,
  STATS: `${c.bgGreen}${c.black}${c.bold} STATS ${c.reset}`,
  CONFIG: `${c.bgOrange}${c.black}${c.bold} CONF  ${c.reset}`
}

const srcIcon: Record<string, string> = {
  TUI: chalk.hex('#b381c5')(figures.pointer),
  AGENT: chalk.hex('#36f9f6')(figures.play),
  TOOL: chalk.hex('#ff7edb')(figures.star),
  STATS: chalk.hex('#72f1b8')(figures.square),
  CONFIG: chalk.hex('#ff8b39')(figures.hamburger)
}

// Custom Unicode icons
const icons = {
  check: '✓',
  cross: '✗',
  clock: '⏱',
  lightning: '◆',
  dollar: '$',
  file: '📄',
  gear: '⚙',
  folder: '📁',
  error: '⚠',
  info: 'ℹ',
  debug: '⚙',
  id: '🆔',
  ruler: '📏',
  wrench: '🔧',
  message: '💬',
  clipboard: '📋'
}

function getSrcBadge(src: string): string {
  const upper = src.toUpperCase()
  if (srcBadge[upper]) return srcBadge[upper]

  // Dynamic badge for unknown sources
  const padded = src.slice(0, 5).padEnd(5)
  return `${c.bgGray}${c.white} ${padded} ${c.reset}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALUE FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatValue(value: unknown): string {
  if (value === null) return `${c.dim}null${c.reset}`
  if (value === undefined) return `${c.dim}undef${c.reset}`

  if (typeof value === 'number') {
    // Highlight durations and costs
    if (Number.isInteger(value)) {
      return `${c.cyan}${value}${c.reset}`
    }
    // Show 2-4 decimal places for floats
    return `${c.cyan}${value.toFixed(value < 0.01 ? 4 : 2)}${c.reset}`
  }

  if (typeof value === 'boolean') {
    return value ? `${c.lime}✓${c.reset}` : `${c.red}✗${c.reset}`
  }

  if (typeof value === 'string') {
    // Duration patterns
    if (/^\d+\.?\d*(ms|s|sec|min)$/i.test(value)) {
      return `${c.yellow}${value}${c.reset}`
    }
    // Cost patterns
    if (/^\$[\d.]+$/.test(value)) {
      return `${c.green}${value}${c.reset}`
    }
    // Color hex patterns - truncate aggressively
    if (/^#[0-9a-fA-F]{6}$/.test(value) || /^#[0-9a-fA-F]{8}$/.test(value)) {
      return `${c.white}"${value.slice(0, 10)}...${c.reset}"`
    }
    // Truncate long strings
    if (value.length > 35) {
      return `${c.white}"${value.slice(0, 32)}..."${c.reset}`
    }
    return `${c.white}"${value}"${c.reset}`
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return `${c.dim}[]${c.reset}`
    return `${c.purple}[${value.length}]${c.reset}`
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value as object)
    if (keys.length === 0) return `${c.dim}{}${c.reset}`
    return `${c.purple}{${keys.length}}${c.reset}`
  }

  return String(value)
}

function formatKeyValue(key: string, value: unknown): string {
  // Color key based on common patterns
  let keyColor = c.pink
  if (key.includes('error') || key.includes('fail')) keyColor = c.red
  else if (key.includes('success') || key === 'success') keyColor = c.green
  else if (key.includes('time') || key.includes('duration') || key === 'ms') keyColor = c.yellow
  else if (key.includes('token') || key.includes('cost')) keyColor = c.cyan

  return `${keyColor}${key}${c.reset}${c.dim}=${c.reset}${formatValue(value)}`
}

// Get icon for data key
function getIconForKey(key: string): string {
  const iconMap: Record<string, string> = {
    duration: icons.clock,
    durationMs: icons.clock,
    tokens: icons.lightning,
    inputTokens: `${icons.lightning}→`,
    outputTokens: `→${icons.lightning}`,
    totalTokens: icons.lightning,
    cost: icons.dollar,
    costUsd: icons.dollar,
    errors: icons.error,
    error: icons.error,
    errorsCount: icons.error,
    success: icons.check,
    sessionId: icons.id,
    promptLength: icons.ruler,
    toolCallsCount: icons.wrench,
    messageType: icons.message,
    type: icons.clipboard,
    subtype: icons.clipboard,
  }

  return iconMap[key] || '•'
}

function formatMetrics(metrics: LogMetrics): string {
  const parts: string[] = []

  // Duration with color coding based on speed
  if (metrics.duration_ms !== undefined) {
    const dur = metrics.duration_ms
    let durColor = c.green  // Fast
    if (dur > 5000) durColor = c.red  // Slow
    else if (dur > 2000) durColor = c.yellow  // Medium

    const durStr = dur > 1000
      ? `${(dur / 1000).toFixed(1)}s`
      : `${dur.toFixed(0)}ms`
    parts.push(`${durColor}⏱ ${durStr}${c.reset}`)
  }

  // Token usage with visual indicator
  if (metrics.tokens) {
    const total = metrics.tokens.in + metrics.tokens.out
    parts.push(`${c.cyan}◆ ${metrics.tokens.in}→${metrics.tokens.out}${c.dim}(${total})${c.reset}`)
  }

  // Cost with dollar sign
  if (metrics.cost_usd !== undefined) {
    const cost = metrics.cost_usd
    let costColor = c.green  // Cheap
    if (cost > 0.1) costColor = c.red  // Expensive
    else if (cost > 0.01) costColor = c.yellow  // Medium

    parts.push(`${costColor}$ ${cost.toFixed(4)}${c.reset}`)
  }

  // Tool count with lightning bolt
  if (metrics.tool_count !== undefined && metrics.tool_count > 0) {
    parts.push(`${c.magenta}⚡ ${metrics.tool_count}${c.reset}`)
  }

  // Memory usage
  if (metrics.memory_mb !== undefined) {
    parts.push(`${c.gray}◧ ${metrics.memory_mb}MB${c.reset}`)
  }

  return parts.length > 0 ? `${c.dim}│${c.reset} ${parts.join(' ')}` : ''
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function stripAnsi(str: string): string {
  // Strip all ANSI/CSI escape sequences completely
  // Matches ESC [ ... followed by any parameter string and a letter
  let result = str.replace(/\x1b\[.*?[a-zA-Z]/g, '')
  // OSC 8 hyperlink sequences
  result = result.replace(/\x1b\]8;;[^\x07]*\x07/g, '')
  result = result.replace(/\x1b\]8;;[^\x1b]*\x1b\\/g, '')
  // OSC sequences with BEL or ST
  result = result.replace(/\x1b\][^\x07\x1b]*[\x07\x1b]/g, '')
  return result
}

function visibleLength(str: string): number {
  return stripAnsi(str).length
}

function padToRight(left: string, right: string): string {
  const width = getWidth()
  const leftLen = visibleLength(left)
  const rightLen = visibleLength(right)
  const padding = Math.max(1, width - leftLen - rightLen)
  return `${left}${' '.repeat(padding)}${right}`
}

function createDots(leftLen: number, rightLen: number): string {
  const width = getWidth()
  const dotsLen = Math.max(3, width - leftLen - rightLen - 2)
  return chalk.dim('·'.repeat(dotsLen))
}

// Create compact colored badge
function createBadge(key: string, value: unknown): string {
  const formatted = formatValue(value)

  // Determine color based on key
  let bgColor = c.bgGray
  let fgColor = c.white

  if (key.includes('success') || key === 'success') {
    bgColor = c.bgGreen
    fgColor = c.black
  } else if (key.includes('error') || key.includes('fail')) {
    bgColor = c.bgRed
    fgColor = c.white
  } else if (key.includes('token')) {
    bgColor = c.bgCyan
    fgColor = c.black
  } else if (key.includes('cost') || key.includes('duration')) {
    bgColor = c.bgYellow
    fgColor = c.black
  }

  return `${bgColor}${fgColor} ${key}=${formatted} ${c.reset}`
}

function formatData(data: Record<string, unknown>): string {
  const entries = Object.entries(data)
  if (entries.length === 0) return ''

  // For small datasets (<= 3 items), use inline badges
  if (entries.length <= 3) {
    const badges = entries.map(([k, v]) => createBadge(k, v))
    return badges.join(' ')
  }

  // For larger datasets, use cli-table3
  const table = new Table({
    chars: {
      top: '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      bottom: '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      left: '',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '',
      'right-mid': '',
      middle: ' │ '
    },
    style: {
      'padding-left': 0,
      'padding-right': 0
    },
    wordWrap: false
  })

  entries.forEach(([key, value]) => {
    const icon = getIconForKey(key)
    const formattedValue = formatValue(value)
    table.push([`${icon} ${chalk.dim(key)}`, formattedValue])
  })

  return '\n' + table.toString()
}

// Create button-like link with borders
function createFileLink(loc: string): string {
  const projectDir = resolve(__dirname, '..')
  const [relPath, line] = loc.split(':')
  const fullPath = resolve(projectDir, relPath)
  const url = `webstorm://open?file=${fullPath}&line=${line}`

  // Simple button with brackets
  const buttonText = `${icons.file} ${loc}`
  const styledButton = `${c.bgPurple}${c.white}[${buttonText}]${c.reset}`

  return `\x1b]8;;${url}\x07${styledButton}\x1b]8;;\x07`
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOG LINE FORMATTER
// ═══════════════════════════════════════════════════════════════════════════════

function formatLogLine(line: string): string | null {
  if (!line.trim()) return null

  try {
    const entry = JSON.parse(line) as JsonLogEntry

    // Extract time HH:MM:SS.mmm (compact)
    const timePart = entry.ts.split('T')[1]
    const time = timePart ? timePart.slice(0, 12) : entry.ts.slice(0, 12)

    // Build left side: level + source + message
    const lvlBadge = levelBadge[entry.level] || levelBadge['INF']
    const source = getSrcBadge(entry.src)

    // Message with highlighting
    let msgStr = entry.msg

    // Highlight patterns based on log level
    if (entry.level === 'ERR') {
      msgStr = `${c.red}${msgStr}${c.reset}`
    } else if (entry.level === 'WRN') {
      msgStr = `${c.yellow}${msgStr}${c.reset}`
    } else {
      // Highlight patterns in normal messages
      msgStr = msgStr
        .replace(/(\d+\.?\d*)(ms|s|sec)/gi, `${c.yellow}$1$2${c.reset}`)
        .replace(/(\$\d+\.?\d*)/g, `${c.green}$1${c.reset}`)
        .replace(/\b(success|complete|completed|done)\b/gi, `${c.green}$1${c.reset}`)
        .replace(/\b(error|fail|failed|exception)\b/gi, `${c.red}$1${c.reset}`)
        .replace(/\b(starting|calling|processing)\b/gi, `${c.cyan}$1${c.reset}`)
        .replace(/"([^"]+)"/g, `${c.white}"$1"${c.reset}`)  // Quoted strings
    }

    // Left side: badges + message
    let leftPart = `${lvlBadge} ${source} ${msgStr}`

    // Add metrics inline if present
    let metricsStr = ''
    if (entry.metrics) {
      metricsStr = formatMetrics(entry.metrics)
    }

    // Right side: caller location (clickable) + timestamp
    // Normalize to consistent width by padding visible text BEFORE wrapping in OSC 8
    const LOC_WIDTH = 25 // chars reserved for location
    const TIME_WIDTH = 12 // chars for timestamp "HH:MM:SS.mmm"
    const SEP = '│ '
    const RIGHT_PART_WIDTH = LOC_WIDTH + 1 + SEP.length + TIME_WIDTH // 25 + 1 + 2 + 12 = 40

    let rightPart = ''

    if (entry.loc) {
      // Pad the visible text BEFORE wrapping in OSC 8 link
      const locPaddedVisible = entry.loc.padEnd(LOC_WIDTH, ' ')
      const locLink = createFileLink(locPaddedVisible)
      const timeStr = chalk.hex('#36f9f6')(time)
      rightPart = `${locLink}${chalk.dim(SEP)}${timeStr}`
    } else {
      // No location - just spaces
      const locPadded = ' '.repeat(LOC_WIDTH)
      const timeStr = chalk.hex('#36f9f6')(time)
      rightPart = `${locPadded}${chalk.dim(SEP)}${timeStr}`
    }

    // For dot calculation, use fixed width since right part should always be consistent
    const leftLen = visibleLength(leftPart) + (metricsStr ? visibleLength(metricsStr) + 1 : 0)
    const rightLen = RIGHT_PART_WIDTH

    // Create dot-filled line
    const dots = createDots(leftLen, rightLen)
    let output = metricsStr
      ? `${leftPart} ${metricsStr} ${dots} ${rightPart}`
      : `${leftPart} ${dots} ${rightPart}`

    // Add data on new line with tree connector if present
    if (entry.data && Object.keys(entry.data).length > 0) {
      const indent = ' '.repeat(7)
      output += `\n${indent}${c.dim}└──${c.reset} ${formatData(entry.data)}`
    }

    return output
  } catch {
    // Not JSON, try legacy format
    const match = line.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)/)
    if (match) {
      const [, timestamp, level, component, message] = match
      const time = timestamp.includes('T')
        ? timestamp.split('T')[1]?.slice(0, 8)
        : timestamp.slice(11, 19)
      const timeStr = `${c.dim}${time}${c.reset}`
      const lvlBadge = levelBadge[level?.toUpperCase() || 'INF'] || levelBadge['INF']
      const source = getSrcBadge(component || 'SYS')
      return `${timeStr} ${lvlBadge} ${source} ${c.dim}${message}${c.reset}`
    }

    // Raw line (non-JSON)
    return `${c.dim}${line}${c.reset}`
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getLogFile(): string {
  const today = new Date().toISOString().split('T')[0]
  // Try new format first, fallback to old
  const newFormat = resolve(LOG_DIR, `waxin-${today}.jsonl`)
  const oldFormat = resolve(LOG_DIR, `tui-debug-${today}.log`)

  try {
    if (require('fs').existsSync(newFormat)) return newFormat
    if (require('fs').existsSync(oldFormat)) return oldFormat
  } catch {}

  return newFormat
}

async function readLastLines(filePath: string, n: number): Promise<string[]> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n').filter((l) => l.trim())
    return lines.slice(-n)
  } catch {
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════════════════════════

function printHeader(logFile: string, lineCount?: number, isFirstPrint = false) {
  const width = getWidth()
  const titleText = `${icons.lightning} WAXIN AGENT - LIVE LOG VIEWER`

  // Box-drawing characters
  const box = {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    leftT: '╠',
    rightT: '╣'
  }

  // Top border
  const topBorder = box.topLeft + box.horizontal.repeat(width - 2) + box.topRight

  // Calculate padding for centered title
  const padding = Math.max(0, Math.floor((width - 2 - titleText.length) / 2))
  const titlePadding = ' '.repeat(padding)

  // Title line with borders
  const titleLine = box.vertical + titlePadding + chalk.hex('#b381c5').white.bold(titleText) + ' '.repeat(Math.max(0, width - 2 - padding - titleText.length)) + box.vertical

  // Info section with borders
  const fileIcon = chalk.hex('#36f9f6')(icons.file)
  const fileInfo = `${fileIcon} ${chalk.dim('File:')} ${chalk.hex('#36f9f6')(logFile)}`

  const countIcon = chalk.hex('#fede5d')(figures.bullet)
  const linesInfo = lineCount !== undefined
    ? `${countIcon} ${chalk.dim('Lines:')} ${chalk.hex('#fede5d')(String(lineCount))}`
    : ''

  // Info line with borders
  let infoLine: string
  if (linesInfo) {
    const infoContent = padToRight(fileInfo, linesInfo)
    infoLine = box.vertical + ' ' + infoContent + ' '.repeat(Math.max(0, width - 3 - visibleLength(infoContent))) + box.vertical
  } else {
    infoLine = box.vertical + ' ' + fileInfo + ' '.repeat(Math.max(0, width - 3 - visibleLength(fileInfo))) + box.vertical
  }

  // Separator line with T-junctions
  const separatorLine = box.leftT + box.horizontal.repeat(width - 2) + box.rightT

  // Empty line for spacing
  const emptyLine = box.vertical + ' '.repeat(width - 2) + box.vertical

  // Only clear screen on first print, not on resize
  if (isFirstPrint) {
    console.clear()
  }

  console.log(topBorder)
  console.log(emptyLine)
  console.log(titleLine)
  console.log(emptyLine)
  console.log(infoLine)
  console.log(separatorLine)
  console.log('')
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const logFile = getLogFile()

  let lastSize = 0
  let processedLines = new Set<string>()

  // Initial read
  const initialLines = await readLastLines(logFile, LINES_TO_SHOW)

  // Print header with line count (first print clears screen)
  printHeader(logFile, initialLines.length, true)

  initialLines.forEach((line) => {
    processedLines.add(line)
    const formatted = formatLogLine(line)
    if (formatted) console.log(formatted)
  })

  try {
    const stats = await stat(logFile)
    lastSize = stats.size
  } catch {}

  // Watch for changes
  const checkForUpdates = async () => {
    try {
      const stats = await stat(logFile)

      if (stats.size > lastSize) {
        const allLines = await readLastLines(logFile, LINES_TO_SHOW + 20)

        // Find truly new lines
        allLines.forEach((line) => {
          if (!processedLines.has(line)) {
            processedLines.add(line)
            const formatted = formatLogLine(line)
            if (formatted) console.log(formatted)
          }
        })

        // Keep processedLines manageable
        if (processedLines.size > 1000) {
          const arr = Array.from(processedLines)
          processedLines = new Set(arr.slice(-500))
        }

        lastSize = stats.size
      }
    } catch {}
  }

  // Poll for updates
  setInterval(checkForUpdates, POLL_INTERVAL)

  // Handle terminal resize - just update width, don't reprint
  process.stdout.on('resize', () => {
    // Width will be recalculated on next render via getWidth()
  })

  // Handle exit
  process.on('SIGINT', () => {
    const width = getWidth()
    const box = {
      topLeft: '╔',
      topRight: '╗',
      bottomLeft: '╚',
      bottomRight: '╝',
      horizontal: '═',
      vertical: '║',
    }

    const message = `${icons.info} Log viewer stopped`
    const padding = Math.max(0, Math.floor((width - 2 - message.length) / 2))

    console.log('')
    console.log(box.vertical + ' '.repeat(width - 2) + box.vertical)
    console.log(box.vertical + ' '.repeat(padding) + chalk.hex('#fede5d')(message) + ' '.repeat(Math.max(0, width - 2 - padding - message.length)) + box.vertical)
    console.log(box.bottomLeft + box.horizontal.repeat(width - 2) + box.bottomRight)
    process.exit(0)
  })
}

main()
