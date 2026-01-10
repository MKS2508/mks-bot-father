/**
 * Running Operations State Management.
 */
import type { IRunningOperation, StepStatus } from '../types/agent.js'
import { initializeSteps, detectOperationType } from './progress.js'
import { botLogger } from '../middleware/logging.js'

/** In-memory store for running operations */
const runningOperations = new Map<string, IRunningOperation>()

/** Generate operation ID */
function generateOperationId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Create a new running operation */
export function createOperation(
  chatId: number,
  messageId: number,
  userId: string,
  prompt: string
): IRunningOperation {
  const id = generateOperationId()
  const operationType = detectOperationType(prompt, [])
  const steps = initializeSteps(operationType)

  const operation: IRunningOperation = {
    id,
    chatId,
    messageId,
    userId,
    prompt,
    steps,
    currentStep: 0,
    startedAt: new Date(),
    abortController: new AbortController(),
    lastUpdate: new Date()
  }

  runningOperations.set(id, operation)
  botLogger.info(`Created operation ${id}: ${prompt.slice(0, 50)}...`)

  return operation
}

/** Get operation by ID */
export function getOperation(id: string): IRunningOperation | undefined {
  return runningOperations.get(id)
}

/** Get operation by chat and message ID */
export function getOperationByMessage(
  chatId: number,
  messageId: number
): IRunningOperation | undefined {
  for (const op of runningOperations.values()) {
    if (op.chatId === chatId && op.messageId === messageId) {
      return op
    }
  }
  return undefined
}

/** Get operations for user */
export function getUserOperations(userId: string): IRunningOperation[] {
  return Array.from(runningOperations.values()).filter((op) => op.userId === userId)
}

/** Update operation step */
export function updateOperationStep(
  id: string,
  stepIndex: number,
  status: StepStatus,
  error?: string
): void {
  const operation = runningOperations.get(id)
  if (!operation) return

  const step = operation.steps[stepIndex]
  if (!step) return

  if (status === 'running' && !step.startedAt) {
    step.startedAt = new Date()
  }

  if (status === 'completed' || status === 'failed') {
    step.completedAt = new Date()
  }

  step.status = status
  step.error = error

  if (status === 'completed') {
    operation.currentStep = stepIndex + 1
  }

  operation.lastUpdate = new Date()
}

/** Advance to next step */
export function advanceStep(id: string): void {
  const operation = runningOperations.get(id)
  if (!operation) return

  const currentStep = operation.currentStep

  // Complete current step
  if (currentStep < operation.steps.length) {
    updateOperationStep(id, currentStep, 'completed')
  }

  // Start next step
  if (currentStep + 1 < operation.steps.length) {
    updateOperationStep(id, currentStep + 1, 'running')
  }
}

/** Map tool names to step descriptions */
const TOOL_STEP_MAP: Record<string, string> = {
  create_bot: 'Creating bot via BotFather',
  list_bots: 'Fetching bot list',
  get_bot_token: 'Retrieving bot token',
  create_repo: 'Creating GitHub repository',
  clone_repo: 'Cloning repository',
  commit_and_push: 'Pushing to GitHub',
  deploy: 'Deploying to Coolify',
  set_env_vars: 'Setting environment variables',
  get_deployment_status: 'Checking deployment status',
  execute_command: 'Running command',
  build_project: 'Building project',
  run_tests: 'Running tests',
  install_dependencies: 'Installing dependencies',
  lint_project: 'Linting code',
  type_check: 'Type checking'
}

/** Update steps based on tool call */
export function updateStepsFromToolCall(id: string, toolName: string): void {
  const operation = runningOperations.get(id)
  if (!operation) return

  // Extract tool name from MCP format (mcp__server__tool)
  const shortToolName = toolName.split('__').pop() || toolName
  const stepName = TOOL_STEP_MAP[shortToolName] || `Running ${shortToolName}`

  // Find existing step with this name
  let stepIndex = operation.steps.findIndex((s) => s.name === stepName)

  if (stepIndex === -1) {
    // Mark current running step as completed
    const runningStep = operation.steps.find((s) => s.status === 'running')
    if (runningStep) {
      const runningIndex = operation.steps.indexOf(runningStep)
      updateOperationStep(id, runningIndex, 'completed')
    }

    // Add dynamic step
    operation.steps.push({
      index: operation.steps.length + 1,
      total: operation.steps.length + 1,
      name: stepName,
      status: 'running',
      startedAt: new Date()
    })

    // Update totals
    operation.steps.forEach((s, i) => {
      s.total = operation.steps.length
      s.index = i + 1
    })

    stepIndex = operation.steps.length - 1
  } else {
    // Mark previous running steps as completed
    operation.steps.forEach((s, i) => {
      if (i < stepIndex && s.status === 'running') {
        updateOperationStep(id, i, 'completed')
      }
    })
    updateOperationStep(id, stepIndex, 'running')
  }

  operation.lastUpdate = new Date()
}

/** Cancel operation */
export function cancelOperation(id: string): boolean {
  const operation = runningOperations.get(id)
  if (!operation) return false

  operation.abortController.abort()

  // Mark remaining steps as failed
  for (const step of operation.steps) {
    if (step.status === 'pending' || step.status === 'running') {
      step.status = 'failed'
      step.error = 'Cancelled by user'
      step.completedAt = new Date()
    }
  }

  botLogger.info(`Cancelled operation ${id}`)
  return true
}

/** Complete operation */
export function completeOperation(id: string, success: boolean): void {
  const operation = runningOperations.get(id)
  if (!operation) return

  // Mark remaining steps
  for (const step of operation.steps) {
    if (step.status === 'pending') {
      step.status = success ? 'completed' : 'failed'
      step.completedAt = new Date()
    }
    if (step.status === 'running') {
      step.status = success ? 'completed' : 'failed'
      step.completedAt = new Date()
    }
  }

  // Keep operation for stats display, then clean up after 5 minutes
  setTimeout(
    () => {
      runningOperations.delete(id)
    },
    5 * 60 * 1000
  )
}

/** Get all running operations */
export function getAllOperations(): IRunningOperation[] {
  return Array.from(runningOperations.values())
}

/** Clear operations for user */
export function clearUserOperations(userId: string): void {
  for (const [id, operation] of runningOperations) {
    if (operation.userId === userId) {
      operation.abortController.abort()
      runningOperations.delete(id)
    }
  }
}

/** Check if operation is cancelled */
export function isOperationCancelled(id: string): boolean {
  const operation = runningOperations.get(id)
  return operation?.abortController.signal.aborted ?? false
}
