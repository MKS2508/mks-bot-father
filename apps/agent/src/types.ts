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
  // Flag to prevent duplicate messages when telegram tools were used
  telegramMessageSent?: boolean
}

export interface AgentOptions {
  workingDirectory?: string
  maxTurns?: number
  model?: string
  maxBudgetUsd?: number
  permissionMode?: PermissionModeType
  includePartial?: boolean
  onMessage?: (message: unknown) => void
  onProgress?: (event: ProgressEvent) => void
  resumeSession?: string
  forkSession?: boolean
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

export interface SessionMetadata {
  sessionId: string
  name?: string
  createdAt: string
  lastMessageAt: string
  messageCount: number
  userId?: string
  gitBranch?: string
  projectPath?: string
  model?: string
  isForked?: boolean
  parentSessionId?: string
  totalCostUsd?: number
  inputTokens?: number
  outputTokens?: number
}

export interface SessionData {
  metadata: SessionMetadata
  messages: Message[]
  summary?: string
}

export type CompactTrigger = 'manual' | 'auto'

export interface CompactResult {
  success: boolean
  previousTokens: number
  newTokens: number
  summary: string
  trigger: CompactTrigger
}

export interface SessionListOptions {
  userId?: string
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'lastMessageAt'
  sortOrder?: 'asc' | 'desc'
}

export type PermissionModeType = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
