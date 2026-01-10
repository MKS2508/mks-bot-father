/**
 * Header - WAXIN animated text header
 * Shows animated WAXIN ASCII text at the top of the screen
 */

import { useState, useEffect } from 'react'

const THEME = {
  purple: '#b381c5',
  magenta: '#ff7edb',
  cyan: '#36f9f6',
  yellow: '#fede5d',
} as const

type AsciiEffect = 'glitch' | 'matrix' | 'cyber' | 'scan' | 'decode'

interface AnimatedLine {
  text: string
  color: string
}

const GLITCH_CHARS = ['▓', '▒', '░', '█', '▄', '▀', '■', '□', '▪', '▫', '▬', '▭', '▮', '▯']
const MATRIX_CHARS = ['0', '1', 'ﾊ', 'ﾐ', 'ﾋ', 'ｰ', 'ｳ', 'ｼ', 'ﾅ', 'ﾓ', 'ｦ', 'ｻ', 'ﾜ', 'ﾊ', 'ｨ', 'ｽ']
const CYBER_CHARS = ['░', '▒', '▓', '█', '■']

function applyGlitchEffect(lines: string[]): AnimatedLine[] {
  return lines.map((line) => {
    const chars = line.split('')
    const shouldLineGlitch = Math.random() < 0.25

    if (!shouldLineGlitch) {
      return { text: line, color: THEME.magenta }
    }

    const glitchedChars = chars.map((char) => {
      if (char === ' ') return ' '
      const shouldReplace = Math.random() < 0.4
      if (shouldReplace) {
        return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
      }
      return char
    })

    const color = Math.random() > 0.7
      ? (Math.random() > 0.5 ? '#ff0044' : '#00ffff')
      : THEME.magenta

    return { text: glitchedChars.join(''), color }
  })
}

function applyMatrixEffect(lines: string[]): AnimatedLine[] {
  return lines.map((line) => {
    const chars = line.split('')
    const transformedChars = chars.map((char) => {
      if (char === ' ') return ' '
      if (Math.random() < 0.15) {
        return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
      }
      return char
    })

    return {
      text: transformedChars.join(''),
      color: Math.random() < 0.3 ? '#00ff88' : THEME.magenta
    }
  })
}

function applyCyberEffect(lines: string[]): AnimatedLine[] {
  const colors = [THEME.magenta, '#00ffff', '#ff0044', THEME.yellow, '#00ff88']

  return lines.map((line, lineIndex) => {
    const chars = line.split('')
    const colorIndex = lineIndex % colors.length
    const lineColor = colors[colorIndex]

    const transformedChars = chars.map((char) => {
      if (char === ' ') return ' '
      const shouldBlink = Math.random() < 0.1
      if (shouldBlink) {
        return CYBER_CHARS[Math.floor(Math.random() * CYBER_CHARS.length)]
      }
      return char
    })

    return {
      text: transformedChars.join(''),
      color: lineColor
    }
  })
}

function applyScanEffect(lines: string[]): AnimatedLine[] {
  return lines.map((line, i) => {
    return {
      text: line,
      color: i % 3 === 0 ? '#00ffff' : THEME.magenta
    }
  })
}

function applyDecodeEffect(lines: string[]): AnimatedLine[] {
  return lines.map((line) => {
    const chars = line.split('')

    const transformedChars = chars.map((char) => {
      if (char === ' ') return ' '
      if (Math.random() < 0.1) {
        return String.fromCharCode(33 + Math.floor(Math.random() * 94))
      }
      return char
    })

    return {
      text: transformedChars.join(''),
      color: THEME.magenta
    }
  })
}

function renderAnimatedAscii(ascii: string, effect: AsciiEffect) {
  const lines = ascii.split('\n')

  let animatedLines: AnimatedLine[]

  switch (effect) {
    case 'glitch':
      animatedLines = applyGlitchEffect(lines)
      break
    case 'matrix':
      animatedLines = applyMatrixEffect(lines)
      break
    case 'cyber':
      animatedLines = applyCyberEffect(lines)
      break
    case 'scan':
      animatedLines = applyScanEffect(lines)
      break
    case 'decode':
      animatedLines = applyDecodeEffect(lines)
      break
    default:
      animatedLines = lines.map(line => ({ text: line, color: THEME.magenta }))
  }

  return (
    <box style={{ flexDirection: 'column' }}>
      {animatedLines.map((line: AnimatedLine, i: number) => (
        <text key={i} style={{ fg: line.color as any }}>
          {line.text}
        </text>
      ))}
    </box>
  )
}

interface HeaderProps {
  waxinText: string
}

export const Header = ({ waxinText }: HeaderProps) => {
  const [asciiFrame, setAsciiFrame] = useState(0)
  const [asciiEffect, setAsciiEffect] = useState<AsciiEffect>('glitch')

  useEffect(() => {
    const interval = setInterval(() => {
      setAsciiFrame(prev => prev + 1)

      if (asciiFrame % 60 === 0 && asciiFrame > 0) {
        const effects: AsciiEffect[] = ['glitch', 'matrix', 'cyber', 'scan', 'decode']
        const nextEffect = effects[Math.floor((asciiFrame / 60) % effects.length)]
        setAsciiEffect(nextEffect)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [asciiFrame])

  return (
    <box
      style={{
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 1,
      }}
    >
      {renderAnimatedAscii(waxinText, asciiEffect)}
    </box>
  )
}
