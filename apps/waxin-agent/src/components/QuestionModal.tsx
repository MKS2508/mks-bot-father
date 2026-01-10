import { useState, useCallback } from 'react'
import { useKeyboard, useRenderer } from '@opentui/react'
import type { UserQuestion } from '../types.js'
import { THEME } from '../theme/colors.js'

interface QuestionModalProps {
  question: UserQuestion
  onAnswer: (selectedOptions: string[]) => void
  onCancel: () => void
}

export const QuestionModal = ({ question, onAnswer, onCancel }: QuestionModalProps) => {
  const renderer = useRenderer()
  const termWidth = renderer?.terminalWidth ?? 80
  const termHeight = renderer?.terminalHeight ?? 24

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())

  const options = question.options
  const isMultiSelect = question.multiSelect

  const handleSelect = useCallback((index: number) => {
    if (isMultiSelect) {
      setSelectedItems(prev => {
        const next = new Set(prev)
        if (next.has(index)) {
          next.delete(index)
        } else {
          next.add(index)
        }
        return next
      })
    } else {
      onAnswer([options[index].label])
    }
  }, [isMultiSelect, onAnswer, options])

  const handleConfirm = useCallback(() => {
    if (isMultiSelect) {
      const selected = Array.from(selectedItems).map(i => options[i].label)
      if (selected.length > 0) {
        onAnswer(selected)
      }
    } else {
      onAnswer([options[selectedIndex].label])
    }
  }, [isMultiSelect, selectedItems, selectedIndex, options, onAnswer])

  useKeyboard((key) => {
    if (key.name === 'escape') {
      onCancel()
      return
    }

    if (key.name === 'up' || key.name === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1))
      return
    }

    if (key.name === 'down' || key.name === 'j') {
      setSelectedIndex(prev => Math.min(options.length - 1, prev + 1))
      return
    }

    if (key.name === 'space' && isMultiSelect) {
      handleSelect(selectedIndex)
      return
    }

    if (key.name === 'return') {
      if (isMultiSelect) {
        handleConfirm()
      } else {
        handleSelect(selectedIndex)
      }
      return
    }
  })

  const modalWidth = Math.min(60, termWidth - 4)
  const modalHeight = Math.min(options.length * 3 + 10, termHeight - 4)
  const modalLeft = Math.floor((termWidth - modalWidth) / 2)
  const modalTop = Math.floor((termHeight - modalHeight) / 2)

  return (
    <box
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: termWidth,
        height: termHeight,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      }}
    >
      <box
        style={{
          position: 'absolute',
          left: modalLeft,
          top: modalTop,
          width: modalWidth,
          border: true,
          borderStyle: 'rounded',
          borderColor: THEME.purple,
          backgroundColor: THEME.bgPanel,
          padding: 1,
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <box style={{ flexDirection: 'row', marginBottom: 1 }}>
          <text style={{ fg: THEME.cyan }}>📋 </text>
          <text style={{ fg: THEME.purple }}>{question.header}</text>
        </box>

        {/* Question */}
        <text style={{ fg: THEME.text, marginBottom: 1 }}>{question.question}</text>

        {/* Options */}
        <box
          style={{
            border: true,
            borderColor: THEME.textMuted,
            backgroundColor: THEME.bgDark,
            flexDirection: 'column',
            marginTop: 1,
            marginBottom: 1,
          }}
        >
          {options.map((opt, index) => {
            const isSelected = selectedIndex === index
            const isChecked = selectedItems.has(index)

            return (
              <box
                key={opt.label}
                style={{
                  flexDirection: 'column',
                  backgroundColor: isSelected ? THEME.purple : 'transparent',
                  padding: 1,
                }}
              >
                <box style={{ flexDirection: 'row' }}>
                  {isMultiSelect ? (
                    <text style={{ fg: isChecked ? THEME.green : THEME.textDim }}>
                      {isChecked ? '[✓] ' : '[ ] '}
                    </text>
                  ) : (
                    <text style={{ fg: isSelected ? THEME.text : THEME.magenta }}>
                      {isSelected ? '▶ ' : '  '}
                    </text>
                  )}
                  <text style={{ fg: isSelected ? THEME.text : THEME.cyan }}>
                    {opt.label}
                  </text>
                </box>
                <text
                  style={{
                    fg: isSelected ? THEME.textDim : THEME.textMuted,
                    marginLeft: isMultiSelect ? 4 : 2,
                  }}
                >
                  {opt.description}
                </text>
              </box>
            )
          })}
        </box>

        {/* Help text */}
        <box style={{ flexDirection: 'row', marginTop: 1, justifyContent: 'center' }}>
          <text style={{ fg: THEME.textMuted }}>↑/↓</text>
          <text style={{ fg: THEME.textDim }}> navigate  </text>
          {isMultiSelect ? (
            <>
              <text style={{ fg: THEME.textMuted }}>Space</text>
              <text style={{ fg: THEME.textDim }}> toggle  </text>
              <text style={{ fg: THEME.textMuted }}>Enter</text>
              <text style={{ fg: THEME.textDim }}> confirm  </text>
            </>
          ) : (
            <>
              <text style={{ fg: THEME.textMuted }}>Enter</text>
              <text style={{ fg: THEME.textDim }}> select  </text>
            </>
          )}
          <text style={{ fg: THEME.textMuted }}>Esc</text>
          <text style={{ fg: THEME.textDim }}> cancel</text>
        </box>
      </box>
    </box>
  )
}
