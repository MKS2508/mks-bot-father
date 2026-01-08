import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { isOk, isErr } from '@mks2508/no-throw'

describe('ConfigService', () => {
  const TEST_CONFIG_DIR = join(tmpdir(), `mks-bot-father-test-${process.pid}`)
  const TEST_CONFIG_FILE = join(TEST_CONFIG_DIR, 'config.json')

  let originalHomedir: typeof import('node:os').homedir
  let ConfigService: typeof import('../config.service.js').ConfigService
  let getConfigService: typeof import('../config.service.js').getConfigService

  beforeEach(async () => {
    vi.resetModules()

    if (!existsSync(TEST_CONFIG_DIR)) {
      mkdirSync(TEST_CONFIG_DIR, { recursive: true })
    }

    vi.doMock('node:os', async () => {
      const actual = await vi.importActual<typeof import('node:os')>('node:os')
      return {
        ...actual,
        homedir: () => TEST_CONFIG_DIR,
      }
    })

    const module = await import('../config.service.js')
    ConfigService = module.ConfigService
    getConfigService = module.getConfigService
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
    }
  })

  describe('Constructor and load()', () => {
    it('should create config directory if it does not exist', async () => {
      const service = new ConfigService()
      const configDir = join(TEST_CONFIG_DIR, '.config', 'mks-bot-father')
      expect(existsSync(configDir)).toBe(true)
    })

    it('should load valid config from file', async () => {
      const configDir = join(TEST_CONFIG_DIR, '.config', 'mks-bot-father')
      const configFile = join(configDir, 'config.json')

      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true })
      }

      const testConfig = {
        github: { token: 'ghp_test123', defaultOrg: 'test-org' },
        coolify: { url: 'https://coolify.test', token: 'coolify_token' },
      }

      writeFileSync(configFile, JSON.stringify(testConfig))

      vi.resetModules()
      vi.doMock('node:os', async () => {
        const actual = await vi.importActual<typeof import('node:os')>('node:os')
        return {
          ...actual,
          homedir: () => TEST_CONFIG_DIR,
        }
      })

      const freshModule = await import('../config.service.js')
      const service = new freshModule.ConfigService()

      const config = service.get()
      expect(config.github?.token).toBe('ghp_test123')
      expect(config.github?.defaultOrg).toBe('test-org')
      expect(config.coolify?.url).toBe('https://coolify.test')
    })

    it('should return defaults if config file does not exist', async () => {
      const service = new ConfigService()
      const config = service.get()
      expect(config).toEqual({})
    })

    it('should return defaults if config file is invalid JSON', async () => {
      const configDir = join(TEST_CONFIG_DIR, '.config', 'mks-bot-father')
      const configFile = join(configDir, 'config.json')

      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true })
      }
      writeFileSync(configFile, 'invalid json {{{')

      vi.resetModules()
      const freshModule = await import('../config.service.js')
      const service = new freshModule.ConfigService()

      const config = service.get()
      expect(config).toEqual({})
    })
  })

  describe('save()', () => {
    it('should save config to file correctly', async () => {
      const service = new ConfigService()
      service.set('github.token', 'ghp_newtoken')

      const configFile = join(TEST_CONFIG_DIR, '.config', 'mks-bot-father', 'config.json')
      const savedContent = readFileSync(configFile, 'utf-8')
      const parsed = JSON.parse(savedContent)

      expect(parsed.github.token).toBe('ghp_newtoken')
    })
  })

  describe('set()', () => {
    it('should set value by dot notation key', async () => {
      const service = new ConfigService()
      const result = service.set('github.token', 'ghp_test')

      expect(isOk(result)).toBe(true)
      expect(service.get().github?.token).toBe('ghp_test')
    })

    it('should create nested objects if they do not exist', async () => {
      const service = new ConfigService()
      service.set('coolify.url', 'https://coolify.example.com')
      service.set('coolify.token', 'coolify_secret')

      const config = service.get()
      expect(config.coolify?.url).toBe('https://coolify.example.com')
      expect(config.coolify?.token).toBe('coolify_secret')
    })

    it('should handle telegram config with apiId number', async () => {
      const service = new ConfigService()
      service.set('telegram.apiId', 12345678)
      service.set('telegram.apiHash', 'abc123hash')

      const config = service.get()
      expect(config.telegram?.apiId).toBe(12345678)
      expect(config.telegram?.apiHash).toBe('abc123hash')
    })

    it('should persist changes to disk', async () => {
      const service = new ConfigService()
      service.set('github.defaultVisibility', 'private')

      vi.resetModules()
      const freshModule = await import('../config.service.js')
      const newService = new freshModule.ConfigService()

      expect(newService.get().github?.defaultVisibility).toBe('private')
    })
  })

  describe('get()', () => {
    it('should return current config', async () => {
      const service = new ConfigService()
      service.set('github.token', 'test_token')

      const config = service.get()
      expect(config.github?.token).toBe('test_token')
    })

    it('should return empty object for fresh config', async () => {
      const service = new ConfigService()
      const config = service.get()

      expect(typeof config).toBe('object')
    })
  })

  describe('getGitHubToken()', () => {
    it('should return configured GitHub token', async () => {
      const service = new ConfigService()
      service.set('github.token', 'ghp_configured')

      expect(service.getGitHubToken()).toBe('ghp_configured')
    })

    it('should return undefined if not configured', async () => {
      const service = new ConfigService()
      expect(service.getGitHubToken()).toBeUndefined()
    })
  })

  describe('resolveGitHubToken()', () => {
    it('should return token from config first', async () => {
      const service = new ConfigService()
      service.set('github.token', 'ghp_from_config')

      const result = await service.resolveGitHubToken()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toBe('ghp_from_config')
      }
    })

    it('should fallback to environment variable when useGhCli is false', async () => {
      const service = new ConfigService()
      service.set('github.useGhCli', false)

      const originalToken = process.env['GITHUB_TOKEN']
      process.env['GITHUB_TOKEN'] = 'ghp_from_env'

      const result = await service.resolveGitHubToken()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toBe('ghp_from_env')
      }

      if (originalToken) {
        process.env['GITHUB_TOKEN'] = originalToken
      } else {
        delete process.env['GITHUB_TOKEN']
      }
    })

    it('should return undefined if no token available and useGhCli is false', async () => {
      const service = new ConfigService()
      service.set('github.useGhCli', false)

      const originalToken = process.env['GITHUB_TOKEN']
      delete process.env['GITHUB_TOKEN']

      const result = await service.resolveGitHubToken()

      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toBeUndefined()
      }

      if (originalToken) {
        process.env['GITHUB_TOKEN'] = originalToken
      }
    })
  })

  describe('getCoolifyUrl() / getCoolifyToken()', () => {
    it('should return coolify URL and token', async () => {
      const service = new ConfigService()
      service.set('coolify.url', 'https://coolify.example.com')
      service.set('coolify.token', 'coolify_secret_token')

      expect(service.getCoolifyUrl()).toBe('https://coolify.example.com')
      expect(service.getCoolifyToken()).toBe('coolify_secret_token')
    })

    it('should return undefined if not configured', async () => {
      const service = new ConfigService()

      expect(service.getCoolifyUrl()).toBeUndefined()
      expect(service.getCoolifyToken()).toBeUndefined()
    })
  })

  describe('getTelegramCredentials()', () => {
    it('should return telegram apiId and apiHash', async () => {
      const service = new ConfigService()
      service.set('telegram.apiId', 12345678)
      service.set('telegram.apiHash', 'abcdef123456')

      const creds = service.getTelegramCredentials()

      expect(creds.apiId).toBe(12345678)
      expect(creds.apiHash).toBe('abcdef123456')
    })

    it('should return undefined values if not configured', async () => {
      const service = new ConfigService()
      const creds = service.getTelegramCredentials()

      expect(creds.apiId).toBeUndefined()
      expect(creds.apiHash).toBeUndefined()
    })
  })

  describe('getConfigPath()', () => {
    it('should return the config file path', async () => {
      const path = ConfigService.getConfigPath()
      expect(path).toContain('config.json')
      expect(path).toContain('.config')
      expect(path).toContain('mks-bot-father')
    })
  })

  describe('getConfigService() singleton', () => {
    it('should return the same instance', async () => {
      const instance1 = getConfigService()
      const instance2 = getConfigService()

      expect(instance1).toBe(instance2)
    })
  })
})
