/**
 * Background Operation Queue.
 *
 * Manages non-blocking background operations with progress tracking.
 */

import { bgopsLogger } from './logger.js'
import { log } from './json-logger.js'

/**
 * Operation status types.
 */
export type OperationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * Background operation with metadata.
 */
export interface BackgroundOperation {
  id: string
  tool: string
  input: unknown
  status: OperationStatus
  progress: number
  result?: unknown
  error?: Error
  startedAt: Date
  completedAt?: Date
  duration?: number
}

/**
 * Operation execution function.
 */
export type OperationExecutor = (operation: BackgroundOperation) => Promise<unknown>

/**
 * Queue configuration.
 */
export interface QueueConfig {
  maxConcurrent: number
  retryAttempts: number
  retryDelay: number
}

/**
 * Default queue configuration.
 */
export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxConcurrent: 3,
  retryAttempts: 2,
  retryDelay: 1000
}

/**
 * Background operation queue manager.
 */
export class OperationQueue {
  private queue: BackgroundOperation[] = []
  private running = new Map<string, BackgroundOperation>()
  private completed: BackgroundOperation[] = []
  private executor: OperationExecutor | null = null
  private isProcessing = false

  constructor(
    private config: QueueConfig = DEFAULT_QUEUE_CONFIG
  ) {}

  /**
   * Set the operation executor function.
   */
  setExecutor(executor: OperationExecutor): void {
    this.executor = executor
  }

  /**
   * Add an operation to the queue.
   */
  enqueue(tool: string, input: unknown): string {
    const id = `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    const operation: BackgroundOperation = {
      id,
      tool,
      input,
      status: 'pending',
      progress: 0,
      startedAt: new Date()
    }

    this.queue.push(operation)
    bgopsLogger.info(`Enqueued operation ${id}: ${tool}`)
    log.info('QUEUE', 'Operation enqueued', {
      id,
      tool,
      inputType: typeof input,
      queueSize: this.queue.length
    })

    // Start processing if not already running
    if (!this.isProcessing) {
      this.process().catch(err => {
        bgopsLogger.error(`Queue processing error: ${err}`)
        log.error('QUEUE', 'Queue processing error', {
          error: err instanceof Error ? err.message : String(err)
        })
      })
    }

    return id
  }

  /**
   * Process the queue.
   */
  async process(): Promise<void> {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true
    bgopsLogger.debug('Started queue processing')
    log.debug('QUEUE', 'Queue processing started', {
      queueSize: this.queue.length,
      runningSize: this.running.size,
      maxConcurrent: this.config.maxConcurrent
    })

    try {
      while (this.queue.length > 0 || this.running.size > 0) {
        // Start new operations up to maxConcurrent
        while (this.queue.length > 0 && this.running.size < this.config.maxConcurrent) {
          const operation = this.queue.shift()!
          await this.executeWithRetry(operation)
        }

        // Wait a bit before next iteration
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      bgopsLogger.debug('Queue processing completed')
      log.debug('QUEUE', 'Queue processing completed')
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Execute an operation with retry logic.
   */
  private async executeWithRetry(operation: BackgroundOperation, attempt = 1): Promise<void> {
    this.running.set(operation.id, operation)
    operation.status = 'running'
    bgopsLogger.info(`Executing operation ${operation.id} (attempt ${attempt}): ${operation.tool}`)
    log.info('QUEUE', 'Executing operation', {
      id: operation.id,
      tool: operation.tool,
      attempt,
      maxAttempts: this.config.retryAttempts,
      running: this.running.size,
      maxConcurrent: this.config.maxConcurrent
    })

    try {
      if (!this.executor) {
        throw new Error('No executor set. Call setExecutor() first.')
      }

      const result = await this.executor(operation)
      operation.status = 'completed'
      operation.result = result
      operation.completedAt = new Date()
      operation.progress = 100
      operation.duration = operation.completedAt.getTime() - operation.startedAt.getTime()

      bgopsLogger.success(`Operation ${operation.id} completed in ${operation.duration}ms`)
      log.info('QUEUE', 'Operation completed', {
        id: operation.id,
        tool: operation.tool,
        duration: operation.duration,
        attempt
      })

      // Move to completed list
      this.completed.push(operation)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      // Retry if attempts remain
      if (attempt < this.config.retryAttempts) {
        bgopsLogger.warn(`Operation ${operation.id} failed, retrying... (${attempt}/${this.config.retryAttempts})`)
        log.warn('QUEUE', 'Operation failed, retrying', {
          id: operation.id,
          tool: operation.tool,
          attempt,
          maxAttempts: this.config.retryAttempts,
          error: err.message
        })
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay))
        await this.executeWithRetry(operation, attempt + 1)
        return
      }

      operation.status = 'failed'
      operation.error = err
      operation.completedAt = new Date()
      operation.duration = operation.completedAt.getTime() - operation.startedAt.getTime()

      bgopsLogger.error(`Operation ${operation.id} failed after ${attempt} attempts: ${err.message}`)
      log.error('QUEUE', 'Operation failed permanently', {
        id: operation.id,
        tool: operation.tool,
        attempts: attempt,
        error: err.message,
        duration: operation.duration
      })

      // Move to completed list
      this.completed.push(operation)
    } finally {
      this.running.delete(operation.id)
    }
  }

  /**
   * Cancel a pending operation.
   */
  cancel(id: string): boolean {
    const index = this.queue.findIndex(op => op.id === id)

    if (index !== -1) {
      const operation = this.queue.splice(index, 1)[0]
      operation.status = 'cancelled'
      operation.completedAt = new Date()

      bgopsLogger.info(`Cancelled operation ${id}`)
      log.info('QUEUE', 'Operation cancelled', { id, tool: operation.tool })
      return true
    }

    bgopsLogger.warn(`Cannot cancel operation ${id}: not in queue`)
    log.warn('QUEUE', 'Cannot cancel operation', { id, reason: 'not_in_queue' })
    return false
  }

  /**
   * Get operation by ID.
   */
  getOperation(id: string): BackgroundOperation | undefined {
    return (
      this.queue.find(op => op.id === id) ||
      this.running.get(id) ||
      this.completed.find(op => op.id === id)
    )
  }

  /**
   * Get current queue status.
   */
  getStatus(): {
    pending: BackgroundOperation[]
    running: BackgroundOperation[]
    completed: BackgroundOperation[]
    stats: QueueStats
  } {
    const stats = this.getStats()

    return {
      pending: [...this.queue],
      running: Array.from(this.running.values()),
      completed: [...this.completed],
      stats
    }
  }

  /**
   * Get queue statistics.
   */
  getStats(): QueueStats {
    const completed = this.completed
    const succeeded = completed.filter(op => op.status === 'completed')
    const failed = completed.filter(op => op.status === 'failed')
    const cancelled = completed.filter(op => op.status === 'cancelled')

    const totalDuration = succeeded.reduce((sum, op) => sum + (op.duration || 0), 0)
    const avgDuration = succeeded.length > 0 ? totalDuration / succeeded.length : 0

    return {
      pending: this.queue.length,
      running: this.running.size,
      completed: completed.length,
      succeeded: succeeded.length,
      failed: failed.length,
      cancelled: cancelled.length,
      averageDuration: Math.round(avgDuration),
      totalDuration
    }
  }

  /**
   * Clear completed operations.
   */
  clearCompleted(): void {
    const count = this.completed.length
    this.completed = []
    bgopsLogger.info(`Cleared ${count} completed operations`)
    log.info('QUEUE', 'Cleared completed operations', { count })
  }

  /**
   * Clear all operations (resets the queue).
   */
  clearAll(): void {
    this.queue = []
    this.running.clear()
    this.completed = []
    bgopsLogger.info('Cleared all operations')
    log.info('QUEUE', 'Cleared all operations')
  }
}

/**
 * Queue statistics.
 */
export interface QueueStats {
  pending: number
  running: number
  completed: number
  succeeded: number
  failed: number
  cancelled: number
  averageDuration: number
  totalDuration: number
}

/**
 * Singleton instance for global use.
 */
let globalQueue: OperationQueue | null = null

/**
 * Get or create the global operation queue instance.
 */
export function getGlobalQueue(config?: QueueConfig): OperationQueue {
  if (!globalQueue) {
    globalQueue = new OperationQueue(config)
  }
  return globalQueue
}
