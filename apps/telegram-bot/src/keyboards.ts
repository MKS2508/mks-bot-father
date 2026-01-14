/**
 * Telegram Inline Keyboard Builders.
 * Uses TelegramKeyboardBuilder from telegram-message-builder.
 */
import { TelegramKeyboardBuilder } from '@mks2508/telegram-message-builder'
import type { InlineKeyboardMarkup } from 'telegraf/types'

type TelegrafKeyboardOptions = { reply_markup: InlineKeyboardMarkup }

/**
 * Confirmation dialog keyboard.
 */
export function confirmationKeyboard(confirmationId: string): TelegrafKeyboardOptions {
  return {
    reply_markup: TelegramKeyboardBuilder.inline()
      .callbackButton('✅ Confirm', `confirm:${confirmationId}`)
      .callbackButton('❌ Cancel', `cancel:${confirmationId}`)
      .buildMarkup() as unknown as InlineKeyboardMarkup
  }
}

/**
 * Cancel operation keyboard.
 */
export function cancelOperationKeyboard(operationId: string): TelegrafKeyboardOptions {
  return {
    reply_markup: TelegramKeyboardBuilder.inline()
      .callbackButton('🛑 Cancel Operation', `cancel_op:${operationId}`)
      .buildMarkup() as unknown as InlineKeyboardMarkup
  }
}

/**
 * Main menu keyboard with grid layout.
 */
export function mainMenuKeyboard(): TelegrafKeyboardOptions {
  return {
    reply_markup: TelegramKeyboardBuilder.inline()
      .callbackButton('🤖 Create Bot', 'menu:create_bot')
      .callbackButton('📋 List Bots', 'menu:list_bots')
      .row()
      .callbackButton('🚀 Deploy', 'menu:deploy')
      .callbackButton('📊 Status', 'menu:status')
      .row()
      .callbackButton('📜 History', 'menu:history')
      .callbackButton('⚙️ Settings', 'menu:settings')
      .buildMarkup() as unknown as InlineKeyboardMarkup
  }
}

/**
 * Post-creation quick actions keyboard.
 */
export function postCreationKeyboard(botUsername: string): TelegrafKeyboardOptions {
  return {
    reply_markup: TelegramKeyboardBuilder.inline()
      .callbackButton('🔧 Configure', `configure:${botUsername}`)
      .callbackButton('📦 Create Repo', `create_repo:${botUsername}`)
      .row()
      .callbackButton('🚀 Deploy Now', `deploy:${botUsername}`)
      .urlButton('🔗 Open in TG', `https://t.me/${botUsername}`)
      .buildMarkup() as unknown as InlineKeyboardMarkup
  }
}

/**
 * Stats toggle keyboard.
 */
export function statsToggleKeyboard(operationId: string, expanded: boolean): TelegrafKeyboardOptions {
  return {
    reply_markup: TelegramKeyboardBuilder.inline()
      .callbackButton(
        expanded ? '📊 Hide Details' : '📊 Show Details',
        `stats:${operationId}:${expanded ? 'hide' : 'show'}`
      )
      .buildMarkup() as unknown as InlineKeyboardMarkup
  }
}

/**
 * History pagination keyboard.
 */
export function historyPaginationKeyboard(currentPage: number, totalPages: number): TelegrafKeyboardOptions {
  const builder = TelegramKeyboardBuilder.inline()

  if (currentPage > 0) {
    builder.callbackButton('◀️ Prev', `history:${currentPage - 1}`)
  }

  builder.callbackButton(`${currentPage + 1}/${totalPages}`, 'noop')

  if (currentPage < totalPages - 1) {
    builder.callbackButton('Next ▶️', `history:${currentPage + 1}`)
  }

  return {
    reply_markup: builder.buildMarkup() as unknown as InlineKeyboardMarkup
  }
}

/**
 * Simple yes/no keyboard.
 */
export function yesNoKeyboard(actionPrefix: string): TelegrafKeyboardOptions {
  return {
    reply_markup: TelegramKeyboardBuilder.inline()
      .callbackButton('Yes', `${actionPrefix}:yes`)
      .callbackButton('No', `${actionPrefix}:no`)
      .buildMarkup() as unknown as InlineKeyboardMarkup
  }
}

/**
 * Back to menu button.
 */
export function backToMenuKeyboard(): TelegrafKeyboardOptions {
  return {
    reply_markup: TelegramKeyboardBuilder.inline()
      .callbackButton('◀️ Back to Menu', 'menu:back')
      .buildMarkup() as unknown as InlineKeyboardMarkup
  }
}

/**
 * Tool action keyboard (for tool results).
 */
export function toolActionKeyboard(toolName: string, operationId: string): TelegrafKeyboardOptions {
  return {
    reply_markup: TelegramKeyboardBuilder.inline()
      .callbackButton('🔄 Retry', `retry:${operationId}:${toolName}`)
      .callbackButton('📋 Details', `details:${operationId}:${toolName}`)
      .buildMarkup() as unknown as InlineKeyboardMarkup
  }
}

/**
 * Bot management keyboard.
 */
export function botManagementKeyboard(botUsername: string): TelegrafKeyboardOptions {
  return {
    reply_markup: TelegramKeyboardBuilder.inline()
      .callbackButton('▶️ Start', `bot:start:${botUsername}`)
      .callbackButton('⏹️ Stop', `bot:stop:${botUsername}`)
      .row()
      .callbackButton('🔧 Configure', `bot:config:${botUsername}`)
      .callbackButton('📊 Logs', `bot:logs:${botUsername}`)
      .row()
      .callbackButton('🗑️ Delete', `bot:delete:${botUsername}`)
      .buildMarkup() as unknown as InlineKeyboardMarkup
  }
}

/**
 * Session list keyboard with resume buttons.
 */
export function sessionListKeyboard(sessions: Array<{ sessionId: string; name?: string }>): TelegrafKeyboardOptions {
  const builder = TelegramKeyboardBuilder.inline()

  for (let i = 0; i < Math.min(sessions.length, 5); i++) {
    const session = sessions[i]
    const label = session.name || session.sessionId.slice(0, 15) + '...'
    builder.callbackButton(`📂 ${label}`, `session:resume:${session.sessionId}`)
    if (i < Math.min(sessions.length, 5) - 1) {
      builder.row()
    }
  }

  if (sessions.length > 5) {
    builder.row().callbackButton(`Ver más (${sessions.length - 5})...`, 'session:more')
  }

  return {
    reply_markup: builder.buildMarkup() as unknown as InlineKeyboardMarkup
  }
}
