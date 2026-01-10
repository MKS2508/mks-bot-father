/**
 * ProgressBar - Reusable progress bar component
 * Extracted from SplashScreen for modularity
 */

import { useEffect, useState } from 'react'
import { createPulse } from 'opentui-spinner'
import 'opentui-spinner/react'

type RandomSpinner = 'weather' | 'moon' | 'runner' | 'shark' | 'pong' | 'bouncingBall' | 'christmas' | 'earth' | 'hearts' | 'soccerHeader' | 'mindblown' | 'monkey' | 'fingerDance' | 'fistBump'

const RANDOM_SPINNERS: RandomSpinner[] = [
  'weather',
  'moon',
  'runner',
  'shark',
  'pong',
  'bouncingBall',
  'christmas',
  'earth',
  'hearts',
  'soccerHeader',
  'mindblown',
  'monkey',
  'fingerDance',
  'fistBump',
]

const THEME = {
  purple: '#b381c5',
  textDim: '#848bbd',
  textMuted: '#495495',
  blue: '#6e95ff',
  yellow: '#fede5d',
  magenta: '#ff6b9d',
} as const

interface ProgressBarProps {
  /** Progress value (0-100) */
  progress: number
  /** Optional message to display */
  message?: string
  /** Background color for the progress bar container */
  backgroundColor?: string
  /** Filled color for the progress bar */
  fillColor?: string
  /** Empty color for the unfilled portion */
  emptyColor?: string
  /** Width in characters (default: 50) */
  width?: number
  /** Show spinners on both sides (default: true) */
  showSpinners?: boolean
  /** Border style (default: 'box') */
  borderStyle?: 'box' | 'simple' | 'none'
}

/**
 * Animated progress bar with optional spinners
 *
 * @example
 * ```tsx
 * <ProgressBar progress={45} message="Deploying..." />
 * <ProgressBar progress={100} message="Complete!" borderStyle="simple" />
 * ```
 */
export const ProgressBar = ({
  progress,
  message,
  backgroundColor = '#1a0a1a',
  fillColor = THEME.purple,
  emptyColor = THEME.textMuted,
  width = 50,
  showSpinners = true,
  borderStyle = 'box',
}: ProgressBarProps) => {
  const [currentSpinner, setCurrentSpinner] = useState<RandomSpinner>('weather')

  // Rotar spinners cada 2 segundos
  useEffect(() => {
    if (!showSpinners) return

    const interval = setInterval(() => {
      setCurrentSpinner(prev => {
        const currentIndex = RANDOM_SPINNERS.indexOf(prev)
        const nextIndex = (currentIndex + 1) % RANDOM_SPINNERS.length
        return RANDOM_SPINNERS[nextIndex]
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [showSpinners])

  // Clamped progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress))
  const filledWidth = Math.floor((clampedProgress / 100) * width)
  const emptyWidth = width - filledWidth

  const filledBar = '█'.repeat(filledWidth)
  const emptyBar = '░'.repeat(emptyWidth)

  const renderContent = () => {
    if (borderStyle === 'simple') {
      return (
        <box style={{ flexDirection: 'row', alignItems: 'center' }}>
          {showSpinners && (
            <spinner
              name={currentSpinner}
              color={createPulse([THEME.purple, THEME.magenta, THEME.blue, THEME.yellow], 0.8)}
              backgroundColor={backgroundColor}
            />
          )}
          <text style={{ fg: THEME.textMuted, bg: backgroundColor }}> </text>
          <text style={{ fg: fillColor, bg: backgroundColor }}>
            {filledBar}
          </text>
          <text style={{ fg: emptyColor, bg: backgroundColor }}>
            {emptyBar}
          </text>
          {message && (
            <>
              <text style={{ fg: THEME.textMuted, bg: backgroundColor }}> </text>
              <text style={{ fg: THEME.textDim, bg: backgroundColor }}>{message}</text>
            </>
          )}
          {showSpinners && (
            <>
              <text style={{ fg: THEME.textMuted, bg: backgroundColor }}> </text>
              <spinner
                name={currentSpinner}
                color={createPulse([THEME.yellow, THEME.blue, THEME.magenta, THEME.purple], 0.8)}
                backgroundColor={backgroundColor}
              />
            </>
          )}
        </box>
      )
    }

    if (borderStyle === 'box') {
      return (
        <box style={{ flexDirection: 'row', alignItems: 'center' }}>
          <text style={{ fg: THEME.purple, bg: backgroundColor }}>{'│ '}</text>
          {showSpinners && (
            <spinner
              name={currentSpinner}
              color={createPulse([THEME.purple, THEME.magenta, THEME.blue, THEME.yellow], 0.8)}
              backgroundColor={backgroundColor}
            />
          )}
          <text style={{ fg: THEME.textMuted, bg: backgroundColor }}> </text>
          <text style={{ fg: fillColor, bg: backgroundColor }}>
            {filledBar}
          </text>
          <text style={{ fg: emptyColor, bg: backgroundColor }}>
            {emptyBar}
          </text>
          {message && (
            <>
              <text style={{ fg: THEME.textMuted, bg: backgroundColor }}> </text>
              <text style={{ fg: THEME.textDim, bg: backgroundColor }}>{message}</text>
            </>
          )}
          {showSpinners && (
            <>
              <text style={{ fg: THEME.textMuted, bg: backgroundColor }}> </text>
              <spinner
                name={currentSpinner}
                color={createPulse([THEME.yellow, THEME.blue, THEME.magenta, THEME.purple], 0.8)}
                backgroundColor={backgroundColor}
              />
            </>
          )}
          <text style={{ fg: THEME.purple, bg: backgroundColor }}>{' │'}</text>
        </box>
      )
    }

    // borderStyle === 'none'
    return (
      <box style={{ flexDirection: 'row', alignItems: 'center' }}>
        {showSpinners && (
          <spinner
            name={currentSpinner}
            color={createPulse([THEME.purple, THEME.magenta, THEME.blue, THEME.yellow], 0.8)}
            backgroundColor={backgroundColor}
          />
        )}
        <text style={{ fg: THEME.textMuted, bg: backgroundColor }}> </text>
        <text style={{ fg: fillColor, bg: backgroundColor }}>
          {filledBar}
        </text>
        <text style={{ fg: emptyColor, bg: backgroundColor }}>
          {emptyBar}
        </text>
        {message && (
          <>
            <text style={{ fg: THEME.textMuted, bg: backgroundColor }}> </text>
            <text style={{ fg: THEME.textDim, bg: backgroundColor }}>{message}</text>
          </>
        )}
        {showSpinners && (
          <>
            <text style={{ fg: THEME.textMuted, bg: backgroundColor }}> </text>
            <spinner
              name={currentSpinner}
              color={createPulse([THEME.yellow, THEME.blue, THEME.magenta, THEME.purple], 0.8)}
              backgroundColor={backgroundColor}
            />
          </>
        )}
      </box>
    )
  }

  // Optional: Add top/bottom border for box style
  if (borderStyle === 'box') {
    return (
      <box style={{ flexDirection: 'column', alignItems: 'center' }}>
        <text style={{ fg: THEME.purple, bg: backgroundColor }}>
          {'╭' + '─'.repeat(width + 4) + '╮'}
        </text>
        {renderContent()}
        <text style={{ fg: THEME.purple, bg: backgroundColor }}>
          {'╰' + '─'.repeat(width + 4) + '╯'}
        </text>
      </box>
    )
  }

  return renderContent()
}
