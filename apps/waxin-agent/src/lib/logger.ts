/**
 * Better Logger Configuration for TUI.
 *
 * Provides categorized loggers for different components of the TUI.
 */

import logger, { component } from '@mks2508/better-logger'

/**
 * TUI component logger - UI events (input, render, focus changes)
 */
export const tuiLogger = component('TUI')

/**
 * Agent component logger - Agent lifecycle (session start, message, result)
 */
export const agentLogger = component('AGENT')

/**
 * Tools component logger - Tool execution (start, progress, complete)
 */
export const toolsLogger = component('TOOLS')

/**
 * Stats component logger - Metrics and statistics
 */
export const statsLogger = component('STATS')

/**
 * Error component logger - Categorized errors
 */
export const errorLogger = component('ERROR')

/**
 * File component logger - Log file operations
 */
export const fileLogger = component('FILE')

/**
 * Background operations logger - Async task execution
 */
export const bgopsLogger = component('BGOPS')

// Re-export the base logger for direct usage
export { logger }

/**
 * Configure better-logger presets for TUI usage.
 */
export function configureTUILogger(preset: 'cyberpunk' | 'minimal' = 'cyberpunk'): void {
  logger.preset(preset)
  logger.showTimestamp()
  logger.showLocation()
}
