/**
 * Logger utilities for mks-bot-father.
 *
 * @module
 */

import logger, { component } from '@mks2508/better-logger'

logger.preset('cyberpunk')

/**
 * Creates a logger instance with a component prefix.
 *
 * @param name - Component name for the logger prefix
 * @returns Logger instance with the component name
 *
 * @example
 * ```typescript
 * const log = createLogger('GitHubService')
 * log.info('Creating repository...')
 * log.success('Repository created')
 * log.error('Failed to create repository')
 * ```
 */
export function createLogger(name: string) {
  return component(name)
}

export { logger, component }
