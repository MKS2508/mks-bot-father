# mks-bun-monorepo

[![Use this template](https://img.shields.io/badge/Use_this_template-📦-blue?logo=github)](https://github.com/MKS2508/mks-bun-monorepo/generate)

> Modern Bun monorepo template for npm packages with TypeScript, workspaces, and best practices.

## Quick Start

Click "Use this template" to create a new repository, or use via CLI:

```bash
bun create bun-mono my-lib --template monorepo
```

## Features

- **Bun Workspaces**: Fast package management with native workspaces
- **TypeScript**: Strict mode with tsgo for lightning-fast type checking
- **Code Quality**: Prettier + Oxlint for consistent formatting and linting
- **Version Management**: Changesets for automated versioning and publishing
- **Modern Tooling**: Better Logger, no-throw, arktype

## Template Structure

```
my-monorepo/
├── core/
│   └── packages/          # Main packages (e.g., core library)
├── apps/                  # Applications (examples, docs)
└── package.json           # Workspace root
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start all packages in dev mode |
| `bun run build` | Build all packages |
| `bun run typecheck` | Type-check with tsgo |
| `bun run lint` | Lint with Oxlint |
| `bun run format` | Format with Prettier |
| `bun run changeset` | Create a changeset |
| `bun run changeset:version` | Apply changesets and bump versions |
| `bun run changeset:publish` | Publish packages to npm |

## Placeholder Variables

This template uses the following placeholders (auto-replaced by CLI):

- `mks-bot-father` - Project name (e.g., "my-lib")
- `mks2508` - npm scope without @ (e.g., "my-org")
- `` - Project description
- `MKS2508` - Author name
- `2026` - Current year

## Tech Stack

| Tool | Version | Purpose |
| ------ | ------- | ------- |
| **Bun** | 1.3+ | Runtime & package manager |
| **TypeScript** | 5.9+ | Language |
| **tsgo** | native-preview | Type checking |
| **Oxlint** | latest | Linting |
| **Prettier** | 3.4+ | Formatting |
| **Changesets** | latest | Version management |

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Project documentation
- [MUST-FOLLOW-GUIDELINES.md](./MUST-FOLLOW-GUIDELINES.md) - Development guidelines

## License

MIT
