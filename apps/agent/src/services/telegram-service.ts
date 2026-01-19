import type { Telegram } from 'telegraf'
import {
  TelegrafSender,
  ProgressManager,
  type IChatTarget,
  type ISendOptionsWithKeyboard,
  type ISendResult,
  type IProgressConfig
} from '@mks2508/telegram-message-builder-telegraf'
import {
  TelegramMessageBuilder,
  TelegramKeyboardBuilder,
  TelegramMediaBuilder,
  type TelegramMessage,
  type IMediaBuildResult,
  type IInlineKeyboardMarkup
} from '@mks2508/telegram-message-builder'
import { isErr } from '@mks2508/no-throw'
import { createToolLogger } from '../utils/tool-logger.js'

export interface IButtonConfig {
  text: string
  value: string
}

export interface IUserResponse {
  buttonText: string
  callbackData: string
  value: string
}

export interface IPendingCallback {
  callbackId: string
  chatId: number
  resolve: (response: IUserResponse) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
  createdAt: number
}

export interface IProgressOperation {
  operationId: string
  chatId: number
  threadId?: number
  manager: ProgressManager
  startedAt: number
  messageId?: number
}

export interface IKeyboardButton {
  text: string
  type: 'callback' | 'url' | 'webapp'
  data: string
}

export interface ILineFormat {
  key: string
  value: string
  format?: 'none' | 'bold' | 'italic' | 'code' | 'underline'
}

export interface IMessageSection {
  header?: string
  lines?: ILineFormat[]
  text?: string
  codeBlock?: { code: string; language?: string }
  listItems?: string[]
}

export interface IBuildMessageOptions {
  title?: string
  sections?: IMessageSection[]
  text?: string
  links?: Array<{ text: string; url: string }>
  parseMode?: 'html' | 'markdown' | 'markdownv2'
}

class TelegramMessengerService {
  private telegram: Telegram | null = null
  private sender: TelegrafSender | null = null
  private pendingCallbacks: Map<string, IPendingCallback> = new Map()
  private progressOperations: Map<string, IProgressOperation> = new Map()
  private log = createToolLogger('telegram-messenger-service')

  initialize(telegram: Telegram): void {
    this.telegram = telegram
    this.sender = new TelegrafSender(telegram)
    this.log.info('TelegramMessengerService initialized')
  }

  isInitialized(): boolean {
    return this.telegram !== null && this.sender !== null
  }

  getSender(): TelegrafSender {
    if (!this.sender) {
      throw new Error('TelegramMessengerService not initialized. Call initialize() first.')
    }
    return this.sender
  }

  getTelegram(): Telegram {
    if (!this.telegram) {
      throw new Error('TelegramMessengerService not initialized. Call initialize() first.')
    }
    return this.telegram
  }

  buildMessage(options: IBuildMessageOptions): TelegramMessage {
    const builder = TelegramMessageBuilder.text()

    if (options.parseMode) {
      builder.setParseMode(options.parseMode)
    }

    if (options.title) {
      builder.title(options.title)
      builder.newline()
    }

    if (options.sections) {
      for (const section of options.sections) {
        if (section.header) {
          builder.section(section.header)
          builder.newline()
        }

        if (section.lines) {
          for (const line of section.lines) {
            const formatOpts = line.format && line.format !== 'none'
              ? { [line.format]: true }
              : undefined
            builder.line(line.key, line.value, formatOpts)
          }
        }

        if (section.text) {
          builder.text(section.text)
          builder.newline()
        }

        if (section.codeBlock) {
          builder.codeBlock(section.codeBlock.code, section.codeBlock.language)
        }

        if (section.listItems) {
          for (const item of section.listItems) {
            builder.listItem(item)
          }
        }

        builder.newline()
      }
    }

    if (options.text) {
      builder.text(options.text)
    }

    if (options.links) {
      for (const link of options.links) {
        builder.link(link.text, link.url)
        builder.newline()
      }
    }

    return builder.build()
  }

  buildKeyboard(rows: IKeyboardButton[][]): IInlineKeyboardMarkup {
    const builder = TelegramKeyboardBuilder.inline()

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex]
      for (const button of row) {
        switch (button.type) {
          case 'callback':
            builder.callbackButton(button.text, button.data)
            break
          case 'url':
            builder.urlButton(button.text, button.data)
            break
          case 'webapp':
            builder.webAppButton(button.text, button.data)
            break
        }
      }
      if (rowIndex < rows.length - 1) {
        builder.row()
      }
    }

    return builder.buildMarkup()
  }

  async sendMessage(
    target: IChatTarget,
    message: TelegramMessage,
    options?: ISendOptionsWithKeyboard
  ): Promise<ISendResult> {
    const sender = this.getSender()
    const result = await sender.send(target, message, options)

    if (isErr(result)) {
      throw new Error(result.error.message)
    }

    return result.value
  }

  async sendMedia(
    target: IChatTarget,
    media: IMediaBuildResult,
    options?: ISendOptionsWithKeyboard
  ): Promise<ISendResult> {
    const sender = this.getSender()
    const result = await sender.sendMedia(target, media, options)

    if (isErr(result)) {
      throw new Error(result.error.message)
    }

    return result.value
  }

  async editMessage(
    chatId: number,
    messageId: number,
    message: TelegramMessage,
    keyboard?: IInlineKeyboardMarkup
  ): Promise<boolean> {
    const telegram = this.getTelegram()

    try {
      const extra: Record<string, unknown> = {
        parse_mode: message.parse_mode || 'html'
      }

      if (keyboard) {
        extra.reply_markup = keyboard
      }

      await (telegram as any).editMessageText(
        chatId,
        messageId,
        undefined,
        message.text || '',
        extra
      )

      return true
    } catch (error) {
      this.log.info('Failed to edit message', {
        error: error instanceof Error ? error.message : String(error),
        chatId,
        messageId
      })
      return false
    }
  }

  async editKeyboard(
    chatId: number,
    messageId: number,
    keyboard?: IInlineKeyboardMarkup
  ): Promise<boolean> {
    const telegram = this.getTelegram()

    try {
      await (telegram as any).editMessageReplyMarkup(chatId, messageId, undefined, keyboard)
      return true
    } catch (error) {
      this.log.info('Failed to edit keyboard', {
        error: error instanceof Error ? error.message : String(error),
        chatId,
        messageId
      })
      return false
    }
  }

  async deleteMessage(chatId: number, messageId: number): Promise<boolean> {
    const telegram = this.getTelegram()

    try {
      await (telegram as any).deleteMessage(chatId, messageId)
      return true
    } catch (error) {
      this.log.info('Failed to delete message', {
        error: error instanceof Error ? error.message : String(error),
        chatId,
        messageId
      })
      return false
    }
  }

  async askUserQuestion(
    target: IChatTarget,
    question: string,
    buttons: IButtonConfig[],
    timeoutSeconds: number = 60
  ): Promise<IUserResponse> {
    const callbackId = `ask_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const keyboardRows: IKeyboardButton[][] = []
    let currentRow: IKeyboardButton[] = []

    for (const button of buttons) {
      currentRow.push({
        text: button.text,
        type: 'callback',
        data: `${callbackId}:${button.value}`
      })

      if (currentRow.length >= 2) {
        keyboardRows.push(currentRow)
        currentRow = []
      }
    }

    if (currentRow.length > 0) {
      keyboardRows.push(currentRow)
    }

    const message = TelegramMessageBuilder.text()
      .title(question)
      .build()

    const keyboard = this.buildKeyboard(keyboardRows)
    const sendResult = await this.sendMessage(target, message, { keyboard })

    this.log.info(`askUserQuestion: Creating pending callback`, {
      callbackId,
      chatId: sendResult.chatId,
      messageId: sendResult.messageId,
      timeoutSeconds,
      buttonsCount: buttons.length
    })

    return new Promise<IUserResponse>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.log.info(`askUserQuestion: Timeout reached`, {
          callbackId,
          timeoutSeconds,
          pendingCount: this.pendingCallbacks.size
        })
        this.pendingCallbacks.delete(callbackId)
        this.deleteMessage(sendResult.chatId, sendResult.messageId).catch(() => {})
        reject(new Error(`Question timed out after ${timeoutSeconds} seconds`))
      }, timeoutSeconds * 1000)

      this.pendingCallbacks.set(callbackId, {
        callbackId,
        chatId: sendResult.chatId,
        resolve,
        reject,
        timeoutId,
        createdAt: Date.now()
      })

      this.log.info(`askUserQuestion: Callback registered`, {
        callbackId,
        pendingCount: this.pendingCallbacks.size,
        allIds: [...this.pendingCallbacks.keys()]
      })
    })
  }

  processPendingCallback(callbackData: string): boolean {
    const parts = callbackData.split(':')
    if (parts.length < 2) {
      this.log.info(`processPendingCallback: Invalid callback data format`, { callbackData })
      return false
    }

    const callbackId = parts[0]
    const value = parts.slice(1).join(':')

    this.log.info(`processPendingCallback: Processing`, {
      callbackData,
      callbackId,
      value,
      pendingCount: this.pendingCallbacks.size,
      allIds: [...this.pendingCallbacks.keys()]
    })

    const pending = this.pendingCallbacks.get(callbackId)
    if (!pending) {
      this.log.info(`processPendingCallback: Callback not found in pending map`, {
        callbackId,
        pendingCount: this.pendingCallbacks.size,
        allIds: [...this.pendingCallbacks.keys()]
      })
      return false
    }

    clearTimeout(pending.timeoutId)
    this.pendingCallbacks.delete(callbackId)

    this.log.info(`processPendingCallback: Resolving callback`, {
      callbackId,
      value,
      remainingPending: this.pendingCallbacks.size
    })

    pending.resolve({
      buttonText: '',
      callbackData,
      value
    })

    return true
  }

  hasPendingCallback(callbackData: string): boolean {
    const parts = callbackData.split(':')
    if (parts.length < 2) return false
    const callbackId = parts[0]
    const exists = this.pendingCallbacks.has(callbackId)
    this.log.info(`hasPendingCallback check`, {
      callbackData,
      callbackId,
      exists,
      pendingCount: this.pendingCallbacks.size,
      pendingIds: [...this.pendingCallbacks.keys()]
    })
    return exists
  }

  getPendingCallbacksCount(): number {
    return this.pendingCallbacks.size
  }

  getPendingCallbackIds(): string[] {
    return [...this.pendingCallbacks.keys()]
  }

  private parseTarget(target: IChatTarget): { chatId: number; threadId?: number } {
    if (typeof target === 'number') {
      return { chatId: target }
    }

    if (typeof target === 'string') {
      const parts = target.split('/')
      if (parts.length === 2) {
        return {
          chatId: parseInt(parts[0], 10),
          threadId: parseInt(parts[1], 10)
        }
      }
      return { chatId: parseInt(target, 10) }
    }

    return target
  }

  async startProgress(
    operationId: string,
    target: IChatTarget,
    status: string,
    totalSteps: number = 10,
    config?: Partial<IProgressConfig>
  ): Promise<number> {
    const telegram = this.getTelegram()
    const { chatId, threadId } = this.parseTarget(target)

    const defaultConfig: IProgressConfig = {
      strategy: 'inline',
      updateInterval: 2000,
      showPercentage: true,
      showElapsedTime: true,
      showETA: true,
      ...config
    }

    const manager = new ProgressManager(telegram, chatId, threadId, defaultConfig)
    await manager.start(status, totalSteps)

    const state = manager.getState()

    this.progressOperations.set(operationId, {
      operationId,
      chatId,
      threadId,
      manager,
      startedAt: Date.now()
    })

    return state.currentStep
  }

  async updateProgress(
    operationId: string,
    currentStep: number,
    status?: string
  ): Promise<void> {
    const operation = this.progressOperations.get(operationId)
    if (!operation) {
      throw new Error(`Progress operation not found: ${operationId}`)
    }

    await operation.manager.setTo(currentStep)
    if (status) {
      await operation.manager.setStatus(status)
    }
  }

  async completeProgress(operationId: string, status: string): Promise<void> {
    const operation = this.progressOperations.get(operationId)
    if (!operation) {
      throw new Error(`Progress operation not found: ${operationId}`)
    }

    await operation.manager.complete(status)
    this.progressOperations.delete(operationId)
  }

  async failProgress(operationId: string, error: string): Promise<void> {
    const operation = this.progressOperations.get(operationId)
    if (!operation) {
      throw new Error(`Progress operation not found: ${operationId}`)
    }

    await operation.manager.fail(error)
    this.progressOperations.delete(operationId)
  }

  formatToolResult(
    toolName: string,
    success: boolean,
    result?: Record<string, unknown>,
    error?: string
  ): TelegramMessage {
    const builder = TelegramMessageBuilder.text()

    if (success) {
      builder.title(`✅ ${toolName}`)
    } else {
      builder.title(`❌ ${toolName}`)
    }

    builder.newline()

    if (success && result) {
      builder.section('Result')
      for (const [key, value] of Object.entries(result)) {
        if (value !== null && value !== undefined) {
          const displayValue = typeof value === 'object'
            ? JSON.stringify(value)
            : String(value)
          builder.line(key, displayValue.slice(0, 100))
        }
      }
    }

    if (!success && error) {
      builder.section('Error')
      builder.text(error)
    }

    return builder.build()
  }

  buildMedia(
    type: 'photo' | 'video' | 'document' | 'audio' | 'voice',
    source: string,
    options?: {
      caption?: string
      parseMode?: 'html' | 'markdown' | 'markdownv2'
      duration?: number
      width?: number
      height?: number
      performer?: string
      title?: string
      thumbnail?: string
      fileName?: string
    }
  ): IMediaBuildResult {
    let builder

    switch (type) {
      case 'photo':
        builder = TelegramMediaBuilder.photo(source)
        break
      case 'video':
        builder = TelegramMediaBuilder.video(source)
        if (options?.duration) builder.duration(options.duration)
        if (options?.width) builder.width(options.width)
        if (options?.height) builder.height(options.height)
        break
      case 'document':
        builder = TelegramMediaBuilder.document(source)
        if (options?.fileName) builder.fileName(options.fileName)
        break
      case 'audio':
        builder = TelegramMediaBuilder.audio(source)
        if (options?.duration) builder.duration(options.duration)
        if (options?.performer) builder.performer(options.performer)
        if (options?.title) builder.title(options.title)
        break
      case 'voice':
        builder = TelegramMediaBuilder.voice(source)
        if (options?.duration) builder.duration(options.duration)
        break
    }

    if (options?.caption) {
      builder.caption(options.caption)
    }

    if (options?.parseMode) {
      builder.setParseMode(options.parseMode)
    }

    if (options?.thumbnail && 'thumbnail' in builder) {
      ;(builder as any).thumbnail(options.thumbnail)
    }

    return builder.build()
  }
}

export const telegramMessengerService = new TelegramMessengerService()

export {
  TelegramMessengerService,
  TelegramMessageBuilder,
  TelegramKeyboardBuilder,
  TelegramMediaBuilder
}
