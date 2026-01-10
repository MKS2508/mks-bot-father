/**
 * MessageList - Scrollable list of chat messages
 * Uses ScrollBox with custom scrollbar styling
 */

import { memo } from 'react'
import { THEME } from '../theme/colors.js'
import { ChatBubble } from './ChatBubble.js'
import { CompactToolResult } from './ToolResultCard.js'
import type { Message } from '../types.js'
import type { ToolExecution } from '../types.js'

interface MessageListProps {
  messages: Message[]
  isExecuting: boolean
  toolExecutions?: ToolExecution[]
}

const SCROLLBOX_STYLE = {
  rootOptions: {
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
  },
  wrapperOptions: {
    backgroundColor: 'transparent',
  },
  viewportOptions: {
    backgroundColor: 'transparent',
  },
  contentOptions: {
    backgroundColor: 'transparent',
  },
  scrollbarOptions: {
    trackOptions: {
      foregroundColor: THEME.purple,
      backgroundColor: THEME.bgDark,
    },
  },
} as const

export const MessageList = memo(function MessageList({ messages, isExecuting, toolExecutions = [] }: MessageListProps) {
  return (
    <scrollbox
      style={SCROLLBOX_STYLE}
      scrollY={true}
      focused={!isExecuting}
    >
      {messages.map((msg, idx) => {
        if (msg.role === 'tool') {
          // Try to find matching tool execution
          const toolExec = toolExecutions.find(e => e.tool === msg.content)
          if (toolExec) {
            return (
              <CompactToolResult
                key={`tool-${msg.timestamp.getTime()}-${idx}`}
                execution={toolExec}
              />
            )
          }
          // Fallback: show tool message as text
          return (
            <box key={`tool-${msg.timestamp.getTime()}-${idx}`} style={{ flexDirection: 'row', marginTop: 1, marginBottom: 1 }}>
              <text style={{ fg: THEME.magenta }}>🔧</text>
              <text style={{ fg: THEME.textMuted }}> </text>
              <text style={{ fg: THEME.cyan }}>{msg.content}</text>
            </box>
          )
        }
        return <ChatBubble key={`${msg.role}-${msg.timestamp.getTime()}-${idx}`} message={msg} />
      })}
    </scrollbox>
  )
})
