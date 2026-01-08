# waxin-agent

Terminal User Interface (TUI) for debugging and testing AI agents interactively.

## Overview

waxin-agent is a development tool that provides a real-time TUI for:
- Executing AI agent prompts with streaming output
- Monitoring token usage, costs, and execution statistics
- Viewing logs with filtering (DEBUG/INFO/WARN/ERROR)
- Tracking tool calls and results

This is part of the **mks-bot-father** monorepo, which automates the complete Telegram bot creation pipeline (BotFather → GitHub → Coolify).

## Installation

```bash
bun install
```

## Usage

### Development

```bash
bun run dev        # Start TUI in watch mode
bun run build      # Type check
bun run lint       # Lint with oxlint
```

### Running the TUI

```bash
bun run dev
```

**Required environment variables** (create `.env` in project root):
```bash
ANTHROPIC_API_KEY=sk-ant-...
# or
ANTHROPIC_AUTH_TOKEN=sk-ant-...
```

**Optional**:
```bash
ANTHROPIC_BASE_URL=https://...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
```

### TUI Controls

- **Enter** - Send prompt
- **Shift+Enter** - New line in textarea
- **Ctrl+L** - Toggle log level filter
- **Ctrl+K** - Clear input
- **Esc** - Exit TUI
- **F1** - Help

## Architecture

```
src/
├── index.ts              # Entry point (dotenv, startTUI)
├── app.tsx               # Main TUI application
├── types.ts              # Shared types
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
    ├── file-logger.ts    # File logging
    └── error-categorizer.ts # Error handling
```

## Tech Stack

- **Runtime**: Bun
- **TUI Framework**: `@opentui/core`
- **Agent SDK**: `@anthropic-ai/claude-agent-sdk`
- **Logging**: `@mks2508/better-logger`

## Related Packages

- **@mks2508/mks-bot-father** - Main package with pipeline automation
- **@mks2508/telegram-bot-manager** - BotFather automation library

## License

MIT
