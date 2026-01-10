/**
 * Theme Manager
 *
 * Central theme configuration and color management
 */

import type { ThemeColors, ThemePreset } from '../types/index.js'
import { getThemeColors } from '../config/default.js'

export class ThemeManager {
  private currentPreset: ThemePreset
  private colors: ThemeColors

  constructor(preset: ThemePreset = 'synthwave84') {
    this.currentPreset = preset
    this.colors = getThemeColors(preset)
  }

  /**
   * Get current theme colors
   */
  getTheme(): ThemeColors {
    return this.colors
  }

  /**
   * Get current preset name
   */
  getPreset(): ThemePreset {
    return this.currentPreset
  }

  /**
   * Set theme preset
   */
  setTheme(preset: ThemePreset): void {
    this.currentPreset = preset
    this.colors = getThemeColors(preset)
  }

  /**
   * Get level badge color
   */
  getLevelBadgeColor(level: string): { bg: string; fg: string } {
    return this.colors.levelBadges[level as keyof ThemeColors['levelBadges']] || this.colors.levelBadges.INF
  }

  /**
   * Get source badge color
   */
  getSourceBadgeColor(source: string): { bg: string; fg: string } {
    return this.colors.sourceBadges[source as keyof ThemeColors['sourceBadges']] || { bg: '#444', fg: '#ccc' }
  }
}

let globalThemeManager: ThemeManager | null = null

export function getThemeManager(preset?: ThemePreset): ThemeManager {
  if (!globalThemeManager) {
    globalThemeManager = new ThemeManager(preset)
  }
  return globalThemeManager
}

export function setThemePreset(preset: ThemePreset): void {
  if (globalThemeManager) {
    globalThemeManager.setTheme(preset)
  }
}
