/**
 * Memory Store for the Bot Manager Agent.
 *
 * File-based JSON persistence with in-memory caching, deduplication,
 * and token-aware context retrieval.
 */

import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import type { Message } from '../types.js'

const MEMORIES_DIR = join(process.cwd(), 'memories')
const USERS_DIR = join(MEMORIES_DIR, 'users')
const SESSIONS_DIR = join(MEMORIES_DIR, 'sessions')

const MAX_MESSAGES_PER_USER = 200
const MAX_CONTEXT_TOKENS = 50000
const CACHE_TTL_MS = 5 * 60 * 1000
const DEDUP_WINDOW_MS = 2000

interface ICacheEntry {
  messages: Message[]
  lastFetch: number
}

class MemoryStoreClass {
  private cache = new Map<string, ICacheEntry>()

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  private isDuplicate(messages: Message[], newMsg: Message): boolean {
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg) return false

    const timeDiff = new Date(newMsg.timestamp).getTime() - new Date(lastMsg.timestamp).getTime()
    return (
      lastMsg.content === newMsg.content &&
      lastMsg.role === newMsg.role &&
      timeDiff < DEDUP_WINDOW_MS
    )
  }

  async load(userId: string): Promise<Message[]> {
    const cached = this.cache.get(userId)
    if (cached && Date.now() - cached.lastFetch < CACHE_TTL_MS) {
      return [...cached.messages]
    }

    try {
      const filePath = join(USERS_DIR, `${userId}.json`)
      const content = await readFile(filePath, 'utf-8')
      const messages = JSON.parse(content) as Message[]

      this.cache.set(userId, {
        messages: [...messages],
        lastFetch: Date.now()
      })

      return messages
    } catch {
      return []
    }
  }

  async save(userId: string, messages: Message[]): Promise<void> {
    await mkdir(USERS_DIR, { recursive: true })

    const trimmed = messages.slice(-MAX_MESSAGES_PER_USER)

    const filePath = join(USERS_DIR, `${userId}.json`)
    await writeFile(filePath, JSON.stringify(trimmed, null, 2))

    this.cache.set(userId, {
      messages: [...trimmed],
      lastFetch: Date.now()
    })
  }

  async append(userId: string, message: Message): Promise<void> {
    const messages = await this.load(userId)

    if (this.isDuplicate(messages, message)) {
      return
    }

    messages.push(message)
    await this.save(userId, messages)
  }

  async clear(userId: string): Promise<void> {
    const filePath = join(USERS_DIR, `${userId}.json`)
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
    this.cache.delete(userId)
  }

  async getRecentContext(userId: string, count: number = 50): Promise<string> {
    const messages = await this.load(userId)
    const recent: Message[] = []
    let totalTokens = 0

    for (let i = messages.length - 1; i >= 0 && recent.length < count; i--) {
      const msg = messages[i]
      const tokens = this.estimateTokens(msg.content)

      if (totalTokens + tokens > MAX_CONTEXT_TOKENS) {
        break
      }

      recent.unshift(msg)
      totalTokens += tokens
    }

    return recent.map(m => {
      const role = m.role === 'user' ? 'Human' : 'Assistant'
      return `${role}: ${m.content}`
    }).join('\n\n')
  }

  async saveSession(
    sessionId: string,
    messages: Message[],
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await mkdir(SESSIONS_DIR, { recursive: true })

    const data = {
      sessionId,
      savedAt: new Date().toISOString(),
      messageCount: messages.length,
      metadata,
      messages
    }

    const filePath = join(SESSIONS_DIR, `${sessionId}.json`)
    await writeFile(filePath, JSON.stringify(data, null, 2))
  }

  async loadSession(sessionId: string): Promise<{
    messages: Message[]
    metadata?: Record<string, unknown>
  } | null> {
    try {
      const filePath = join(SESSIONS_DIR, `${sessionId}.json`)
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)
      return {
        messages: data.messages,
        metadata: data.metadata
      }
    } catch {
      return null
    }
  }

  async listUsers(): Promise<string[]> {
    try {
      const files = await readdir(USERS_DIR)
      return files
        .filter(f => f.endsWith('.json') && !f.includes('_session'))
        .map(f => f.replace('.json', ''))
    } catch {
      return []
    }
  }

  async getUserStats(userId: string): Promise<{
    messageCount: number
    firstMessage: string | null
    lastMessage: string | null
  }> {
    const messages = await this.load(userId)

    return {
      messageCount: messages.length,
      firstMessage: messages[0]?.timestamp || null,
      lastMessage: messages[messages.length - 1]?.timestamp || null
    }
  }

  async saveUserSession(userId: string, sessionId: string): Promise<void> {
    await mkdir(USERS_DIR, { recursive: true })
    const filePath = join(USERS_DIR, `${userId}_session.json`)
    await writeFile(
      filePath,
      JSON.stringify({ sessionId, savedAt: new Date().toISOString() })
    )
  }

  async getUserLastSessionId(userId: string): Promise<string | null> {
    try {
      const filePath = join(USERS_DIR, `${userId}_session.json`)
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content) as { sessionId?: string }
      return data.sessionId || null
    } catch {
      return null
    }
  }

  async clearUserSession(userId: string): Promise<void> {
    const filePath = join(USERS_DIR, `${userId}_session.json`)
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
  }

  async clearAll(userId: string): Promise<void> {
    await this.clear(userId)
    await this.clearUserSession(userId)
    this.cache.delete(userId)
  }

  invalidateCache(userId: string): void {
    this.cache.delete(userId)
  }

  invalidateAllCaches(): void {
    this.cache.clear()
  }
}

export const memoryStore = new MemoryStoreClass()
