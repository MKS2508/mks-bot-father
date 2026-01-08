/**
 * Logger utility for the Bot Manager Agent.
 */

import chalk from 'chalk'

const PREFIXES = {
  info: chalk.blue('ℹ'),
  success: chalk.green('✓'),
  warn: chalk.yellow('⚠'),
  error: chalk.red('✗'),
  debug: chalk.gray('●'),
  assistant: chalk.cyan('🤖'),
  tool: chalk.magenta('🔧'),
  toolResult: chalk.green('📤')
}

function formatTimestamp(): string {
  return chalk.gray(`[${new Date().toISOString().slice(11, 19)}]`)
}

export const logger = {
  info(message: string, ...args: unknown[]) {
    console.log(`${formatTimestamp()} ${PREFIXES.info} ${message}`, ...args)
  },

  success(message: string, ...args: unknown[]) {
    console.log(`${formatTimestamp()} ${PREFIXES.success} ${chalk.green(message)}`, ...args)
  },

  warn(message: string, ...args: unknown[]) {
    console.log(`${formatTimestamp()} ${PREFIXES.warn} ${chalk.yellow(message)}`, ...args)
  },

  error(message: string, ...args: unknown[]) {
    console.error(`${formatTimestamp()} ${PREFIXES.error} ${chalk.red(message)}`, ...args)
  },

  debug(message: string, ...args: unknown[]) {
    if (process.env.DEBUG) {
      console.log(`${formatTimestamp()} ${PREFIXES.debug} ${chalk.gray(message)}`, ...args)
    }
  },

  assistant(message: string) {
    console.log(`${formatTimestamp()} ${PREFIXES.assistant} ${message}`)
  },

  tool(message: string) {
    console.log(`${formatTimestamp()} ${PREFIXES.tool} ${chalk.magenta(message)}`)
  },

  toolResult(tool: string, result: unknown) {
    const preview = typeof result === 'string'
      ? result.slice(0, 100)
      : JSON.stringify(result).slice(0, 100)
    console.log(`${formatTimestamp()} ${PREFIXES.toolResult} ${chalk.green(tool)}: ${chalk.gray(preview)}...`)
  }
}
