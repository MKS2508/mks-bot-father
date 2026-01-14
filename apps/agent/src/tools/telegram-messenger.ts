import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { createToolLogger } from '../utils/tool-logger.js'
import {
  telegramMessengerService,
  type IBuildMessageOptions,
  type IKeyboardButton,
  type IButtonConfig
} from '../services/telegram-service.js'

const LineFormatSchema = z.object({
  key: z.string().describe('Label/key for the line'),
  value: z.string().describe('Value to display'),
  format: z.enum(['none', 'bold', 'italic', 'code', 'underline']).optional().describe('Text formatting')
})

const SectionSchema = z.object({
  header: z.string().optional().describe('Section header (underlined)'),
  lines: z.array(LineFormatSchema).optional().describe('Key-value lines'),
  text: z.string().optional().describe('Plain text content'),
  codeBlock: z.object({
    code: z.string().describe('Code content'),
    language: z.string().optional().describe('Language for syntax highlighting')
  }).optional().describe('Code block'),
  listItems: z.array(z.string()).optional().describe('Bullet list items')
})

const KeyboardButtonSchema = z.object({
  text: z.string().describe('Button label'),
  type: z.enum(['callback', 'url', 'webapp']).describe('Button type'),
  data: z.string().describe('Callback data, URL, or webapp URL')
})

const TargetSchema = z.union([
  z.number().describe('Chat ID'),
  z.string().describe('Chat target as "chatId/threadId" for topics'),
  z.object({
    chatId: z.number(),
    threadId: z.number().optional()
  }).describe('Chat target object')
])

const SendOptionsSchema = z.object({
  silent: z.boolean().optional().describe('Send without notification'),
  protect: z.boolean().optional().describe('Protect from forwarding'),
  replyTo: z.number().optional().describe('Reply to message ID'),
  disableWebPagePreview: z.boolean().optional().describe('Disable link previews')
}).optional()

export const telegramMessengerServer = createSdkMcpServer({
  name: 'telegram-messenger',
  version: '1.0.0',
  tools: [
    tool(
      'build_message',
      `Build a formatted Telegram message using the fluent TelegramMessageBuilder API.

Supports:
- Title: Bold formatted header
- Sections: Underlined headers with content
- Lines: Key-value pairs with formatting (bold/italic/code)
- Code blocks: With optional language highlighting
- List items: Bulleted lists
- Links: Clickable hyperlinks
- Multiple parse modes (HTML default, Markdown, MarkdownV2)

Returns a message object with text and parse_mode that can be sent with send_message.

Example:
{
  "title": "Deployment Status",
  "sections": [{
    "header": "Server Info",
    "lines": [
      { "key": "Status", "value": "Running", "format": "bold" },
      { "key": "Uptime", "value": "2h 30m", "format": "code" }
    ]
  }]
}`,
      {
        title: z.string().optional().describe('Bold title for the message'),
        sections: z.array(SectionSchema).optional().describe('Message sections'),
        text: z.string().optional().describe('Additional plain text'),
        links: z.array(z.object({
          text: z.string(),
          url: z.string()
        })).optional().describe('Clickable links'),
        parseMode: z.enum(['html', 'markdown', 'markdownv2']).default('html').describe('Parse mode')
      },
      async (args) => {
        const log = createToolLogger('telegram-messenger.build_message')
        const startTime = log.start({ hasTitle: !!args.title, sectionsCount: args.sections?.length })

        try {
          const options: IBuildMessageOptions = {
            title: args.title,
            sections: args.sections,
            text: args.text,
            links: args.links,
            parseMode: args.parseMode
          }

          const message = telegramMessengerService.buildMessage(options)

          log.success(startTime, { textLength: message.text?.length })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                message: {
                  text: message.text,
                  parse_mode: message.parse_mode
                }
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'build' })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'build_keyboard',
      `Build an inline keyboard with callback buttons, URL buttons, or web app buttons.

Button types:
- callback: Triggers bot callback (callback_data field)
- url: Opens URL in browser
- webapp: Opens Telegram Mini App

Buttons are organized in rows. Each array element in 'rows' is a row of buttons.

Example:
{
  "rows": [
    [
      { "text": "Yes", "type": "callback", "data": "confirm_yes" },
      { "text": "No", "type": "callback", "data": "confirm_no" }
    ],
    [
      { "text": "Open Docs", "type": "url", "data": "https://example.com/docs" }
    ]
  ]
}`,
      {
        rows: z.array(z.array(KeyboardButtonSchema)).describe('Array of button rows')
      },
      async (args) => {
        const log = createToolLogger('telegram-messenger.build_keyboard')
        const startTime = log.start({ rowsCount: args.rows.length })

        try {
          const keyboard = telegramMessengerService.buildKeyboard(args.rows as IKeyboardButton[][])

          log.success(startTime, { buttonsCount: args.rows.flat().length })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                keyboard
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'build' })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'send_message',
      `Send a formatted message to a Telegram user, group, or topic.

Target formats:
- Number: Direct chat ID (positive for users, negative for groups)
- String: "chatId/threadId" format for topics in supergroups
- Object: { chatId: number, threadId?: number }

The message should be built using build_message first, or provided directly.

Options:
- silent: Send without notification sound
- protect: Prevent forwarding/saving
- replyTo: Reply to specific message
- keyboard: Inline keyboard (use build_keyboard first)

Returns: { messageId, chatId, threadId? }`,
      {
        target: TargetSchema.describe('Chat target'),
        message: z.object({
          text: z.string().describe('Message text (HTML formatted)'),
          parse_mode: z.enum(['html', 'markdown', 'markdownv2']).optional()
        }).describe('Message content'),
        keyboard: z.object({
          inline_keyboard: z.array(z.array(z.any()))
        }).optional().describe('Inline keyboard markup'),
        options: SendOptionsSchema
      },
      async (args) => {
        const log = createToolLogger('telegram-messenger.send_message')
        const startTime = log.start({ target: args.target })

        try {
          if (!telegramMessengerService.isInitialized()) {
            throw new Error('Telegram messenger service not initialized. Bot must be running.')
          }

          const result = await telegramMessengerService.sendMessage(
            args.target as any,
            { text: args.message.text, parse_mode: args.message.parse_mode || 'html' },
            { ...args.options, keyboard: args.keyboard as any }
          )

          log.success(startTime, { messageId: result.messageId, chatId: result.chatId })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                messageId: result.messageId,
                chatId: result.chatId,
                threadId: result.threadId
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'send' })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'send_media',
      `Send a media message (photo, video, document, audio, voice) to a Telegram chat.

Media types:
- photo: JPEG, PNG, GIF images
- video: MP4 videos (optionally with streaming support)
- document: Any file type
- audio: MP3/OGG with metadata support
- voice: OGG voice messages

Source can be:
- File path on server: "/path/to/file.jpg"
- URL: "https://example.com/image.jpg"
- Telegram file_id: From previously sent media

Returns: { messageId, chatId }`,
      {
        target: TargetSchema.describe('Chat target'),
        type: z.enum(['photo', 'video', 'document', 'audio', 'voice']).describe('Media type'),
        source: z.string().describe('File path, URL, or file_id'),
        caption: z.string().optional().describe('Media caption'),
        parseMode: z.enum(['html', 'markdown', 'markdownv2']).optional().describe('Caption parse mode'),
        options: z.object({
          duration: z.number().optional().describe('Duration in seconds (video/audio/voice)'),
          width: z.number().optional().describe('Width in pixels (video)'),
          height: z.number().optional().describe('Height in pixels (video)'),
          performer: z.string().optional().describe('Performer name (audio)'),
          title: z.string().optional().describe('Track title (audio)'),
          thumbnail: z.string().optional().describe('Thumbnail source'),
          fileName: z.string().optional().describe('Original filename (document)')
        }).optional(),
        keyboard: z.object({
          inline_keyboard: z.array(z.array(z.any()))
        }).optional().describe('Inline keyboard markup')
      },
      async (args) => {
        const log = createToolLogger('telegram-messenger.send_media')
        const startTime = log.start({ target: args.target, type: args.type })

        try {
          if (!telegramMessengerService.isInitialized()) {
            throw new Error('Telegram messenger service not initialized. Bot must be running.')
          }

          const media = telegramMessengerService.buildMedia(args.type, args.source, {
            caption: args.caption,
            parseMode: args.parseMode,
            ...args.options
          })

          const result = await telegramMessengerService.sendMedia(
            args.target as any,
            media,
            { keyboard: args.keyboard as any }
          )

          log.success(startTime, { messageId: result.messageId, chatId: result.chatId })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                messageId: result.messageId,
                chatId: result.chatId,
                threadId: result.threadId
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'send_media' })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'edit_message',
      `Edit a previously sent message text and/or keyboard.

Can update:
- Message text with new formatting
- Inline keyboard buttons
- Both text and keyboard together

Note: Cannot edit message type (e.g., can't turn text into media).
For media messages, only caption can be edited.

Returns: { success: boolean }`,
      {
        chatId: z.number().describe('Chat where message exists'),
        messageId: z.number().describe('ID of message to edit'),
        text: z.string().optional().describe('New message text'),
        parseMode: z.enum(['html', 'markdown', 'markdownv2']).optional().describe('Parse mode'),
        keyboard: z.object({
          inline_keyboard: z.array(z.array(z.any()))
        }).optional().describe('New inline keyboard (omit to keep current, empty array to remove)')
      },
      async (args) => {
        const log = createToolLogger('telegram-messenger.edit_message')
        const startTime = log.start({ chatId: args.chatId, messageId: args.messageId })

        try {
          if (!telegramMessengerService.isInitialized()) {
            throw new Error('Telegram messenger service not initialized. Bot must be running.')
          }

          let success: boolean

          if (args.text) {
            success = await telegramMessengerService.editMessage(
              args.chatId,
              args.messageId,
              { text: args.text, parse_mode: args.parseMode || 'html' },
              args.keyboard as any
            )
          } else if (args.keyboard !== undefined) {
            success = await telegramMessengerService.editKeyboard(
              args.chatId,
              args.messageId,
              args.keyboard as any
            )
          } else {
            throw new Error('Either text or keyboard must be provided')
          }

          log.success(startTime, { success })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({ success }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'edit' })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'delete_message',
      `Delete a message from a chat.

Limitations:
- Bot can delete its own messages anytime
- In groups, bot needs delete permissions to remove user messages
- Messages older than 48 hours may not be deletable

Returns: { success: boolean }`,
      {
        chatId: z.number().describe('Chat where message exists'),
        messageId: z.number().describe('ID of message to delete')
      },
      async (args) => {
        const log = createToolLogger('telegram-messenger.delete_message')
        const startTime = log.start({ chatId: args.chatId, messageId: args.messageId })

        try {
          if (!telegramMessengerService.isInitialized()) {
            throw new Error('Telegram messenger service not initialized. Bot must be running.')
          }

          const success = await telegramMessengerService.deleteMessage(args.chatId, args.messageId)

          log.success(startTime, { success })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({ success }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'delete' })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'ask_user_question',
      `Ask the user a question with button options and wait for their response.

This implements an interactive dialog pattern:
1. Sends message with inline keyboard buttons
2. Waits for user to click a button
3. Returns the selected option value

Use cases:
- Confirmations: "Are you sure?" with Yes/No
- Multiple choice: Select from options
- Interactive workflows: Step-by-step decisions

Note: Has configurable timeout (default 60s). Question expires after timeout.

Returns: { buttonText, callbackData, value } when user responds.
Throws error if timeout expires.`,
      {
        target: TargetSchema.describe('Chat target'),
        question: z.string().describe('Question text to display'),
        buttons: z.array(z.object({
          text: z.string().describe('Button label'),
          value: z.string().describe('Value returned when clicked')
        })).describe('Button options'),
        timeoutSeconds: z.number().default(60).describe('Timeout in seconds')
      },
      async (args) => {
        const log = createToolLogger('telegram-messenger.ask_user_question')
        const startTime = log.start({ target: args.target, buttonsCount: args.buttons.length })

        try {
          if (!telegramMessengerService.isInitialized()) {
            throw new Error('Telegram messenger service not initialized. Bot must be running.')
          }

          const response = await telegramMessengerService.askUserQuestion(
            args.target as any,
            args.question,
            args.buttons as IButtonConfig[],
            args.timeoutSeconds
          )

          log.success(startTime, { response: response.value })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                response: response.value,
                buttonText: response.buttonText,
                callbackData: response.callbackData
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'ask' })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
                timedOut: error instanceof Error && error.message.includes('timed out')
              })
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'update_progress',
      `Create or update a progress indicator message for long operations.

Actions:
- start: Create new progress message
- update: Update step and status
- complete: Mark as successfully completed
- fail: Mark as failed with error

Progress display shows:
- Current status message
- Percentage complete
- Elapsed time
- ETA (estimated time remaining)

Returns: { success: boolean, operationId }`,
      {
        operationId: z.string().describe('Unique ID for this operation'),
        action: z.enum(['start', 'update', 'complete', 'fail']).describe('Progress action'),
        target: TargetSchema.optional().describe('Chat target (required for start)'),
        status: z.string().optional().describe('Status message'),
        currentStep: z.number().optional().describe('Current step number'),
        totalSteps: z.number().optional().describe('Total steps (for start)'),
        errorMessage: z.string().optional().describe('Error message (for fail action)')
      },
      async (args) => {
        const log = createToolLogger('telegram-messenger.update_progress')
        const startTime = log.start({ operationId: args.operationId, action: args.action })

        try {
          if (!telegramMessengerService.isInitialized()) {
            throw new Error('Telegram messenger service not initialized. Bot must be running.')
          }

          switch (args.action) {
            case 'start':
              if (!args.target) {
                throw new Error('Target is required for start action')
              }
              await telegramMessengerService.startProgress(
                args.operationId,
                args.target as any,
                args.status || 'Starting...',
                args.totalSteps || 10
              )
              break

            case 'update':
              await telegramMessengerService.updateProgress(
                args.operationId,
                args.currentStep || 0,
                args.status
              )
              break

            case 'complete':
              await telegramMessengerService.completeProgress(
                args.operationId,
                args.status || 'Completed!'
              )
              break

            case 'fail':
              await telegramMessengerService.failProgress(
                args.operationId,
                args.errorMessage || args.status || 'Operation failed'
              )
              break
          }

          log.success(startTime, { action: args.action })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                operationId: args.operationId,
                action: args.action
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'progress' })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }],
            isError: true
          }
        }
      }
    ),

    tool(
      'format_tool_result',
      `Format a tool execution result for display in Telegram.

Creates a nicely formatted message showing:
- Tool name with success/error icon
- Key results from the operation
- Error details if failed
- Optional action buttons

Useful for presenting MCP tool results to users in a consistent format.

Returns: Built message object ready for send_message.`,
      {
        toolName: z.string().describe('Name of the tool that was executed'),
        success: z.boolean().describe('Whether the operation succeeded'),
        result: z.record(z.unknown()).optional().describe('Tool result data'),
        error: z.string().optional().describe('Error message if failed'),
        includeRetryButton: z.boolean().optional().describe('Include retry button'),
        retryCallbackData: z.string().optional().describe('Callback data for retry button')
      },
      async (args) => {
        const log = createToolLogger('telegram-messenger.format_tool_result')
        const startTime = log.start({ toolName: args.toolName, success: args.success })

        try {
          const message = telegramMessengerService.formatToolResult(
            args.toolName,
            args.success,
            args.result as Record<string, unknown>,
            args.error
          )

          let keyboard
          if (args.includeRetryButton && !args.success) {
            keyboard = telegramMessengerService.buildKeyboard([[
              {
                text: '🔄 Retry',
                type: 'callback',
                data: args.retryCallbackData || `retry_${args.toolName}`
              }
            ]])
          }

          log.success(startTime, { textLength: message.text?.length })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                message: {
                  text: message.text,
                  parse_mode: message.parse_mode
                },
                keyboard
              }, null, 2)
            }]
          }
        } catch (error) {
          log.error(startTime, error, { phase: 'format' })
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
              })
            }],
            isError: true
          }
        }
      }
    )
  ]
})
