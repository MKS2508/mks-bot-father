/**
 * useOperations hook - Background operations management.
 *
 * Manages background operation queue with auto-processing.
 */

import { OperationQueue, getGlobalQueue, toolsLogger } from '../lib/index.js'
import type { BackgroundOperation, QueueConfig, QueueStats } from '../lib/operation-queue.js'

/**
 * Operations state.
 */
let queue: OperationQueue | null = null
let operations: BackgroundOperation[] = []
let autoProcessInterval: ReturnType<typeof setInterval> | null = null

/**
 * Initialize operation queue.
 */
export function initOperations(config?: QueueConfig): void {
  if (!queue) {
    queue = getGlobalQueue(config)
    toolsLogger.info('Operations initialized')
  }
}

/**
 * Add an operation to the queue.
 */
export function enqueueOperation(tool: string, input: unknown): string {
  if (!queue) {
    initOperations()
  }

  const id = queue!.enqueue(tool, input)
  updateStatus()
  return id
}

/**
 * Cancel an operation.
 */
export function cancelOperation(id: string): boolean {
  if (!queue) {
    return false
  }

  const result = queue!.cancel(id)
  updateStatus()
  return result
}

/**
 * Get operation by ID.
 */
export function getOperation(id: string): BackgroundOperation | undefined {
  if (!queue) {
    return undefined
  }

  return queue!.getOperation(id)
}

/**
 * Get all operations.
 */
export function getOperations(): BackgroundOperation[] {
  return [...operations]
}

/**
 * Get operations by status.
 */
export function getOperationsByStatus(status: BackgroundOperation['status']): BackgroundOperation[] {
  return operations.filter(op => op.status === status)
}

/**
 * Get queue statistics.
 */
export function getQueueStats(): QueueStats | null {
  if (!queue) {
    return null
  }

  return queue!.getStats()
}

/**
 * Get operations count by status.
 */
export function getOperationsCount(): {
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
  total: number
} {
  const stats = getQueueStats()

  if (!stats) {
    return {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0
    }
  }

  return {
    pending: stats.pending,
    running: stats.running,
    completed: stats.succeeded,
    failed: stats.failed,
    cancelled: stats.cancelled,
    total: stats.pending + stats.running + stats.completed
  }
}

/**
 * Update operations list from queue status.
 */
function updateStatus(): void {
  if (!queue) {
    return
  }

  const status = queue!.getStatus()
  operations = [
    ...status.pending,
    ...status.running,
    ...status.completed
  ]
}

/**
 * Enable auto-processing of the queue.
 */
export function enableAutoProcessing(intervalMs = 1000): void {
  if (autoProcessInterval) {
    return // Already enabled
  }

  if (!queue) {
    initOperations()
  }

  autoProcessInterval = setInterval(() => {
    updateStatus()
  }, intervalMs)

  toolsLogger.info('Auto-processing enabled')
}

/**
 * Disable auto-processing of the queue.
 */
export function disableAutoProcessing(): void {
  if (autoProcessInterval) {
    clearInterval(autoProcessInterval)
    autoProcessInterval = null
    toolsLogger.info('Auto-processing disabled')
  }
}

/**
 * Clear completed operations.
 */
export function clearCompleted(): void {
  if (!queue) {
    return
  }

  queue!.clearCompleted()
  updateStatus()
  toolsLogger.info('Cleared completed operations')
}

/**
 * Clear all operations.
 */
export function clearAllOperations(): void {
  if (!queue) {
    return
  }

  queue!.clearAll()
  operations = []
  toolsLogger.info('Cleared all operations')
}

/**
 * Get formatted operation status text.
 */
export function formatOperationStatus(status: BackgroundOperation['status']): string {
  const statusMap: Record<BackgroundOperation['status'], string> = {
    pending: '⏳',
    running: '▶️',
    completed: '✅',
    failed: '❌',
    cancelled: '🚫'
  }

  return statusMap[status] || status
}

/**
 * Get operation progress percentage.
 */
export function getOperationProgress(operation: BackgroundOperation): number {
  if (operation.status === 'completed') {
    return 100
  } else if (operation.status === 'failed' || operation.status === 'cancelled') {
    return operation.progress
  }

  return operation.progress
}

/**
 * Format operation duration.
 */
export function formatOperationDuration(operation: BackgroundOperation): string {
  if (!operation.completedAt) {
    return '...'
  }

  const duration = operation.completedAt.getTime() - operation.startedAt.getTime()

  if (duration >= 60000) {
    return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`
  } else if (duration >= 1000) {
    return `${(duration / 1000).toFixed(1)}s`
  }

  return `${duration}ms`
}

/**
 * Cleanup on exit.
 */
export function cleanupOperations(): void {
  disableAutoProcessing()
  clearAllOperations()
  toolsLogger.info('Operations cleaned up')
}
