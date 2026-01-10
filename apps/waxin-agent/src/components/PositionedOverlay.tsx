/**
 * PositionedOverlay - Wrapper component for positionable overlays
 * Handles positioning, backdrop, and close behavior for debug/help overlays
 */

import { useRenderer } from '@opentui/react'
import type { OverlayConfig } from './overlays/OverlayTypes.js'
import { calculatePosition } from './overlays/OverlayTypes.js'

// ═══════════════════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════════════════

const THEME = {
  bg: '#262335',
  bgDark: '#1a1a2e',
  bgPanel: '#2a2139',

  purple: '#b381c5',
  magenta: '#ff7edb',
  cyan: '#36f9f6',
  blue: '#6e95ff',

  green: '#72f1b8',
  yellow: '#fede5d',
  orange: '#ff8b39',
  red: '#fe4450',

  text: '#ffffff',
  textDim: '#848bbd',
  textMuted: '#495495'
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PositionedOverlayProps {
  children: React.ReactNode
  config: OverlayConfig
  title?: string
  borderColor?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// POSITIONED OVERLAY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PositionedOverlay - A floating overlay with configurable position
 *
 * Features:
 * - Absolute positioning with top/left/right/bottom
 * - Semi-transparent backdrop
 * - Optional title bar
 * - Configurable border color
 * - ESC key handling via closeOnEscape
 */
export function PositionedOverlay({
  children,
  config,
  title,
  borderColor = THEME.purple
}: PositionedOverlayProps) {
  const renderer = useRenderer()

  if (!renderer) {
    return null
  }

  const termWidth = renderer.terminalWidth
  const termHeight = renderer.terminalHeight

  // Calculate position
  const pos = calculatePosition(config.position, termWidth, termHeight, {
    width: config.width,
    height: config.height
  })

  // Calculate background color with transparency
  const bgColor = config.transparent
    ? 'rgba(26, 26, 46, 0.85)'
    : THEME.bgPanel

  // Build style object
  const style: Record<string, any> = {
    position: 'absolute',
    width: pos.width,
    height: pos.height,
    backgroundColor: bgColor,
    border: true,
    borderColor,
    borderStyle: 'rounded',
    flexDirection: 'column',
  }

  // Add position properties
  if (pos.top !== undefined) style.top = pos.top
  if (pos.left !== undefined) style.left = pos.left
  if (pos.right !== undefined) style.right = pos.right
  if (pos.bottom !== undefined) style.bottom = pos.bottom

  return (
    <box style={style}>
      {/* Optional Title Bar */}
      {title && (
        <box
          style={{
            width: '100%',
            backgroundColor: THEME.bgDark,
            paddingLeft: 1,
            paddingRight: 1,
            paddingBottom: 1,
            marginBottom: 1,
          }}
        >
          <text style={{ fg: borderColor as any }}>{title}</text>
        </box>
      )}

      {/* Content */}
      <box
        style={{
          flexGrow: 1,
          padding: 1,
          overflow: 'hidden',
        }}
      >
        {children}
      </box>
    </box>
  )
}
