/**
 * AgentSwitchOverlay - Agent selection overlay
 * Shows available agents and allows switching between them
 */

import { useKeyboard } from '@opentui/react'
import { useState } from 'react'

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

// Available agents (from useAgent hook)
const AGENTS = [
  { id: 'chatgpt', name: 'ChatGPT', description: 'OpenAI GPT models' },
  { id: 'claude', name: 'Claude', description: 'Anthropic Claude models' },
  { id: 'ollama', name: 'Ollama', description: 'Local LLM models' },
] as const

interface AgentSwitchOverlayProps {
  currentAgent?: string
  onSwitch?: (agentId: string) => void
  onClose?: () => void
}

/**
 * AgentSwitchOverlay - Agent selection interface
 *
 * Features:
 * - List of available agents
 * - Current agent highlighted
 * - Click or press number to switch
 * - ESC to close
 */
export function AgentSwitchOverlay({ currentAgent = 'claude', onSwitch, onClose }: AgentSwitchOverlayProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useKeyboard((key) => {
    if (key.name === 'escape') {
      onClose?.()
      return
    }

    // Arrow keys to navigate
    if (key.name === 'up' || key.name === 'k') {
      setSelectedIndex(prev => (prev - 1 + AGENTS.length) % AGENTS.length)
      return
    }

    if (key.name === 'down' || key.name === 'j') {
      setSelectedIndex(prev => (prev + 1) % AGENTS.length)
      return
    }

    // Number keys 1-3 to select
    if (key.name === '1' || key.name === '2' || key.name === '3') {
      const idx = parseInt(key.name) - 1
      if (AGENTS[idx]) {
        onSwitch?.(AGENTS[idx]!.id)
        onClose?.()
      }
      return
    }

    // Enter to select
    if (key.name === 'enter') {
      onSwitch?.(AGENTS[selectedIndex]!.id)
      onClose?.()
    }
  })

  return (
    <box style={{ flexDirection: 'column' }}>
      {/* Header */}
      <box style={{ paddingBottom: 1 }}>
        <text style={{ fg: THEME.cyan }}>
          {'🤖 Agent Switcher'}
        </text>
      </box>

      {/* Current Agent */}
      <box style={{ marginBottom: 1, paddingBottom: 1 }}>
        <text style={{ fg: THEME.textMuted }}>
          {'Current: '}
        </text>
        <text style={{ fg: THEME.green }}>
          {AGENTS.find(a => a.id === currentAgent)?.name || currentAgent}
        </text>
      </box>

      {/* Agent List */}
      {AGENTS.map((agent, idx) => {
        const isSelected = idx === selectedIndex
        const isCurrent = agent.id === currentAgent

        return (
          <box
            key={agent.id}
            style={{
              flexDirection: 'column',
              marginBottom: 1,
              padding: 1,
              backgroundColor: isSelected ? THEME.bgPanel : undefined,
              border: true,
              borderColor: isSelected ? THEME.cyan : THEME.bgPanel,
              borderStyle: 'single',
            }}
            onMouseUp={() => {
              onSwitch?.(agent.id)
              onClose?.()
            }}
          >
            {/* Agent header */}
            <box style={{ flexDirection: 'row', gap: 2 }}>
              {/* Number indicator */}
              <text style={{ fg: THEME.textDim }}>
                {`${idx + 1}.`}
              </text>

              {/* Selection indicator */}
              {isSelected && (
                <text style={{ fg: THEME.green }}>
                  {'▶'}
                </text>
              )}

              {/* Agent name */}
              <text style={{ fg: isSelected ? THEME.cyan : THEME.text }}>
                {agent.name}
              </text>

              {/* Current badge */}
              {isCurrent && (
                <text style={{ fg: THEME.green }}>
                  {'[current]'}
                </text>
              )}
            </box>

            {/* Description */}
            <text style={{ fg: THEME.textDim }}>
              {agent.description}
            </text>
          </box>
        )
      })}

      {/* Footer with hint */}
      <box style={{ marginTop: 1, flexDirection: 'row', gap: 2 }}>
        <text style={{ fg: THEME.textMuted }}>
          {'↑↓ Navigate | Enter: Select | ESC: Close'}
        </text>
      </box>
    </box>
  )
}
