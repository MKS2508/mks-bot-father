/**
 * PromptBox - Input area for user prompts
 * Contains textarea with agent selection and stats display
 */

import { useMemo } from 'react'
import type { TextareaRenderable } from '@opentui/core'
import { THEME } from '../theme/colors.js'
import { LAYOUT } from '../constants/layout.js'
import { formatTokens, formatCost } from '../hooks/useStats.js'
import { useAgentStatsShared } from '../hooks/useAgentStatsShared.js'
import type { AgentInfo } from '../types.js'

// Custom keybindings for textarea: Enter = submit, Shift+Enter = newline
const TEXTAREA_KEYBINDINGS: Array<{
  name: string
  shift?: boolean
  action: 'submit' | 'newline'
}> = [
  { name: 'return', action: 'submit' },
  { name: 'return', shift: true, action: 'newline' },
]

interface PromptBoxProps {
  centered?: boolean
  bannerSubtitle?: string
  textareaRef: React.RefObject<TextareaRenderable | null>
  textareaFocused: boolean
  isExecuting: boolean
  currentAgentInfo: AgentInfo | undefined
  modelBadge: string
  onSubmit: () => void
}

export function PromptBox({
  centered = false,
  bannerSubtitle,
  textareaRef,
  textareaFocused,
  isExecuting,
  currentAgentInfo,
  modelBadge,
  onSubmit,
}: PromptBoxProps) {
  const stats = useAgentStatsShared()

  const statsBadge = useMemo(() => {
    if (!stats) return ''
    return `${formatTokens(stats.totalTokens)} tk · ${formatCost(stats.totalCostUsd)}`
  }, [stats])

  return (
    <box
      style={{
        flexDirection: 'column',
        width: centered ? LAYOUT.PROMPT_WIDTH : LAYOUT.PROMPT_WIDTH_FULLSCREEN,
        alignItems: centered ? 'center' : 'stretch',
        alignSelf: centered ? 'center' : undefined,
        marginTop: centered ? LAYOUT.MARGIN_TOP : 0,
        marginBottom: LAYOUT.MARGIN_BOTTOM,
      }}
    >
      {/* Subtitle with cyberpunk decorators */}
      {bannerSubtitle && (
        <box style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 1 }}>
          <text style={{ fg: THEME.textMuted }}>╌╌ </text>
          <text style={{ fg: THEME.textDim }}>{bannerSubtitle}</text>
          <text style={{ fg: THEME.textMuted }}> ╌╌</text>
        </box>
      )}

      {/* Main input container */}
      <box
        style={{
          border: true,
          borderStyle: 'rounded',
          borderColor: textareaFocused ? THEME.cyan : (isExecuting ? THEME.yellow : THEME.purple),
          backgroundColor: THEME.bgDark,
          padding: LAYOUT.PADDING,
          width: '100%',
        }}
      >
        {/* Input row with glowing cursor indicator */}
        <box style={{ flexDirection: 'row', width: '100%' }}>
          <text style={{ fg: textareaFocused ? THEME.cyan : THEME.magenta }}>
            {textareaFocused ? '▌' : '▎'}{' '}
          </text>
          <textarea
            key="prompt-textarea"
            ref={textareaRef}
            placeholder='Dime algo waxin... Puedes listar tus bots, crear nuevos, o simplemente joder'
            onSubmit={onSubmit}
            keyBindings={TEXTAREA_KEYBINDINGS}
            focused={textareaFocused && !isExecuting}
            textColor={THEME.text}
            style={{ width: '100%', height: LAYOUT.TEXTAREA_HEIGHT }}
          />
        </box>
      </box>

      {/* Status row - OUTSIDE the bordered box for better spacing when there are messages */}
      <box style={{ flexDirection: 'row', marginTop: 1, alignItems: 'center', justifyContent: 'center' }}>
        <text style={{ fg: THEME.textMuted }}>⟨ </text>
        <text style={{ fg: currentAgentInfo?.color ?? THEME.cyan }}>
          {currentAgentInfo?.label ?? 'Build'}
        </text>
        <text style={{ fg: THEME.textMuted }}> │ </text>
        <text style={{ fg: THEME.textDim }}>{modelBadge}</text>
        {isExecuting && (
          <>
            <text style={{ fg: THEME.textMuted }}> │ </text>
            <text style={{ fg: THEME.yellow }}>◐ processing</text>
          </>
        )}
        {statsBadge && (
          <>
            <text style={{ fg: THEME.textMuted }}> │ </text>
            <text style={{ fg: THEME.green }}>{statsBadge}</text>
          </>
        )}
        <text style={{ fg: THEME.textMuted }}> ⟩</text>
      </box>
    </box>
  )
}
