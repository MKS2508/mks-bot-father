/**
 * Memory Store for the Bot Manager Agent.
 *
 * File-based JSON persistence for conversation history and sessions.
 */

import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import type { Message } from '../types.js'

const MEMORIES_DIR = join(process.cwd(), 'memories')
const USERS_DIR = join(MEMORIES_DIR, 'users')
const SESSIONS_DIR = join(MEMORIES_DIR, 'sessions')
const MAX_MESSAGES_PER_USER = 100

export const memoryStore = {
  async load(userId: string): Promise<Message[]> {
    try {
      const filePath = join(USERS_DIR, `${userId}.json`)
      const content = await readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return []
    }
  },

  async save(userId: string, messages: Message[]): Promise<void> {
    await mkdir(USERS_DIR, { recursive: true })

    const trimmed = messages.slice(-MAX_MESSAGES_PER_USER)

    const filePath = join(USERS_DIR, `${userId}.json`)
    await writeFile(filePath, JSON.stringify(trimmed, null, 2))
  },

  async append(userId: string, message: Message): Promise<void> {
    const messages = await this.load(userId)
    messages.push(message)
    await this.save(userId, messages)
  },

  async clear(userId: string): Promise<void> {
    const filePath = join(USERS_DIR, `${userId}.json`)
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
  },

  async getRecentContext(userId: string, count: number = 10): Promise<string> {
    const messages = await this.load(userId)
    const recent = messages.slice(-count)

    return recent.map(m => {
      const role = m.role === 'user' ? 'Human' : 'Assistant'
      return `${role}: ${m.content}`
    }).join('\n\n')
  },

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
  },

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
  },

  async listUsers(): Promise<string[]> {
    try {
      const files = await readdir(USERS_DIR)
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
    } catch {
      return []
    }
  },

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
  },

  async saveUserSession(userId: string, sessionId: string): Promise<void> {
    await mkdir(USERS_DIR, { recursive: true })
    const filePath = join(USERS_DIR, `${userId}_session.json`)
    await writeFile(
      filePath,
      JSON.stringify({ sessionId, savedAt: new Date().toISOString() })
    )
  },

  async getUserLastSessionId(userId: string): Promise<string | null> {
    try {
      const filePath = join(USERS_DIR, `${userId}_session.json`)
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content) as { sessionId?: string }
      return data.sessionId || null
    } catch {
      return null
    }
  },

  async clearUserSession(userId: string): Promise<void> {
    const filePath = join(USERS_DIR, `${userId}_session.json`)
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
  }
}
