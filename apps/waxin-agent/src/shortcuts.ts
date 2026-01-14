/**
 * Keyboard Shortcuts Configuration
 * Centralized keyboard shortcut definitions with enums and constants
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Named keyboard shortcuts for easy reference
 */
export enum Shortcut {
  // Help & Info
  TOGGLE_HELP = 'toggle_help',
  CLOSE_HELP = 'close_help',

  // Focus Control
  TEXTAREA_TOGGLE_FOCUS = 'textarea_toggle_focus',

  // Debug Mode
  DEBUG_TOGGLE = 'debug_toggle',
  DEBUG_TAB_COLORS = 'debug_tab_colors',
  DEBUG_TAB_KEYPRESS = 'debug_tab_keypress',
  DEBUG_TAB_FPS = 'debug_tab_fps',
  DEBUG_TAB_PERFORMANCE = 'debug_tab_performance',
  DEBUG_CLOSE = 'debug_close',

  // Messages
  MESSAGES_CLEAR = 'messages_clear',

  // Navigation
  AGENT_SWITCH = 'agent_switch',

  // Audio
  AUDIO_MUTE_TOGGLE = 'audio_mute_toggle',

  // Main Menu
  MAIN_MENU = 'main_menu',

  // System
  APP_EXIT = 'app_exit',

  // Session Management
  SESSION_CLEAR = 'session_clear',
  SESSION_LIST = 'session_list',
  SESSION_RESUME = 'session_resume',
  SESSION_COMPACT = 'session_compact',
  SESSION_CONTEXT = 'session_context',

  // Testing
  TEST_QUESTION_SINGLE = 'test_question_single',
  TEST_QUESTION_MULTI = 'test_question_multi',
}

/**
 * Keyboard key names that map to terminal input
 */
export enum KeyName {
  // Special keys
  ESCAPE = 'escape',
  SPACE = 'space',
  TAB = 'tab',
  ENTER = 'return',
  BACKSPACE = 'backspace',
  QUESTION_MARK = 'questionmark',

  // F-keys
  F1 = 'f1',
  F2 = 'f2',
  F3 = 'f3',
  F10 = 'f10',

  // Letters
  D = 'd',
  F = 'f',
  H = 'h',
  K = 'k',
  C = 'c',
  M = 'm',
  R = 'r',
  S = 's',
  L = 'l',
  P = 'p',
  X = 'x',

  // Punctuation
  SEMICOLON = ';',

  // Numbers
  _1 = '1',
  _2 = '2',
  _3 = '3',
  _4 = '4',
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ShortcutConfig {
  id: Shortcut
  keys: ShortcutKey[]
  sequences?: ShortcutSequence[]
  description: string
  category: ShortcutCategory
  enabledWhen?: 'always' | 'no_debug' | 'debug_only' | 'no_help' | 'help_only' | 'textarea_focused' | 'textarea_unfocused'
}

export interface ShortcutSequence {
  keys: KeyName[]
  timeout: number
}

export interface ShortcutKey {
  name: KeyName
  ctrl?: boolean
  shift?: boolean
  meta?: boolean
}

export enum ShortcutCategory {
  HELP = 'help',
  FOCUS = 'focus',
  DEBUG = 'debug',
  MESSAGES = 'messages',
  NAVIGATION = 'navigation',
  AUDIO = 'audio',
  MENU = 'menu',
  SYSTEM = 'system',
  SESSION = 'session',
  TESTING = 'testing',
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHORTCUT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const SHORTCUTS: ReadonlyArray<ShortcutConfig> = [
  // ═══════════════════════════════════════════════════════════════════════════════
  // HELP & INFO
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: Shortcut.TOGGLE_HELP,
    keys: [
      { name: KeyName.F1 },
      { name: KeyName.H, ctrl: true },
      { name: KeyName.BACKSPACE, ctrl: true },
      { name: KeyName.QUESTION_MARK },
    ],
    sequences: [
      { keys: [KeyName.H, KeyName.H], timeout: 500 },
    ],
    description: 'Toggle Help/Shortcuts',
    category: ShortcutCategory.HELP,
    enabledWhen: 'no_help',
  },
  {
    id: Shortcut.CLOSE_HELP,
    keys: [{ name: KeyName.ESCAPE }],
    description: 'Close Help',
    category: ShortcutCategory.HELP,
    enabledWhen: 'help_only',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // FOCUS CONTROL
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: Shortcut.TEXTAREA_TOGGLE_FOCUS,
    keys: [
      { name: KeyName.ESCAPE },
      { name: KeyName.SPACE, ctrl: true },
    ],
    description: 'Toggle Textarea Focus',
    category: ShortcutCategory.FOCUS,
    enabledWhen: 'no_help',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // DEBUG MODE
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: Shortcut.DEBUG_TOGGLE,
    keys: [{ name: KeyName.D, ctrl: true }],
    description: 'Toggle Debug Panel',
    category: ShortcutCategory.DEBUG,
    enabledWhen: 'always',
  },
  {
    id: Shortcut.DEBUG_TAB_COLORS,
    keys: [{ name: KeyName._1 }],
    description: 'Debug: Colors Tab',
    category: ShortcutCategory.DEBUG,
    enabledWhen: 'debug_only',
  },
  {
    id: Shortcut.DEBUG_TAB_KEYPRESS,
    keys: [{ name: KeyName._2 }],
    description: 'Debug: Keypress Tab',
    category: ShortcutCategory.DEBUG,
    enabledWhen: 'debug_only',
  },
  {
    id: Shortcut.DEBUG_TAB_FPS,
    keys: [{ name: KeyName._3 }],
    description: 'Debug: FPS Tab',
    category: ShortcutCategory.DEBUG,
    enabledWhen: 'debug_only',
  },
  {
    id: Shortcut.DEBUG_TAB_PERFORMANCE,
    keys: [{ name: KeyName._4 }],
    description: 'Debug: Performance Tab',
    category: ShortcutCategory.DEBUG,
    enabledWhen: 'debug_only',
  },
  {
    id: Shortcut.DEBUG_CLOSE,
    keys: [{ name: KeyName.ESCAPE }],
    description: 'Close Debug Panel',
    category: ShortcutCategory.DEBUG,
    enabledWhen: 'debug_only',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: Shortcut.MESSAGES_CLEAR,
    keys: [{ name: KeyName.K, ctrl: true }],
    description: 'Clear Messages',
    category: ShortcutCategory.MESSAGES,
    enabledWhen: 'no_debug',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: Shortcut.AGENT_SWITCH,
    keys: [{ name: KeyName.TAB, shift: true }],
    description: 'Switch Agent (Build/Plan/Code)',
    category: ShortcutCategory.NAVIGATION,
    enabledWhen: 'always',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // AUDIO
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: Shortcut.AUDIO_MUTE_TOGGLE,
    keys: [{ name: KeyName.M, shift: true }],
    description: 'Toggle Audio Mute',
    category: ShortcutCategory.AUDIO,
    enabledWhen: 'always',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN MENU
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: Shortcut.MAIN_MENU,
    keys: [{ name: KeyName.ESCAPE, shift: true }],
    description: 'Main Menu Overlay',
    category: ShortcutCategory.MENU,
    enabledWhen: 'always',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: Shortcut.APP_EXIT,
    keys: [{ name: KeyName.C, ctrl: true }],
    description: 'Exit Application',
    category: ShortcutCategory.SYSTEM,
    enabledWhen: 'always',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: Shortcut.SESSION_CLEAR,
    keys: [{ name: KeyName.L, ctrl: true, shift: true }],
    description: 'Clear Session (/clear)',
    category: ShortcutCategory.SESSION,
    enabledWhen: 'no_debug',
  },
  {
    id: Shortcut.SESSION_LIST,
    keys: [{ name: KeyName.S, ctrl: true, shift: true }],
    description: 'List Sessions (/sessions)',
    category: ShortcutCategory.SESSION,
    enabledWhen: 'no_debug',
  },
  {
    id: Shortcut.SESSION_RESUME,
    keys: [{ name: KeyName.R, ctrl: true, shift: true }],
    description: 'Resume Session (/resume)',
    category: ShortcutCategory.SESSION,
    enabledWhen: 'no_debug',
  },
  {
    id: Shortcut.SESSION_COMPACT,
    keys: [{ name: KeyName.P, ctrl: true, shift: true }],
    description: 'Compact Session (/compact)',
    category: ShortcutCategory.SESSION,
    enabledWhen: 'no_debug',
  },
  {
    id: Shortcut.SESSION_CONTEXT,
    keys: [{ name: KeyName.X, ctrl: true, shift: true }],
    description: 'Show Context (/context)',
    category: ShortcutCategory.SESSION,
    enabledWhen: 'no_debug',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // TESTING
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: Shortcut.TEST_QUESTION_SINGLE,
    keys: [{ name: KeyName.F2 }],
    description: 'Test: Single Select Question',
    category: ShortcutCategory.TESTING,
    enabledWhen: 'always',
  },
  {
    id: Shortcut.TEST_QUESTION_MULTI,
    keys: [{ name: KeyName.F3 }],
    description: 'Test: Multi Select Question',
    category: ShortcutCategory.TESTING,
    enabledWhen: 'always',
  },
] as const

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format shortcut key for display
 */
export function formatShortcutKey(key: ShortcutKey): string {
  const parts: string[] = []
  if (key.ctrl) parts.push('Ctrl')
  if (key.shift) parts.push('Shift')
  if (key.meta) parts.push('Meta')
  parts.push(key.name.toUpperCase())
  return parts.join('+')
}

/**
 * Format all keys for a shortcut
 */
export function formatShortcutKeys(keys: ShortcutKey[]): string {
  return keys.map(formatShortcutKey).join(' / ')
}

/**
 * Format all keys and sequences for a shortcut
 */
export function formatShortcutKeysWithSequences(shortcut: ShortcutConfig): string {
  const keyFormats = shortcut.keys.map(formatShortcutKey)
  const sequenceFormats = shortcut.sequences?.map(formatSequence) ?? []
  return [...keyFormats, ...sequenceFormats].join(' / ')
}

/**
 * Check if a shortcut key matches an incoming keyboard event
 */
export function matchesShortcutKey(event: KeyEvent, key: ShortcutKey): boolean {
  return (
    event.name === key.name &&
    !!event.ctrl === !!key.ctrl &&
    !!event.shift === !!key.shift &&
    !!event.meta === !!key.meta
  )
}

/**
 * Check if an event matches any of the keys for a shortcut
 */
export function matchesShortcut(event: KeyEvent, shortcut: ShortcutConfig): boolean {
  return shortcut.keys.some(key => matchesShortcutKey(event, key))
}

/**
 * Get shortcut by ID
 */
export function getShortcut(id: Shortcut): ShortcutConfig | undefined {
  return SHORTCUTS.find(s => s.id === id)
}

/**
 * Get all shortcuts by category
 */
export function getShortcutsByCategory(category: ShortcutCategory): ShortcutConfig[] {
  return SHORTCUTS.filter(s => s.category === category)
}

/**
 * Check if a shortcut should be enabled based on current state
 */
export function isShortcutEnabled(
  shortcut: ShortcutConfig,
  state: {
    debugMode: boolean
    showHelp: boolean
    textareaFocused: boolean
  }
): boolean {
  switch (shortcut.enabledWhen) {
    case undefined:
    case 'always':
      return true
    case 'no_debug':
      return !state.debugMode
    case 'debug_only':
      return state.debugMode
    case 'no_help':
      return !state.showHelp
    case 'help_only':
      return state.showHelp
    case 'textarea_focused':
      return state.textareaFocused
    case 'textarea_unfocused':
      return !state.textareaFocused
    default:
      return true
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES FOR EXTERNAL USE
// ═══════════════════════════════════════════════════════════════════════════════

export interface KeyEvent {
  name: string
  ctrl?: boolean
  shift?: boolean
  meta?: boolean
  preventDefault?: () => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCE TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface SequenceState {
  keys: string[]
  lastKeyTime: number
}

export function createSequenceTracker(): {
  state: SequenceState
  checkSequence: (key: KeyEvent, sequence: ShortcutSequence) => boolean
  reset: () => void
} {
  const state: SequenceState = {
    keys: [],
    lastKeyTime: 0,
  }

  const reset = () => {
    state.keys = []
    state.lastKeyTime = 0
  }

  const checkSequence = (key: KeyEvent, sequence: ShortcutSequence): boolean => {
    const now = Date.now()

    if (now - state.lastKeyTime > sequence.timeout) {
      state.keys = []
    }

    state.keys.push(key.name)
    state.lastKeyTime = now

    if (state.keys.length > sequence.keys.length) {
      state.keys = state.keys.slice(-sequence.keys.length)
    }

    if (state.keys.length === sequence.keys.length) {
      const matches = state.keys.every((k, i) => k === sequence.keys[i])
      if (matches) {
        reset()
        return true
      }
    }

    return false
  }

  return { state, checkSequence, reset }
}

export function matchesSequence(
  tracker: ReturnType<typeof createSequenceTracker>,
  key: KeyEvent,
  shortcut: ShortcutConfig
): boolean {
  if (!shortcut.sequences) return false
  return shortcut.sequences.some(seq => tracker.checkSequence(key, seq))
}

export function formatSequence(sequence: ShortcutSequence): string {
  return sequence.keys.join('')
}
