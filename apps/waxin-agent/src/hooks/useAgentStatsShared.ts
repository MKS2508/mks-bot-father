/**
 * Shared hook for agent statistics.
 * Single source of truth to avoid multiple intervals.
 */

import { useState, useEffect } from 'react'
import type { AgentStats } from '../types.js'

// Intervalo de actualización de stats (coordinado con LAYOUT.THINKING_WORD_INTERVAL_MS)
const STATS_UPDATE_INTERVAL_MS = 2000

/**
 * Obtiene las estadísticas actuales del agent store.
 * Esta función se mueve aquí para evitar dependencias circulares.
 */
function getStats(): AgentStats | null {
  try {
    // Import dinámico para evitar circular dependency
    const { useAgentStore } = require('../stores/agentStore.js')
    const store = useAgentStore.getState()
    return store.getStats()
  } catch {
    return null
  }
}

/**
 * Hook compartido para stats del agent.
 * Usa un solo intervalo para toda la aplicación.
 */
export function useAgentStatsShared() {
  const [stats, setStats] = useState<AgentStats | null>(null)

  useEffect(() => {
    // Actualizar stats inmediatamente
    setStats(getStats())

    // Intervalo único para actualizaciones
    const interval = setInterval(() => {
      setStats(getStats())
    }, STATS_UPDATE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  return stats
}
