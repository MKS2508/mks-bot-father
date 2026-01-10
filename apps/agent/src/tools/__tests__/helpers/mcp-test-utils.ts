/**
 * MCP Test Utilities.
 *
 * Provides shared mocking and testing utilities for MCP tools.
 */

import { vi } from 'vitest'
import { ok, err, type Result } from '@mks2508/no-throw'

export interface MockTool {
  name: string
  description: string
  schema: Record<string, unknown>
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text: string }>
    isError?: boolean
  }>
}

export interface CapturedTools {
  tools: MockTool[]
}

let capturedTools: MockTool[] = []

export function getCapturedTools(): MockTool[] {
  return capturedTools
}

export function resetCapturedTools(): void {
  capturedTools = []
}

export function getTool(name: string): MockTool | undefined {
  return capturedTools.find(t => t.name === name)
}

export function createMockMcpServer() {
  return {
    createSdkMcpServer: vi.fn((config: { name: string; version: string; tools: MockTool[] }) => {
      capturedTools = config.tools
      return {
        start: vi.fn(),
        stop: vi.fn()
      }
    }),
    tool: vi.fn((
      name: string,
      description: string,
      schema: Record<string, unknown>,
      handler: MockTool['handler']
    ): MockTool => ({
      name,
      description,
      schema,
      handler
    }))
  }
}

export function createMockResult<T>(success: true, data: T): Result<T, never>
export function createMockResult<E>(success: false, error: E): Result<never, E>
export function createMockResult<T, E>(success: boolean, dataOrError: T | E): Result<T, E> {
  if (success) {
    return ok(dataOrError as T) as Result<T, E>
  }
  return err(dataOrError as E) as Result<T, E>
}

export function createMockServiceInit() {
  return vi.fn().mockResolvedValue(createMockResult(true, undefined))
}

export function createMockServiceMethod<T>(returnValue: T) {
  return vi.fn().mockResolvedValue(createMockResult(true, returnValue))
}

export function createMockServiceError(code: string, message: string) {
  return vi.fn().mockResolvedValue(createMockResult(false, { code, message }))
}

export function parseToolResult(result: { content: Array<{ type: string; text: string }> }): unknown {
  const text = result.content[0]?.text
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function createMockExecAsync(stdout: string, stderr = '') {
  return vi.fn().mockResolvedValue({ stdout, stderr })
}

export function createMockExecAsyncError(message: string, stdout = '', stderr = '', code?: number) {
  const error = new Error(message) as Error & { stdout?: string; stderr?: string; code?: number }
  error.stdout = stdout
  error.stderr = stderr
  if (code !== undefined) {
    error.code = code
  }
  return vi.fn().mockRejectedValue(error)
}

export function createMockReaddir(files: string[]) {
  return vi.fn().mockResolvedValue(files)
}

export const mockFs = {
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue('{}')
}

export function resetMockFs(): void {
  mockFs.existsSync.mockClear()
  mockFs.mkdirSync.mockClear()
  mockFs.appendFileSync.mockClear()
  mockFs.readFileSync.mockClear()
}
