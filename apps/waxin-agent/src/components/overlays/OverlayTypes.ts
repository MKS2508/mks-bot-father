/**
 * OverlayTypes - Types and configurations for positioned overlays
 * Used by the help dialog to show content-specific floating overlays
 */

// ═══════════════════════════════════════════════════════════════════════════════
// POSITION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Named positions for overlays
 */
export type OverlayPosition =
  | 'fullscreen'
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

/**
 * Custom position with specific dimensions and alignment
 */
export interface CustomPosition {
  width: number      // Percentage (0-100) or fixed columns
  height: number     // Percentage (0-100) or fixed rows
  align: OverlayPosition
}

/**
 * Union type for all position types
 */
export type PositionType = OverlayPosition | CustomPosition

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for an overlay
 */
export interface OverlayConfig {
  position: PositionType
  backdropOpacity?: number
  transparent?: boolean
  closeOnEscape?: boolean
  width?: number
  height?: number
}

/**
 * Map of shortcut IDs to their overlay configurations
 */
export interface ShortcutOverlayConfig {
  [key: string]: OverlayConfig | undefined
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default overlay configurations for each debug/testing shortcut
 * Uses Shortcut enum values as keys
 */
import { Shortcut } from '../../shortcuts.js'

export const DEFAULT_OVERLAY_CONFIGS: ShortcutOverlayConfig = {
  // Debug: Colors - Right side panel
  [Shortcut.DEBUG_TAB_COLORS]: {
    position: 'right',
    backdropOpacity: 0.3,
    transparent: true,
    width: 30,
  },

  // Debug: Keypress - Bottom panel for event log
  [Shortcut.DEBUG_TAB_KEYPRESS]: {
    position: 'bottom',
    backdropOpacity: 0.4,
    transparent: true,
    height: 40,
  },

  // Debug: FPS - Top right corner
  [Shortcut.DEBUG_TAB_FPS]: {
    position: 'top-right',
    backdropOpacity: 0.3,
    transparent: true,
    width: 25,
    height: 20,
  },

  // Debug: Performance - Right panel
  [Shortcut.DEBUG_TAB_PERFORMANCE]: {
    position: 'right',
    backdropOpacity: 0.35,
    transparent: true,
    width: 35,
  },

  // Testing: Question Modal - Center overlay
  [Shortcut.TEST_QUESTION_SINGLE]: {
    position: 'center',
    backdropOpacity: 0.5,
  },

  // Testing: Multi-select Question - Center overlay
  [Shortcut.TEST_QUESTION_MULTI]: {
    position: 'center',
    backdropOpacity: 0.5,
  },

  // Navigation: Agent Switch - Right panel
  [Shortcut.AGENT_SWITCH]: {
    position: 'right',
    backdropOpacity: 0.3,
    transparent: true,
    width: 25,
  },

  // Messages: Clear - Small center confirmation
  [Shortcut.MESSAGES_CLEAR]: {
    position: 'center',
    backdropOpacity: 0.5,
    width: 40,
    height: 10,
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// POSITION CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate absolute position styles for a given position config
 * Returns top, left, width, height for absolute positioning
 */
export interface CalculatedPosition {
  top?: number
  left?: number
  right?: number
  bottom?: number
  width: number
  height: number
}

export function calculatePosition(
  position: PositionType,
  termWidth: number,
  termHeight: number,
  config?: Partial<Pick<OverlayConfig, 'width' | 'height'>>
): CalculatedPosition {
  const width = config?.width ?? 50
  const height = config?.height ?? 20

  // Handle custom positions
  if (typeof position === 'object' && 'width' in position) {
    const custom = position as CustomPosition
    return calculateCustomPosition(custom, termWidth, termHeight)
  }

  // Handle named positions
  switch (position) {
    case 'fullscreen':
      return {
        width: termWidth,
        height: termHeight,
      }

    case 'center':
      return {
        top: Math.floor((termHeight - height) / 2),
        left: Math.floor((termWidth - width) / 2),
        width,
        height,
      }

    case 'top':
      return {
        top: 0,
        left: Math.floor((termWidth - width) / 2),
        width,
        height,
      }

    case 'bottom':
      return {
        bottom: 0,
        left: Math.floor((termWidth - width) / 2),
        width,
        height,
      }

    case 'left':
      return {
        top: Math.floor((termHeight - height) / 2),
        left: 0,
        width,
        height,
      }

    case 'right':
      return {
        top: Math.floor((termHeight - height) / 2),
        right: 0,
        width,
        height,
      }

    case 'top-left':
      return {
        top: 0,
        left: 0,
        width,
        height,
      }

    case 'top-right':
      return {
        top: 0,
        right: 0,
        width,
        height,
      }

    case 'bottom-left':
      return {
        bottom: 0,
        left: 0,
        width,
        height,
      }

    case 'bottom-right':
      return {
        bottom: 0,
        right: 0,
        width,
        height,
      }

    default:
      return {
        top: Math.floor((termHeight - height) / 2),
        left: Math.floor((termWidth - width) / 2),
        width,
        height,
      }
  }
}

function calculateCustomPosition(
  custom: CustomPosition,
  termWidth: number,
  termHeight: number
): CalculatedPosition {
  const width = Math.floor(termWidth * custom.width / 100)
  const height = Math.floor(termHeight * custom.height / 100)

  switch (custom.align) {
    case 'top':
      return { top: 0, left: Math.floor((termWidth - width) / 2), width, height }
    case 'bottom':
      return { bottom: 0, left: Math.floor((termWidth - width) / 2), width, height }
    case 'left':
      return { top: Math.floor((termHeight - height) / 2), left: 0, width, height }
    case 'right':
      return { top: Math.floor((termHeight - height) / 2), right: 0, width, height }
    default:
      return { top: 0, left: 0, width, height }
  }
}
