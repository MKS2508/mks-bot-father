#!/usr/bin/env bun
/**
 * Development Script - Auto-setup tmux sessions
 *
 * Usage: bun run dev
 *
 * Creates two separate tmux sessions:
 * - waxintui: TUI application
 * - waxinlogs: Log viewer
 *
 * After creation, use:
 * - cx waxintui (attach to TUI)
 * - cx waxinlogs (attach to log viewer)
 * - tx waxintui "command" (send command to TUI)
 * - tx waxinlogs "command" (send command to log viewer)
 */

import { $ } from 'bun'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_DIR = resolve(__dirname, '..')

const SESSION_TUI = 'waxintui'
const SESSION_LOGS = 'waxinlogs'

// ANSI colors
const c = {
  reset: '\x1b[0m',
  green: '\x1b[92m',
  yellow: '\x1b[93m',
  cyan: '\x1b[96m',
  dim: '\x1b[2m'
}

async function sessionExists(name: string): Promise<boolean> {
  try {
    const result = await $`tmux has-session -t ${name} 2>/dev/null`.quiet()
    return result.exitCode === 0
  } catch {
    return false
  }
}

async function createTUISession(): Promise<void> {
  console.log(`${c.cyan}Creating tmux session '${SESSION_TUI}' (TUI)...${c.reset}`)

  await $`tmux new-session -d -s ${SESSION_TUI} -c ${PROJECT_DIR} "bun run --watch src/index.ts"`.quiet()
  await $`tmux set -t ${SESSION_TUI} mouse on`.quiet()
  await $`tmux set -t ${SESSION_TUI} history-limit 10000`.quiet()

  console.log(`${c.green}✓ TUI session created${c.reset}`)
}

async function createLogsSession(): Promise<void> {
  console.log(`${c.cyan}Creating tmux session '${SESSION_LOGS}' (Log Viewer)...${c.reset}`)

  await $`tmux new-session -d -s ${SESSION_LOGS} -c ${PROJECT_DIR} "bun run scripts/log-viewer.ts"`.quiet()
  await $`tmux set -t ${SESSION_LOGS} mouse on`.quiet()
  await $`tmux set -t ${SESSION_LOGS} history-limit 50000`.quiet()

  // Configure OSC 8 hyperlinks for log viewer
  await $`tmux set-option -g allow-passthrough on`.quiet()
  await $`tmux set-option -ga terminal-features "*:hyperlinks"`.quiet()

  console.log(`${c.green}✓ Log viewer session created${c.reset}`)
}

async function attachSession(name: string): Promise<void> {
  console.log(`${c.cyan}Attaching to session '${name}'...${c.reset}`)

  if (process.env.TMUX) {
    await $`tmux switch-client -t ${name}`.quiet()
  } else {
    const proc = Bun.spawn(['tmux', 'attach-session', '-t', name], {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit'
    })
    await proc.exited
  }
}

async function main() {
  console.log(`${c.cyan}╔════════════════════════════════════════╗${c.reset}`)
  console.log(`${c.cyan}║  WAXIN Agent Development Environment  ║${c.reset}`)
  console.log(`${c.cyan}╚════════════════════════════════════════╝${c.reset}`)
  console.log('')

  const tuiExists = await sessionExists(SESSION_TUI)
  const logsExists = await sessionExists(SESSION_LOGS)

  if (tuiExists && logsExists) {
    console.log(`${c.yellow}Both sessions already exist${c.reset}`)
    console.log('')
    console.log(`${c.dim}Use:${c.reset}`)
    console.log(`${c.dim}  cx ${SESSION_TUI}  - attach to TUI${c.reset}`)
    console.log(`${c.dim}  cx ${SESSION_LOGS} - attach to Log Viewer${c.reset}`)
    return
  }

  // Create TUI session first
  if (!tuiExists) {
    await createTUISession()
  } else {
    console.log(`${c.yellow}TUI session '${SESSION_TUI}' already exists${c.reset}`)
  }

  // Create Logs session second
  if (!logsExists) {
    await createLogsSession()
  } else {
    console.log(`${c.yellow}Logs session '${SESSION_LOGS}' already exists${c.reset}`)
  }

  console.log('')
  console.log(`${c.green}✓ All sessions ready${c.reset}`)
  console.log('')
  console.log(`${c.dim}Use:${c.reset}`)
  console.log(`${c.dim}  cx ${SESSION_TUI}  - attach to TUI${c.reset}`)
  console.log(`${c.dim}  cx ${SESSION_LOGS} - attach to Log Viewer${c.reset}`)
  console.log('')
  console.log(`${c.dim}Or send commands:${c.reset}`)
  console.log(`${c.dim}  tx ${SESSION_TUI}  "command" - send to TUI${c.reset}`)
  console.log(`${c.dim}  tx ${SESSION_LOGS} "command" - send to Log Viewer${c.reset}`)
}

main().catch((err) => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
