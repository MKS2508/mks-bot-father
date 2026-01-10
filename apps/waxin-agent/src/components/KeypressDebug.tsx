/**
 * KeypressDebug - Keyboard event logger with JSON export
 * Captures and displays keyboard events in real-time
 */

import { useState, useCallback, useRef } from 'react'
import { useKeyboard } from '@opentui/react'

export interface KeyEvent {
  name: string
  sequence: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  option?: boolean
  super?: boolean
  hyper?: boolean
}

export interface PasteEvent {
  text: string
}

export interface CapturedEvent {
  id: string
  timestamp: string
  type: 'keypress' | 'keyrelease' | 'paste' | 'raw-input'
  event: KeyEvent | PasteEvent | { sequence: string }
}

export interface KeypressDebugProps {
  visible: boolean
  maxEvents?: number
  onExport?: (events: CapturedEvent[]) => void
}

const EVENT_ICONS = {
  keypress: '↓ ',
  keyrelease: '↑ ',
  paste: '📋 ',
  'raw-input': '⌨️ ',
} as const

const MODIFIER_NAMES = {
  ctrl: 'Ctrl',
  meta: 'Meta',
  shift: 'Shift',
  option: 'Option',
  super: 'Super',
  hyper: 'Hyper',
} as const

export function formatEvent(event: CapturedEvent): string {
  const icon = EVENT_ICONS[event.type]

  let output = `${icon}[${event.type.toUpperCase()}]`

  if ('name' in event.event) {
    const evt = event.event as KeyEvent
    output += ` \x1b[38;2;255;165;87m${evt.name}\x1b[0m`

    const modifiers: string[] = []
    if (evt.ctrl) modifiers.push(MODIFIER_NAMES.ctrl)
    if (evt.meta) modifiers.push(MODIFIER_NAMES.meta)
    if (evt.shift) modifiers.push(MODIFIER_NAMES.shift)
    if (evt.option) modifiers.push(MODIFIER_NAMES.option)
    if (evt.super) modifiers.push(MODIFIER_NAMES.super)
    if (evt.hyper) modifiers.push(MODIFIER_NAMES.hyper)

    if (modifiers.length > 0) {
      output += ` \x1b[38;2;210;168;255m[${modifiers.join('+')}]\x1b[0m`
    }

    if (evt.sequence) {
      output += ` \x1b[38;2;121;192;255m"${evt.sequence}"\x1b[0m`
    }
  } else if ('text' in event.event) {
    const evt = event.event as PasteEvent
    const preview = evt.text.length > 50 ? evt.text.substring(0, 47) + '...' : evt.text
    output += ` \x1b[38;2;165;214;255m"${preview}"\x1b[0m`
  } else if ('sequence' in event.event) {
    const evt = event.event as { sequence: string }
    output += ` \x1b[38;2;121;192;255m"${evt.sequence}"\x1b[0m`
  }

  output += `\n  \x1b[38;2;110;114;125m${event.timestamp}\x1b[0m`

  return output
}

export function exportEventsToJSON(events: CapturedEvent[]): string {
  const data = {
    exportedAt: new Date().toISOString(),
    eventCount: events.length,
    events: events.map(e => ({
      ...e,
      // Remove id for cleaner export
      id: undefined,
    })),
  }
  return JSON.stringify(data, null, 2)
}

export function useKeypressDebug(props: KeypressDebugProps) {
  const [events, setEvents] = useState<CapturedEvent[]>([])
  const eventIdRef = useRef(0)

  const addEvent = useCallback((type: CapturedEvent['type'], event: CapturedEvent['event']) => {
    const newEvent: CapturedEvent = {
      id: `evt-${eventIdRef.current++}`,
      timestamp: new Date().toISOString(),
      type,
      event,
    }

    setEvents(prev => {
      const updated = [...prev, newEvent]
      const maxEvents = props.maxEvents ?? 100
      if (updated.length > maxEvents) {
        return updated.slice(-maxEvents)
      }
      return updated
    })
  }, [props.maxEvents])

  const clearEvents = useCallback(() => {
    setEvents([])
    eventIdRef.current = 0
  }, [])

  const exportEvents = useCallback(() => {
    props.onExport?.(events)
  }, [events, props.onExport])

  // Keyboard handler - simplified for React
  useKeyboard((key) => {
    if (!props.visible) return

    // Handle Ctrl+S for export
    if (key.ctrl && key.name === 's') {
      exportEvents()
      return
    }

    // Capture the key event
    addEvent('keypress', {
      name: key.name,
      sequence: key.sequence,
      ctrl: key.ctrl,
      meta: key.meta,
      shift: key.shift,
      option: key.option,
      super: key.super,
      hyper: key.hyper,
    })
  })

  return {
    events,
    addEvent,
    clearEvents,
    exportEvents,
    formattedEvents: events.map(formatEvent),
  }
}

// Default export filename generator
export function getExportFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `keypress-debug-${timestamp}.json`
}
