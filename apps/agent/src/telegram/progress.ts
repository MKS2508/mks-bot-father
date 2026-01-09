/**
 * Progress Tracking for Long Operations.
 */
import type { IProgressStep, IRunningOperation, StepStatus } from './types.js'
import { formatElapsedTime } from './formatters.js'

/** Standard operation steps by type */
export const OPERATION_STEPS: Record<string, string[]> = {
  create_bot: [
    'Connecting to Telegram',
    'Creating bot via BotFather',
    'Retrieving bot token',
    'Saving configuration'
  ],
  create_bot_full: [
    'Connecting to Telegram',
    'Creating bot via BotFather',
    'Retrieving bot token',
    'Creating GitHub repository',
    'Pushing template code',
    'Deploying to Coolify',
    'Setting environment variables'
  ],
  deploy: [
    'Connecting to Coolify',
    'Validating configuration',
    'Triggering deployment',
    'Waiting for build'
  ],
  list_bots: ['Connecting to Telegram', 'Fetching bot list', 'Retrieving tokens'],
  create_repo: [
    'Authenticating with GitHub',
    'Creating repository',
    'Initializing with template'
  ],
  custom: ['Processing...']
}

/** Get icon for step status */
function getStepIcon(status: StepStatus): string {
  switch (status) {
    case 'completed':
      return '✅'
    case 'running':
      return '🔄'
    case 'failed':
      return '❌'
    case 'pending':
      return '⬜'
  }
}

/** Format step duration */
function formatStepDuration(step: IProgressStep): string {
  if (!step.startedAt || !step.completedAt) return ''
  const duration = step.completedAt.getTime() - step.startedAt.getTime()
  return `(${(duration / 1000).toFixed(1)}s)`
}

/** Format progress message with steps */
export function formatProgressMessage(operation: IRunningOperation): string {
  const elapsed = formatElapsedTime(operation.startedAt)
  const promptPreview =
    operation.prompt.length > 40 ? operation.prompt.slice(0, 37) + '...' : operation.prompt

  const lines: string[] = [`⏳ *${promptPreview}*`, `_Elapsed: ${elapsed}_`, '']

  for (const step of operation.steps) {
    const icon = getStepIcon(step.status)
    let stepLine = `${icon} Step ${step.index}/${step.total}: ${step.name}`

    if (step.status === 'completed' && step.startedAt && step.completedAt) {
      stepLine += ` ${formatStepDuration(step)}`
    } else if (step.status === 'running') {
      stepLine += ' ...'
    } else if (step.status === 'failed' && step.error) {
      stepLine += ` - ${step.error}`
    }

    lines.push(stepLine)
  }

  return lines.join('\n')
}

/** Detect operation type from prompt and tool calls */
export function detectOperationType(prompt: string, toolCalls: string[]): string {
  const lower = prompt.toLowerCase()

  if (lower.includes('create') && lower.includes('bot')) {
    if (lower.includes('deploy') || lower.includes('github') || lower.includes('full')) {
      return 'create_bot_full'
    }
    return 'create_bot'
  }

  if (lower.includes('deploy')) return 'deploy'
  if (lower.includes('list') && lower.includes('bot')) return 'list_bots'
  if (lower.includes('create') && lower.includes('repo')) return 'create_repo'

  // Check tool calls for hints
  if (toolCalls.some((t) => t.includes('create_bot'))) return 'create_bot'
  if (toolCalls.some((t) => t.includes('deploy'))) return 'deploy'
  if (toolCalls.some((t) => t.includes('list_bots'))) return 'list_bots'

  return 'custom'
}

/** Initialize steps for operation */
export function initializeSteps(operationType: string, customSteps?: string[]): IProgressStep[] {
  const stepNames = OPERATION_STEPS[operationType] || customSteps || OPERATION_STEPS.custom

  return stepNames.map((name, index) => ({
    index: index + 1,
    total: stepNames.length,
    name,
    status: index === 0 ? 'running' : 'pending',
    startedAt: index === 0 ? new Date() : undefined
  }))
}

/** Calculate progress percentage */
export function calculateProgress(operation: IRunningOperation): number {
  const completedSteps = operation.steps.filter((s) => s.status === 'completed').length
  return Math.round((completedSteps / operation.steps.length) * 100)
}

/** Get current step name */
export function getCurrentStepName(operation: IRunningOperation): string {
  const runningStep = operation.steps.find((s) => s.status === 'running')
  if (runningStep) return runningStep.name

  const pendingStep = operation.steps.find((s) => s.status === 'pending')
  if (pendingStep) return pendingStep.name

  return 'Completing...'
}

/** Format simple progress (emoji bar) */
export function formatSimpleProgress(operation: IRunningOperation): string {
  const total = operation.steps.length
  const completed = operation.steps.filter((s) => s.status === 'completed').length
  const running = operation.steps.filter((s) => s.status === 'running').length

  const filled = '🟩'.repeat(completed)
  const current = '🟨'.repeat(running)
  const empty = '⬜'.repeat(total - completed - running)

  return `${filled}${current}${empty} ${completed}/${total}`
}
