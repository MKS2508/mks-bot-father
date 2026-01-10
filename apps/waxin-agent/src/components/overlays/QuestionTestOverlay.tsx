/**
 * QuestionTestOverlay - Preview component for testing QuestionModal
 * Shows what a single or multi-select question looks like
 */

import { useKeyboard } from '@opentui/react'
import { useEffect } from 'react'
import type { UserQuestion } from '../../types.js'
import { tuiLogger } from '../../lib/json-logger.js'

const THEME = {
  bg: '#262335',
  bgDark: '#1a1a2e',
  bgPanel: '#2a2139',
  purple: '#b381c5',
  cyan: '#36f9f6',
  green: '#72f1b8',
  text: '#ffffff',
  textDim: '#848bbd',
  textMuted: '#495495'
} as const

interface QuestionTestOverlayProps {
  type: 'single' | 'multi'
  onLaunch?: () => void
  onClose?: () => void
}

// Test questions
const SINGLE_QUESTION: UserQuestion = {
  question: 'Which library should we use for date formatting?',
  header: 'Library',
  options: [
    { label: 'date-fns (Recommended)', description: 'Lightweight and tree-shakeable' },
    { label: 'moment.js', description: 'Feature-rich but larger bundle size' },
    { label: 'dayjs', description: 'Immutable and minimal API' },
    { label: 'Luxon', description: 'Modern Intl-based formatting' },
  ],
  multiSelect: false
}

const MULTI_QUESTION: UserQuestion = {
  question: 'Which features do you want to enable?',
  header: 'Features',
  options: [
    { label: 'Dark Mode', description: 'Enable dark theme support' },
    { label: 'Analytics', description: 'Track user interactions' },
    { label: 'PWA Support', description: 'Progressive web app capabilities' },
    { label: 'Offline Mode', description: 'Cache data for offline use' },
  ],
  multiSelect: true
}

/**
 * QuestionTestOverlay - Preview of question modal
 *
 * Features:
 * - Shows preview of single/multi select questions
 * - Press Enter to launch actual modal
 * - ESC to close
 */
export function QuestionTestOverlay({ type, onLaunch, onClose }: QuestionTestOverlayProps) {
  const question = type === 'single' ? SINGLE_QUESTION : MULTI_QUESTION

  // Log when overlay mounts
  useEffect(() => {
    tuiLogger.info('Question Test Overlay mounted', { type, question: question.question })
    return () => {
      tuiLogger.info('Question Test Overlay unmounted')
    }
  }, [type, question.question])

  useKeyboard((key) => {
    if (key.name === 'escape') {
      onClose?.()
    }
    if (key.name === 'enter') {
      onLaunch?.()
    }
  })

  return (
    <box style={{ flexDirection: 'column' }}>
      {/* Header */}
      <box style={{ paddingBottom: 1 }}>
        <text style={{ fg: THEME.cyan }}>
          {type === 'single' ? '❓ Single-Select Question' : '🔘 Multi-Select Question'}
        </text>
      </box>

      {/* Question Preview */}
      <box style={{ flexDirection: 'column', marginBottom: 1 }}>
        <text style={{ fg: THEME.text }}>
          {question.question}
        </text>
      </box>

      {/* Header */}
      {question.header && (
        <box style={{ marginTop: 1, marginBottom: 1 }}>
          <text style={{ fg: THEME.purple }}>
            {`[${question.header}]`}
          </text>
        </box>
      )}

      {/* Options */}
      <box style={{ flexDirection: 'column', marginTop: 1 }}>
        {question.options.map((option, idx) => (
          <box
            key={idx}
            style={{
              flexDirection: 'column',
              marginBottom: 1,
              padding: 1,
              border: true,
              borderColor: THEME.bgPanel,
              borderStyle: 'single',
            }}
          >
            {/* Option label with indicator */}
            <box style={{ flexDirection: 'row', gap: 1 }}>
              <text style={{ fg: THEME.green }}>
                {type === 'multi' ? '☐' : '○'}
              </text>
              <text style={{ fg: THEME.text }}>
                {option.label}
              </text>
            </box>

            {/* Option description */}
            {option.description && (
              <text style={{ fg: THEME.textDim }}>
                {option.description}
              </text>
            )}
          </box>
        ))}
      </box>

      {/* Footer with hint */}
      <box style={{ marginTop: 1, flexDirection: 'row', gap: 2 }}>
        <text style={{ fg: THEME.textMuted }}>
          {'Press Enter to launch'}
        </text>
        <text style={{ fg: THEME.textMuted }}>
          {'|'}
        </text>
        <text style={{ fg: THEME.textMuted }}>
          {'ESC to close'}
        </text>
      </box>
    </box>
  )
}
