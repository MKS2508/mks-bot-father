/**
 * DebugBox - Debug shortcuts reference panel
 * Shows all available keyboard shortcuts for debugging and navigation
 */

import { SHORTCUTS, formatShortcutKeysWithSequences, ShortcutCategory } from '../shortcuts.js'

const CATEGORIES = {
  [ShortcutCategory.HELP]: { label: '🔍 HELP & INFO', color: '#ff7edb' },
  [ShortcutCategory.FOCUS]: { label: '🎯 FOCUS CONTROL', color: '#72f1b8' },
  [ShortcutCategory.DEBUG]: { label: '🔧 DEBUG MODE', color: '#b381c5' },
  [ShortcutCategory.MESSAGES]: { label: '💬 MESSAGES', color: '#6e95ff' },
  [ShortcutCategory.NAVIGATION]: { label: '🧭 NAVIGATION', color: '#36f9f6' },
  [ShortcutCategory.SYSTEM]: { label: '⚙️ SYSTEM', color: '#ff8b39' },
  [ShortcutCategory.TESTING]: { label: '🧪 TESTING', color: '#495495' },
} as const

interface ShortcutConfig {
  key: string
  description: string
  category: ShortcutCategory
  color?: string
}

// Legacy format for compatibility - will be phased out
const LEGACY_SHORTCUTS: ShortcutConfig[] = SHORTCUTS.map(s => ({
  key: formatShortcutKeysWithSequences(s),
  description: s.description,
  category: s.category,
  color: CATEGORIES[s.category]?.color,
}))

// Helper function to get shortcuts by category (must be defined before formatDebugBox)
export function getShortcutsByCategory(category: ShortcutConfig['category']): ShortcutConfig[] {
  return LEGACY_SHORTCUTS.filter(s => s.category === category)
}

export function formatDebugBox(): string[] {
  const lines: string[] = []

  lines.push('╔══════════════════════════════════════════════════════════════════════════════╗')
  lines.push('║                    🔧 DEBUG SHORTCUTS REFERENCE                          ║')
  lines.push('╠══════════════════════════════════════════════════════════════════════════════╣')

  // Group by category
  const categories: Array<{ key: ShortcutCategory; shortcuts: ShortcutConfig[] }> = [
    { key: ShortcutCategory.HELP, shortcuts: getShortcutsByCategory(ShortcutCategory.HELP) },
    { key: ShortcutCategory.FOCUS, shortcuts: getShortcutsByCategory(ShortcutCategory.FOCUS) },
    { key: ShortcutCategory.DEBUG, shortcuts: getShortcutsByCategory(ShortcutCategory.DEBUG) },
    { key: ShortcutCategory.MESSAGES, shortcuts: getShortcutsByCategory(ShortcutCategory.MESSAGES) },
    { key: ShortcutCategory.NAVIGATION, shortcuts: getShortcutsByCategory(ShortcutCategory.NAVIGATION) },
    { key: ShortcutCategory.SYSTEM, shortcuts: getShortcutsByCategory(ShortcutCategory.SYSTEM) },
    { key: ShortcutCategory.TESTING, shortcuts: getShortcutsByCategory(ShortcutCategory.TESTING) },
  ]

  for (const cat of categories) {
    if (cat.shortcuts.length === 0) continue

    const catConfig = CATEGORIES[cat.key]

    lines.push(`║ \x1b[38;2;${hexToRgb(catConfig.color)}m${catConfig.label.padEnd(24)}\x1b[0m                ║`)
    lines.push('║ ─────────────────────────────────────────────────────────────────────────────── ║')

    for (const shortcut of cat.shortcuts) {
      const keyDisplay = shortcut.key.padEnd(22, ' ')
      const descDisplay = shortcut.description.padEnd(44, ' ')

      // Color the key based on category
      let keyText = keyDisplay
      if (shortcut.color) {
        const coloredKey = `\x1b[38;2;${hexToRgb(shortcut.color)}m${shortcut.key}\x1b[0m`
        keyText = coloredKey.padEnd(22, ' ')
      }

      lines.push(`║ ${keyText} ${descDisplay}║`)
    }

    lines.push('║                                                                              ║')
  }

  lines.push('╚══════════════════════════════════════════════════════════════════════════════╝')

  return lines
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `${r};${g};${b}`
}

// Re-exports for backward compatibility
export { LEGACY_SHORTCUTS as SHORTCUTS, CATEGORIES }

export function findShortcut(key: string): ShortcutConfig | undefined {
  return LEGACY_SHORTCUTS.find(s => s.key === key)
}
