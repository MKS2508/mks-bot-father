/**
 * HelpDialogContent - Content for the help dialog
 * Shows categorized keyboard shortcuts with click handlers
 */

import { THEME } from '../../theme/colors.js'
import { log as tuiLogger } from '../../lib/json-logger.js'
import { SHORTCUTS, ShortcutCategory, formatShortcutKeysWithSequences } from '../../shortcuts.js'
import { hasOverlay } from '../overlays/index.js'

interface HelpDialogContentProps {
  onShowOverlay: (shortcutId: string) => void
  onDirectAction: (shortcutId: string) => void
}

const HELP_CATEGORIES = [
  { key: ShortcutCategory.HELP, label: 'Help', color: THEME.magenta },
  { key: ShortcutCategory.FOCUS, label: 'Focus', color: THEME.green },
  { key: ShortcutCategory.DEBUG, label: 'Debug', color: THEME.purple },
  { key: ShortcutCategory.MESSAGES, label: 'Messages', color: THEME.blue },
  { key: ShortcutCategory.NAVIGATION, label: 'Navigation', color: THEME.cyan },
  { key: ShortcutCategory.SYSTEM, label: 'System', color: THEME.yellow },
  { key: ShortcutCategory.TESTING, label: 'Testing', color: THEME.red },
]

export function HelpDialogContent({ onShowOverlay, onDirectAction }: HelpDialogContentProps) {
  return (
    <box style={{ flexDirection: 'column', gap: 1 }}>
      {HELP_CATEGORIES.map(cat => {
        const shortcuts = SHORTCUTS.filter(s => s.category === cat.key)
        if (shortcuts.length === 0) return null

        return (
          <box key={cat.key} style={{ flexDirection: 'column' }}>
            <text style={{ fg: cat.color as any }}>
              {cat.label}
            </text>
            {shortcuts.map((shortcut, i) => {
              // Non-clickable: TOGGLE_HELP, CLOSE_HELP
              const isClickable = shortcut.id !== 'toggle_help' && shortcut.id !== 'close_help'
              const hasOverlayComp = hasOverlay(shortcut.id)

              return (
                <box
                  key={i}
                  style={{
                    flexDirection: 'column',
                    marginBottom: 1,
                    padding: 1,
                    backgroundColor: isClickable ? (hasOverlayComp ? '#2a2139' : '#262335') : undefined,
                    border: isClickable ? true : undefined,
                    borderColor: hasOverlayComp ? THEME.purple : THEME.bgPanel,
                    borderStyle: 'single',
                  }}
                  onMouseUp={isClickable ? () => {
                    // Log click event
                    tuiLogger.info('Help option clicked', `shortcut=${shortcut.id}, description="${shortcut.description}", hasOverlay=${hasOverlayComp}`)
                    // Check if this shortcut has an overlay
                    if (hasOverlayComp) {
                      onShowOverlay(shortcut.id as string)
                    } else {
                      onDirectAction(shortcut.id as string)
                    }
                  } : undefined}
                >
                  {/* Shortcut name with keyboard hint */}
                  <box style={{ flexDirection: 'row', gap: 2 }}>
                    <text style={{
                      fg: THEME.cyan as any,
                      width: 20,
                    }}>
                      {formatShortcutKeysWithSequences(shortcut)}
                    </text>

                    {/* Description */}
                    <text style={{
                      fg: THEME.text as any,
                      flexGrow: 1,
                    }}>
                      {shortcut.description}
                    </text>

                    {/* Click indicator */}
                    {isClickable && (
                      <text style={{ fg: hasOverlayComp ? THEME.magenta : THEME.green as any }}>
                        {hasOverlayComp ? '[→]' : '[▶]'}
                      </text>
                    )}
                  </box>

                  {/* Additional hint for overlay items */}
                  {isClickable && hasOverlayComp && (
                    <text style={{ fg: THEME.textDim as any }}>
                      {' Opens overlay window'}
                    </text>
                  )}
                </box>
              )
            })}
          </box>
        )
      })}

      <box style={{ marginTop: 1, flexDirection: 'row', gap: 2 }}>
        <text style={{ fg: THEME.textMuted as any }}>
          Click any option to open
        </text>
        <text style={{ fg: THEME.magenta as any }}>
          {'→'}
        </text>
        <text style={{ fg: THEME.textMuted as any }}>
          {' overlay or press Esc to close'}
        </text>
      </box>
    </box>
  )
}
