#!/usr/bin/env bun
/**
 * Development Script - Auto-setup tmux session with dual panes
 *
 * Usage: bun run dev
 *
 * Behavior:
 * - If 'waxin' session exists -> attach to it
 * - If not exists -> create session with TUI (pane 0) + Log Viewer (pane 1)
 */

import { $ } from 'bun'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_DIR = resolve(__dirname, '..')

const SESSION_NAME = 'waxin'

// ANSI colors
const c = {
  reset: '\x1b[0m',
  green: '\x1b[92m',
  yellow: '\x1b[93m',
  cyan: '\x1b[96m',
  magenta: '\x1b[95m',
  dim: '\x1b[2m'
}

async function sessionExists(): Promise<boolean> {
  try {
    const result = await $`tmux has-session -t ${SESSION_NAME} 2>/dev/null`.quiet()
    return result.exitCode === 0
  } catch {
    return false
  }
}

async function cleanupOrphanSessions(): Promise<void> {
  try {
    const result = await $`tmux list-sessions -F "#{session_name}" 2>/dev/null`.quiet()
    const sessions = result.stdout.toString().split('\n').filter(s => s.trim())

    // Find sessions that start with 'waxin' but aren't the main one
    const orphans = sessions.filter(s => s.startsWith('waxin') && s !== SESSION_NAME)

    if (orphans.length > 0) {
      console.log(`${c.yellow}Cleaning up ${orphans.length} orphan session(s)...${c.reset}`)
      for (const session of orphans) {
        try {
          await $`tmux kill-session -t ${session}`.quiet()
          console.log(`${c.dim}  Killed: ${session}${c.reset}`)
        } catch {
          // Ignore errors
        }
      }
    }
  } catch {
    // No tmux sessions exist, that's fine
  }
}

async function createSession(): Promise<void> {
  console.log(`${c.cyan}Creating tmux session '${SESSION_NAME}'...${c.reset}`)

  // Configure tmux globally for OSC 8 hyperlinks support (must be before creating session)
  await $`tmux set-option -g allow-passthrough on`.quiet()
  await $`tmux set-option -ga terminal-features "*:hyperlinks"`.quiet()

  // Create new detached session with first command (TUI with watch)
  await $`tmux new-session -d -s ${SESSION_NAME} -c ${PROJECT_DIR} "bun run --watch src/index.ts; read"`.quiet()

  // Split window horizontally (pane 1 at bottom, 30%) and run log viewer with watch
  // Pass pane width via environment variable for proper layout
  await $`tmux split-window -t ${SESSION_NAME} -v -p 30 -c ${PROJECT_DIR} "TMUX_PANE_WIDTH=\$(tmux display-message -t #{pane_id} -p '#{pane_width}') bun run --watch scripts/log-viewer.ts; read"`.quiet()

  // Enable mouse mode for scrolling and selection
  await $`tmux set -t ${SESSION_NAME} mouse on`.quiet()

  // Set scrollback buffer size
  await $`tmux set -t ${SESSION_NAME} history-limit 10000`.quiet()

  // Enable OSC 8 hyperlink passthrough on log viewer pane (pane 1) - redundant but explicit
  await $`tmux set-option -t ${SESSION_NAME}:.1 allow-passthrough on`.quiet()

  // Select pane 0 (TUI) as active
  await $`tmux select-pane -t ${SESSION_NAME}:.0`.quiet()

  console.log(`${c.green}✓ Session created with dual panes${c.reset}`)
  console.log(`${c.dim}  Pane 0 (top):    TUI${c.reset}`)
  console.log(`${c.dim}  Pane 1 (bottom): Log Viewer (clickable links!)${c.reset}`)
  console.log(`${c.dim}  Mouse: enabled (scroll + select)${c.reset}`)
}

async function attachSession(): Promise<void> {
  console.log(`${c.magenta}Attaching to session '${SESSION_NAME}'...${c.reset}`)

  // Check if we're already inside tmux
  if (process.env.TMUX) {
    // Switch to the session
    await $`tmux switch-client -t ${SESSION_NAME}`.quiet()
  } else {
    // Attach to the session
    const proc = Bun.spawn(['tmux', 'attach-session', '-t', SESSION_NAME], {
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

  // Clean up any orphan sessions first
  await cleanupOrphanSessions()

  const exists = await sessionExists()

  if (exists) {
    console.log(`${c.yellow}Session '${SESSION_NAME}' already exists${c.reset}`)
    await attachSession()
  } else {
    await createSession()
    await attachSession()
  }
}

main().catch((err) => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
