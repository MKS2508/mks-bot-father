/**
 * Telegram Inline Keyboard Builders.
 */
import { Markup } from 'telegraf'

/** Confirmation dialog keyboard */
export function confirmationKeyboard(confirmationId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Confirm', `confirm:${confirmationId}`),
      Markup.button.callback('❌ Cancel', `cancel:${confirmationId}`)
    ]
  ])
}

/** Cancel operation keyboard */
export function cancelOperationKeyboard(operationId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🛑 Cancel Operation', `cancel_op:${operationId}`)]
  ])
}

/** Main menu keyboard */
export function mainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🤖 Create Bot', 'menu:create_bot'),
      Markup.button.callback('📋 List Bots', 'menu:list_bots')
    ],
    [
      Markup.button.callback('🚀 Deploy', 'menu:deploy'),
      Markup.button.callback('📊 Status', 'menu:status')
    ],
    [
      Markup.button.callback('📜 History', 'menu:history'),
      Markup.button.callback('⚙️ Settings', 'menu:settings')
    ]
  ])
}

/** Post-creation quick actions */
export function postCreationKeyboard(botUsername: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔧 Configure', `configure:${botUsername}`),
      Markup.button.callback('📦 Create Repo', `create_repo:${botUsername}`)
    ],
    [
      Markup.button.callback('🚀 Deploy Now', `deploy:${botUsername}`),
      Markup.button.url('🔗 Open in TG', `https://t.me/${botUsername}`)
    ]
  ])
}

/** Stats toggle keyboard */
export function statsToggleKeyboard(operationId: string, expanded: boolean) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        expanded ? '📊 Hide Details' : '📊 Show Details',
        `stats:${operationId}:${expanded ? 'hide' : 'show'}`
      )
    ]
  ])
}

/** History pagination keyboard */
export function historyPaginationKeyboard(currentPage: number, totalPages: number) {
  const buttons = []

  if (currentPage > 0) {
    buttons.push(Markup.button.callback('◀️ Prev', `history:${currentPage - 1}`))
  }

  buttons.push(Markup.button.callback(`${currentPage + 1}/${totalPages}`, 'noop'))

  if (currentPage < totalPages - 1) {
    buttons.push(Markup.button.callback('Next ▶️', `history:${currentPage + 1}`))
  }

  return Markup.inlineKeyboard([buttons])
}

/** Simple yes/no keyboard */
export function yesNoKeyboard(actionPrefix: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Yes', `${actionPrefix}:yes`),
      Markup.button.callback('No', `${actionPrefix}:no`)
    ]
  ])
}

/** Back to menu button */
export function backToMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('◀️ Back to Menu', 'menu:back')]
  ])
}
