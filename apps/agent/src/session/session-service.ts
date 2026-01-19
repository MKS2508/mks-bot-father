/**
 * Session Service for the Bot Manager Agent.
 *
 * Provides full session lifecycle management compatible with Claude Code format.
 * Sessions are stored in ~/.claude/projects/ for interoperability.
 */

import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'
import type {
  SessionMetadata,
  SessionData,
  SessionListOptions,
  Message
} from '../types.js'

const CLAUDE_DIR = join(homedir(), '.claude')
const SESSIONS_DIR = join(CLAUDE_DIR, 'projects')
const SESSION_INDEX_FILE = join(CLAUDE_DIR, 'session-index.json')

interface ISessionIndex {
  sessions: Record<string, SessionMetadata>
  userSessions: Record<string, string[]>
  lastUpdated: string
}

class SessionServiceClass {
  private index: ISessionIndex | null = null
  private indexLoaded = false

  private async ensureDirectories(): Promise<void> {
    await mkdir(SESSIONS_DIR, { recursive: true })
  }

  private async loadIndex(): Promise<ISessionIndex> {
    if (this.index && this.indexLoaded) {
      return this.index
    }

    try {
      const content = await readFile(SESSION_INDEX_FILE, 'utf-8')
      this.index = JSON.parse(content) as ISessionIndex
    } catch {
      this.index = {
        sessions: {},
        userSessions: {},
        lastUpdated: new Date().toISOString()
      }
    }

    this.indexLoaded = true
    return this.index
  }

  private async saveIndex(): Promise<void> {
    if (!this.index) return

    this.index.lastUpdated = new Date().toISOString()
    await mkdir(CLAUDE_DIR, { recursive: true })
    await writeFile(SESSION_INDEX_FILE, JSON.stringify(this.index, null, 2))
  }

  private getSessionFilePath(sessionId: string): string {
    return join(SESSIONS_DIR, `${sessionId}.json`)
  }

  private getCurrentGitBranch(): string | undefined {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim()
    } catch {
      return undefined
    }
  }

  async create(options: {
    userId?: string
    name?: string
    projectPath?: string
    model?: string
    parentSessionId?: string
  } = {}): Promise<SessionMetadata> {
    await this.ensureDirectories()
    const index = await this.loadIndex()

    const sessionId = this.generateSessionId()
    const now = new Date().toISOString()

    const metadata: SessionMetadata = {
      sessionId,
      name: options.name,
      createdAt: now,
      lastMessageAt: now,
      messageCount: 0,
      userId: options.userId,
      gitBranch: this.getCurrentGitBranch(),
      projectPath: options.projectPath || process.cwd(),
      model: options.model,
      isForked: !!options.parentSessionId,
      parentSessionId: options.parentSessionId,
      totalCostUsd: 0,
      inputTokens: 0,
      outputTokens: 0
    }

    const sessionData: SessionData = {
      metadata,
      messages: []
    }

    await writeFile(
      this.getSessionFilePath(sessionId),
      JSON.stringify(sessionData, null, 2)
    )

    index.sessions[sessionId] = metadata
    if (options.userId) {
      if (!index.userSessions[options.userId]) {
        index.userSessions[options.userId] = []
      }
      index.userSessions[options.userId].push(sessionId)
    }
    await this.saveIndex()

    return metadata
  }

  async get(sessionId: string): Promise<SessionData | null> {
    try {
      const filePath = this.getSessionFilePath(sessionId)
      const content = await readFile(filePath, 'utf-8')
      return JSON.parse(content) as SessionData
    } catch {
      return null
    }
  }

  async getMetadata(sessionId: string): Promise<SessionMetadata | null> {
    const index = await this.loadIndex()
    return index.sessions[sessionId] || null
  }

  async list(options: SessionListOptions = {}): Promise<SessionMetadata[]> {
    const index = await this.loadIndex()
    let sessions: SessionMetadata[]

    if (options.userId) {
      const userSessionIds = index.userSessions[options.userId] || []
      sessions = userSessionIds
        .map(id => index.sessions[id])
        .filter((s): s is SessionMetadata => !!s)
    } else {
      sessions = Object.values(index.sessions)
    }

    const sortBy = options.sortBy || 'lastMessageAt'
    const sortOrder = options.sortOrder || 'desc'

    sessions.sort((a, b) => {
      const aVal = new Date(a[sortBy]).getTime()
      const bVal = new Date(b[sortBy]).getTime()
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
    })

    const offset = options.offset || 0
    const limit = options.limit || 50

    return sessions.slice(offset, offset + limit)
  }

  async update(
    sessionId: string,
    updates: Partial<Pick<SessionMetadata, 'name' | 'lastMessageAt' | 'messageCount' | 'totalCostUsd' | 'inputTokens' | 'outputTokens'>>
  ): Promise<SessionMetadata | null> {
    const session = await this.get(sessionId)
    if (!session) return null

    const updatedMetadata: SessionMetadata = {
      ...session.metadata,
      ...updates,
      lastMessageAt: updates.lastMessageAt || new Date().toISOString()
    }

    session.metadata = updatedMetadata

    await writeFile(
      this.getSessionFilePath(sessionId),
      JSON.stringify(session, null, 2)
    )

    const index = await this.loadIndex()
    index.sessions[sessionId] = updatedMetadata
    await this.saveIndex()

    return updatedMetadata
  }

  async appendMessage(sessionId: string, message: Message): Promise<void> {
    const session = await this.get(sessionId)
    if (!session) return

    session.messages.push(message)
    session.metadata.messageCount = session.messages.length
    session.metadata.lastMessageAt = new Date().toISOString()

    await writeFile(
      this.getSessionFilePath(sessionId),
      JSON.stringify(session, null, 2)
    )

    const index = await this.loadIndex()
    index.sessions[sessionId] = session.metadata
    await this.saveIndex()
  }

  async fork(sessionId: string, options: {
    userId?: string
    name?: string
  } = {}): Promise<SessionMetadata | null> {
    const sourceSession = await this.get(sessionId)
    if (!sourceSession) return null

    const forkedMetadata = await this.create({
      userId: options.userId || sourceSession.metadata.userId,
      name: options.name || `Fork of ${sourceSession.metadata.name || sessionId}`,
      projectPath: sourceSession.metadata.projectPath,
      model: sourceSession.metadata.model,
      parentSessionId: sessionId
    })

    const forkedSession = await this.get(forkedMetadata.sessionId)
    if (forkedSession) {
      forkedSession.messages = [...sourceSession.messages]
      forkedSession.summary = sourceSession.summary
      forkedSession.metadata.messageCount = sourceSession.messages.length

      await writeFile(
        this.getSessionFilePath(forkedMetadata.sessionId),
        JSON.stringify(forkedSession, null, 2)
      )
    }

    return forkedMetadata
  }

  async clear(sessionId: string): Promise<boolean> {
    const session = await this.get(sessionId)
    if (!session) return false

    session.messages = []
    session.summary = undefined
    session.metadata.messageCount = 0
    session.metadata.lastMessageAt = new Date().toISOString()

    await writeFile(
      this.getSessionFilePath(sessionId),
      JSON.stringify(session, null, 2)
    )

    const index = await this.loadIndex()
    index.sessions[sessionId] = session.metadata
    await this.saveIndex()

    return true
  }

  async delete(sessionId: string): Promise<boolean> {
    const index = await this.loadIndex()
    const metadata = index.sessions[sessionId]

    if (!metadata) return false

    try {
      await unlink(this.getSessionFilePath(sessionId))
    } catch {
      // File may not exist
    }

    delete index.sessions[sessionId]

    if (metadata.userId && index.userSessions[metadata.userId]) {
      index.userSessions[metadata.userId] = index.userSessions[metadata.userId]
        .filter(id => id !== sessionId)
    }

    await this.saveIndex()
    return true
  }

  async rename(sessionId: string, name: string): Promise<SessionMetadata | null> {
    return this.update(sessionId, { name })
  }

  async setSummary(sessionId: string, summary: string): Promise<boolean> {
    const session = await this.get(sessionId)
    if (!session) return false

    session.summary = summary

    await writeFile(
      this.getSessionFilePath(sessionId),
      JSON.stringify(session, null, 2)
    )

    return true
  }

  async getUserLastSession(userId: string): Promise<SessionMetadata | null> {
    const sessions = await this.list({ userId, limit: 1, sortBy: 'lastMessageAt' })
    return sessions[0] || null
  }

  async getSessionCount(userId?: string): Promise<number> {
    const index = await this.loadIndex()

    if (userId) {
      return (index.userSessions[userId] || []).length
    }

    return Object.keys(index.sessions).length
  }

  async getSessionsByGitBranch(branch: string): Promise<SessionMetadata[]> {
    const index = await this.loadIndex()
    return Object.values(index.sessions).filter(s => s.gitBranch === branch)
  }

  async getForkedSessions(parentSessionId: string): Promise<SessionMetadata[]> {
    const index = await this.loadIndex()
    return Object.values(index.sessions).filter(s => s.parentSessionId === parentSessionId)
  }

  async rebuildIndex(): Promise<void> {
    await this.ensureDirectories()

    const newIndex: ISessionIndex = {
      sessions: {},
      userSessions: {},
      lastUpdated: new Date().toISOString()
    }

    try {
      const files = await readdir(SESSIONS_DIR)
      const jsonFiles = files.filter(f => f.endsWith('.json'))

      for (const file of jsonFiles) {
        try {
          const filePath = join(SESSIONS_DIR, file)
          const content = await readFile(filePath, 'utf-8')
          const session = JSON.parse(content) as SessionData

          if (session.metadata?.sessionId) {
            newIndex.sessions[session.metadata.sessionId] = session.metadata

            if (session.metadata.userId) {
              if (!newIndex.userSessions[session.metadata.userId]) {
                newIndex.userSessions[session.metadata.userId] = []
              }
              newIndex.userSessions[session.metadata.userId].push(session.metadata.sessionId)
            }
          }
        } catch {
          // Skip invalid files
        }
      }
    } catch {
      // Directory may not exist
    }

    this.index = newIndex
    await this.saveIndex()
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `session-${timestamp}-${random}`
  }

  invalidateCache(): void {
    this.index = null
    this.indexLoaded = false
  }
}

export const sessionService = new SessionServiceClass()
