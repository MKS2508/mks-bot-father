/**
 * Audio Manager - Handles sound playback and mute state persistence
 * Uses native afplay on macOS, fallback to sound-play for other platforms
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { log } from './json-logger.js'
import { platform } from 'os'

const execAsync = promisify(exec)

const ENV_PATH = resolve(process.cwd(), '.env')

export interface AudioConfig {
  enabled: boolean
  volume: number
}

const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  enabled: true,
  volume: 0.5
}

class AudioManager {
  private config: AudioConfig = { ...DEFAULT_AUDIO_CONFIG }
  private soundPlayer: any = null
  private playerReady: Promise<void>

  constructor() {
    this.loadConfig()
    this.playerReady = this.initializePlayer()
  }

  private async initializePlayer() {
    try {
      const player = await import('sound-play')
      this.soundPlayer = player
      log.info('AUDIO', 'Sound player initialized')
    } catch (error) {
      log.error('AUDIO', 'Failed to initialize sound-play', { error })
    }
  }

  private loadConfig() {
    if (existsSync(ENV_PATH)) {
      const envContent = readFileSync(ENV_PATH, 'utf-8')
      const audioEnabled = envContent.match(/^AUDIO_ENABLED=(.*)$/m)

      if (audioEnabled) {
        this.config.enabled = audioEnabled[1].toLowerCase() === 'true'
      }

      const audioVolume = envContent.match(/^AUDIO_VOLUME=(.*)$/m)
      if (audioVolume) {
        const vol = parseFloat(audioVolume[1])
        if (!isNaN(vol) && vol >= 0 && vol <= 1) {
          this.config.volume = vol
        }
      }
    }

    log.info('AUDIO', 'Config loaded', { enabled: this.config.enabled, volume: this.config.volume })
  }

  private saveConfig() {
    let envContent = ''
    if (existsSync(ENV_PATH)) {
      envContent = readFileSync(ENV_PATH, 'utf-8')
    }

    const lines = envContent.split('\n')
    const filteredLines = lines.filter(
      line => !line.startsWith('AUDIO_ENABLED=') && !line.startsWith('AUDIO_VOLUME=')
    )

    filteredLines.push(`AUDIO_ENABLED=${this.config.enabled}`)
    filteredLines.push(`AUDIO_VOLUME=${this.config.volume}`)

    writeFileSync(ENV_PATH, filteredLines.join('\n'))
  }

  async play(soundPath: string): Promise<void> {
    if (!this.config.enabled) {
      log.debug('AUDIO', 'Audio disabled, skipping playback')
      return
    }

    try {
      const fullPath = resolve(process.cwd(), soundPath)
      log.info('AUDIO', 'Playing sound', { path: fullPath, volume: this.config.volume, platform: platform() })

      const commands = this.getPlayCommands(fullPath)
      let lastError: Error | null = null

      for (const [cmd, args] of commands) {
        try {
          const cmdStr = `${cmd} ${args.join(' ')}`
          log.debug('AUDIO', `Trying command: ${cmd}`)
          await execAsync(cmdStr)
          log.info('AUDIO', 'Sound played successfully', { command: cmd })
          return
        } catch (err) {
          lastError = err as Error
          log.debug('AUDIO', `Command failed: ${cmd}`, { error: lastError.message })
          continue
        }
      }

      throw lastError || new Error('All audio commands failed')
    } catch (error) {
      log.error('AUDIO', 'Failed to play sound', { error: error instanceof Error ? error.message : String(error) })
    }
  }

  /**
   * Get platform-specific audio commands in order of preference
   * Skips first 1 second of audio to remove silence
   */
  private getPlayCommands(filePath: string): [string, string[]][] {
    const vol = this.config.volume
    const volArg = vol > 0 ? String(vol) : '0.5'
    // Skip first 1 second to remove initial silence
    const skipTime = '1.5'

    const platformCommands: Record<string, [string, string[]][]> = {
      darwin: [
        // afplay doesn't support seeking, use ffplay first
        ['ffplay', ['-ss', skipTime, '-nodisp', '-autoexit', `-volume`, `${Math.round(vol * 100)}`, `"${filePath}"`]],
        ['afplay', ['-v', volArg, `"${filePath}"`]],
        ['mpg123', ['-q', `"${filePath}"`]],
      ],
      linux: [
        ['ffplay', ['-ss', skipTime, '-nodisp', '-autoexit', `-volume`, `${Math.round(vol * 100)}`, `"${filePath}"`]],
        ['mpv', [`--start=${skipTime}`, '--no-video', `--volume=${Math.round(vol * 100)}`, `"${filePath}"`]],
        ['aplay', [`-q`, `"${filePath}"`]],
        ['paplay', [`--volume=${Math.round(vol * 100)}`, `"${filePath}"`]],
        ['mpg123', ['-q', `"${filePath}"`]],
      ],
      win32: [
        ['ffplay', ['-ss', skipTime, '-nodisp', '-autoexit', `-volume`, `${Math.round(vol * 100)}`, `"${filePath}"`]],
        ['mpv', [`--start=${skipTime}`, '--no-video', `--volume=${Math.round(vol * 100)}`, `"${filePath}"`]],
        ['powershell', [`-c`, `"(New-Object Media.SoundPlayer '${filePath}').LoadSync(); (New-Object Media.SoundPlayer '${filePath}').PlaySync()"`]],
      ],
    }

    return platformCommands[platform()] || platformCommands['linux'] || []
  }

  toggle(): boolean {
    this.config.enabled = !this.config.enabled
    this.saveConfig()
    log.info('AUDIO', `Audio ${this.config.enabled ? 'enabled' : 'disabled'}`)
    return this.config.enabled
  }

  setMuted(muted: boolean): void {
    this.config.enabled = !muted
    this.saveConfig()
  }

  isMuted(): boolean {
    return !this.config.enabled
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  setVolume(volume: number): void {
    if (volume >= 0 && volume <= 1) {
      this.config.volume = volume
      this.saveConfig()
    }
  }

  getVolume(): number {
    return this.config.volume
  }

  getConfig(): AudioConfig {
    return { ...this.config }
  }
}

let globalAudioManager: AudioManager | null = null

export function getAudioManager(): AudioManager {
  if (!globalAudioManager) {
    globalAudioManager = new AudioManager()
  }
  return globalAudioManager
}
