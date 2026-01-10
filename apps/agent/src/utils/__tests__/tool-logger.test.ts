/**
 * Tests for Tool Logger.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn()
}))

vi.mock('node:os', () => ({
  homedir: () => '/mock-home'
}))

vi.mock('node:path', () => ({
  join: (...parts: string[]) => parts.join('/'),
  resolve: (...parts: string[]) => parts.join('/')
}))

import { createToolLogger, logAgentEvent } from '../tool-logger.js'
import * as fs from 'node:fs'

const mockFs = vi.mocked(fs)

describe('tool-logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFs.existsSync.mockReturnValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createToolLogger', () => {
    it('returns an IToolLogger interface', () => {
      const logger = createToolLogger('test-tool')

      expect(logger).toHaveProperty('start')
      expect(logger).toHaveProperty('success')
      expect(logger).toHaveProperty('error')
      expect(logger).toHaveProperty('info')
      expect(typeof logger.start).toBe('function')
      expect(typeof logger.success).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.info).toBe('function')
    })

    it('start() returns a timestamp number', () => {
      const logger = createToolLogger('test-tool')
      const now = Date.now()

      const startTime = logger.start({ arg1: 'value1' })

      expect(typeof startTime).toBe('number')
      expect(startTime).toBeGreaterThanOrEqual(now)
      expect(startTime).toBeLessThanOrEqual(Date.now())
    })

    it('start() logs structured JSONL entry', () => {
      const logger = createToolLogger('my-tool')

      logger.start({ testArg: 'testValue' })

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1)
      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.level).toBe('INF')
      expect(parsed.src).toBe('TOOL')
      expect(parsed.tool).toBe('my-tool')
      expect(parsed.msg).toBe('started')
      expect(parsed.data).toEqual({ testArg: 'testValue' })
      expect(parsed.ts).toBeDefined()
    })

    it('success() logs with duration_ms metric', async () => {
      const logger = createToolLogger('my-tool')
      const startTime = Date.now() - 100

      logger.success(startTime, { result: 'ok' })

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1)
      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.level).toBe('INF')
      expect(parsed.msg).toBe('success')
      expect(parsed.data).toEqual({ result: 'ok' })
      expect(parsed.metrics).toBeDefined()
      expect(parsed.metrics.duration_ms).toBeGreaterThanOrEqual(100)
    })

    it('success() works without optional data', () => {
      const logger = createToolLogger('my-tool')
      const startTime = Date.now()

      logger.success(startTime)

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1)
      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.msg).toBe('success')
      expect(parsed.metrics.duration_ms).toBeDefined()
    })

    it('error() logs with ERR level and duration', () => {
      const logger = createToolLogger('my-tool')
      const startTime = Date.now() - 50

      logger.error(startTime, new Error('Test error'), { context: 'test' })

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1)
      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.level).toBe('ERR')
      expect(parsed.msg).toBe('failed')
      expect(parsed.data.error).toBe('Test error')
      expect(parsed.data.context).toBe('test')
      expect(parsed.metrics.duration_ms).toBeGreaterThanOrEqual(50)
    })

    it('error() handles string errors', () => {
      const logger = createToolLogger('my-tool')
      const startTime = Date.now()

      logger.error(startTime, 'String error message')

      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.data.error).toBe('String error message')
    })

    it('info() logs informational message', () => {
      const logger = createToolLogger('my-tool')

      logger.info('Processing item', { itemId: 123 })

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1)
      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.level).toBe('INF')
      expect(parsed.msg).toBe('Processing item')
      expect(parsed.data).toEqual({ itemId: 123 })
    })

    it('info() works without data parameter', () => {
      const logger = createToolLogger('my-tool')

      logger.info('Simple message')

      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.msg).toBe('Simple message')
    })
  })

  describe('log file management', () => {
    it('creates log directory if missing', () => {
      mockFs.existsSync.mockReturnValue(false)
      const logger = createToolLogger('test-tool')

      logger.start({})

      expect(mockFs.mkdirSync).toHaveBeenCalledTimes(1)
      const dirPath = mockFs.mkdirSync.mock.calls[0]![0] as string
      expect(dirPath).toContain('.config/mks-bot-father/logs')
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      )
    })

    it('does not create directory if exists', () => {
      mockFs.existsSync.mockReturnValue(true)
      const logger = createToolLogger('test-tool')

      logger.start({})

      expect(mockFs.mkdirSync).not.toHaveBeenCalled()
    })

    it('logs to correct file path with date', () => {
      const logger = createToolLogger('test-tool')
      const today = new Date().toISOString().split('T')[0]

      logger.start({})

      const logPath = mockFs.appendFileSync.mock.calls[0]![0] as string
      expect(logPath).toContain('.config/mks-bot-father/logs')
      expect(logPath).toContain(`agent-${today}.jsonl`)
    })

    it('silently fails if logging throws', () => {
      mockFs.appendFileSync.mockImplementation(() => {
        throw new Error('Write failed')
      })
      const logger = createToolLogger('test-tool')

      expect(() => logger.start({})).not.toThrow()
      expect(() => logger.success(Date.now())).not.toThrow()
      expect(() => logger.error(Date.now(), 'err')).not.toThrow()
      expect(() => logger.info('msg')).not.toThrow()
    })
  })

  describe('logAgentEvent', () => {
    it('logs agent events with AGENT source', () => {
      logAgentEvent('INF', 'Agent started', { version: '1.0' })

      expect(mockFs.appendFileSync).toHaveBeenCalledTimes(1)
      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.src).toBe('AGENT')
      expect(parsed.tool).toBe('')
      expect(parsed.msg).toBe('Agent started')
      expect(parsed.data).toEqual({ version: '1.0' })
    })

    it('logs different levels correctly', () => {
      logAgentEvent('ERR', 'Error occurred')

      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.level).toBe('ERR')
    })

    it('includes metrics when provided', () => {
      logAgentEvent('INF', 'Task completed', { task: 'build' }, { duration_ms: 500 })

      const logContent = mockFs.appendFileSync.mock.calls[0]![1] as string
      const parsed = JSON.parse(logContent.replace('\n', ''))

      expect(parsed.metrics).toEqual({ duration_ms: 500 })
    })
  })
})
