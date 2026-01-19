/**
 * MainMenuOverlay - Main menu overlay with blur backdrop effect
 * Shows animated WAXIN ASCII banner and 3 options: Options, Help, Quit
 */

import { useEffect, useState, useCallback } from 'react'
import { useKeyboard, useRenderer } from '@opentui/react'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import type { OverlayComponentProps } from './index.js'

const THEME = {
  bg: '#262335',
  bgDark: '#1a1a2e',
  purple: '#b381c5',
  magenta: '#ff7edb',
  cyan: '#36f9f6',
  blue: '#6e95ff',
  green: '#72f1b8',
  yellow: '#fede5d',
  text: '#ffffff',
  textDim: '#848bbd',
  textMuted: '#495495',
} as const

type AsciiEffect = 'glitch' | 'matrix' | 'cyber' | 'scan' | 'decode'

interface AnimatedLine {
  text: string
  color: string
}

interface MenuItem {
  id: string
  label: string
  icon: string
  key: string
  action: string
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'options', label: 'Options', icon: '⚙️', key: '1', action: 'options' },
  { id: 'help', label: 'Help', icon: '❓', key: '2', action: 'help' },
  { id: 'quit', label: 'Quit', icon: '🚪', key: '3', action: 'quit' },
]

// ASCII Animation Effects (reused from SplashScreen)
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

function applyCyberEffect(lines: string[], frame: number): AnimatedLine[] {
  const colors = [THEME.magenta, '#00ffff', '#ff0044', THEME.yellow, '#00ff88']

  return lines.map((line, lineIndex) => {
    const chars = line.split('')
    const wavePos = (frame / 10 + lineIndex * 0.5) % (colors.length * 2)
    const colorIndex = Math.floor(wavePos) % colors.length
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

function renderAnimatedAscii(ascii: string, frame: number, effect: AsciiEffect) {
  const lines = ascii.split('\n')
  let animatedLines: AnimatedLine[]

  switch (effect) {
    case 'glitch':
      animatedLines = applyGlitchEffect(lines)
      break
    case 'cyber':
      animatedLines = applyCyberEffect(lines, frame)
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

export const MainMenuOverlay = ({ onClose }: OverlayComponentProps) => {
  const renderer = useRenderer()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [asciiFrame, setAsciiFrame] = useState(0)
  const [asciiEffect, setAsciiEffect] = useState<AsciiEffect>('cyber')
  const [waxinAscii, setWaxinAscii] = useState('')

  // Load ASCII art
  useEffect(() => {
    try {
      const waxinPath = resolve(process.cwd(), 'assets/waxin.ascii.txt')
      const waxinContent = readFileSync(waxinPath, 'utf-8')
      setWaxinAscii(waxinContent.trim())
    } catch {
      setWaxinAscii('WAXIN MK1 😈')
    }
  }, [])

  // ASCII Animation - rotate effects every 3 seconds (60 frames)
  useEffect(() => {
    const interval = setInterval(() => {
      setAsciiFrame(prev => {
        const newFrame = prev + 1
        // Rotate effects every 60 frames (~3 seconds at 50ms)
        if (newFrame % 60 === 0 && newFrame > 0) {
          const effects: AsciiEffect[] = ['glitch', 'cyber']
          const nextEffect = effects[Math.floor((newFrame / 60) % effects.length)]
          setAsciiEffect(nextEffect)
        }
        return newFrame
      })
    }, 50)

    return () => clearInterval(interval)
  }, [])

  // Handle option selection
  const handleSelect = useCallback((index: number) => {
    const item = MENU_ITEMS[index]
    if (!item) return

    switch (item.action) {
      case 'quit':
        process.exit(0)
      case 'help':
        onClose?.()
        // Trigger help overlay - this would be handled by parent
        break
      case 'options':
        // TODO: Open options overlay
        break
    }
  }, [onClose])

  // Keyboard handling
  useKeyboard((key) => {
    if (key.name === 'escape') {
      onClose?.()
      return
    }

    if (key.name === 'left') {
      setSelectedIndex(prev => (prev - 1 + MENU_ITEMS.length) % MENU_ITEMS.length)
    }

    if (key.name === 'right') {
      setSelectedIndex(prev => (prev + 1) % MENU_ITEMS.length)
    }

    if (key.name === 'return') {
      handleSelect(selectedIndex)
    }

    // Number keys 1-3
    if (key.name === '1') handleSelect(0)
    if (key.name === '2') handleSelect(1)
    if (key.name === '3') handleSelect(2)
  })

  const termWidth = renderer?.terminalWidth ?? 120
  const termHeight = renderer?.terminalHeight ?? 40

  return (
    <box
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
      }}
    >
      {/* Backdrop with simulated blur effect (dark semi-transparent) */}
      <box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.6)' as any,
        }}
      />

      {/* Main modal centered */}
      <box
        style={{
          position: 'absolute',
          top: Math.floor((termHeight - 20) / 2),
          left: Math.floor((termWidth - 60) / 2),
          width: 60,
          height: 20,
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: 'rgba(38, 35, 53, 0.95)' as any,
          border: { type: 'line', fg: THEME.purple as any },
          zIndex: 1,
        }}
      >
        {/* ASCII Banner */}
        <box
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 1,
          }}
        >
          {waxinAscii && renderAnimatedAscii(waxinAscii, asciiFrame, asciiEffect)}
        </box>

        {/* Separator */}
        <box
          style={{
            flexDirection: 'row',
            width: 56,
            marginTop: 1,
            marginBottom: 2,
          }}
        >
          <text style={{ fg: THEME.purple as any }}>
            {'─'.repeat(56)}
          </text>
        </box>

        {/* Menu options centered in one line */}
        <box
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 1,
          }}
        >
          {MENU_ITEMS.map((item, index) => {
            const isSelected = index === selectedIndex
            return (
              <box
                key={item.id}
                style={{
                  flexDirection: 'column',
                  alignItems: 'center',
                  margin: 2,
                }}
              >
                <box
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isSelected ? (THEME.purple as any) : undefined,
                    padding: { left: 1, right: 1, top: 0, bottom: 0 },
                  }}
                >
                  <text style={{ fg: isSelected ? (THEME.bg as any) : (THEME.textDim as any) }}>
                    {item.icon}
                  </text>
                  <text style={{ fg: isSelected ? (THEME.bg as any) : (THEME.text as any) }}>
                    {' '}
                  </text>
                  <text style={{ fg: isSelected ? (THEME.bg as any) : (THEME.text as any) }}>
                    {item.label}
                  </text>
                  <text style={{ fg: isSelected ? (THEME.bg as any) : (THEME.textDim as any) }}>
                    {' '}
                  </text>
                  <text style={{ fg: isSelected ? (THEME.bg as any) : (THEME.magenta as any) }}>
                    [{item.key}]
                  </text>
                </box>
              </box>
            )
          })}
        </box>

        {/* Footer instructions */}
        <box
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 1,
          }}
        >
          <text style={{ fg: THEME.textDim as any }}>
            {'◄ ► navigate'}
          </text>
          <text style={{ fg: THEME.textMuted as any }}>
            {' · '}
          </text>
          <text style={{ fg: THEME.textDim as any }}>
            {'Enter confirm'}
          </text>
          <text style={{ fg: THEME.textMuted as any }}>
            {' · '}
          </text>
          <text style={{ fg: THEME.textDim as any }}>
            {'1-3 select'}
          </text>
          <text style={{ fg: THEME.textMuted as any }}>
            {' · '}
          </text>
          <text style={{ fg: THEME.textDim as any }}>
            {'Esc close'}
          </text>
        </box>
      </box>
    </box>
  )
}
