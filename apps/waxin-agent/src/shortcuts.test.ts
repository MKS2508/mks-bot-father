/**
 * Tests for keyboard shortcuts system
 * Testing shortcut matching, formatting, and sequence tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  Shortcut,
  KeyName,
  ShortcutCategory,
  SHORTCUTS,
  formatShortcutKey,
  formatShortcutKeys,
  formatShortcutKeysWithSequences,
  formatSequence,
  matchesShortcutKey,
  matchesShortcut,
  getShortcut,
  getShortcutsByCategory,
  isShortcutEnabled,
  createSequenceTracker,
  matchesSequence,
  type KeyEvent,
  type ShortcutKey,
  type ShortcutConfig,
} from './shortcuts'

describe('Shortcut Enums', () => {
  it('should have all expected shortcuts', () => {
    expect(Shortcut.TOGGLE_HELP).toBe('toggle_help')
    expect(Shortcut.DEBUG_TOGGLE).toBe('debug_toggle')
    expect(Shortcut.APP_EXIT).toBe('app_exit')
  })

  it('should have all expected key names', () => {
    expect(KeyName.ESCAPE).toBe('escape')
    expect(KeyName.SPACE).toBe('space')
    expect(KeyName.F1).toBe('f1')
    expect(KeyName.D).toBe('d')
  })

  it('should have all expected categories', () => {
    expect(ShortcutCategory.HELP).toBe('help')
    expect(ShortcutCategory.DEBUG).toBe('debug')
    expect(ShortcutCategory.SYSTEM).toBe('system')
  })
})

describe('SHORTCUTS constant', () => {
  it('should be a readonly array', () => {
    expect(SHORTCUTS).toBeInstanceOf(Array)
    expect(SHORTCUTS.length).toBeGreaterThan(0)
  })

  it('should have unique IDs', () => {
    const ids = SHORTCUTS.map(s => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should all have required properties', () => {
    SHORTCUTS.forEach(shortcut => {
      expect(shortcut).toHaveProperty('id')
      expect(shortcut).toHaveProperty('keys')
      expect(shortcut).toHaveProperty('description')
      expect(shortcut).toHaveProperty('category')
      expect(shortcut.keys.length).toBeGreaterThan(0)
    })
  })
})

describe('formatShortcutKey', () => {
  it('should format simple key', () => {
    const key: ShortcutKey = { name: KeyName.A }
    expect(formatShortcutKey(key)).toBe('A')
  })

  it('should format key with Ctrl', () => {
    const key: ShortcutKey = { name: KeyName.D, ctrl: true }
    expect(formatShortcutKey(key)).toBe('Ctrl+D')
  })

  it('should format key with Shift', () => {
    const key: ShortcutKey = { name: KeyName.TAB, shift: true }
    expect(formatShortcutKey(key)).toBe('Shift+TAB')
  })

  it('should format key with Meta', () => {
    const key: ShortcutKey = { name: KeyName.SPACE, meta: true }
    expect(formatShortcutKey(key)).toBe('Meta+SPACE')
  })

  it('should format key with multiple modifiers', () => {
    const key: ShortcutKey = { name: KeyName.A, ctrl: true, shift: true }
    expect(formatShortcutKey(key)).toBe('Ctrl+Shift+A')
  })

  it('should format all modifiers', () => {
    const key: ShortcutKey = { name: KeyName.A, ctrl: true, shift: true, meta: true }
    expect(formatShortcutKey(key)).toBe('Ctrl+Shift+Meta+A')
  })
})

describe('formatShortcutKeys', () => {
  it('should format single key', () => {
    const keys: ShortcutKey[] = [{ name: KeyName.F1 }]
    expect(formatShortcutKeys(keys)).toBe('F1')
  })

  it('should format multiple keys with separator', () => {
    const keys: ShortcutKey[] = [
      { name: KeyName.F1 },
      { name: KeyName.H, ctrl: true },
    ]
    expect(formatShortcutKeys(keys)).toBe('F1 / Ctrl+H')
  })

  it('should handle empty array', () => {
    expect(formatShortcutKeys([])).toBe('')
  })
})

describe('formatShortcutKeysWithSequences', () => {
  it('should format keys without sequences', () => {
    const shortcut: ShortcutConfig = {
      id: Shortcut.APP_EXIT,
      keys: [{ name: KeyName.C, ctrl: true }],
      description: 'Exit',
      category: ShortcutCategory.SYSTEM,
    }
    expect(formatShortcutKeysWithSequences(shortcut)).toBe('Ctrl+C')
  })

  it('should format keys with sequences', () => {
    const shortcut: ShortcutConfig = {
      id: Shortcut.TOGGLE_HELP,
      keys: [{ name: KeyName.F1 }],
      sequences: [{ keys: [KeyName.H, KeyName.H], timeout: 500 }],
      description: 'Toggle Help',
      category: ShortcutCategory.HELP,
      enabledWhen: 'no_help',
    }
    expect(formatShortcutKeysWithSequences(shortcut)).toBe('F1 / HH')
  })
})

describe('formatSequence', () => {
  it('should format sequence keys', () => {
    const sequence = { keys: [KeyName.H, KeyName.H], timeout: 500 }
    expect(formatSequence(sequence)).toBe('HH')
  })

  it('should format single key sequence', () => {
    const sequence = { keys: [KeyName.ESCAPE], timeout: 500 }
    expect(formatSequence(sequence)).toBe('escape')
  })
})

describe('matchesShortcutKey', () => {
  it('should match simple key', () => {
    const event: KeyEvent = { name: KeyName.ESCAPE }
    const key: ShortcutKey = { name: KeyName.ESCAPE }
    expect(matchesShortcutKey(event, key)).toBe(true)
  })

  it('should not match different key', () => {
    const event: KeyEvent = { name: KeyName.ESCAPE }
    const key: ShortcutKey = { name: KeyName.SPACE }
    expect(matchesShortcutKey(event, key)).toBe(false)
  })

  it('should match with Ctrl', () => {
    const event: KeyEvent = { name: KeyName.D, ctrl: true }
    const key: ShortcutKey = { name: KeyName.D, ctrl: true }
    expect(matchesShortcutKey(event, key)).toBe(true)
  })

  it('should not match if Ctrl differs', () => {
    const event: KeyEvent = { name: KeyName.D }
    const key: ShortcutKey = { name: KeyName.D, ctrl: true }
    expect(matchesShortcutKey(event, key)).toBe(false)
  })

  it('should match with all modifiers', () => {
    const event: KeyEvent = { name: KeyName.A, ctrl: true, shift: true, meta: true }
    const key: ShortcutKey = { name: KeyName.A, ctrl: true, shift: true, meta: true }
    expect(matchesShortcutKey(event, key)).toBe(true)
  })

  it('should not match if any modifier differs', () => {
    const event: KeyEvent = { name: KeyName.A, ctrl: true, shift: true }
    const key: ShortcutKey = { name: KeyName.A, ctrl: true, shift: true, meta: true }
    expect(matchesShortcutKey(event, key)).toBe(false)
  })

  it('should handle undefined modifiers as false', () => {
    const event: KeyEvent = { name: KeyName.D }
    const key: ShortcutKey = { name: KeyName.D, ctrl: false, shift: false }
    expect(matchesShortcutKey(event, key)).toBe(true)
  })
})

describe('matchesShortcut', () => {
  it('should match if any key matches', () => {
    const event: KeyEvent = { name: KeyName.F1 }
    const shortcut: ShortcutConfig = {
      id: Shortcut.TOGGLE_HELP,
      keys: [
        { name: KeyName.F1 },
        { name: KeyName.H, ctrl: true },
      ],
      description: 'Toggle Help',
      category: ShortcutCategory.HELP,
      enabledWhen: 'no_help',
    }
    expect(matchesShortcut(event, shortcut)).toBe(true)
  })

  it('should not match if no key matches', () => {
    const event: KeyEvent = { name: KeyName.D }
    const shortcut: ShortcutConfig = {
      id: Shortcut.TOGGLE_HELP,
      keys: [
        { name: KeyName.F1 },
        { name: KeyName.H, ctrl: true },
      ],
      description: 'Toggle Help',
      category: ShortcutCategory.HELP,
      enabledWhen: 'no_help',
    }
    expect(matchesShortcut(event, shortcut)).toBe(false)
  })

  it('should match key with modifiers', () => {
    const event: KeyEvent = { name: KeyName.D, ctrl: true }
    const shortcut: ShortcutConfig = {
      id: Shortcut.DEBUG_TOGGLE,
      keys: [{ name: KeyName.D, ctrl: true }],
      description: 'Toggle Debug',
      category: ShortcutCategory.DEBUG,
      enabledWhen: 'always',
    }
    expect(matchesShortcut(event, shortcut)).toBe(true)
  })
})

describe('getShortcut', () => {
  it('should return shortcut by ID', () => {
    const shortcut = getShortcut(Shortcut.APP_EXIT)
    expect(shortcut).toBeDefined()
    expect(shortcut?.id).toBe(Shortcut.APP_EXIT)
  })

  it('should return undefined for unknown ID', () => {
    const shortcut = getShortcut('unknown' as Shortcut)
    expect(shortcut).toBeUndefined()
  })
})

describe('getShortcutsByCategory', () => {
  it('should return all shortcuts in category', () => {
    const debugShortcuts = getShortcutsByCategory(ShortcutCategory.DEBUG)
    debugShortcuts.forEach(shortcut => {
      expect(shortcut.category).toBe(ShortcutCategory.DEBUG)
    })
  })

  it('should return empty array for empty category', () => {
    const shortcuts = getShortcutsByCategory(ShortcutCategory.TESTING)
    expect(shortcuts).toBeInstanceOf(Array)
    shortcuts.forEach(shortcut => {
      expect(shortcut.category).toBe(ShortcutCategory.TESTING)
    })
  })
})

describe('isShortcutEnabled', () => {
  const state = {
    debugMode: false,
    showHelp: false,
    textareaFocused: false,
  }

  it('should enable when always', () => {
    const shortcut: ShortcutConfig = {
      id: Shortcut.APP_EXIT,
      keys: [{ name: KeyName.C, ctrl: true }],
      description: 'Exit',
      category: ShortcutCategory.SYSTEM,
      enabledWhen: 'always',
    }
    expect(isShortcutEnabled(shortcut, state)).toBe(true)
  })

  it('should enable when no_debug and debug is false', () => {
    const shortcut: ShortcutConfig = {
      id: Shortcut.MESSAGES_CLEAR,
      keys: [{ name: KeyName.K, ctrl: true }],
      description: 'Clear Messages',
      category: ShortcutCategory.MESSAGES,
      enabledWhen: 'no_debug',
    }
    expect(isShortcutEnabled(shortcut, state)).toBe(true)
  })

  it('should disable when no_debug and debug is true', () => {
    const debugState = { ...state, debugMode: true }
    const shortcut: ShortcutConfig = {
      id: Shortcut.MESSAGES_CLEAR,
      keys: [{ name: KeyName.K, ctrl: true }],
      description: 'Clear Messages',
      category: ShortcutCategory.MESSAGES,
      enabledWhen: 'no_debug',
    }
    expect(isShortcutEnabled(shortcut, debugState)).toBe(false)
  })

  it('should enable when debug_only and debug is true', () => {
    const debugState = { ...state, debugMode: true }
    const shortcut: ShortcutConfig = {
      id: Shortcut.DEBUG_TAB_COLORS,
      keys: [{ name: KeyName._1 }],
      description: 'Debug Colors',
      category: ShortcutCategory.DEBUG,
      enabledWhen: 'debug_only',
    }
    expect(isShortcutEnabled(shortcut, debugState)).toBe(true)
  })

  it('should enable when no_help and help is false', () => {
    const shortcut: ShortcutConfig = {
      id: Shortcut.TEXTAREA_TOGGLE_FOCUS,
      keys: [{ name: KeyName.ESCAPE }],
      description: 'Toggle Focus',
      category: ShortcutCategory.FOCUS,
      enabledWhen: 'no_help',
    }
    expect(isShortcutEnabled(shortcut, state)).toBe(true)
  })

  it('should disable when no_help and help is true', () => {
    const helpState = { ...state, showHelp: true }
    const shortcut: ShortcutConfig = {
      id: Shortcut.TEXTAREA_TOGGLE_FOCUS,
      keys: [{ name: KeyName.ESCAPE }],
      description: 'Toggle Focus',
      category: ShortcutCategory.FOCUS,
      enabledWhen: 'no_help',
    }
    expect(isShortcutEnabled(shortcut, helpState)).toBe(false)
  })

  it('should enable when help_only and help is true', () => {
    const helpState = { ...state, showHelp: true }
    const shortcut: ShortcutConfig = {
      id: Shortcut.CLOSE_HELP,
      keys: [{ name: KeyName.ESCAPE }],
      description: 'Close Help',
      category: ShortcutCategory.HELP,
      enabledWhen: 'help_only',
    }
    expect(isShortcutEnabled(shortcut, helpState)).toBe(true)
  })

  it('should enable when textarea_focused and textarea is focused', () => {
    const focusState = { ...state, textareaFocused: true }
    const shortcut: ShortcutConfig = {
      id: Shortcut.TEXTAREA_TOGGLE_FOCUS,
      keys: [{ name: KeyName.SPACE, ctrl: true }],
      description: 'Toggle Focus',
      category: ShortcutCategory.FOCUS,
      enabledWhen: 'textarea_focused',
    }
    expect(isShortcutEnabled(shortcut, focusState)).toBe(true)
  })

  it('should enable when undefined enabledWhen', () => {
    const shortcut: ShortcutConfig = {
      id: Shortcut.AGENT_SWITCH,
      keys: [{ name: KeyName.TAB, shift: true }],
      description: 'Switch Agent',
      category: ShortcutCategory.NAVIGATION,
    }
    expect(isShortcutEnabled(shortcut, state)).toBe(true)
  })
})

describe('createSequenceTracker', () => {
  it('should create tracker with initial state', () => {
    const tracker = createSequenceTracker()
    expect(tracker.state.keys).toEqual([])
    expect(tracker.state.lastKeyTime).toBe(0)
    expect(typeof tracker.checkSequence).toBe('function')
    expect(typeof tracker.reset).toBe('function')
  })

  it('should reset state', () => {
    const tracker = createSequenceTracker()
    tracker.state.keys.push(KeyName.A)
    tracker.state.lastKeyTime = Date.now()

    tracker.reset()

    expect(tracker.state.keys).toEqual([])
    expect(tracker.state.lastKeyTime).toBe(0)
  })

  it('should detect matching sequence', () => {
    const tracker = createSequenceTracker()
    const sequence = { keys: [KeyName.H, KeyName.H], timeout: 500 }

    const event1: KeyEvent = { name: KeyName.H }
    const event2: KeyEvent = { name: KeyName.H }

    expect(tracker.checkSequence(event1, sequence)).toBe(false)
    expect(tracker.checkSequence(event2, sequence)).toBe(true)
  })

  it('should reset after successful match', () => {
    const tracker = createSequenceTracker()
    const sequence = { keys: [KeyName.H, KeyName.H], timeout: 500 }

    const event: KeyEvent = { name: KeyName.H }

    tracker.checkSequence(event, sequence)
    tracker.checkSequence(event, sequence)

    expect(tracker.state.keys).toEqual([])
    expect(tracker.state.lastKeyTime).toBe(0)
  })

  it('should timeout sequence', () => {
    vi.useFakeTimers()

    const tracker = createSequenceTracker()
    const sequence = { keys: [KeyName.H, KeyName.H], timeout: 500 }

    const event: KeyEvent = { name: KeyName.H }

    tracker.checkSequence(event, sequence)

    vi.advanceTimersByTime(600)

    expect(tracker.checkSequence(event, sequence)).toBe(false)

    vi.useRealTimers()
  })

  it('should track only last N keys', () => {
    const tracker = createSequenceTracker()
    const sequence = { keys: [KeyName.A, KeyName.B, KeyName.C], timeout: 1000 }

    const eventA: KeyEvent = { name: KeyName.A }
    const eventB: KeyEvent = { name: KeyName.B }
    const eventX: KeyEvent = { name: KeyName._1 }
    const eventC: KeyEvent = { name: KeyName.C }

    tracker.checkSequence(eventA, sequence)
    tracker.checkSequence(eventB, sequence)
    tracker.checkSequence(eventX, sequence) // Pushes out A
    tracker.checkSequence(eventC, sequence)

    expect(tracker.state.keys).toEqual([KeyName._1, KeyName.C])
  })
})

describe('matchesSequence', () => {
  it('should return false for shortcut without sequences', () => {
    const tracker = createSequenceTracker()
    const event: KeyEvent = { name: KeyName.H }
    const shortcut: ShortcutConfig = {
      id: Shortcut.APP_EXIT,
      keys: [{ name: KeyName.C, ctrl: true }],
      description: 'Exit',
      category: ShortcutCategory.SYSTEM,
    }

    expect(matchesSequence(tracker, event, shortcut)).toBe(false)
  })

  it('should check all sequences', () => {
    const tracker = createSequenceTracker()
    const event: KeyEvent = { name: KeyName.H }
    const shortcut: ShortcutConfig = {
      id: Shortcut.TOGGLE_HELP,
      keys: [{ name: KeyName.F1 }],
      sequences: [
        { keys: [KeyName.H, KeyName.H], timeout: 500 },
        { keys: [KeyName._1, KeyName._2], timeout: 500 },
      ],
      description: 'Toggle Help',
      category: ShortcutCategory.HELP,
      enabledWhen: 'no_help',
    }

    expect(matchesSequence(tracker, event, shortcut)).toBe(false)
    tracker.checkSequence(event, shortcut.sequences[0])
    expect(matchesSequence(tracker, event, shortcut)).toBe(true)
  })
})
