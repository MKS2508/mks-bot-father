/**
 * OpenTUI-specific types and utilities
 * Provides proper typing for OpenTUI components to reduce `as any` usage
 */

import type { BoxOptions } from '@opentui/core'
import { THEME } from '../theme/colors.js'

/**
 * Color value type - can be a theme color or any hex string
 */
export type ColorValue = keyof typeof THEME | string

/**
 * Extended text options with proper color typing
 */
export interface TextOptionsWithColors {
  fg?: ColorValue
  bg?: ColorValue
  bold?: boolean
  dim?: boolean
  italic?: boolean
  underline?: boolean
  width?: number
  align?: 'left' | 'center' | 'right'
}

/**
 * Extended box options with proper color typing
 */
export interface BoxOptionsWithColors extends Omit<BoxOptions, 'borderColor'> {
  borderColor?: ColorValue
  fg?: ColorValue
  bg?: ColorValue
}

/**
 * Cast a color value to string for OpenTUI (type-safe alternative to `as any`)
 */
export function colorToString(color: ColorValue): string {
  return color as string
}

/**
 * Create text style with proper color typing
 */
export function textStyle(options: TextOptionsWithColors): Record<string, unknown> {
  const style: Record<string, unknown> = {}

  if (options.fg !== undefined) style.fg = colorToString(options.fg)
  if (options.bg !== undefined) style.bg = colorToString(options.bg)
  if (options.bold) style.bold = true
  if (options.dim) style.dim = true
  if (options.italic) style.italic = true
  if (options.underline) style.underline = true
  if (options.width !== undefined) style.width = options.width
  if (options.align) style.align = options.align

  return style
}

/**
 * Create box style with proper color typing
 */
export function boxStyle(options: BoxOptionsWithColors): BoxOptions {
  const style: BoxOptions = {
    ...options,
  } as BoxOptions

  // Type-safe color casting
  if (options.borderColor !== undefined) {
    ;(style as { borderColor?: string }).borderColor = colorToString(options.borderColor)
  }

  return style
}
