/**
 * Shared types for the Bot Manager Agent.
 */

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

export interface AgentResult {
  success: boolean
  result: string | null
  sessionId: string
  toolCalls: ToolCallLog[]
  errors: string[]
  usage: AgentUsage
  durationMs: number
}

export interface AgentOptions {
  workingDirectory?: string
  maxTurns?: number
  model?: string
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions'
  includePartial?: boolean
  onMessage?: (message: unknown) => void
  resumeSession?: string
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
