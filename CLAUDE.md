# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Development Guidelines

**ALL development MUST follow the rules in `MUST-FOLLOW-GUIDELINES.md`**

Before making ANY code changes, read and understand:
- `/MUST-FOLLOW-GUIDELINES.md` - Source of truth for coding standards

**Key Rules Overview:**
- JSDoc completo profesional obligatorio
- Result pattern siempre (mks2508/utils/result)
- Logging via mks2508/utils/logger (NUNCA console.log)
- Validacion con Arktype
- Nomenclatura: prefijo I para interfaces
- Estructura: src/types/ y src/utils/ con barrel exports
- Async/await preferido sobre Promise chaining

## Monorepo Stack

This is a Bun-based monorepo for npm packages.

**Core Stack:**
- **Runtime**: Bun (package manager & runtime)
- **Workspaces**: Bun workspaces (`workspace:*` protocol)
- **Bundling**: Rolldown (`rolldown` v1.0.0-beta.58)
- **Linting**: Oxlint (OxC-based linter)
- **Formatting**: Prettier with `prettier-plugin-organize-imports`
- **Type Checking**: TSGO (@typescript/native-preview v7.0.0-dev)
- **Validation**: Arktype (schema validation)
- **Versioning**: Changesets

## Commands

```bash
# Development - all workspaces
bun run dev          # Start dev mode for all packages

# Build - all workspaces
bun run build        # Build all packages

# Type checking
bun run typecheck    # Type check all packages

# Linting (Oxlint only - no ESLint)
bun run lint         # Run oxlint
bun run lint:fix     # Auto-fix oxlint issues

# Formatting (Prettier)
bun run format       # Format all files
bun run format:check # Check formatting

# Clean everything
bun run clean        # Remove node_modules, dist, .turbo

# Changesets (versioning)
bun run changeset              # Create a changeset
bun run changeset:version      # Apply changesets and bump versions
bun run changeset:publish      # Publish packages to npm
```

## Monorepo Structure

```
├── core/
│   └── packages/
│       ├── utils/              # Shared utilities package
│       │   ├── src/
│       │   │   ├── logger.ts   # Logging wrapper (@mks2508/better-logger)
│       │   │   ├── result.ts   # Result wrapper (@mks2508/no-throw)
│       │   │   └── index.ts    # Barrel export
│       │   ├── rolldown.config.ts
│       │   └── package.json
│       └── main/               # Main library package
│           ├── src/
│           └── package.json    # Depends on utils via workspace:*
└── apps/
    └── example/                # Example app
        └── package.json        # Depends on utils via workspace:*
```

**Workspace Pattern:**
- Packages in `core/packages/*` and `apps/*` are auto-discovered
- Internal dependencies use `"mks2508/package": "workspace:*"`
- Root `package.json` defines shared devDependencies

## Shared Utilities Pattern

The `mks2508/utils` package provides shared wrappers:

### Logger (`mks2508/utils/logger`)

Wrapper around `@mks2508/better-logger` with preset configured:
```typescript
import { createLogger } from 'mks2508/utils/logger';

const log = createLogger('ComponentName');
log.info('Message');
log.success('Success!');
```

### Result (`mks2508/utils/result`)

Wrapper around `@mks2508/no-throw` with domain-specific error codes:
```typescript
import { ok, tryCatch, createAppError, type Result } from 'mks2508/utils/result';

const result: Result<string> = ok('success');
const error = createAppError('NetworkError', 'Failed to fetch');
```

## Tool Configuration Files

### Root TypeScript/TSGO (`tsconfig.json`)
- Target: ES2022, Module: ESNext
- Strict mode enabled
- `moduleResolution: "bundler"`
- Key options: `verbatimModuleSyntax: true`, `declaration: true`
- Compiler: TSGO (@typescript/native-preview) for faster type checking

### Validation (Arktype)
Schema validation using Arktype for performance:
```typescript
import { type } from 'arktype';

export const OptionsSchema = type({
  url: 'string',
  timeout: 'number.optional',
});

const result = OptionsSchema(options);
if (result instanceof type.errors) {
  return err(result.summary());
}
```

### Oxlint (`oxlint.json`)
- Categories: `correctness`, `suspicious`, `perf`, `style` -> "warn"
- `restriction` -> "off"
- Env: `node`, `es2021`

### Prettier (`.prettierrc`)
- 100 char width, 2 spaces, single quotes
- Plugin: `prettier-plugin-organize-imports`
- Trailing commas: es5

## Workspace Dependencies

When adding a new package dependency:

1. **For shared packages**: Add to appropriate `core/packages/*/package.json`
2. **For workspace deps**: Use `"mks2508/name": "workspace:*"`
3. **For external deps**: Add to root `package.json` devDependencies if used across multiple packages

```bash
bun install              # Install/resolves workspace dependencies
```

## Build Output Patterns

- **Rolldown**: Generates JS + sourcemaps, separate `tsc --emitDeclarationOnly` for types
- Always ESM-first, CJS as optional compatibility layer
