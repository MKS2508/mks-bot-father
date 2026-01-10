/**
 * Log Viewer Entry Point
 *
 * Loads .env, parses CLI args, and starts the TUI application
 */

import { resolve } from 'path'
import { statSync } from 'fs'
import { LogViewerApp } from './app.js'
import type { ParsedArgs } from './config/types.js'
import type { LogLevel } from './types/index.js'
import { HELP_TEXT, defaultConfig } from './config/default.js'

/**
 * Parse CLI arguments
 */
function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2)
  const parsed: ParsedArgs = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    // Help
    if (arg === '--help' || arg === '-h') {
      parsed.help = true
      return parsed
    }

    // File
    if (arg === '--file' || arg === '-f') {
      parsed.file = args[++i]
      continue
    }

    // Level
    if (arg === '--level' || arg === '-l') {
      parsed.level = args[++i]
      continue
    }

    // Source
    if (arg === '--source' || arg === '-s') {
      parsed.source = args[++i]
      continue
    }

    // Search
    if (arg === '--search') {
      parsed.search = args[++i]
      continue
    }

    // Watch
    if (arg === '--watch' || arg === '-w') {
      parsed.watch = true
      continue
    }

    // Positional argument (file path)
    if (!arg.startsWith('-')) {
      parsed.file = arg
    }
  }

  return parsed
}

/**
 * Parse level string to array
 */
function parseLevels(levelStr?: string): LogLevel[] {
  if (!levelStr) return defaultConfig.filters.defaultLevels

  const levels: LogLevel[] = []
  for (const l of levelStr.split(',')) {
    const upper = l.trim().toUpperCase() as LogLevel
    if (['DBG', 'INF', 'WRN', 'ERR', 'ALL'].includes(upper)) {
      levels.push(upper)
    }
  }

  return levels.length > 0 ? levels : defaultConfig.filters.defaultLevels
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Parse CLI args
  const args = parseArgs()

  // Show help if requested
  if (args.help) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  // Resolve log directory or file
  let logDir: string
  let specificFile: string | undefined

  if (args.file) {
    const resolvedPath = resolve(process.cwd(), args.file)
    let stat: ReturnType<typeof statSync> | null
    try {
      stat = statSync(resolvedPath)
    } catch {
      stat = null
    }

    if (stat && stat.isDirectory()) {
      logDir = resolvedPath
    } else if (stat && stat.isFile()) {
      // It's a file, extract directory from it
      logDir = resolve(resolvedPath, '..')
      specificFile = resolvedPath
    } else {
      // Doesn't exist, assume it's a directory
      logDir = resolvedPath
    }
  } else {
    logDir = resolve(process.cwd(), 'logs')
  }

  // Build config
  const config = {
    logDir,
    logFilePattern: 'waxin-*.jsonl',
    refreshInterval: 100,
    maxLines: 10000,
    scrollback: 1000,
    theme: 'synthwave84' as const,
    filters: {
      defaultLevels: parseLevels(args.level),
      defaultSources: args.source ? args.source.split(',').map(s => s.trim()) : []
    },
    layout: defaultConfig.layout
  }

  // Create and start app
  const app = new LogViewerApp(config)

  try {
    await app.start(specificFile)
  } catch (error) {
    console.error('Failed to start log viewer:', error)
    process.exit(1)
  }
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
