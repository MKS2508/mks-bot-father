/**
 * Error Categorization using no-throw pattern.
 *
 * Categorizes errors by type for better debugging and user feedback.
 */

import { isErr, type Result } from '@mks2508/no-throw'
import { errorLogger } from './logger.js'
import type { LogEntry } from '../types.js'

/**
 * Error categories for classification.
 */
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK = 'NETWORK',
  PARSING = 'PARSING',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Categorized error with metadata.
 */
export interface CategorizedError {
  category: ErrorCategory
  message: string
  timestamp: Date
  original: unknown
  suggestions?: string[]
}

/**
 * Categorize an error based on its message content.
 */
export function categorizeError(error: unknown): CategorizedError {
  const msg = error instanceof Error ? error.message : String(error)
  let category = ErrorCategory.UNKNOWN
  const suggestions: string[] = []

  if (msg.includes('AUTHENTICATION_FAILED') || msg.includes('401') || msg.includes('unauthorized')) {
    category = ErrorCategory.AUTHENTICATION
    suggestions.push('Check your ANTHROPIC_API_KEY')
    suggestions.push('Verify the key is valid and not expired')
  } else if (msg.includes('RATE_LIMIT') || msg.includes('429') || msg.includes('rate_limit_exceeded')) {
    category = ErrorCategory.RATE_LIMIT
    suggestions.push('Wait a few seconds before retrying')
    suggestions.push('Consider reducing request frequency')
  } else if (
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('network')
  ) {
    category = ErrorCategory.NETWORK
    suggestions.push('Check your internet connection')
    suggestions.push('Verify the API endpoint is accessible')
  } else if (msg.includes('parse') || msg.includes('JSON') || msg.includes('SyntaxError')) {
    category = ErrorCategory.PARSING
    suggestions.push('Check the response format')
    suggestions.push('Verify data structure matches expected schema')
  } else if (msg.includes('invalid') || msg.includes('validation') || msg.includes('ValidationError')) {
    category = ErrorCategory.VALIDATION
    suggestions.push('Check input parameters')
    suggestions.push('Verify required fields are present')
  } else if (msg.includes('permission') || msg.includes('forbidden') || msg.includes('403')) {
    category = ErrorCategory.PERMISSION
    suggestions.push('Check file/directory permissions')
    suggestions.push('Verify you have access to the resource')
  } else if (msg.includes('timeout') || msg.includes('TIMEDOUT')) {
    category = ErrorCategory.TIMEOUT
    suggestions.push('The operation took too long')
    suggestions.push('Try again or increase timeout')
  }

  errorLogger.error(`[${category}] ${msg}`)

  return {
    category,
    message: msg,
    timestamp: new Date(),
    original: error,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  }
}

/**
 * Log if result is an error, return value otherwise.
 *
 * @example
 * const result = await someOperation()
 * const value = logIfError(result)
 * if (value === null) {
 *   // Error was logged and categorized
 * }
 */
export function logIfError<T>(result: Result<T>): T | null {
  if (isErr(result)) {
    categorizeError(result.error)
    return null
  }
  return result.value
}

/**
 * Convert a categorized error to a log entry.
 */
export function errorToLogEntry(categorized: CategorizedError): LogEntry {
  return {
    timestamp: categorized.timestamp.toISOString(),
    level: 3, // ERROR
    component: 'ERROR',
    message: `[${categorized.category}] ${categorized.message}`,
    data: {
      category: categorized.category,
      suggestions: categorized.suggestions
    }
  }
}

/**
 * Get human-readable description for error category.
 */
export function getCategoryDescription(category: ErrorCategory): string {
  const descriptions: Record<ErrorCategory, string> = {
    [ErrorCategory.AUTHENTICATION]: 'Authentication failed - invalid or missing credentials',
    [ErrorCategory.RATE_LIMIT]: 'Rate limit exceeded - too many requests',
    [ErrorCategory.NETWORK]: 'Network error - connection failed or timed out',
    [ErrorCategory.PARSING]: 'Parsing error - invalid data format',
    [ErrorCategory.VALIDATION]: 'Validation error - invalid input',
    [ErrorCategory.PERMISSION]: 'Permission denied - insufficient access',
    [ErrorCategory.TIMEOUT]: 'Operation timed out',
    [ErrorCategory.UNKNOWN]: 'Unknown error - unexpected issue'
  }

  return descriptions[category] || descriptions[ErrorCategory.UNKNOWN]
}
