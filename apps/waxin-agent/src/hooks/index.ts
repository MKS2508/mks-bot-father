/**
 * Hooks exports.
 */

export {
  useAgent,
  resetAgentBridge
} from './useAgent.js'

export {
  useAgentStatsShared
} from './useAgentStatsShared.js'

export type { UseAgentState } from './useAgent.js'

export {
  updateStats,
  getStats,
  getStatsHistory,
  clearStats,
  getAggregatedStats,
  formatTokens,
  formatCost,
  formatDuration
} from './useStats.js'

export type { StatsHistoryEntry } from './useStats.js'

export {
  addLog,
  logDebug,
  logInfo,
  logWarn,
  logError,
  getLogs,
  getLogsByLevel,
  getLogsByComponent,
  getRecentLogs,
  setLogFilter,
  getLogFilter,
  clearLogs,
  getLogCount,
  exportLogsToString,
  initLogs
} from './useLogs.js'

// Re-export JSON logger for direct use
export { log } from '../lib/json-logger.js'

export {
  initOperations,
  enqueueOperation,
  cancelOperation,
  getOperation,
  getOperations,
  getOperationsByStatus,
  getQueueStats,
  getOperationsCount,
  enableAutoProcessing,
  disableAutoProcessing,
  clearCompleted,
  clearAllOperations,
  formatOperationStatus,
  getOperationProgress,
  formatOperationDuration,
  cleanupOperations
} from './useOperations.js'

export {
  showQuestion,
  getActiveQuestion,
  hasActiveQuestion,
  answerQuestion,
  cancelQuestion,
  subscribeToQuestions,
  resetQuestions
} from './useQuestions.js'
