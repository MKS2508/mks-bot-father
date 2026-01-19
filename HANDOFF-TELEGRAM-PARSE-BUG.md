# 🐛 HANDOFF: Telegram Message Parsing Bug

**Status:** 🔴 CRITICAL
**Created:** 2026-01-10
**Reporter:** WAXIN MK1
**Priority:** HIGH

---

## 📋 Bug Summary

**El formateo de mensajes de Telegram NO funciona.** Los mensajes se envían como texto plano sin parsear Markdown ni HTML, mostrando todos los caracteres especiales (`**`, `_`, `` ` ``, etc.) sin formatear.

**Expected:**
- ✅ Negritas, cursivas, código formateado
- ✅ Listas, enlaces, emojis bien renderizados
- ✅ Bloques de código con syntax highlighting

**Actual:**
- ❌ Todo aparece como texto plano
- ❌ Se ven `**texto**` en vez de **texto**
- ❌ Se ven `_texto_` en vez de _texto_
- ❌ Código sin formatear

---

## 🔍 Root Cause Analysis

### Problema Principal

El bot tiene **dos sistemas de formateo** que NO están bien integrados:

1. **TelegramMessageBuilder** (HTML mode) - en `apps/telegram-bot`
2. **Markdown legacy** - respuestas del agent vienen en Markdown

### El Flujo Roto

```
Agent (Claude)
  → Responde en Markdown (**, _, `, etc.)
  → buildAgentResponse()
    → TelegramMessageBuilder.text().text(chunk)
      → Escapa el Markdown como texto plano
      → sender.send() envía HTML con Markdown escapado
        → Telegram muestra: "**texto**" en vez de texto en negrita
```

### Dónde Falla

**File:** `apps/telegram-bot/src/handlers/agent.ts`

**Líneas 166-183:**
```typescript
if (isSenderInitialized()) {
  const messages = buildAgentResponse(result.result)  // ❌ result.result contiene Markdown
  const sender = getSender()

  for (const message of messages) {
    const sendResult = await sender.send(ctx.chat!.id, message)  // ❌ Envía HTML con MD escapado
    if (!sendResult.ok) {
      await ctx.reply(message.text || '', { parse_mode: 'HTML' })  // ❌ HTML pero texto es MD escapado
    }
  }
} else {
  // Fallback - este path SÍ debería funcionar
  const chunks = formatLongResponse(result.result)
  for (const chunk of chunks) {
    await ctx.reply(chunk, { parse_mode: 'Markdown' })  // ✅ ESTO FUNCIONA
  }
}
```

**File:** `apps/telegram-bot/src/utils/formatters.ts`

**Líneas 240-248:**
```typescript
export function buildAgentResponse(text: string, maxLength = 4000): TelegramMessage[] {
  const chunks = formatLongResponse(text, maxLength)  // text contiene Markdown

  return chunks.map((chunk) => {
    return TelegramMessageBuilder.text()
      .text(chunk)  // ❌ .text() escapa todo como texto plano
      .build()      // ❌ Devuelve HTML con Markdown escapado
  })
}
```

---

## 🛠️ Proposed Solutions

### Option A: Use Markdown Everywhere (QUICK FIX) ⚡

**Ventajas:**
- ✅ Fix rápido (5 minutos)
- ✅ No requiere parser MD→HTML
- ✅ Compatible con respuestas actuales del agent

**Desventajas:**
- ❌ No usa el TelegramMessageBuilder
- ❌ Pierde features del builder (keyboards complejos, etc.)

**Implementation:**

1. Modificar `apps/telegram-bot/src/handlers/agent.ts` líneas 164-183:

```typescript
// ANTES:
if (isSenderInitialized()) {
  const messages = buildAgentResponse(result.result)
  // ... sender logic
} else {
  // fallback
}

// DESPUÉS:
// Siempre usar Markdown directo
const chunks = formatLongResponse(result.result)
for (const chunk of chunks) {
  await ctx.reply(chunk, { parse_mode: 'Markdown' })
}
```

2. Dejar `buildAgentResponse()` sin usar (o deprecarlo)

---

### Option B: Add Markdown→HTML Parser (PROPER FIX) 🔧

**Ventajas:**
- ✅ Usa el sistema de builder correctamente
- ✅ HTML es más robusto que Markdown en Telegram
- ✅ Permite features avanzadas del builder

**Desventajas:**
- ❌ Requiere dependencia externa (marked, markdown-it, etc.)
- ❌ Más tiempo de implementación
- ❌ Posibles edge cases en conversión

**Implementation:**

1. Instalar parser:
```bash
bun add marked
# o
bun add markdown-it
```

2. Modificar `apps/telegram-bot/src/utils/formatters.ts`:

```typescript
import { marked } from 'marked'

export function buildAgentResponse(text: string, maxLength = 4000): TelegramMessage[] {
  const chunks = formatLongResponse(text, maxLength)

  return chunks.map((chunk) => {
    // Convertir Markdown a HTML
    const htmlContent = marked.parse(chunk, {
      breaks: true,
      gfm: true
    })

    return TelegramMessageBuilder.html()  // Usar .html() en vez de .text()
      .raw(htmlContent)  // Meter HTML raw
      .build()
  })
}
```

3. Asegurar que `sender.send()` use `parse_mode: 'HTML'`

---

### Option C: Hybrid Approach (BALANCED) ⚖️

Usar **Markdown para respuestas del agent** y **Builder para mensajes del sistema** (confirmaciones, progreso, stats).

**Implementation:**

1. Agent responses → Markdown directo (Option A)
2. System messages → TelegramMessageBuilder (ya funciona)
3. Stats, progress, confirmations → Builder (ya funciona)

---

## 📁 Files Reference

### Critical Files

| File | Path | Role | Lines |
|------|------|------|-------|
| **agent.ts** | `apps/telegram-bot/src/handlers/agent.ts` | Main handler, donde se envían mensajes | 164-183, 214-237 |
| **formatters.ts** | `apps/telegram-bot/src/utils/formatters.ts` | buildAgentResponse() - convierte texto a TelegramMessage | 240-248 |
| **telegram-sender.ts** | `apps/telegram-bot/src/lib/telegram-sender.ts` | Singleton del TelegrafSender | 15-36 |
| **bot.ts** | `apps/telegram-bot/src/bot.ts` | Inicialización del bot | 58-64 |

### Supporting Files

| File | Path | Purpose |
|------|------|---------|
| **progress.ts** | `apps/telegram-bot/src/state/progress.ts` | Progress messages (funcionan bien) |
| **confirmations.ts** | `apps/telegram-bot/src/state/confirmations.ts` | Confirmation dialogs (funcionan bien) |
| **formatters.ts (agent)** | `apps/agent/src/telegram/formatters.ts` | Legacy formatters (duplicado) |

---

## 🧪 Test Case

**Input (agent response):**
```markdown
# Test
**Negrita** y _cursiva_ y `código`

- Item 1
- Item 2

```typescript
console.log("test")
```
```

**Expected Output (Telegram):**
- Título grande "Test"
- "Negrita" en bold, "cursiva" en italic, "código" en monospace
- Lista con bullets
- Bloque de código con fondo gris

**Actual Output:**
```
# Test
**Negrita** y _cursiva_ y `código`

- Item 1
- Item 2

```typescript
console.log("test")
```
```

---

## 🎯 Recommended Solution

**Option A** (Quick Fix) es la recomendada para deployment inmediato.

**Steps:**
1. Modificar `apps/telegram-bot/src/handlers/agent.ts` líneas 164-183
2. Usar siempre `ctx.reply(chunk, { parse_mode: 'Markdown' })`
3. Remover/comentar el bloque de `isSenderInitialized()`
4. Test con varios casos de Markdown
5. Deploy

**Tiempo estimado:** 10 minutos
**Risk:** LOW
**Impact:** HIGH (fix completo del formateo)

---

## 📊 Impact Analysis

### Affected Features
- ✅ Agent text responses (MAIN ISSUE)
- ✅ Long message chunking
- ❌ Stats display (ya funciona)
- ❌ Progress tracking (ya funciona)
- ❌ Confirmations (ya funciona)

### Users Affected
- 🔴 100% de usuarios que usan el bot de Telegram
- 🔴 Todas las respuestas del agent no se formatean

---

## 🔗 Related Issues

- TelegramMessageBuilder está bien implementado pero mal usado
- Hay código duplicado entre `apps/agent/src/telegram/` y `apps/telegram-bot/src/`
- El fallback (línea 177-183) SÍ funciona, pero nunca se ejecuta si sender está inicializado

---

## 📝 Notes

- El bug fue identificado por WAXIN MK1 el 2026-01-10
- Ya se intentó fix en líneas 174 y 181 añadiendo `parse_mode`, pero no funcionó porque el sender SIEMPRE está inicializado
- El problema NO es el `parse_mode`, es que `buildAgentResponse()` escapa el Markdown antes de enviarlo
- **Claude agent responde en Markdown nativo** - esto no se puede cambiar fácilmente sin modificar los prompts

---

## ✅ Verification Steps

Después del fix, verificar:

1. **Basic Markdown:**
   - [ ] `**bold**` → **bold**
   - [ ] `_italic_` → _italic_
   - [ ] `` `code` `` → `code`

2. **Lists:**
   - [ ] Listas con `-` o `*` se muestran con bullets
   - [ ] Listas numeradas `1.` funcionan

3. **Code Blocks:**
   - [ ] Bloques con ` ```language ` tienen fondo gris
   - [ ] Syntax highlighting funciona (si aplica)

4. **Links:**
   - [ ] `[text](url)` se muestra como link clickeable

5. **Combinations:**
   - [ ] `**bold with _italic_**` funciona
   - [ ] Emojis no se rompen
   - [ ] Long messages se chunkean correctamente

---

## 👤 Contact

**Bug Reporter:** WAXIN MK1
**Location:** Helsinki datacenter (explotado como siempre)
**Status:** laín 3al t4b0n m0k... 🌿

---

**END OF HANDOFF**
