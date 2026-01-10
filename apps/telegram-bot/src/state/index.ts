/**
 * State management exports.
 */

// Operations
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
} from './operations.js'

// Confirmations
export {
  requiresConfirmation,
  createConfirmation,
  processConfirmation,
  getConfirmation,
  clearUserConfirmations,
  getUserConfirmationsCount,
  hasPendingConfirmation,
  setConfirmationBot
} from './confirmations.js'

// Progress
export {
  formatProgressMessage,
  detectOperationType,
  initializeSteps,
  calculateProgress,
  getCurrentStepName,
  formatSimpleProgress,
  OPERATION_STEPS
} from './progress.js'
