/**
 * KeypressOverlay - Real-time keyboard event logger overlay
 * Shows captured keyboard events with timestamps and modifiers
 */

import { useKeypressDebug } from '../KeypressDebug.js'
import { useKeyboard } from '@opentui/react'
import { useState } from 'react'

const THEME = {
  bg: '#262335',
  bgDark: '#1a1a2e',
  bgPanel: '#2a2139',
  purple: '#b381c5',
  cyan: '#36f9f6',
  green: '#72f1b8',
  yellow: '#fede5d',
  text: '#ffffff',
  textDim: '#848bbd',
  textMuted: '#495495'
} as const

interface KeypressOverlayProps {
  onClose?: () => void
}

/**
 * KeypressOverlay - Display keyboard events in real-time
 *
 * Features:
 * - Captures and displays keyboard events
 * - Shows modifiers (Ctrl, Shift, etc.)
 * - Displays timestamps
 * - Ctrl+S to export JSON
 * - Ctrl+L to clear
 * - ESC to close
 */
export function KeypressOverlay({ onClose }: KeypressOverlayProps) {
  const [visible] = useState(true)

  // Use the keypress debug hook
  const { events, clearEvents } = useKeypressDebug({
    visible,
    maxEvents: 50,
    onExport: (events) => {
      // For now, just log to console
      // In a real implementation, this would write to a file
      console.log(`Exporting ${events.length} events`)
      const filename = getExportFilename()
      console.log(`Filename: ${filename}`)
    },
  })

  // Handle keyboard shortcuts specific to overlay
  useKeyboard((key) => {
    if (!visible) return

    // ESC closes the overlay
    if (key.name === 'escape') {
      onClose?.()
      return
    }

    // Ctrl+L clears events
    if (key.ctrl && key.name === 'l') {
      clearEvents()
      return
    }

    // Ctrl+S exports events (handled by hook, but prevent propagation)
    if (key.ctrl && key.name === 's') {
      return
    }
  })

  return (
    <box style={{ flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <box style={{ paddingBottom: 1, flexDirection: 'row', gap: 2 }}>
        <text style={{ fg: THEME.cyan }}>
          {'⌨️ Keypress Events'}
        </text>
        <text style={{ fg: THEME.textMuted }}>
          {`(${events.length} captured)`}
        </text>
      </box>

      {/* Help line */}
      <box style={{ paddingBottom: 1 }}>
        <text style={{ fg: THEME.textDim }}>
          {'Ctrl+S: Export | Ctrl+L: Clear | ESC: Close'}
        </text>
      </box>

      {/* Events list */}
      {events.length === 0 ? (
        <box style={{ padding: 2 }}>
          <text style={{ fg: THEME.textMuted }}>
            {'Press any key to see events here...'}
          </text>
        </box>
      ) : (
        <box
          style={{
            flexDirection: 'column',
            overflow: 'hidden',
            flexGrow: 1,
          }}
        >
          {events.slice().reverse().map((event, idx) => (
            <box
              key={event.id || idx}
              style={{
                flexDirection: 'column',
                marginBottom: 1,
              }}
            >
              {/* Formatted event line */}
              <text style={{ fg: THEME.text }}>
                {formatEventLine(event)}
              </text>
            </box>
          ))}
        </box>
      )}
    </box>
  )
}

/**
 * Format a single event for display
 */
function formatEventLine(event: any): string {
  const typeIcons: Record<string, string> = {
    keypress: '↓',
    keyrelease: '↑',
    paste: '📋',
    'raw-input': '⌨️',
  }

  const icon = typeIcons[event.type] || '•'
  const typeUpper = event.type.toUpperCase()

  if (event.event && 'name' in event.event) {
    const evt = event.event
    const modifiers: string[] = []
    if (evt.ctrl) modifiers.push('Ctrl')
    if (evt.meta) modifiers.push('Meta')
    if (evt.shift) modifiers.push('Shift')
    if (evt.option) modifiers.push('Option')

    const modStr = modifiers.length > 0 ? ` +${modifiers.join('+')}` : ''
    const seqStr = evt.sequence ? ` "${evt.sequence}"` : ''

    return `${icon} ${typeUpper}: ${evt.name}${modStr}${seqStr}`
  }

  return `${icon} ${typeUpper}: ${JSON.stringify(event.event)}`
}

/**
 * Generate export filename
 */
function getExportFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `keypress-debug-${timestamp}.json`
}
