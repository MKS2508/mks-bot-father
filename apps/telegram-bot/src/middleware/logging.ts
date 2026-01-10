/**
 * Logging middleware and utilities.
 * Using @mks2508/better-logger directly.
 */

import logger from '@mks2508/better-logger'

// Setup logger preset for bot usage
logger.preset('cyberpunk')
logger.showTimestamp()

export const botLogger = logger
export const commandLogger = logger
export const agentLogger = logger
export const callbackLogger = logger

// Styled logging helpers (template-inspired)
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Semantic aliases
  error: '\x1b[31m',
  success: '\x1b[32m',
  warning: '\x1b[33m',
  info: '\x1b[36m',
  dim: '\x1b[90m',
} as const

export function colorText(text: string, color: string): string {
  return `${color}${text}${colors.reset}`
}

export function badge(text: string, style: 'pill' | 'rounded' = 'pill'): string {
  const styleChars = style === 'pill' ? ['⟨', '⟩'] : ['[', ']']
  return colorText(`${styleChars[0]}${text}${styleChars[1]}`, colors.cyan)
}

export function kv(obj: Record<string, string | number | undefined>): string {
  const entries = Object.entries(obj)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => {
      const coloredKey = colorText(key, colors.dim)
      const coloredValue = colorText(String(value), colors.brightCyan || colors.cyan)
      return `${coloredKey}=${coloredValue}`
    })
  return entries.join(' ')
}
