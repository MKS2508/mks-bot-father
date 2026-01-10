/**
 * Professional chat bubble component for WAXIN TUI.
 * Styled with borders, colors, and alignment based on message role.
 */

import { THEME } from '../theme/colors.js'
import { formatTimestamp } from '../utils/format.js'

interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: Date
}

interface ChatBubbleProps {
  message: Message
}

export const ChatBubble = ({ message }: ChatBubbleProps) => {
  const isUser = message.role === 'user'
  const isTool = message.role === 'tool'

  if (isTool) {
    return (
      <box
        style={{
          width: '100%',
          marginBottom: 1,
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        <box style={{ flexDirection: 'row' }}>
          <text style={{ fg: THEME.magenta }}>⚡ {message.content}</text>
          <text style={{ fg: THEME.textMuted }}> · {formatTimestamp(message.timestamp)}</text>
        </box>
      </box>
    )
  }

  return (
    <box
      style={{
        width: '100%',
        marginBottom: 1,
        paddingLeft: 1,
        paddingRight: 1,
        flexDirection: 'column',
      }}
    >
      <box
        style={{
          alignSelf: isUser ? 'flex-end' : 'flex-start',
          maxWidth: '70%',
          backgroundColor: THEME.bgDark,
          border: true,
          padding: 1,
        }}
      >
        {isUser && (
          <text style={{ fg: THEME.cyan }}>
            ▶{' '}
          </text>
        )}
        <text
          style={{
            fg: isUser ? THEME.cyan : THEME.green,
          }}
        >
          {message.content}
        </text>
      </box>
      <text
        style={{
          fg: THEME.textMuted,
          alignSelf: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        {formatTimestamp(message.timestamp)}
      </text>
    </box>
  )
}
