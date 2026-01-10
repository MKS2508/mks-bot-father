/**
 * ColorPalette - Visual color palette inspector
 * Displays colors in grid or list format with hex values
 * Auto-adjusts text color based on background brightness
 */

export interface ColorPaletteProps {
  colors: string[]
  type?: 'grid' | 'list'
  columns?: number
  blockWidth?: number
  blockHeight?: number
  maxHeight?: number
  showLabels?: boolean
}

export interface ColorBlock {
  color: string
  index: number
  textColor: 'light' | 'dark'
  hex: string
}

// Calculate brightness to determine text color
function calculateBrightness(hex: string): number {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000
}

function getTextColor(hex: string): 'light' | 'dark' {
  return calculateBrightness(hex) > 128 ? 'dark' : 'light'
}

export function processColorPalette(colors: string[]): ColorBlock[] {
  return colors.map((color, index) => ({
    color,
    index,
    textColor: getTextColor(color),
    hex: color.toUpperCase(),
  }))
}

export function formatColorPaletteAsText(
  colors: ColorBlock[],
  type: 'grid' | 'list',
  columns = 4,
  blockWidth = 8
): string[] {
  const lines: string[] = []

  if (type === 'list') {
    // List format: each color on its own line with details
    for (const block of colors) {
      const paddedIndex = block.index.toString().padStart(3, ' ')
      const paddedHex = block.hex.padEnd(7, ' ')
      lines.push(`${paddedIndex}: ${paddedHex} ${'█'.repeat(blockWidth)}`)
    }
  } else {
    // Grid format: arrange colors in rows
    const rows: ColorBlock[][] = []
    for (let i = 0; i < colors.length; i += columns) {
      const row = colors.slice(i, i + columns)
      rows.push(row)
    }

    for (const row of rows) {
      const rowLines: string[] = []

      // First line: colored blocks
      const blocksLine = row.map(block => {
        const colorCode = block.color
        return `\x1b[48;2;${parseInt(colorCode.slice(1, 3), 16)};${parseInt(colorCode.slice(3, 5), 16)};${parseInt(colorCode.slice(5, 7), 16)}m${' '.repeat(blockWidth)}\x1b[0m`
      }).join('')
      rowLines.push(blocksLine)

      // Second line: hex values (if showLabels)
      const hexLine = row.map(block => {
        const textColor = block.textColor === 'light' ? '\x1b[37m' : '\x1b[30m'
        return `${textColor}${block.hex.padStart(blockWidth, ' ')}\x1b[0m`
      }).join('')
      rowLines.push(hexLine)

      lines.push(...rowLines)
      lines.push('') // Empty line between rows
    }
  }

  return lines
}

// Theme colors for waxin-agent
export const WAXIN_THEME_COLORS = [
  '#262335', // bg
  '#1a1a2e', // bgDark
  '#2a2139', // bgPanel
  '#b381c5', // purple
  '#ff7edb', // magenta
  '#36f9f6', // cyan
  '#6e95ff', // blue
  '#72f1b8', // green
  '#fede5d', // yellow
  '#ff8b39', // orange
  '#fe4450', // red
  '#ffffff', // text
  '#848bbd', // textDim
  '#495495', // textMuted
] as const
