/**
 * Shared types for the Bot Manager Agent.
 */

export type ExecutionEnvironment = 'telegram' | 'tui' | 'cli'

export interface TelegramContext {
  chatId: number
  threadId?: number
  userId: string
  username?: string
}

export interface ExecutionContext {
  environment: ExecutionEnvironment
  telegram?: TelegramContext
}

export type SDKMessageType =
  | 'system'
  | 'assistant'
  | 'tool_call'
  | 'tool_result'
  | 'result'
  | 'error'

export interface ToolCallLog {
  tool: string
  input: unknown
  result: string
}

export interface AgentUsage {
  inputTokens: number
  outputTokens: number
  totalCostUsd: number
}

export interface PermissionDenial {
  tool: string
  reason: string
}

export interface ProgressEvent {
  pct: number
  msg: string
  step?: string
}

export interface AgentResult {
  success: boolean
  result: string | null
  sessionId: string
  toolCalls: ToolCallLog[]
  errors: string[]
  permissionDenials: PermissionDenial[]
  usage: AgentUsage
  durationMs: number
}

export interface AgentOptions {
  workingDirectory?: string
  maxTurns?: number
  model?: string
  maxBudgetUsd?: number
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions'
  includePartial?: boolean
  onMessage?: (message: unknown) => void
  onProgress?: (event: ProgressEvent) => void
  resumeSession?: string
  additionalDirectories?: string[]
  executionContext?: ExecutionContext
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  toolCalls?: ToolCallLog[]
}

export interface SessionInfo {
  sessionId: string
  createdAt: string
  lastMessageAt: string
  messageCount: number
}
