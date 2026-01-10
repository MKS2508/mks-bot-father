/**
 * Screen Singleton
 *
 * Global blessed Screen instance with resize handling
 */

import { Screen, NodeRuntime } from '@unblessed/node'
import { setRuntime } from '@unblessed/core'

export interface ScreenOptions {
  title?: string
  smartCSR?: boolean
  autoPadding?: boolean
  terminal?: string
}

let globalScreen: Screen | null = null
let runtimeInitialized = false

export function getScreen(options: ScreenOptions = {}): Screen {
  if (!globalScreen) {
    // Initialize the Node.js runtime before creating Screen
    if (!runtimeInitialized) {
      setRuntime(new NodeRuntime())
      runtimeInitialized = true
    }

    globalScreen = new Screen({
      smartCSR: true,
      autoPadding: false,
      title: options.title || 'Waxin Log Viewer',
      ...options
    })

    // Setup key handlers for global keys
    globalScreen.key(['C-c'], () => {
      process.exit(0)
    })

    // Handle resize
    globalScreen.on('resize', () => {
      globalScreen?.render()
    })

    // Clean exit
    process.on('SIGINT', () => {
      globalScreen?.destroy()
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      globalScreen?.destroy()
      process.exit(0)
    })
  }

  return globalScreen
}

export function destroyScreen(): void {
  if (globalScreen) {
    globalScreen.destroy()
    globalScreen = null
  }
}

export function getTerminalWidth(): number {
  if (process.stdout.isTTY && process.stdout.columns) {
    return process.stdout.columns
  }
  return 120
}

export function getTerminalHeight(): number {
  if (process.stdout.isTTY && process.stdout.rows) {
    return process.stdout.rows
  }
  return 30
}
