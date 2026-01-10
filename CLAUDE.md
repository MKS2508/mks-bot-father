# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a **Bun workspace monorepo** with three main components:

```
mks-bot-father/
├── core/packages/main/           # @mks2508/mks-bot-father (published library + CLI)
├── apps/
│   ├── agent/                    # Bot Manager Agent (Claude Agent SDK + MCP tools)
│   ├── waxin-agent/              # TUI for agent debugging/testing (OpenTUI)
│   └── log-viewer/               # JSONL log viewer utility
└── package.json                  # Root workspace config
```

### Component Overview

| Component | Purpose | Main Tech |
|-----------|---------|-----------|
| `core/packages/main` | Published npm package for bot automation pipeline | telegram-bot-manager, arktype |
| `apps/agent` | AI agent with MCP tools for bot management | Claude Agent SDK, telegraf |
| `apps/waxin-agent` | Terminal UI for interactive agent debugging | OpenTUI, React, zustand |
| `apps/log-viewer` | Standalone JSONL log viewer | Bun, CLI utilities |

### Workspace Dependencies

Apps reference the main package using `workspace:*`:
- `agent` depends on `@mks2508/mks-bot-father@workspace:*`
- `waxin-agent` depends on `@mks2508/bot-manager-agent@workspace:*`

---

## Root Commands

```bash
# Install all dependencies (handles workspace linking)
bun install

# Run commands across all packages
bun run --filter '*' dev          # Start dev mode for all packages
bun run --filter '*' build        # Build all packages
bun run --filter '*' typecheck    # Type check all packages

# Linting (root level)
bun run lint                      # oxlint
bun run lint:fix                  # oxlint --fix

# Log viewer
bun run logs:tui                  # View waxin-agent logs in TUI
```

---

## Package-Specific Documentation

For detailed information about each component, see:
- **Main Package**: `core/packages/main/CLAUDE.md` - Pipeline automation, ConfigManager, GitHubManager, CoolifyManager
- **Agent**: `apps/agent/CLAUDE.md` - Claude Agent SDK integration, MCP tools, subagents
- **WAXIN Agent**: `apps/waxin-agent/CLAUDE.md` - OpenTUI application, React hooks, shortcuts system

---

## Key Technologies Across Monorepo

- **Runtime**: Bun (package manager and runtime)
- **Language**: TypeScript (ES2022 target, strict mode)
- **Testing**: Vitest (globally installed, use `vitest run` not `bun test`)
- **Logging**: `@mks2508/better-logger` v4.0.0 (cyberpunk preset)
- **Schema**: arktype (main package), zod (agent)
- **Build**: tsgo for library, bun build for CLIs

---

## Development Workflow

### Adding Dependencies

```bash
# Add to root (shared)
bun add <package>

# Add to specific package
bun --filter <package-name> add <package>

# Add dev dependency
bun add -d <package>
```

### Running Tests

```bash
# From root - run all tests
vitest run --config vitest.config.ts

# From package directory
cd apps/agent && vitest run

# Run specific test file
vitest run apps/agent/src/tools/__tests__/coolify.test.ts

# Coverage
vitest run --coverage
```

### Type Checking

Each package has its own `typecheck` script:
```bash
bun run --filter '*' typecheck
```

---

## Critical Architecture Notes

### MCP Tools Pattern

The agent uses custom MCP servers (Model Context Protocol) in `apps/agent/src/tools/`:
- `bot-manager.ts` - BotFather automation
- `github.ts` - GitHub operations
- `coolify.ts` - Coolify deployment
- `code-executor.ts` - Shell command execution

These are registered in `tools/index.ts` and exposed to the Claude Agent SDK.

### Workspace Resolution

When developing across packages:
1. Changes in `core/packages/main` require rebuilding: `cd core/packages/main && bun run build`
2. Apps reference the built `dist/` output, not source files
3. Use `workspace:*` in package.json for internal dependencies

### Shared Configuration

Root `tsconfig.json` provides base configuration; packages extend it:
- `noUncheckedIndexedAccess: false` - Relaxed for array access
- `exactOptionalPropertyTypes: false` - Relaxed for optional props
- `strict: true` - Full strict mode enabled

---

## Project Overview

**@mks2508/mks-bot-father** is a TypeScript CLI and library for automating the complete Telegram bot creation and deployment pipeline:

1. **BotFather Automation** - Creates bots via @BotFather using telegram-bot-manager
2. **GitHub Integration** - Creates repositories and pushes scaffolded code
3. **Coolify Deployment** - Deploys to Coolify with environment variables

### Dual Purpose

- **CLI**: `npx @mks2508/mks-bot-father create my-bot --full`
- **Library**: `import { Pipeline } from '@mks2508/mks-bot-father'`

## CRITICAL: Development Guidelines

**ALL development MUST follow the rules in `MUST-FOLLOW-GUIDELINES.md`**

**Key Rules:**
- **arktype** for schema validation (not zod)
- **@mks2508/better-logger** for logging (NEVER console.log in library code)
- **JSDoc** on all public exports
- **Interface prefix `I`** (e.g., `IPipelineOptions`)

## Package Structure

```
mks-bot-father/
├── core/packages/main/           # Main package: @mks2508/mks-bot-father
│   ├── src/
│   │   ├── index.ts              # Public exports
│   │   ├── types.ts              # Types with arktype schemas
│   │   ├── pipeline.ts           # Pipeline orchestrator
│   │   ├── config/index.ts       # ConfigManager
│   │   ├── github/index.ts       # GitHubManager
│   │   ├── coolify/index.ts      # CoolifyManager
│   │   └── cli/
│   │       ├── index.ts          # CLI entry point
│   │       └── commands/         # create, deploy, config
│   ├── dist/
│   │   ├── *.js                  # Library (ESM)
│   │   ├── *.d.ts                # Type declarations
│   │   └── bin/cli.js            # Bundled CLI (~1.7MB)
│   ├── package.json
│   └── tsconfig.build.json
├── package.json                   # Root workspace config
└── tsconfig.json                  # Base TypeScript config
```

## Commands

```bash
# Root level
bun install
bun run build                     # Build library + CLI
bun run typecheck                 # Type check with tsgo
bun run lint                      # Lint with oxlint

# Package level (core/packages/main)
bun run build                     # tsgo + bun build CLI
bun run build:lib                 # Library only
bun run build:cli                 # CLI bundle only

# CLI usage
node dist/bin/cli.js --help
mbf create my-bot --full
mbf status
```

## Testing

**CRITICAL**: Always use `vitest` for running tests (globally installed). Do NOT use `bun test`.

```bash
# Run all tests (from any package directory)
vitest run

# Run tests with coverage
vitest run --coverage

# Watch mode for development
vitest

# Run specific test file
vitest run src/tools/__tests__/coolify.test.ts
```

### Test Structure

- **Core package** (`core/packages/main`): 183+ tests, ~97% coverage
- **Agent** (`apps/agent`): 148+ tests, ~90% coverage

### Mocking Patterns

Tests use `vi.mock` for module mocking. Important patterns:

```typescript
// Mock must be inline (hoisted to top of file)
vi.mock('@mks2508/mks-bot-father', () => ({
  getService: () => ({ method: vi.fn() })
}))

// Use vi.resetModules() for fresh module state in beforeEach
beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  await import('../module.js')
})
```

## Build Configuration

### Build Process

- **build:lib**: `tsgo -p tsconfig.build.json` - Compiles library + types to `dist/`
- **build:cli**: `bun build ./src/cli/index.ts --outfile ./dist/bin/cli.js --target node --minify`

The CLI is bundled separately to include all dependencies in a single file.

### tsconfig.build.json

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "allowImportingTsExtensions": false,
    "rewriteRelativeImportExtensions": true
  },
  "exclude": ["src/cli/**/*"]  // CLI is bundled separately
}
```

## Core Architecture

### Pipeline (`pipeline.ts`)

Orchestrates the full automation flow:

```typescript
class Pipeline {
  async run(options: IPipelineOptions): Promise<IPipelineResult> {
    // Step 1: BotFather automation (telegram-bot-manager)
    // Step 2: Scaffold project with bunspace
    // Step 3: Create GitHub repository
    // Step 4: Deploy to Coolify
  }
}
```

### ConfigManager (`config/index.ts`)

Manages persistent configuration stored in `~/.config/mks-bot-father/config.json`:

```typescript
const config = getConfigManager()
config.set('github.token', 'ghp_xxx')
config.getTelegramCredentials()
await config.resolveGitHubToken() // Config -> gh CLI -> env
```

### GitHubManager (`github/index.ts`)

- `createRepo()` - Create new repository
- `createRepoFromTemplate()` - Create from template
- `pushToRepo()` - Initialize git and push

### CoolifyManager (`coolify/index.ts`)

- `createApplication()` - Create app from GitHub repo
- `setEnvironmentVariables()` - Set env vars
- `deploy()` - Trigger deployment

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@mks2508/telegram-bot-manager` | BotFather automation (programmatic) |
| `@mks2508/better-logger` | Styled logging |
| `arktype` | Schema validation |
| `commander` | CLI framework |
| `ora` | Spinners |
| `chalk` | Colors |

## telegram-bot-manager Integration

**CRITICAL**: Use the library programmatically, NOT via spawn.

### Correct Usage

```typescript
import { BotFatherManager, BootstrapClient, EnvManager } from '@mks2508/telegram-bot-manager'

// Connect to Telegram
const client = new BootstrapClient({ apiId, apiHash })
await client.ensureAuthorized()

// Create bot via BotFather
const botFather = new BotFatherManager(client)
const result = await botFather.createBot({ botName, botUsername })

// IBotCreationResult is a simple object, NOT a Result type
if (!result.success) {
  console.error(result.error)
  return
}

// Save to EnvManager
const envManager = new EnvManager()
await envManager.createEnv(result.botUsername, 'local', {
  botToken: result.botToken,
  mode: 'polling',
})

await client.disconnect()
```

### IBotCreationResult

This is a simple object, NOT a Result type:

```typescript
interface IBotCreationResult {
  success: boolean
  botToken?: string
  botUsername?: string
  error?: string
}

// Correct
if (!result.success) { ... }

// WRONG - this is not a Result type
if (result.isErr()) { ... }
```

### EnvManager Methods

```typescript
// Available methods
await envManager.createEnv(username, environment, config)  // Use this
await envManager.readEnv(username, environment)
await envManager.updateEnv(username, environment, updates)
await envManager.listBots()
await envManager.setActiveBot(username)

// WRONG - saveBot() does not exist
await envManager.saveBot({...})
```

## Configuration Schema

```typescript
const ConfigSchema = type({
  'github?': {
    'token?': 'string',
    'useGhCli?': 'boolean',
    'defaultOrg?': 'string',
    'defaultVisibility?': '"public" | "private"',
  },
  'coolify?': {
    'url?': 'string',
    'token?': 'string',
    'defaultServer?': 'string',
    'defaultDestination?': 'string',
  },
  'telegram?': {
    'apiId?': 'number',
    'apiHash?': 'string',
  },
})
```

## Arktype Validation Pattern

```typescript
import { type } from 'arktype'

const result = ConfigSchema(parsed)
if (result instanceof type.errors) {
  log.warn('Invalid config')
  return
}
// result is now typed as Config
```

## Claude Agent SDK Reference

Este proyecto usa el Claude Agent SDK para el sistema de agentes.

### URLs Oficiales
- [SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [Building Agents Blog](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [GitHub SDK](https://github.com/anthropics/claude-agent-sdk-typescript)

### Documentación Detallada
Ver: `apps/agent/docs/claude-agent-sdk-reference.md`

### Patrones Clave

```typescript
// Query básico con streaming
import { query } from "@anthropic-ai/claude-agent-sdk"

for await (const message of query({
  prompt: "Task",
  options: {
    model: "claude-sonnet-4-5",
    cwd: process.cwd(),
    allowedTools: ["Read", "Edit", "Bash", "Task"],  // Task para subagentes
    maxBudgetUsd: 10.0
  }
})) {
  // Capturar session_id siempre
  if (message.type === 'system' && message.subtype === 'init') {
    sessionId = message.session_id
  }
  // Verificar permission_denials
  if (message.type === 'result' && message.permission_denials?.length) {
    console.warn('Denials:', message.permission_denials)
  }
}
```

### Archivos del Agent
- `/apps/agent/src/agent.ts` - Orquestador principal
- `/apps/agent/src/tools/` - MCP servers (bot-manager, github, coolify, code-executor)
- `/apps/agent/src/subagents/` - Definición de subagentes

## License

MIT
