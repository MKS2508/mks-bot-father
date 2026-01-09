/**
 * Professional chat bubble component for WAXIN TUI.
 * Styled with borders, colors, and alignment based on message role.
 */

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

interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: Date
}

interface ChatBubbleProps {
  message: Message
}

function formatTimestamp(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
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
