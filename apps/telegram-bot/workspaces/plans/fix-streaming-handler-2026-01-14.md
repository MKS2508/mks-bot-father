# Plan: Arreglar Streaming Handler

**Fecha:** 2026-01-14
**Status:** Critical - Needs Immediate Fix
**Prioridad:** High

---

## Problemas Identificados

### 1. Mensaje se borra al final ❌
**Problema:** A pesar de implementar `buildFinalSummary()`, el mensaje aún se borra y dice "Completado"
**Causa posible:** Algo está llamando a delete en lugar de edit

### 2. No se actualiza correctamente ❌
**Problema:** Solo se actualiza la primera vez que arranca un tool, luego solo aumenta el tiempo
**Causa:** El debounce (1.5s) es demasiado largo para operaciones rápidas, o hay un bug en `scheduleUpdate()`

### 3. Formato pobre ❌
**Problema:**
- No mantiene suficiente historial de tools ejecutados
- Se pierde información valiosa
- Orden confuso
- No muestra outputs importantes

---

## Análisis del Código Actual

### streaming-handler.ts - Problemas detectados

#### Problema 1: buildFinalSummary() puede ser ignorado
```typescript
async finish(): Promise<void> {
  // ...
  try {
    const finalText = this.buildFinalSummary()
    await this.telegram.editMessageText(...)
  } catch {
    // If final update fails, leave the last status message as-is
  }
}
```

**Issue:** Si el `editMessageText` falla (por timeout, rate limit, etc.), se ignora silenciosamente. Puede que el mensaje quede en un estado intermedio o se borre por otra parte.

#### Problema 2: Debounce muy largo
```typescript
const UPDATE_DEBOUNCE_MS = 1500
```

**Issue:** Para tools rápidos (<1.5s), nunca se ve el progreso - solo arranca y termina sin updates intermedios.

#### Problema 3: No se muestra output de tools
```typescript
function formatToolInput(tool: string, input: unknown): string | null {
  // Solo muestra INPUT, no OUTPUT/RESULT
}
```

**Issue:** El usuario ve "💻 bun run typecheck" pero no ve si pasó o falló, qué errores hubo, etc.

#### Problema 4: MAX_TOOL_HISTORY muy limitado
```typescript
const MAX_TOOL_HISTORY = 8
```

**Issue:** Si ejecutas 20 tools, solo ves los últimos 8. Se pierde contexto.

---

## Solución Propuesta

### 1. Garantizar que NO se borre el mensaje

**Opción A: Never delete, always edit**
- Eliminar cualquier código que haga `deleteMessage`
- Siempre usar `editMessageText`
- Si edit falla, retry 3 veces antes de rendirse

**Opción B: Pin the message**
- Después de crear el status message, hacer `pinChatMessage`
- Garantiza que el usuario siempre lo vea
- Útil si hay mucho tráfico en el chat

**Decisión:** Opción A (más simple)

---

### 2. Mejorar frecuencia de updates

**Problema actual:**
- Debounce 1.5s es OK para tools lentos (>5s)
- Pero para tools rápidos, no se ve progreso

**Solución: Adaptive debouncing**

```typescript
private getAdaptiveDebounce(): number {
  const pendingTool = this.state.toolExecutions.find(e => !e.endTime)

  if (!pendingTool) return UPDATE_DEBOUNCE_MS

  const elapsed = Date.now() - pendingTool.startTime

  // Tools rápidos: update más frecuente
  if (elapsed < 2000) return 500   // 0.5s for first 2s
  if (elapsed < 5000) return 1000  // 1s for 2-5s
  return 1500                       // 1.5s for >5s
}
```

**Beneficios:**
- Tools rápidos: updates cada 0.5s → se ve progreso
- Tools lentos: updates cada 1.5s → no spam
- Adaptativo: se ajusta automáticamente

---

### 3. Mostrar OUTPUT de tools

**Agregar campo en IToolExecution:**

```typescript
export interface IToolExecution {
  tool: string
  toolId: string
  input: unknown
  startTime: number
  endTime?: number
  duration?: number
  result?: unknown
  error?: string
  // NUEVO:
  resultSummary?: string  // Human-readable result
}
```

**Crear función formatToolResult():**

```typescript
function formatToolResult(tool: string, result: unknown, isError: boolean): string | null {
  if (isError) {
    const errorMsg = typeof result === 'string' ? result : JSON.stringify(result)
    return `❌ Error: ${errorMsg.slice(0, 100)}`
  }

  const toolLower = tool.toLowerCase()

  // Read tool
  if (toolLower.includes('read')) {
    return '✅ File read successfully'
  }

  // Edit tool
  if (toolLower.includes('edit')) {
    return '✅ File edited'
  }

  // Bash tool - show exit code
  if (toolLower.includes('bash')) {
    // Parse result to get exit code
    return '✅ Command executed'
  }

  // Grep tool - show match count
  if (toolLower.includes('grep')) {
    return '✅ Search completed'
  }

  // Bot manager
  if (toolLower.includes('create_bot')) {
    // Extract bot username from result
    const match = String(result).match(/@(\w+_bot)/)
    if (match) return `✅ Bot created: ${match[1]}`
    return '✅ Bot created'
  }

  // Coolify deploy
  if (toolLower.includes('deploy')) {
    return '✅ Deployed successfully'
  }

  return '✅ Completed'
}
```

**Usar en buildStatusText():**

```typescript
for (const exec of recentTools) {
  const icon = exec.error ? '❌' : '✅'
  const inputDetails = formatToolInput(exec.tool, exec.input)
  const resultSummary = exec.resultSummary || ''

  if (inputDetails) {
    lines.push(`${icon} ${inputDetails} ${resultSummary} <code>(${duration})</code>`)
  } else {
    lines.push(`${icon} ${toolIcon} ${toolName} ${resultSummary} <code>(${duration})</code>`)
  }
}
```

---

### 4. Aumentar MAX_TOOL_HISTORY

```typescript
const MAX_TOOL_HISTORY = 15  // was 8
```

**Rationale:**
- Telegram permite mensajes de 4096 chars
- Con `MAX_MESSAGE_LENGTH = 4000`, hay espacio para ~15-20 tools
- Mejor mostrar más contexto que truncar demasiado pronto

---

### 5. Mejorar formato del mensaje

**Formato actual:**
```
⏳ 📖 file.ts (2.3s)

📊 Ejecutado:
✅ 📖 agent.ts (450ms)
✅ ✏️ handler.ts (320ms)
```

**Formato propuesto:**
```
⚡ Progreso en vivo

🔄 Ejecutando ahora:
  ⏳ 📖 streaming-handler.ts (lines 100-200) — 2.3s

📊 Historial (3 de 5 tools):
  ✅ 📖 agent.ts → File read (450ms)
  ✅ ✏️ streaming-handler.ts → File edited (320ms)
  ✅ 💻 bun run typecheck → Command executed (1.2s)

⏱️ Tiempo total: 4.0s
```

**Mejoras:**
- Header claro "Progreso en vivo"
- Sección "Ejecutando ahora" separada
- Historial con contador "X de Y tools"
- Resultados mostrados (→ File read, → File edited, etc.)
- Tiempo total al final

---

### 6. Implementar retry en finish()

```typescript
async finish(): Promise<void> {
  // Clear timeout
  if (this.updateTimeout) {
    clearTimeout(this.updateTimeout)
    this.updateTimeout = null
  }

  // Update with final summary - retry 3 times
  if (this.state.statusMessageId) {
    const finalText = this.buildFinalSummary()

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.telegram.editMessageText(
          this.state.chatId,
          this.state.statusMessageId,
          undefined,
          finalText,
          { parse_mode: 'HTML' }
        )
        return // Success
      } catch (error) {
        if (attempt === 3) {
          // Last attempt failed - log but don't throw
          console.error('Failed to update final summary after 3 attempts:', error)
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }
  }
}
```

---

## Implementación Step-by-Step

### Step 1: Agregar resultSummary a IToolExecution

**Archivo:** `streaming-handler.ts` (línea 10-19)

```typescript
export interface IToolExecution {
  tool: string
  toolId: string
  input: unknown
  startTime: number
  endTime?: number
  duration?: number
  result?: unknown
  error?: string
  resultSummary?: string  // ← ADD THIS
}
```

---

### Step 2: Crear formatToolResult()

**Archivo:** `streaming-handler.ts` (después de `formatToolInput()`)

```typescript
function formatToolResult(tool: string, result: unknown, isError: boolean): string {
  if (isError) {
    const errorMsg = typeof result === 'string' ? result : JSON.stringify(result)
    const shortError = errorMsg.slice(0, 80)
    return `→ ❌ ${shortError}${errorMsg.length > 80 ? '...' : ''}`
  }

  const toolLower = tool.toLowerCase()

  // Read tool
  if (toolLower.includes('read')) {
    return '→ File read'
  }

  // Edit tool
  if (toolLower.includes('edit')) {
    return '→ File edited'
  }

  // Write tool
  if (toolLower.includes('write')) {
    return '→ File written'
  }

  // Bash tool
  if (toolLower.includes('bash')) {
    return '→ Command executed'
  }

  // Glob tool
  if (toolLower.includes('glob')) {
    // Try to count matches if result is array
    if (Array.isArray(result)) {
      return `→ Found ${result.length} files`
    }
    return '→ Search completed'
  }

  // Grep tool
  if (toolLower.includes('grep')) {
    return '→ Search completed'
  }

  // Bot manager
  if (toolLower.includes('bot-manager')) {
    if (toolLower.includes('create_bot')) {
      const resultStr = String(result)
      const match = resultStr.match(/@(\w+_bot)/)
      if (match) return `→ Created ${match[1]}`
      return '→ Bot created'
    }
    if (toolLower.includes('list_bots')) {
      return '→ Bots listed'
    }
  }

  // GitHub tools
  if (toolLower.includes('github')) {
    if (toolLower.includes('create_repo')) {
      return '→ Repo created'
    }
    if (toolLower.includes('commit')) {
      return '→ Changes committed'
    }
  }

  // Coolify tools
  if (toolLower.includes('coolify')) {
    if (toolLower.includes('deploy')) {
      return '→ Deployed'
    }
    if (toolLower.includes('create_application')) {
      return '→ App created'
    }
  }

  return '→ Done'
}
```

---

### Step 3: Actualizar onToolComplete()

**Archivo:** `streaming-handler.ts` (método onToolComplete)

**Reemplazar:**

```typescript
async onToolComplete(toolId: string, result: unknown, isError: boolean): Promise<void> {
  const exec = this.state.toolExecutions.find(e => e.toolId === toolId && !e.endTime)
  if (exec) {
    exec.endTime = Date.now()
    exec.duration = exec.endTime - exec.startTime
    if (isError) {
      exec.error = typeof result === 'string' ? result : JSON.stringify(result).slice(0, 100)
    } else {
      exec.result = result
    }
    // ADD THIS:
    exec.resultSummary = formatToolResult(exec.tool, result, isError)
  }
  await this.scheduleUpdate()
}
```

---

### Step 4: Implementar adaptive debouncing

**Archivo:** `streaming-handler.ts`

**Agregar método:**

```typescript
private getAdaptiveDebounce(): number {
  const pendingTool = this.state.toolExecutions.find(e => !e.endTime)

  if (!pendingTool) return UPDATE_DEBOUNCE_MS

  const elapsed = Date.now() - pendingTool.startTime

  // Adaptive debouncing based on tool execution time
  if (elapsed < 2000) return 500   // 0.5s for first 2s
  if (elapsed < 5000) return 1000  // 1s for 2-5s
  return UPDATE_DEBOUNCE_MS         // 1.5s for >5s
}
```

**Actualizar scheduleUpdate():**

**Reemplazar:**

```typescript
private async scheduleUpdate(): Promise<void> {
  if (this.updateTimeout) {
    this.state.pendingUpdate = true
    return
  }

  const now = Date.now()
  const timeSinceLastUpdate = now - this.state.lastUpdate
  const debounceMs = this.getAdaptiveDebounce()  // ← USE ADAPTIVE

  if (timeSinceLastUpdate >= debounceMs) {
    await this.updateStatusMessage()
  } else {
    this.state.pendingUpdate = true
    this.updateTimeout = setTimeout(async () => {
      this.updateTimeout = null
      if (this.state.pendingUpdate) {
        this.state.pendingUpdate = false
        await this.updateStatusMessage()
      }
    }, debounceMs - timeSinceLastUpdate)
  }
}
```

---

### Step 5: Aumentar MAX_TOOL_HISTORY

**Archivo:** `streaming-handler.ts` (línea 36)

```typescript
const MAX_TOOL_HISTORY = 15  // was 8
```

---

### Step 6: Mejorar formato de buildStatusText()

**Archivo:** `streaming-handler.ts` (método buildStatusText)

**Reemplazar completamente:**

```typescript
private buildStatusText(): string {
  const lines: string[] = []
  const pendingTool = this.state.toolExecutions.find(e => !e.endTime)
  const completed = this.state.toolExecutions.filter(e => e.endTime)

  // Header
  lines.push('⚡ <b>Progreso en vivo</b>')
  lines.push('')

  // Real thinking text (if streaming)
  if (this.state.streamedThinking && !pendingTool) {
    const thinkingPreview = this.state.streamedThinking.slice(-150).trim()
    if (thinkingPreview) {
      lines.push(`🧠 <i>${escapeHtml(thinkingPreview)}</i>`)
      lines.push('')
    }
  }

  // Streamed text preview (if not executing a tool)
  if (this.state.streamedText && !pendingTool) {
    const textPreview = this.state.streamedText.slice(-200).trim()
    if (textPreview) {
      lines.push(`💬 ${escapeHtml(textPreview)}`)
      lines.push('')
    }
  }

  // Current tool being executed
  if (pendingTool) {
    lines.push('🔄 <b>Ejecutando ahora:</b>')

    const elapsed = Date.now() - pendingTool.startTime
    const inputDetails = formatToolInput(pendingTool.tool, pendingTool.input)

    if (inputDetails) {
      lines.push(`  ⏳ ${inputDetails} — ${formatDuration(elapsed)}`)
    } else {
      const icon = getToolIcon(pendingTool.tool)
      const toolName = truncateToolName(pendingTool.tool)
      lines.push(`  ⏳ ${icon} ${toolName} — ${formatDuration(elapsed)}`)
    }
    lines.push('')
  }

  // Completed tools - show recent history
  if (completed.length > 0) {
    const totalCount = this.state.toolExecutions.length
    const completedCount = completed.length

    lines.push(`📊 <b>Historial (${completedCount} de ${totalCount} tools):</b>`)

    // Show last N tools
    const recentTools = completed.slice(-MAX_TOOL_HISTORY)
    for (const exec of recentTools) {
      const icon = exec.error ? '❌' : '✅'
      const duration = exec.duration ? formatDuration(exec.duration) : '?'
      const inputDetails = formatToolInput(exec.tool, exec.input)
      const resultSummary = exec.resultSummary || ''

      if (inputDetails) {
        lines.push(`  ${icon} ${inputDetails} ${resultSummary} <code>(${duration})</code>`)
      } else {
        const toolIcon = getToolIcon(exec.tool)
        const toolName = truncateToolName(exec.tool)
        lines.push(`  ${icon} ${toolIcon} ${toolName} ${resultSummary} <code>(${duration})</code>`)
      }
    }

    // Show count if more tools were executed
    if (completed.length > MAX_TOOL_HISTORY) {
      const hidden = completed.length - MAX_TOOL_HISTORY
      lines.push(`  <i>... y ${hidden} más</i>`)
    }

    lines.push('')

    // Total time
    const totalDuration = this.getTotalDuration()
    lines.push(`⏱️ <b>Tiempo total:</b> ${formatDuration(totalDuration)}`)
  } else if (!pendingTool && !this.state.streamedText && !this.state.streamedThinking) {
    // Show generic status only if no content
    lines.push('⚡ <i>Procesando...</i>')
  }

  // Truncate from the beginning if too long
  let statusText = lines.join('\n')
  if (statusText.length > MAX_MESSAGE_LENGTH) {
    let truncatedLines = lines
    while (truncatedLines.length > 3 && truncatedLines.join('\n').length > MAX_MESSAGE_LENGTH) {
      truncatedLines = truncatedLines.slice(1)
    }
    statusText = '<i>...</i>\n' + truncatedLines.join('\n')
  }

  return statusText
}
```

---

### Step 7: Actualizar buildFinalSummary()

**Archivo:** `streaming-handler.ts` (método buildFinalSummary)

**Reemplazar:**

```typescript
private buildFinalSummary(): string {
  const lines: string[] = []
  const completed = this.state.toolExecutions.filter(e => e.endTime)
  const totalDuration = this.getTotalDuration()
  const totalCount = this.state.toolExecutions.length

  lines.push('✅ <b>Completado</b>')
  lines.push('')

  if (completed.length > 0) {
    lines.push(`📊 <b>${completed.length} tools ejecutados</b> en ${formatDuration(totalDuration)}`)
    lines.push('')

    // Show all completed tools (or last MAX_TOOL_HISTORY if too many)
    const toolsToShow = completed.length > MAX_TOOL_HISTORY
      ? completed.slice(-MAX_TOOL_HISTORY)
      : completed

    for (const exec of toolsToShow) {
      const icon = exec.error ? '❌' : '✅'
      const duration = exec.duration ? formatDuration(exec.duration) : '?'
      const inputDetails = formatToolInput(exec.tool, exec.input)
      const resultSummary = exec.resultSummary || ''

      if (inputDetails) {
        lines.push(`${icon} ${inputDetails} ${resultSummary} <code>(${duration})</code>`)
      } else {
        const toolIcon = getToolIcon(exec.tool)
        const toolName = truncateToolName(exec.tool)
        lines.push(`${icon} ${toolIcon} ${toolName} ${resultSummary} <code>(${duration})</code>`)
      }
    }

    if (completed.length > MAX_TOOL_HISTORY) {
      const hidden = completed.length - MAX_TOOL_HISTORY
      lines.push(`<i>... y ${hidden} más</i>`)
    }
  }

  // Truncate from beginning if needed
  let finalText = lines.join('\n')
  if (finalText.length > MAX_MESSAGE_LENGTH) {
    let truncatedLines = lines
    while (truncatedLines.length > 3 && truncatedLines.join('\n').length > MAX_MESSAGE_LENGTH) {
      truncatedLines = truncatedLines.slice(1)
    }
    finalText = '<i>...</i>\n' + truncatedLines.join('\n')
  }

  return finalText
}
```

---

### Step 8: Implementar retry en finish()

**Archivo:** `streaming-handler.ts` (método finish)

**Reemplazar:**

```typescript
async finish(): Promise<void> {
  // Clear any pending timeout
  if (this.updateTimeout) {
    clearTimeout(this.updateTimeout)
    this.updateTimeout = null
  }

  // Update status message with final summary - retry 3 times
  if (this.state.statusMessageId) {
    const finalText = this.buildFinalSummary()

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.telegram.editMessageText(
          this.state.chatId,
          this.state.statusMessageId,
          undefined,
          finalText,
          { parse_mode: 'HTML' }
        )
        return // Success - exit function
      } catch (error) {
        if (attempt === 3) {
          // Last attempt failed - log error but don't throw
          console.error('[StreamingHandler] Failed to update final summary after 3 attempts:', error)
          // Leave message as-is - better than nothing
        } else {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 500 * attempt))
        }
      }
    }
  }
}
```

---

## Testing Plan

### Test 1: Tools rápidos (<2s)
1. Ejecutar comando que use tools rápidos: Read, Edit, Glob
2. **Esperado:** Updates cada 0.5s, se ve progreso fluido
3. **Verificar:** Mensaje final muestra todos los tools con resultados

### Test 2: Tools lentos (>5s)
1. Ejecutar comando con Bash lento (build, deploy)
2. **Esperado:** Updates cada 1.5s, no spam
3. **Verificar:** Mensaje final correcto

### Test 3: Muchos tools (>15)
1. Ejecutar workflow largo que use 20+ tools
2. **Esperado:** Historial muestra últimos 15, dice "... y X más"
3. **Verificar:** Mensaje no excede 4096 chars

### Test 4: Error en tool
1. Ejecutar comando que falle (ej: Read de archivo que no existe)
2. **Esperado:** Tool marcado con ❌, error mostrado
3. **Verificar:** Mensaje final refleja el error

### Test 5: Retry en finish()
1. Simular rate limit (difícil, pero probar con network slow)
2. **Esperado:** Retries 3 veces antes de rendirse
3. **Verificar:** Logs muestran los retries

---

## Checklist de Implementación

- [ ] Agregar `resultSummary?` a `IToolExecution`
- [ ] Crear función `formatToolResult()`
- [ ] Actualizar `onToolComplete()` para usar `formatToolResult()`
- [ ] Agregar método `getAdaptiveDebounce()`
- [ ] Actualizar `scheduleUpdate()` para usar adaptive debounce
- [ ] Cambiar `MAX_TOOL_HISTORY` de 8 a 15
- [ ] Reescribir `buildStatusText()` con nuevo formato
- [ ] Reescribir `buildFinalSummary()` con nuevo formato
- [ ] Implementar retry en `finish()`
- [ ] Test 1: Tools rápidos
- [ ] Test 2: Tools lentos
- [ ] Test 3: Muchos tools
- [ ] Test 4: Error handling
- [ ] Test 5: Retry mechanism
- [ ] Verificar NO hay más `deleteMessage` en el código

---

## Rollback Plan

Si el nuevo formato causa problemas:

1. **Revertir adaptive debouncing:**
   ```typescript
   // En scheduleUpdate(), reemplazar:
   const debounceMs = UPDATE_DEBOUNCE_MS  // Fixed value
   ```

2. **Revertir formato:**
   - Usar backup del código anterior (`git stash` antes de empezar)
   - O comentar nuevo formato y descomentar viejo

3. **Deshabilitar retry:**
   ```typescript
   // En finish(), simplificar:
   try {
     await this.telegram.editMessageText(...)
   } catch {
     // Ignore
   }
   ```

---

## Notas Adicionales

### Por qué adaptive debouncing
- Tools de filesystem (Read, Edit, Write): ~100-500ms
- Tools de Bash: ~500ms-10s dependiendo del comando
- Tools de API (GitHub, Coolify): ~1-5s
- Con debounce fijo de 1.5s, tools rápidos (<1.5s) nunca se actualizan

### Por qué mostrar resultados
- Usuario quiere saber QUÉ pasó, no solo QUE pasó algo
- "File read" es más útil que solo "✅ Read"
- "Error: file not found" es más útil que solo "❌ Read"

### Por qué MAX_TOOL_HISTORY = 15
- Promedio de caracteres por tool line: ~60-80 chars
- 15 tools × 70 chars = ~1050 chars
- Header + footer: ~200 chars
- Total: ~1250 chars (bien dentro del límite de 4000)

---

## Status Updates

| Fecha | Status | Notas |
|-------|--------|-------|
| 2026-01-14 | Plan creado | Esperando implementación |
| | | |
