# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

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

## License

MIT
