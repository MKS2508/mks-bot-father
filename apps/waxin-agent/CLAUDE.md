# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**waxin-agent** is a Terminal User Interface (TUI) for debugging and testing AI agents. It is part of the **mks-bot-father** monorepo, which provides a TypeScript CLI and library for automating the complete Telegram bot creation and deployment pipeline (BotFather → GitHub → Coolify).

### Monorepo Context

```
mks-bot-father/                         # Monorepo root
├── core/packages/main/                 # @mks2508/mks-bot-father
│   └── src/
│       ├── pipeline.ts                 # Pipeline orchestrator
│       ├── config/index.ts             # ConfigManager
│       ├── github/index.ts             # GitHubManager
│       └── coolify/index.ts            # CoolifyManager
├── apps/
│   ├── agent/                          # Main agent implementation
│   └── waxin-agent/                    # ← This TUI application (debugging tool)
│       └── src/
│           ├── lib/agent-bridge.ts     # Agent SDK wrapper
│           ├── hooks/                  # State management
│           └── app.tsx                 # OpenTUI application
└── package.json                        # Monorepo config
```

### Relationship to Main Package

The waxin-agent TUI is a **development/testing tool** for the mks-bot-father ecosystem:

- **Main package** (`@mks2508/mks-bot-father`): Pipeline automation (BotFather, GitHub, Coolify)
- **Agent** (`apps/agent`): AI agent implementation with tools
- **waxin-agent**: TUI for interactive debugging and testing of agent operations

This TUI uses `@anthropic-ai/claude-agent-sdk` to execute agent commands interactively, with real-time streaming output, statistics tracking, and log management.

### Tech Stack

- **Runtime**: Bun (Node.js-compatible)
- **TUI Framework**: `@opentui/core` - Terminal rendering with Box/Text/Textarea renderables
- **Agent SDK**: `@anthropic-ai/claude-agent-sdk` - Agent execution via `query()` generator
- **Logging**: `@mks2508/better-logger` - Categorized component loggers with presets (shared with main package)
- **Type Safety**: TypeScript with strict mode enabled

### Shared Dependencies with Main Package

Both `@mks2508/mks-bot-father` and `waxin-agent` use:
- `@mks2508/better-logger` - Structured logging with presets (cyberpunk, minimal)
- `@mks2508/no-throw` - Error handling utilities
- `arktype` - Schema validation

See the main package's CLAUDE.md at `/Users/mks/mks-bot-father/CLAUDE.md` for details on:
- Pipeline orchestration (BotFather → GitHub → Coolify)
- ConfigManager for persistent configuration
- GitHubManager for repository operations
- CoolifyManager for deployment automation

---

## Commands

### Development

```bash
bun run dev        # Auto-opens tmux with TUI + Log Viewer (dual panes)
bun run dev:direct # Run TUI directly without tmux (watch mode)
bun run logs       # Run log viewer standalone
bun run build      # Compile TypeScript (tsgo - no output files, type-check only)
bun run typecheck  # Type check without building
bun run lint       # Lint with oxlint
bun run lint:fix   # Auto-fix lint issues
```

---

## 🔧 Development Workflow

### Running the TUI

```bash
bun run dev   # Auto-opens tmux session 'waxin' with dual panes:
              #   Pane 0 (top 70%):    TUI application
              #   Pane 1 (bottom 30%): Live log viewer
```

If the session already exists, it reconnects instead of duplicating.

### Monitoring Logs (for Claude)

```bash
txout waxin 50              # View last 50 lines from log viewer pane
tail -f logs/waxin-*.jsonl  # Raw JSON logs directly
```

### Log Format (JSONL)

Logs are written in JSONL format to `logs/waxin-YYYY-MM-DD.jsonl`:

```json
{"ts":"2026-01-08T21:00:00.123Z","level":"INF","src":"TUI","msg":"Starting WAXIN Agent"}
{"ts":"2026-01-08T21:00:01.456Z","level":"INF","src":"AGENT","msg":"Executing prompt","data":{"prompt":"List bots"}}
{"ts":"2026-01-08T21:00:02.789Z","level":"INF","src":"TOOL","msg":"Tool called","data":{"tool":"list_bots"}}
{"ts":"2026-01-08T21:00:03.012Z","level":"INF","src":"AGENT","msg":"Execution complete","metrics":{"duration_ms":1556,"tokens":{"in":245,"out":89},"cost_usd":0.0012}}
```

Fields:
- `ts`: ISO timestamp
- `level`: DBG/INF/WRN/ERR
- `src`: Component (TUI, AGENT, TOOL, STATS, CONFIG)
- `msg`: Human-readable message
- `data`: Structured key-value data (optional)
- `metrics`: Performance metrics (optional)

### Log Viewer Features

The log viewer (`scripts/log-viewer.ts`) provides:
- Real-time JSONL parsing
- Colored badges by level (DBG=gray, INF=blue, WRN=yellow, ERR=red)
- Colored badges by source (TUI=purple, AGENT=cyan, TOOL=magenta)
- Auto-formatted `key=value` pairs from data objects
- Highlighted metrics (duration, tokens, cost)

---

### Configuration

- **Environment variables**: Load from `.env` file in project root
- **Required**: `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` (sk-ant-...)
- **Optional**: `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL` (defaults to claude-sonnet-4-5-20250929)

---

## Architecture

### Core Pattern: Hooks + Libraries + Agent Bridge

The TUI is structured around three main layers:

1. **AgentBridge** (`lib/agent-bridge.ts`) - Wraps `@anthropic-ai/claude-agent-sdk` `query()`
2. **Hooks** (`hooks/`) - State management for agent, stats, logs, and operations
3. **TUI App** (`app.tsx`) - OpenTUI renderables with real-time updates

### Data Flow

```
User Input (Textarea)
    ↓
useAgent.execute()
    ↓
AgentBridge.query() → Agent SDK
    ↓
Streaming callbacks (onMessage, onAssistantMessage, onToolCall)
    ↓
Update TUI panels (stats, output, logs)
```

### Key Libraries

**`lib/agent-bridge.ts`**
- Wraps the `query()` generator from `@anthropic-ai/claude-agent-sdk`
- Emits messages via callbacks: `onMessage`, `onAssistantMessage`, `onToolCall`
- Returns `AgentResult` with usage, tokens, cost, duration, errors

**`lib/operation-queue.ts`**
- Background operation queue with retry logic
- Singleton via `getGlobalQueue()`
- Configurable: maxConcurrent, retryAttempts, retryDelay

**`lib/logger.ts`**
- Component loggers: `tuiLogger`, `agentLogger`, `toolsLogger`, `statsLogger`, `errorLogger`, `fileLogger`, `bgopsLogger`
- Presets: `configureTUILogger('cyberpunk' | 'minimal')`

**`lib/file-logger.ts`**
- Rotating log files with maxSize/maxFiles limits
- Singleton via `getGlobalFileLogger()`

**`lib/error-categorizer.ts`**
- Categorizes errors for better debugging

### Hooks

**`useAgent`** - Agent lifecycle management
- `execute(prompt, options, callbacks)` → AgentResult
- `getStats()` → AgentStats
- `getSessionId()` → string
- `clear()` → reset state
- Singleton bridge instance

**`useStats`** - Stats aggregation
- `updateStats(stats)` - Update current stats
- `getStats()` → AgentStats | null
- `getStatsHistory()` → StatsHistoryEntry[]
- `getAggregatedStats()` → Aggregated across all sessions
- Formatters: `formatTokens`, `formatCost`, `formatDuration`

**`useLogs`** - Log management with filtering
- `addLog(entry)` - Add log entry
- `logInfo`, `logDebug`, `logWarn`, `logError` - Convenience functions
- `getLogs()`, `getRecentLogs(count)` - Filtered logs
- `setLogFilter(filter)` - Set LogFilter { level, component, search, since }
- `initLogs({ logDirectory })` - Initialize file logger

**`useOperations`** - Background operations
- `enqueueOperation(tool, input)` → operation ID
- `cancelOperation(id)` → boolean
- `getOperations()`, `getOperationsByStatus(status)`
- `enableAutoProcessing(intervalMs)` - Start queue processing
- `disableAutoProcessing()` - Stop queue processing

### TUI Panels

**Stats Panel** (`components/StatsPanel.tsx`)
- Displays current agent stats (tokens, cost, duration, tools, errors)

**Output Panel** (`components/OutputPanel.tsx`)
- Shows assistant messages (streaming or final)

**Logs Panel** (`components/LogsPanel.tsx`)
- Real-time log viewer with filtering by level (DEBUG/INFO/WARN/ERROR)
- Press Ctrl+L to toggle log level

**Tools Panel** (`components/ToolsPanel.tsx`)
- Displays tool calls and results

**Input Panel** (`components/InputPanel.tsx`)
- Textarea for user prompts
- Enter: send, Shift+Enter: new line, Ctrl+K: clear

### Main App Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 Bot Manager Agent TUI                                    │
├──────────────────┬──────────────────────────────────────────┤
│  📊 Stats        │  Output Panel                             │
│  (tokens, cost)  │  (assistant messages)                    │
├──────────────────┴──────────────────────────────────────────┤
│  📋 Logs [INFO] (Press Ctrl+L to change)                    │
│  • Real-time log entries with filtering                     │
├─────────────────────────────────────────────────────────────┤
│  💬 Prompt                                                    │
│  [Enter: send | Shift+Enter: new line | Ctrl+L: logs]      │
└─────────────────────────────────────────────────────────────┘
```

### Keybindings

- **Enter** - Send prompt
- **Shift+Enter** - New line in textarea
- **Ctrl+L** - Toggle log level filter
- **Ctrl+K** - Clear input
- **Esc** - Exit TUI
- **F1** - Help

---

## TypeScript Configuration

- **Target**: ES2022, Module: ESNext
- **Strict mode**: Enabled (noImplicitAny, strictNullChecks, etc.)
- **Module resolution**: bundler (for Bun compatibility)
- **JSX**: react with custom factory (Box for both elements and fragments)
- **noEmit**: true (type-check only)

---

## Important Implementation Details

### Agent Execution Flow

1. User enters prompt in Textarea
2. `useAgent.execute()` called with AgentCallbacks
3. `AgentBridge.query()` iterates over messages from Agent SDK
4. Callbacks emit: onMessage (raw), onAssistantMessage (text), onToolCall (tool, input)
5. TUI updates panels in real-time
6. Final result includes usage, tokens, cost, duration, errors

### Log Filtering

Logs are stored in memory with filtering:
- `level` - LogLevel enum (DEBUG=0, INFO=1, WARN=2, ERROR=3)
- `component` - Filter by component name (e.g., "AGENT", "TUI")
- `search` - Filter by message text
- `since` - Filter by timestamp

### Frame Callbacks

The TUI uses `renderer.setFrameCallback()` for periodic updates:
- Runs every frame (~30-60 FPS)
- Used to update logs panel and stats panel
- Check `frameCounter % 30` to limit updates (~2/sec)

### Global Singletons

- `AgentBridge` via `getGlobalBridge()`
- `OperationQueue` via `getGlobalQueue(config?)`
- `FileLogger` via `getGlobalFileLogger()`

### Error Handling

- Errors are categorized via `categorizeError()` from `error-categorizer.ts`
- Agent errors appear in `AgentResult.errors` array
- File logger writes to `./logs/tui-debug-YYYY-MM-DD.log`

---

## Integration with Main Package

### Using the Main Package from TUI

The waxin-agent TUI can test and debug operations from the main mks-bot-father package:

```typescript
// Example: Testing pipeline operations via TUI
import { Pipeline, ConfigManager, GitHubManager, CoolifyManager } from '@mks2508/mks-bot-father'

// In your agent tools, you can wrap main package functions:
async function createBotTool(name: string) {
  const pipeline = new Pipeline()
  return await pipeline.run({
    botName: name,
    skipGithub: true,
    skipCoolify: true
  })
}
```

### Tool Registration

The TUI's `AgentBridge` can execute tools that interact with the main package:
- **Pipeline operations**: Full automation flow (BotFather → GitHub → Coolify)
- **Config operations**: Read/write persistent configuration
- **GitHub operations**: Create repos, push code
- **Coolify operations**: Deploy applications

### Environment Variables

Both packages share similar environment configuration:
- `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` - For agent SDK
- `GITHUB_TOKEN` - For GitHub operations
- `COOLIFY_URL` and `COOLIFY_TOKEN` - For deployment
- See main package CLAUDE.md for complete configuration schema

---

## Development Notes

### Adding New Panels

1. Create component in `src/components/`
2. Add to `src/components/index.ts`
3. Import and render in `src/app.tsx`
4. Update panel layout (positions are absolute)

### Adding New Loggers

```typescript
// In src/lib/logger.ts
export const myLogger = component('MYCOMPONENT')

// Use anywhere
import { myLogger } from './lib/logger.js'
myLogger.info('Message')
```

### Extending AgentCallbacks

The `AgentCallbacks` interface supports:
- `onMessage` - Raw message from Agent SDK
- `onAssistantMessage` - Text content from assistant
- `onToolCall` - Tool invocation with input
- `onProgress` - Progress updates (0-100)
- `onThinking` - Thinking/reasoning text

Add new callbacks to `src/types.ts` and implement in `src/app.tsx`.

### Debugging Agent Issues

- Check `agentLogger.debug()` output for environment variables
- Verify `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` is set
- Look for specific error types: AUTHENTICATION_FAILED, RATE_LIMIT_EXCEEDED, CONTEXT_LENGTH_EXCEEDED
- Enable debug logs with `setLogFilter({ level: 0 })` (DEBUG level)

---

## File Structure

```
src/
├── index.ts              # Entry point (dotenv, startTUI)
├── app.tsx               # Main TUI application
├── types.ts              # Shared types (LogLevel, AgentStats, etc.)
├── components/           # TUI panels (Stats, Output, Logs, Tools, Input)
├── hooks/                # State management hooks
│   ├── useAgent.ts       # Agent lifecycle
│   ├── useStats.ts       # Stats aggregation
│   ├── useLogs.ts        # Log management
│   └── useOperations.ts  # Background operations
└── lib/                  # Core libraries
    ├── agent-bridge.ts   # Agent SDK wrapper
    ├── operation-queue.ts # Background task queue
    ├── logger.ts         # Better logger config
    ├── file-logger.ts    # File logging with rotation
    └── error-categorizer.ts # Error categorization
```
