/**
 * Bot Manager Agent - Public API.
 *
 * Exports core agent functionality for external consumption.
 */

// Core agent functions
export { runAgent, runInteractiveAgent } from './agent.js'

// Types
export type {
  AgentResult,
  AgentUsage,
  ToolCallLog,
  AgentOptions,
  Message,
  SessionInfo,
  SDKMessageType,
  ExecutionEnvironment,
  ExecutionContext,
  TelegramContext
} from './types.js'

// System prompt
export { SYSTEM_PROMPT } from './prompts/system.js'

// MCP servers and tools
export {
  mcpServers,
  allAllowedTools,
  botManagerServer,
  githubServer,
  coolifyServer,
  codeExecutorServer,
  telegramMessengerServer
} from './tools/index.js'

// Telegram messenger service
export { telegramMessengerService } from './services/telegram-service.js'
export type {
  IButtonConfig,
  IUserResponse,
  IKeyboardButton,
  IMessageSection,
  IBuildMessageOptions
} from './services/telegram-service.js'

// Progress emitter for real-time MCP tool progress
export { progressEmitter } from './services/progress-emitter.js'
export type { IToolProgressEvent } from './services/progress-emitter.js'

// Subagents
export { subagents } from './subagents/index.js'
export type { AgentDefinition } from './subagents/index.js'

// Memory store
export { memoryStore } from './memory/store.js'

// Session management
export { sessionService } from './session/index.js'
export type {
  SessionMetadata,
  SessionData,
  SessionListOptions,
  CompactResult,
  CompactTrigger,
  PermissionModeType
} from './types.js'

// Compaction service
export { compactionService } from './compaction/index.js'
