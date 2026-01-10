/**
 * PositionedOverlay - Wrapper component for positionable overlays
 * Handles positioning, backdrop, and close behavior for debug/help overlays
 */

import { useRenderer } from '@opentui/react'
import type { OverlayConfig } from './overlays/OverlayTypes.js'
import { calculatePosition } from './overlays/OverlayTypes.js'
import { THEME } from '../theme/colors.js'

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
  borderColor = THEME.cyan
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

  // Calculate background color - always use dark background
  // Dark gray color (not purple/magenta) for better readability
  const bgColor = '#1e1e2e'  // Very dark gray, similar to VS Code default

  // Build style object with proper type
  const style = {
    position: 'absolute' as const,
    width: pos.width,
    height: pos.height,
    backgroundColor: bgColor,
    border: true,
    borderColor,
    borderStyle: 'rounded' as const,
    flexDirection: 'column' as const,
    ...(pos.top !== undefined && { top: pos.top }),
    ...(pos.left !== undefined && { left: pos.left }),
    ...(pos.right !== undefined && { right: pos.right }),
    ...(pos.bottom !== undefined && { bottom: pos.bottom }),
  }

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
        }}
      >
        {children}
      </box>
    </box>
  )
}
