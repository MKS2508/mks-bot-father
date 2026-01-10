/**
 * Overlays module exports
 * All overlay components for the help dialog system
 */

// Types and configuration
export {
  type OverlayPosition,
  type CustomPosition,
  type PositionType,
  type OverlayConfig,
  type ShortcutOverlayConfig,
  type CalculatedPosition,
  calculatePosition,
  DEFAULT_OVERLAY_CONFIGS,
} from './OverlayTypes.js'

// Overlay content components
export { ColorsOverlay } from './ColorsOverlay.js'
export { KeypressOverlay } from './KeypressOverlay.js'
export { FPSOverlay } from './FPSOverlay.js'
export { PerformanceOverlay } from './PerformanceOverlay.js'
export { QuestionTestOverlay } from './QuestionTestOverlay.js'
export { AgentSwitchOverlay } from './AgentSwitchOverlay.js'

// Map shortcut IDs to their overlay components
import { Shortcut } from '../../shortcuts.js'
import { ColorsOverlay } from './ColorsOverlay.js'
import { KeypressOverlay } from './KeypressOverlay.js'
import { FPSOverlay } from './FPSOverlay.js'
import { PerformanceOverlay } from './PerformanceOverlay.js'
import { QuestionTestOverlay } from './QuestionTestOverlay.js'
import { AgentSwitchOverlay } from './AgentSwitchOverlay.js'
import type { ComponentType } from 'react'

export interface OverlayComponentProps {
  onClose?: () => void
}

export const OVERLAY_COMPONENTS: Record<string, ComponentType<OverlayComponentProps>> = {
  [Shortcut.DEBUG_TAB_COLORS]: ColorsOverlay,
  [Shortcut.DEBUG_TAB_KEYPRESS]: KeypressOverlay,
  [Shortcut.DEBUG_TAB_FPS]: FPSOverlay,
  [Shortcut.DEBUG_TAB_PERFORMANCE]: PerformanceOverlay,
  [Shortcut.TEST_QUESTION_SINGLE]: (props: OverlayComponentProps) => (
    <QuestionTestOverlay type="single" {...props} />
  ),
  [Shortcut.TEST_QUESTION_MULTI]: (props: OverlayComponentProps) => (
    <QuestionTestOverlay type="multi" {...props} />
  ),
  [Shortcut.AGENT_SWITCH]: AgentSwitchOverlay,
  // MESSAGES_CLEAR uses a confirmation dialog, not a complex overlay
  // It will be handled separately in app.tsx
}

// Helper to get overlay component for a shortcut
export function getOverlayComponent(shortcutId: string): ComponentType<OverlayComponentProps> | undefined {
  return OVERLAY_COMPONENTS[shortcutId]
}

// Helper to check if a shortcut has an overlay
export function hasOverlay(shortcutId: string): boolean {
  return shortcutId in OVERLAY_COMPONENTS
}
