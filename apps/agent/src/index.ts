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
  SDKMessageType
} from './types.js'

// System prompt and templates
export { SYSTEM_PROMPT, TASK_TEMPLATES } from './prompts/system.js'

// MCP servers and tools
export {
  mcpServers,
  allAllowedTools,
  botManagerServer,
  githubServer,
  coolifyServer,
  codeExecutorServer
} from './tools/index.js'

// Subagents
export { subagents } from './subagents/index.js'
export type { AgentDefinition } from './subagents/index.js'

// Memory store
export { memoryStore } from './memory/store.js'
