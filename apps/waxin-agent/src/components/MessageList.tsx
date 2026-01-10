/**
 * MessageList - Scrollable list of chat messages
 * Uses ScrollBox with custom scrollbar styling
 */

import { memo } from 'react'
import { THEME } from '../theme/colors.js'
import { ChatBubble } from './ChatBubble.js'
import type { Message } from '../types.js'

interface MessageListProps {
  messages: Message[]
  isExecuting: boolean
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

export const MessageList = memo(function MessageList({ messages, isExecuting }: MessageListProps) {
  return (
    <scrollbox
      style={SCROLLBOX_STYLE}
      scrollY={true}
      focused={!isExecuting}
    >
      {messages.map((msg, idx) => (
        <ChatBubble key={`${msg.role}-${msg.timestamp.getTime()}-${idx}`} message={msg} />
      ))}
    </scrollbox>
  )
})
