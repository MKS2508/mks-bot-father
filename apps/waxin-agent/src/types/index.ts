/**
 * Types index - Centralized exports for all types
 */

// TUI-specific types
export type {
  ColorValue,
  TextOptionsWithColors,
  BoxOptionsWithColors,
} from './opentui.js'

export {
  colorToString,
  textStyle,
  boxStyle,
} from './opentui.js'

// Re-export main types - Note: These are defined in types.ts in parent directory
// This file only exports OpenTUI-specific types to avoid circular imports
