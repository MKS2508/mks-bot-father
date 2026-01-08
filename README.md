# @mks2508/mks-bot-father

[![npm version](https://img.shields.io/npm/v/@mks2508/mks-bot-father)](https://www.npmjs.com/package/@mks2508/mks-bot-father)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Complete pipeline for Telegram bot automation: BotFather + GitHub + Coolify deployment

## Overview

**mks-bot-father** automates the entire process of creating and deploying Telegram bots:

1. **BotFather Automation** - Creates your bot via Telegram's @BotFather
2. **GitHub Integration** - Creates a repository from template and pushes code
3. **Coolify Deployment** - Deploys your bot to Coolify with environment variables

Works as both a **CLI tool** and a **TypeScript library**.

## Installation

```bash
# Global installation (recommended for CLI)
npm install -g @mks2508/mks-bot-father

# Or use directly with npx
npx @mks2508/mks-bot-father --help

# As a library dependency
bun add @mks2508/mks-bot-father
```

## Quick Start

### 1. Configure credentials

```bash
# Telegram API credentials (required for BotFather automation)
mbf config set telegram.apiId YOUR_API_ID
mbf config set telegram.apiHash YOUR_API_HASH

# GitHub token (optional - can use gh CLI auth)
mbf config set github.token ghp_xxxx

# Coolify (optional - for deployment)
mbf config set coolify.url https://coolify.example.com
mbf config set coolify.token YOUR_COOLIFY_TOKEN
```

### 2. Create a bot

```bash
# Full pipeline: BotFather + GitHub + Coolify
mbf create my-awesome-bot --full

# Just create the bot via BotFather
mbf create my-bot

# Create bot + GitHub repo (no deployment)
mbf create my-bot --github

# With description
mbf create my-bot --description "My awesome Telegram bot" --full
```

### 3. Check status

```bash
mbf status
```

## CLI Reference

### `mbf create <name>`

Create a new Telegram bot with the full pipeline.

| Option | Description |
|--------|-------------|
| `-d, --description <text>` | Bot description |
| `--github` | Create GitHub repository |
| `--github-org <org>` | GitHub organization (default: authenticated user) |
| `--deploy` | Deploy to Coolify |
| `--coolify-server <uuid>` | Coolify server UUID |
| `--coolify-dest <uuid>` | Coolify destination UUID |
| `--skip-botfather` | Skip BotFather automation |
| `--full` | Full pipeline: BotFather + GitHub + Coolify |

```bash
# Examples
mbf create my-bot --full
mbf create my-bot --github --github-org MyOrg
mbf create my-bot --skip-botfather --github --deploy
```

### `mbf deploy <name>`

Deploy an existing application to Coolify.

| Option | Description |
|--------|-------------|
| `-f, --force` | Force rebuild without cache |
| `-t, --tag <tag>` | Deploy by tag instead of UUID |

```bash
mbf deploy my-bot
mbf deploy my-bot --force
mbf deploy abc123-uuid --tag v1.0.0
```

### `mbf config <action> [key] [value]`

Manage configuration.

| Action | Description |
|--------|-------------|
| `get <key>` | Get a configuration value |
| `set <key> <value>` | Set a configuration value |
| `list` | List all configuration |
| `path` | Show config file path |

```bash
mbf config list
mbf config get github.token
mbf config set coolify.url https://coolify.example.com
mbf config path
```

### `mbf status`

Show configuration status and verify connections.

```bash
mbf status

# Output:
# 📋 Configuration Status
#
# ✅ GitHub: Authenticated as MKS2508
# ✅ Coolify: https://coolify.example.com
# ✅ Telegram: API credentials configured
#
# 📁 Config file: /Users/you/.config/mks-bot-father/config.json
```

## Library Usage

Use mks-bot-father programmatically in your TypeScript/JavaScript projects.

### Pipeline

```typescript
import { Pipeline, getPipeline } from '@mks2508/mks-bot-father'

const pipeline = getPipeline()

const result = await pipeline.run({
  botName: 'my-awesome-bot',
  botDescription: 'My awesome Telegram bot',
  createGitHubRepo: true,
  deployToCoolify: true,
})

if (result.success) {
  console.log('Bot created:', result.botUsername)
  console.log('Token:', result.botToken)
  console.log('GitHub:', result.githubRepoUrl)
  console.log('Coolify:', result.deploymentUrl)
} else {
  console.error('Errors:', result.errors)
}
```

### Individual Managers

```typescript
import {
  getConfigManager,
  getGitHubManager,
  getCoolifyManager,
} from '@mks2508/mks-bot-father'

// Configuration
const config = getConfigManager()
config.set('github.token', 'ghp_xxx')
const token = config.getGitHubToken()

// GitHub
const github = getGitHubManager()
await github.init()
const repo = await github.createRepo({
  name: 'my-bot',
  description: 'My Telegram bot',
  private: false,
})

// Coolify
const coolify = getCoolifyManager()
await coolify.init()
await coolify.deploy({ uuid: 'app-uuid' })
```

## Configuration

Configuration is stored in `~/.config/mks-bot-father/config.json`.

### Schema

```typescript
interface Config {
  telegram?: {
    apiId?: number      // Telegram API ID
    apiHash?: string    // Telegram API Hash
  }
  github?: {
    token?: string              // GitHub personal access token
    useGhCli?: boolean          // Use gh CLI for auth (default: true)
    defaultOrg?: string         // Default organization
    defaultVisibility?: 'public' | 'private'
  }
  coolify?: {
    url?: string                // Coolify instance URL
    token?: string              // Coolify API token
    defaultServer?: string      // Default server UUID
    defaultDestination?: string // Default destination UUID
  }
}
```

### Token Resolution Order

**GitHub token:**
1. Config file (`github.token`)
2. gh CLI (`gh auth token`)
3. Environment variable (`GITHUB_TOKEN`)

## Requirements

- **Node.js** >= 18.0.0 or **Bun** >= 1.0.0
- **Telegram API credentials** - Get from https://my.telegram.org
- **GitHub account** - For repository creation
- **Coolify instance** (optional) - For deployment

## Getting Telegram API Credentials

1. Go to https://my.telegram.org
2. Log in with your phone number
3. Click "API development tools"
4. Create a new application
5. Copy the `api_id` and `api_hash`

```bash
mbf config set telegram.apiId 12345678
mbf config set telegram.apiHash abcdef1234567890
```

## Project Template

When creating a bot, mks-bot-father uses the [mks-telegram-bot](https://github.com/MKS2508/mks-telegram-bot) template which includes:

- GramIO framework for bot development
- TypeScript with strict mode
- Docker support
- Webhook/polling modes
- Environment-based configuration

## Dependencies

| Package | Purpose |
|---------|---------|
| [@mks2508/telegram-bot-manager](https://www.npmjs.com/package/@mks2508/telegram-bot-manager) | BotFather automation via MTProto |
| [@mks2508/better-logger](https://www.npmjs.com/package/@mks2508/better-logger) | Styled console logging |
| [arktype](https://arktype.io) | Runtime type validation |
| [commander](https://www.npmjs.com/package/commander) | CLI framework |

## Related Projects

- [@mks2508/telegram-bot-manager](https://github.com/MKS2508/telegram-bot-manager) - BotFather automation library
- [mks-telegram-bot](https://github.com/MKS2508/mks-telegram-bot) - Bot template

## License

MIT
