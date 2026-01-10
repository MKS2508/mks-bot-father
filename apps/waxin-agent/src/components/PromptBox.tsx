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
        marginTop: centered ? LAYOUT.MARGIN_TOP * 2 : 0,
        marginBottom: LAYOUT.MARGIN_BOTTOM,
      }}
    >
      {/* Subtitle centered above prompt - always show when exists */}
      {bannerSubtitle && (
        <box style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 1 }}>
          <text style={{ fg: THEME.textDim }}>
            {bannerSubtitle}
          </text>
        </box>
      )}

      <box
        style={{
          border: true,
          borderStyle: 'rounded',
          borderColor: textareaFocused ? THEME.cyan : (isExecuting ? THEME.textMuted : THEME.purple),
          backgroundColor: THEME.bgPanel,
          padding: LAYOUT.PADDING,
          width: '100%',
        }}
      >
        <box style={{ flexDirection: 'row', width: '100%' }}>
          <text style={{ fg: THEME.magenta }}>▎ </text>
          <textarea
            ref={textareaRef}
            initialValue=""
            placeholder='Dime algo waxin... Puedes listar tus bots, crear nuevos, o simplemente joder'
            onSubmit={onSubmit}
            keyBindings={TEXTAREA_KEYBINDINGS}
            focused={textareaFocused && !isExecuting}
            textColor={THEME.text}
            style={{ width: '100%', height: LAYOUT.TEXTAREA_HEIGHT }}
          />
        </box>
        <box style={{ flexDirection: 'row', marginTop: 1 }}>
          <text style={{ fg: currentAgentInfo?.color ?? THEME.cyan }}>
            {currentAgentInfo?.label ?? 'Build'}
          </text>
          <text style={{ fg: THEME.textDim }}> · {modelBadge}</text>
          {isExecuting && (
            <>
              <text style={{ fg: THEME.yellow }}> ◐ </text>
              <text style={{ fg: THEME.yellow }}>ejecutando...</text>
            </>
          )}
          {statsBadge && (
            <text style={{ fg: THEME.textMuted }}> · {statsBadge}</text>
          )}
        </box>
      </box>
      {centered && (
        <box style={{ flexDirection: 'row', marginTop: 1, justifyContent: 'center' }}>
          <text style={{ fg: THEME.textMuted }}>tab</text>
          <text style={{ fg: THEME.textDim }}> switch agent  </text>
          <text style={{ fg: THEME.textMuted }}>ctrl+c</text>
          <text style={{ fg: THEME.textDim }}> quit</text>
        </box>
      )}
    </box>
  )
}
