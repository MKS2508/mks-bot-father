/**
 * Error types and codes for mks-bot-father.
 *
 * @module
 */

/**
 * Application error codes.
 */
export const AppErrorCode = {
  CONFIG_ERROR: 'CONFIG_ERROR',
  GITHUB_ERROR: 'GITHUB_ERROR',
  COOLIFY_ERROR: 'COOLIFY_ERROR',
  BOTFATHER_ERROR: 'BOTFATHER_ERROR',
  SCAFFOLD_ERROR: 'SCAFFOLD_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

/**
 * Application error code type.
 */
export type AppErrorCode = (typeof AppErrorCode)[keyof typeof AppErrorCode]

/**
 * Application error interface.
 */
export interface IAppError {
  /** Error code */
  code: AppErrorCode
  /** Human-readable error message */
  message: string
  /** Original error or additional context */
  cause?: unknown
}

/**
 * Creates an application error.
 *
 * @param code - Error code
 * @param message - Error message
 * @param cause - Original error or context
 * @returns Application error object
 */
export function createAppError(
  code: AppErrorCode,
  message: string,
  cause?: unknown
): IAppError {
  return { code, message, cause }
}
