/**
 * TUI-specific types for the Bot Manager Agent TUI.
 *
 * Agent types are imported from @mks2508/bot-manager-agent.
 */

// Re-export agent types for convenience
export type {
  AgentResult,
  AgentOptions,
  AgentUsage,
  ToolCallLog
} from '@mks2508/bot-manager-agent'

/**
 * Agent callbacks for streaming and progress.
 */
export interface AgentCallbacks {
  onMessage?: (message: unknown) => void
  onAssistantMessage?: (text: string) => void
  onToolCall?: (tool: string, input: unknown) => void
  onProgress?: (progress: number, message: string) => void
  onThinking?: (text: string) => void
}

/**
 * Log levels for filtering and display.
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Log entry structure.
 */
export interface LogEntry {
  timestamp: string
  level: LogLevel
  component: string
  message: string
  data?: unknown
}

/**
 * Log filter configuration.
 */
export interface LogFilter {
  level: LogLevel
  component?: string
  search?: string
  since?: Date
}

/**
 * Agent stats structure (computed from AgentResult).
 */
export interface AgentStats {
  sessionId: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  totalCostUsd: number
  durationMs: number
  toolCallsCount: number
  errorsCount: number
}

/**
 * Output mode for agent responses.
 */
export type OutputMode = 'streaming' | 'final' | 'progress'

/**
 * TUI configuration options.
 */
export interface TUIConfig {
  outputMode: OutputMode
  showToolCalls: boolean
  showThinking: boolean
}

/**
 * Log file configuration.
 */
export interface LogFileConfig {
  directory: string
  maxSize: number
  maxFiles: number
  pattern: string
}
