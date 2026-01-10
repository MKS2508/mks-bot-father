/**
 * WAXIN Theme - Centralized color palette
 * Synthwave84 retro-futuristic terminal luxury theme
 */

export const THEME = {
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

export type ThemeColor = keyof typeof THEME
