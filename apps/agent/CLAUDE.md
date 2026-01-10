# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## App Overview

**@mks2508/bot-manager-agent** is the AI agent implementation of the mks-bot-father ecosystem. It uses the Claude Agent SDK with custom MCP (Model Context Protocol) tools to automate Telegram bot management operations.

### Position in Monorepo

```
mks-bot-father/
├── core/packages/main/           # @mks2508/mks-bot-father (library)
├── apps/
│   ├── agent/                    # ← THIS APP (AI agent)
│   └── waxin-agent/              # TUI for debugging this agent
```

### Architecture

```
User Prompt
    ↓
runAgent() [agent.ts]
    ↓
Claude Agent SDK (query generator)
    ↓
MCP Tools [tools/]
    ├── bot-manager.ts    → BotFather automation
    ├── github.ts         → GitHub operations
    ├── coolify.ts        → Coolify deployment
    └── code-executor.ts  → Shell commands
    ↓
@mks2508/mks-bot-father (main package)
```

---

## Commands

```bash
# Development
bun run dev              # Watch mode (auto-restart on changes)
bun run start            # Run once
bun run start:telegram   # Run Telegram bot interface

# Build
bun run build            # Bundle CLI to dist/agent.js

# Testing
vitest run               # Run all tests
vitest run --coverage    # With coverage
vitest                   # Watch mode
vitest run src/tools/__tests__/coolify.test.ts  # Single file

# Debugging
bun run debug:coolify    # Test Coolify tools standalone
bun run debug:github     # Test GitHub tools standalone
bun run debug:all        # Run all debug scripts
```

---

## Key Files

| File | Purpose |
|------|---------|
| `agent.ts` | Main agent orchestrator (runAgent, runInteractiveAgent) |
| `cli.ts` | CLI entry point for standalone agent execution |
| `tools/index.ts` | MCP tools registration and export |
| `tools/bot-manager.ts` | BotFather automation MCP server |
| `tools/github.ts` | GitHub operations MCP server |
| `tools/coolify.ts` | Coolify deployment MCP server |
| `tools/code-executor.ts` | Shell command execution MCP server |
| `tools/scaffolder.ts` | Project scaffolding with bunspace templates |
| `prompts/system.ts` | System prompt for Claude |
| `subagents/` | Subagent definitions for specialized tasks |
| `types.ts` | TypeScript types (AgentOptions, AgentResult, etc.) |

---

## MCP Tools Reference

### Available MCP Tools

The agent exposes these tools to the Claude Agent SDK (registered in `tools/index.ts`):

**Standard SDK Tools:**
- `Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`, `WebSearch`, `Task`

**Bot Manager Tools:**
- `mcp__bot-manager__create_bot` - Create bot via BotFather
- `mcp__bot-manager__list_bots` - List all bots
- `mcp__bot-manager__configure_bot` - Configure bot settings
- `mcp__bot-manager__get_bot_token` - Get bot token

**GitHub Tools:**
- `mcp__github__create_repo` - Create new repository
- `mcp__github__clone_repo` - Clone repository
- `mcp__github__create_pr` - Create pull request
- `mcp__github__commit_and_push` - Commit and push changes
- `mcp__github__get_repo_info` - Get repository information

**Coolify Tools:**
- `mcp__coolify__deploy` - Deploy application
- `mcp__coolify__set_env_vars` - Set environment variables
- `mcp__coolify__get_deployment_status` - Get deployment status
- `mcp__coolify__list_applications` - List applications
- `mcp__coolify__delete_application` - Delete application
- `mcp__coolify__get_application_logs` - Get application logs
- `mcp__coolify__start_application` - Start application
- `mcp__coolify__stop_application` - Stop application
- `mcp__coolify__restart_application` - Restart application
- `mcp__coolify__get_deployment_history` - Get deployment history
- `mcp__coolify__update_application` - Update application
- `mcp__coolify__list_servers` - List servers
- `mcp__coolify__get_server` - Get server details
- `mcp__coolify__list_projects` - List projects
- `mcp__coolify__list_teams` - List teams
- `mcp__coolify__get_server_destinations` - Get server destinations
- `mcp__coolify__create_application` - Create application

**Code Executor Tools:**
- `mcp__code-executor__execute_command` - Execute shell command
- `mcp__code-executor__run_tests` - Run test suite
- `mcp__code-executor__install_dependencies` - Install dependencies
- `mcp__code-executor__build_project` - Build project
- `mcp__code-executor__lint_project` - Lint project
- `mcp__code-executor__type_check` - Type check
- `mcp__code-executor__get_project_structure` - Get project structure

**Scaffolder Tools:**
- `mcp__scaffolder__scaffold_project` - Create new project using bunspace templates (monorepo, telegram-bot, fumadocs)
- `mcp__scaffolder__validate_project` - Run full validation pipeline (install → typecheck → lint → build)
- `mcp__scaffolder__update_project_files` - Update README, .gitignore, .env.example, package.json after scaffolding

---

## Usage Patterns

### Running the Agent

```typescript
import { runAgent } from '@mks2508/bot-manager-agent'

const result = await runAgent('Create a new bot called test-bot', {
  workingDirectory: process.cwd(),
  model: 'claude-sonnet-4-5',
  maxBudgetUsd: 10.0,
  permissionMode: 'acceptEdits',
  onMessage: (msg) => console.log(msg)
})

console.log(result.sessionId)
console.log(result.usage)
```

### Interactive Agent

```typescript
import { runInteractiveAgent } from '@mks2508/bot-manager-agent'

const agent = await runInteractiveAgent({
  onAssistantMessage: (text) => console.log('Assistant:', text),
  onToolCall: (tool) => console.log('Tool:', tool)
})

// Send multiple messages in same session
await agent.sendMessage('Create a bot')
await agent.sendMessage('Now deploy it')
console.log(agent.getSessionId())
```

---

## Claude Agent SDK Integration

### Message Flow

```
runAgent(userPrompt, options)
    ↓
query({ prompt, options })  // Returns async generator
    ↓
for await (const message of query(...)) {
  // Message types: system, assistant, result
}
```

### Message Types

- **system/init**: Session initialization (capture `session_id`)
- **assistant**: Text content and tool_use blocks
- **result**: Final result with usage, cost, errors, permission_denials

### Permission Denials

Always check for `permission_denials` in result messages:

```typescript
if (msg.permission_denials?.length) {
  for (const denial of msg.permission_denials) {
    console.warn(`Denied ${denial.tool}: ${denial.reason}`)
  }
}
```

---

## MCP Tool Implementation Pattern

Each tool file follows this pattern:

```typescript
import { MCPServer } from '@anthropic-ai/claude-agent-sdk'

export const myToolServer = new MCPServer({
  name: 'my-tool',
  tools: {
    my_function: {
      description: 'Does something',
      inputSchema: {
        type: 'object',
        properties: { param: { type: 'string' } }
      },
      handler: async (input) => {
        // Implementation using @mks2508/mks-bot-father
        return { success: true, data: '...' }
      }
    }
  }
})
```

---

## Testing

### Test Structure

```
src/tools/__tests__/
├── bot-manager.test.ts
├── coolify.test.ts
└── github.test.ts
```

### Mock Pattern

Use `vi.mock` for module mocking:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('@mks2508/mks-bot-father', () => ({
  Pipeline: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue({ success: true })
  }))
}))
```

### Running Tests

```bash
# All tests
vitest run

# Specific file
vitest run src/tools/__tests__/coolify.test.ts

# Watch mode
vitest

# Coverage
vitest run --coverage
```

---

## Debug Scripts

The `debug/` folder contains standalone scripts for testing MCP tools:

```bash
bun run debug:coolify    # Test Coolify MCP server directly
bun run debug:github     # Test GitHub MCP server directly
```

These are useful for debugging tool implementations without running the full agent.

---

## Dependencies

### Runtime Dependencies

- `@anthropic-ai/claude-agent-sdk` - Agent SDK
- `@mks2508/mks-bot-father@workspace:*` - Main package (pipeline, managers)
- `@mks2508/better-logger` - Logging
- `telegraf` - Telegram bot framework
- `zod` - Schema validation

### Dev Dependencies

- `vitest` - Testing framework
- `typescript` - TypeScript compiler

---

## System Prompt

The system prompt is defined in `prompts/system.ts` and provides:
- Agent role and capabilities
- Tool usage guidelines
- Best practices for bot management

---

## Error Handling

### Common Error Types

- `AUTHENTICATION_FAILED` - Invalid API credentials
- `RATE_LIMIT_EXCEEDED` - API rate limit hit
- `CONTEXT_LENGTH_EXCEEDED` - Session too large

### Error Recovery

```typescript
try {
  const result = await runAgent(prompt, options)
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors)
  }
} catch (error) {
  console.error('Fatal:', error)
}
```

---

## Telegram Bot Interface

The agent can run as a Telegram bot (`src/telegram/bot.ts`):

```bash
bun run start:telegram
```

This exposes the agent via Telegram for remote execution.

---

## Configuration

### Environment Variables

- `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` - Claude API key
- `GITHUB_TOKEN` - GitHub personal access token
- `COOLIFY_URL` - Coolify instance URL
- `COOLIFY_TOKEN` - Coolify API token
- `TELEGRAM_BOT_TOKEN` - For Telegram bot mode

---

## TypeScript Configuration

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "strict": true,
  "moduleResolution": "bundler"
}
```

---

## Development Workflow

1. Make changes to tools or agent logic
2. Run `bun run dev` for auto-restart
3. Test with waxin-agent TUI: `cd ../waxin-agent && bun run dev`
4. Run tests: `vitest run`
5. Debug MCP tools: `bun run debug:coolify`

---

## See Also

- **Main Package**: `core/packages/main/CLAUDE.md` - Pipeline, managers, services
- **WAXIN Agent**: `apps/waxin-agent/CLAUDE.md` - TUI for interactive testing
- **Root**: `CLAUDE.md` - Monorepo overview and shared tooling
