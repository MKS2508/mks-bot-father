/**
 * Animated thinking indicator with WAXIN MK1 personality words.
 * Rotating words with animated dots.
 */

import { useState, useEffect } from 'react'
import { SPINNER_WORDS } from '../types.js'

const THEME = {
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

interface ThinkingIndicatorProps {
  isStreaming?: boolean
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export const ThinkingIndicator = ({ isStreaming = false }: ThinkingIndicatorProps) => {
  const [wordIndex, setWordIndex] = useState(0)
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setWordIndex(i => i + 1)
    }, 2000)

    const frameInterval = setInterval(() => {
      setFrameIndex(i => (i + 1) % SPINNER_FRAMES.length)
    }, 80)

    return () => {
      clearInterval(wordInterval)
      clearInterval(frameInterval)
    }
  }, [])

  const word = SPINNER_WORDS[wordIndex % SPINNER_WORDS.length]
  const frame = SPINNER_FRAMES[frameIndex]

  return (
    <box
      style={{
        paddingLeft: 2,
        marginBottom: 1,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <text
        style={{
          fg: isStreaming ? THEME.cyan : THEME.yellow,
        }}
      >
        {frame}
      </text>
      <text
        style={{
          marginLeft: 1,
          fg: isStreaming ? THEME.cyan : THEME.yellow,
        }}
      >
        {word}...
      </text>
    </box>
  )
}
