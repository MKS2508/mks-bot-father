/**
 * Animated thinking indicator with WAXIN MK1 personality words.
 * Rotating words with animated dots.
 */

import { useState, useEffect, useRef } from 'react'
import { SPINNER_WORDS } from '../types.js'
import { THEME } from '../theme/colors.js'
import { LAYOUT } from '../constants/layout.js'

interface ThinkingIndicatorProps {
  isStreaming?: boolean
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const
const SPINNER_FRAME_COUNT = SPINNER_FRAMES.length

export const ThinkingIndicator = ({ isStreaming = false }: ThinkingIndicatorProps) => {
  const [wordIndex, setWordIndex] = useState(0)
  const [frameIndex, setFrameIndex] = useState(0)

  // Use refs to track interval state for proper cleanup
  const wordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Clean up any existing intervals first
    if (wordIntervalRef.current) clearInterval(wordIntervalRef.current)
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)

    // Word rotation interval
    wordIntervalRef.current = setInterval(() => {
      setWordIndex(prev => (prev + 1) % SPINNER_WORDS.length)
    }, LAYOUT.THINKING_WORD_INTERVAL_MS)

    // Frame animation interval
    frameIntervalRef.current = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % SPINNER_FRAME_COUNT)
    }, LAYOUT.THINKING_FRAME_INTERVAL_MS)

    return () => {
      if (wordIntervalRef.current) clearInterval(wordIntervalRef.current)
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
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
