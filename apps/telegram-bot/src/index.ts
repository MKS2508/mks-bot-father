/**
 * Telegram Bot Package Exports.
 */

// === Types ===
export type {
  // Agent types
  DangerousOperation,
  IPendingConfirmation,
  StepStatus,
  IProgressStep,
  IRunningOperation,
  CallbackAction,
  StatsDisplayMode,
  IMessageFormatOptions,
  IContextState,
  BotContext,
  IStoredMessage,
  IToolCallLog
} from './types/agent.js'

export type {
  // Bot types
  BotMode,
  BotStatus,
  BotStats,
  BotConfig
} from './types/bot.js'

export type {
  // Result types
  Result,
  Ok,
  Err
} from './types/result.js'

// === Handlers ===
export {
  // Agent handlers
  handleStart,
  handleHelp,
  handleMenu,
  handleStatus,
  handleHistory,
  handleCancel,
  handleClear,
  handleCallback,
  handleTextMessage,
  executePrompt,
  handleBots
} from './handlers/index.js'

// === Keyboards ===
export {
  confirmationKeyboard,
  cancelOperationKeyboard,
  mainMenuKeyboard,
  postCreationKeyboard,
  statsToggleKeyboard,
  historyPaginationKeyboard,
  yesNoKeyboard,
  backToMenuKeyboard
} from './keyboards.js'

// === Formatters ===
export {
  // Agent formatters
  escapeMarkdownV2,
  codeBlock,
  inlineCode,
  formatToken,
  formatStatsCompact,
  formatStatsExpanded,
  shouldShowExpandedStats,
  formatLongResponse,
  formatHistoryEntry,
  formatElapsedTime,
  formatDuration,
  formatNumber,
  truncate
} from './utils/formatters.js'

// === Progress ===
export {
  formatProgressMessage,
  detectOperationType,
  initializeSteps,
  calculateProgress,
  getCurrentStepName,
  formatSimpleProgress,
  OPERATION_STEPS
} from './state/progress.js'

// === Confirmations ===
export {
  requiresConfirmation,
  createConfirmation,
  processConfirmation,
  getConfirmation,
  clearUserConfirmations,
  getUserConfirmationsCount,
  hasPendingConfirmation,
  setConfirmationBot
} from './state/confirmations.js'

// === State ===
export {
  createOperation,
  getOperation,
  getOperationByMessage,
  getUserOperations,
  updateOperationStep,
  advanceStep,
  updateStepsFromToolCall,
  cancelOperation,
  completeOperation,
  getAllOperations,
  clearUserOperations,
  isOperationCancelled
} from './state/index.js'

// === Template Utilities ===
export {
  botManager
} from './utils/bot-manager.js'

export {
  getInstanceManager
} from './utils/instance-manager.js'

export type { LockData, InstanceInfo } from './utils/instance-manager.js'

export {
  getConfig,
  updateConfig,
  isAuthorized,
  hasLoggingConfigured,
  hasControlConfigured
} from './config/index.js'

export {
  initializeFileLogging,
  isFileLoggingInitialized,
  getFileLoggingConfig
} from './config/logging.js'

export type { EnvConfig, Environment } from './config/env.js'
export type { FileLoggingConfig } from './config/logging.js'

// === Middleware ===
export { auth } from './middleware/auth.js'
export { errorHandler } from './middleware/error-handler.js'
export { agentStateMiddleware } from './middleware/agent-state.js'

// === Logging ===
export {
  botLogger,
  commandLogger,
  agentLogger,
  callbackLogger,
  badge,
  kv,
  colorText,
  colors
} from './middleware/logging.js'
