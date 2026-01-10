/**
 * Agent-specific types.
 */

export interface IContextState {
  userId: string
  memory?: IStoredMessage[]
}

export interface IPendingConfirmation {
  id: string
  chatId: number
  messageId: number
  userId: string
  operation: DangerousOperation
  operationData: Record<string, unknown>
  prompt: string
  createdAt: Date
  expiresAt: Date
  timeoutId: NodeJS.Timeout
}

export type DangerousOperation =
  | 'create_bot'
  | 'create_repo'
  | 'deploy'
  | 'commit_push'
  | 'delete_bot'

export interface IProgressStep {
  index: number
  total: number
  name: string
  status: StepStatus
  startedAt?: Date
  completedAt?: Date
  error?: string
}

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface IRunningOperation {
  id: string
  chatId: number
  messageId: number
  userId: string
  prompt: string
  steps: IProgressStep[]
  currentStep: number
  startedAt: Date
  abortController: AbortController
  lastUpdate: Date
}

export type CallbackAction =
  | { type: 'confirm'; confirmationId: string }
  | { type: 'cancel'; confirmationId: string }
  | { type: 'cancel_operation'; operationId: string }
  | { type: 'show_stats'; operationId: string }
  | { type: 'menu_action'; action: string }
  | { type: 'history'; page: number }

export type StatsDisplayMode = 'hidden' | 'collapsed' | 'expanded'

export interface IMessageFormatOptions {
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'
  maxLength?: number
  codeBlocks?: boolean
  collapsible?: boolean
}

export type BotContext = import('telegraf').Context & {
  state: IContextState
}

export interface IStoredMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  toolCalls?: IToolCallLog[]
}

export interface IToolCallLog {
  tool: string
  input: unknown
  result: string
}
