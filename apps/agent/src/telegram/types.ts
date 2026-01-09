/**
 * Telegram Bot UX Types.
 */

import type { Context } from 'telegraf'

/** Operation types that require confirmation */
export type DangerousOperation =
  | 'create_bot'
  | 'create_repo'
  | 'deploy'
  | 'commit_push'
  | 'delete_bot'

/** Confirmation dialog state */
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

/** Progress step status */
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed'

/** Progress step state */
export interface IProgressStep {
  index: number
  total: number
  name: string
  status: StepStatus
  startedAt?: Date
  completedAt?: Date
  error?: string
}

/** Running operation state */
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

/** Callback action types */
export type CallbackAction =
  | { type: 'confirm'; confirmationId: string }
  | { type: 'cancel'; confirmationId: string }
  | { type: 'cancel_operation'; operationId: string }
  | { type: 'show_stats'; operationId: string }
  | { type: 'menu_action'; action: string }
  | { type: 'history'; page: number }

/** Stats display mode */
export type StatsDisplayMode = 'hidden' | 'collapsed' | 'expanded'

/** Formatted message options */
export interface IMessageFormatOptions {
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'
  maxLength?: number
  codeBlocks?: boolean
  collapsible?: boolean
}

/** Context state attached by middleware */
export interface IContextState {
  userId: string
  memory: unknown[]
}

/** Extended context with state */
export type BotContext = Context & {
  state: IContextState
}

/** Message from memory store */
export interface IStoredMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  toolCalls?: IToolCallLog[]
}

/** Tool call log entry */
export interface IToolCallLog {
  tool: string
  input: unknown
  result: string
}
