/**
 * Progress Tracker using ProgressManager.
 * Provides visual progress updates for agent operations.
 */

import type { Telegram } from 'telegraf'
import { ProgressManager } from '@mks2508/telegram-message-builder-telegraf'
import type { IProgressConfig } from '@mks2508/telegram-message-builder-telegraf'

interface TrackedProgress {
  manager: ProgressManager
  totalSteps: number
  currentStep: number
  status: string
}

const activeProgress = new Map<string, TrackedProgress>()

/**
 * Create a new progress tracker for an operation.
 */
export function createProgressTracker(
  operationId: string,
  telegram: Telegram,
  chatId: number,
  threadId: number | undefined,
  totalSteps: number = 10
): ProgressManager {
  const config: IProgressConfig = {
    strategy: 'inline',
    updateInterval: 1500,
    showPercentage: true,
    showElapsedTime: true,
    showETA: true
  }

  const manager = new ProgressManager(telegram, chatId, threadId, config)

  activeProgress.set(operationId, {
    manager,
    totalSteps,
    currentStep: 0,
    status: 'Starting...'
  })

  return manager
}

/**
 * Start progress tracking with initial message.
 */
export async function startProgress(
  operationId: string,
  label: string,
  totalSteps: number
): Promise<void> {
  const tracked = activeProgress.get(operationId)
  if (!tracked) return

  tracked.totalSteps = totalSteps
  tracked.status = label

  await tracked.manager.start(label, totalSteps)
}

/**
 * Update progress status and step.
 */
export async function updateProgress(
  operationId: string,
  currentStep: number,
  status: string
): Promise<void> {
  const tracked = activeProgress.get(operationId)
  if (!tracked) return

  tracked.currentStep = currentStep
  tracked.status = status

  await tracked.manager.setStatus(status)
  await tracked.manager.setTo(currentStep)
}

/**
 * Complete progress with success message.
 */
export async function completeProgress(
  operationId: string,
  message = 'Completed successfully!'
): Promise<void> {
  const tracked = activeProgress.get(operationId)
  if (!tracked) return

  await tracked.manager.complete(message)
  activeProgress.delete(operationId)
}

/**
 * Fail progress with error message.
 */
export async function failProgress(
  operationId: string,
  error: string
): Promise<void> {
  const tracked = activeProgress.get(operationId)
  if (!tracked) return

  await tracked.manager.fail(error)
  activeProgress.delete(operationId)
}

/**
 * Get an existing progress tracker.
 */
export function getProgressTracker(operationId: string): TrackedProgress | undefined {
  return activeProgress.get(operationId)
}

/**
 * Remove a progress tracker without sending updates.
 */
export function removeProgressTracker(operationId: string): void {
  activeProgress.delete(operationId)
}
