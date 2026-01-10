/**
 * ColorsOverlay - Visual color palette overlay
 * Shows WAXIN theme colors with hex values and visual blocks
 */

import { processColorPalette, WAXIN_THEME_COLORS } from '../ColorPalette.js'

const THEME = {
  bg: '#262335',
  bgDark: '#1a1a2e',
  bgPanel: '#2a2139',
  purple: '#b381c5',
  cyan: '#36f9f6',
  text: '#ffffff',
  textDim: '#848bbd',
  textMuted: '#495495'
} as const

/**
 * ColorsOverlay - Display the WAXIN color palette
 */
export function ColorsOverlay() {
  const colors = processColorPalette([...WAXIN_THEME_COLORS])

  return (
    <box style={{ flexDirection: 'column' }}>
      {/* Header */}
      <box style={{ paddingBottom: 1 }}>
        <text style={{ fg: THEME.cyan }}>
          {'🎨 WAXIN Color Palette'}
        </text>
      </box>

      {/* Color List */}
      {colors.map((color) => {
        // Determine text color based on background brightness
        const textColor = color.textColor === 'light' ? '#ffffff' : '#000000'
        const labelColor = color.textColor === 'light' ? THEME.textDim : THEME.text

        return (
          <box
            key={color.index}
            style={{
              flexDirection: 'row',
              gap: 1,
              marginBottom: 1,
            }}
          >
            {/* Color block */}
            <text
              style={{
                bg: color.hex as any,
                fg: '#000000',
                width: 4,
              }}
            >
              {'    '}
            </text>

            {/* Hex value */}
            <text style={{ fg: color.hex as any, width: 8 }}>
              {color.hex}
            </text>

            {/* Color name/key */}
            <text style={{ fg: labelColor as any }}>
              {getColorName(color.index)}
            </text>

            {/* Text color indicator */}
            <text style={{ fg: textColor as any }}>
              {color.textColor === 'light' ? '◐' : '◑'}
            </text>
          </box>
        )
      })}
    </box>
  )
}

/**
 * Get color name/key by index
 */
function getColorName(index: number): string {
  const names = [
    'bg',
    'bgDark',
    'bgPanel',
    'purple',
    'magenta',
    'cyan',
    'blue',
    'green',
    'yellow',
    'orange',
    'red',
    'text',
    'textDim',
    'textMuted',
  ]
  return names[index] || `color${index}`
}
