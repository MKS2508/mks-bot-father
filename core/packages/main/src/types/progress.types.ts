/**
 * Progress Callback Types
 *
 * Types for progress tracking throughout the tool pipeline.
 */

/**
 * Progress callback function
 *
 * @param progress - Progress percentage (0-100)
 * @param message - Human-readable progress message
 * @param step - Optional step identifier
 */
export type IProgressCallback = (
  progress: number,
  message: string,
  step?: string
) => void

/**
 * Progress event with metadata
 */
export interface IProgressEvent {
  progress: number
  message: string
  step?: string
  timestamp?: number
}

/**
 * Progress tracker for multi-step operations
 */
export interface IProgressTracker {
  onProgress: IProgressCallback
  currentStep: number
  totalSteps: number
  report(message: string, step?: string): void
  complete(message: string): void
}

/**
 * Create a progress tracker for multi-step operations
 *
 * @example
 * ```typescript
 * const steps = ['init', 'build', 'deploy']
 * const tracker = createProgressTracker(steps, (p, msg, step) => {
 *   console.log(`[${step}] ${p}% - ${msg}`)
 * })
 *
 * // Auto-calculates progress: 33%, 67%, 100%
 * tracker.report('Initializing...', 'init')
 * tracker.report('Building image...', 'build')
 * tracker.report('Deployment complete', 'done')
 * ```
 */
export function createProgressTracker(
  steps: string[],
  onProgress: IProgressCallback
): IProgressTracker {
  let currentStep = 0
  const totalSteps = steps.length

  return {
    onProgress,
    currentStep: 0,
    totalSteps,

    report(message: string, step?: string) {
      // Calculate progress based on step index
      const stepIndex = step ? steps.indexOf(step) : currentStep
      if (stepIndex >= 0) {
        currentStep = stepIndex
      }

      // Progress: completed steps + fraction of current step
      const progress = Math.min(
        100,
        Math.floor(((currentStep + 1) / totalSteps) * 100)
      )

      onProgress(progress, message, step || steps[currentStep])
    },

    complete(message: string) {
      onProgress(100, message, 'done')
    }
  }
}

/**
 * Create a progress callback that emits events
 * Useful for MCP tools to capture progress
 */
export function createProgressEventCollector(
  onEvent?: (event: IProgressEvent) => void
): IProgressCallback {
  const events: IProgressEvent[] = []

  return (progress: number, message: string, step?: string) => {
    const event: IProgressEvent = {
      progress,
      message,
      step,
      timestamp: Date.now()
    }
    events.push(event)
    onEvent?.(event)
  }
}
