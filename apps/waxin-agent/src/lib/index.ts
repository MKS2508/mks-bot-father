/**
 * Library exports for TUI.
 */

export {
  tuiLogger,
  agentLogger,
  toolsLogger,
  statsLogger,
  errorLogger,
  fileLogger,
  bgopsLogger,
  configureTUILogger
} from './logger.js'

export {
  categorizeError,
  logIfError,
  errorToLogEntry,
  getCategoryDescription
} from './error-categorizer.js'

export type { ErrorCategory, CategorizedError } from './error-categorizer.js'

export {
  FileLogger,
  getGlobalFileLogger
} from './file-logger.js'

export type { LogFileConfig } from '../types.js'

export {
  OperationQueue,
  getGlobalQueue
} from './operation-queue.js'

export type {
  BackgroundOperation,
  OperationStatus,
  OperationExecutor,
  QueueConfig,
  QueueStats
} from './operation-queue.js'

export {
  AgentBridge,
  getGlobalBridge
} from './agent-bridge.js'

// Types are re-exported from types.ts which gets them from @mks2508/bot-manager-agent
export type {
  AgentCallbacks,
  AgentResult,
  AgentOptions,
  AgentUsage,
  ToolCallLog
} from '../types.js'
