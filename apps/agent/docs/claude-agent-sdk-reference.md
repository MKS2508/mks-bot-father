# Claude Agent SDK Reference

Documentación de referencia para el Claude Agent SDK usado en este proyecto.

## URLs Oficiales

- **Documentación General**: https://platform.claude.com/docs/en/agent-sdk/overview
- **TypeScript Reference**: https://platform.claude.com/docs/en/agent-sdk/typescript
- **Building Agents Blog**: https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
- **GitHub SDK**: https://github.com/anthropics/claude-agent-sdk-typescript
- **Best Practices**: https://skywork.ai/blog/claude-agent-sdk-best-practices-ai-agents-2025/

---

## Instalación

```bash
bun add @anthropic-ai/claude-agent-sdk
```

---

## API Principal

### `query()` - Función Principal

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk"

for await (const message of query({
  prompt: "Your task here",
  options: {
    model: "claude-opus-4-5",
    cwd: process.cwd(),
    allowedTools: ["Read", "Edit", "Bash", "Glob", "Grep"]
  }
})) {
  if ("result" in message) console.log(message.result)
}
```

### Opciones de Query

| Opción | Tipo | Descripción |
|--------|------|-------------|
| `model` | `string` | Modelo a usar (claude-sonnet-4-5, claude-opus-4-5, etc.) |
| `cwd` | `string` | Directorio de trabajo (SIEMPRE rutas absolutas) |
| `allowedTools` | `string[]` | Herramientas permitidas |
| `mcpServers` | `Record<string, MCPServer>` | Servidores MCP personalizados |
| `agents` | `Record<string, AgentDefinition>` | Subagentes disponibles |
| `maxTurns` | `number` | Máximo de turnos de conversación |
| `maxBudgetUsd` | `number` | Límite de costo en USD |
| `maxThinkingTokens` | `number` | Máximo de tokens para thinking |
| `permissionMode` | `string` | Modo de permisos |
| `resume` | `string` | Session ID para resumir |
| `forkSession` | `boolean` | Crear fork de sesión |
| `includePartialMessages` | `boolean` | Incluir mensajes parciales |
| `additionalDirectories` | `string[]` | Directorios adicionales permitidos |
| `hooks` | `HooksConfig` | Hooks de auditoría |

---

## Herramientas Built-in

### Disponibles por defecto:
- `Read` - Leer archivos
- `Write` - Escribir archivos
- `Edit` - Editar archivos con reemplazo
- `Bash` - Ejecutar comandos shell
- `Glob` - Buscar archivos por patrón
- `Grep` - Buscar contenido en archivos
- `WebSearch` - Búsqueda web
- `WebFetch` - Fetch de URLs
- `Task` - Invocar subagentes

---

## Definición de Tools Personalizados (MCP)

```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"

const myTool = tool(
  "toolName",
  "Tool description",
  z.object({
    param1: z.string().describe("Parameter description"),
    param2: z.boolean().optional()
  }),
  async (args) => {
    // Implementación
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ success: true })
      }]
    }
  }
)

const server = createSdkMcpServer({
  name: "my-server",
  version: "1.0.0",
  tools: [myTool]
})
```

### Tipos de MCP Servers

```typescript
// In-process SDK server
mcpServers: {
  "my-server": {
    type: "sdk",
    instance: server
  }
}

// Stdio-based
mcpServers: {
  "playwright": {
    command: "npx",
    args: ["@playwright/mcp@latest"]
  }
}

// SSE-based
mcpServers: {
  "external": {
    type: "sse",
    url: "https://api.example.com/mcp"
  }
}

// HTTP-based
mcpServers: {
  "http-server": {
    type: "http",
    url: "http://localhost:8000"
  }
}
```

---

## Subagentes

### Definición

```typescript
const agents = {
  "code-reviewer": {
    description: "Expert code reviewer for quality and security",
    prompt: "Analyze code quality, security, and best practices",
    tools: ["Read", "Glob", "Grep"],
    model: "claude-opus-4-5"  // Opcional, puede ser diferente del principal
  }
}
```

### Invocación

Los subagentes se invocan automáticamente via la herramienta `Task`.
**IMPORTANTE**: Incluir `"Task"` en `allowedTools` para poder usar subagentes.

```typescript
allowedTools: ["Read", "Grep", "Task"]  // Task es requerido
```

---

## Streaming y Tipos de Mensaje

### Tipos de mensaje en el stream

| Tipo | Subtipo | Descripción |
|------|---------|-------------|
| `system` | `init` | Inicio de sesión (contiene `session_id`) |
| `assistant` | - | Respuestas del asistente y tool_use |
| `result` | `success` | Resultado exitoso |
| `result` | `failure` | Error en la ejecución |

### Estructura de mensaje

```typescript
interface Message {
  type: string
  subtype?: string
  session_id?: string
  content?: ContentBlock[]
  result?: string
  errors?: string[]
  usage?: { input_tokens: number; output_tokens: number }
  total_cost_usd?: number
  permission_denials?: PermissionDenial[]  // IMPORTANTE: Verificar esto
}

interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  name?: string
  input?: unknown
  id?: string
}
```

---

## Sesiones

### Capturar Session ID

```typescript
let sessionId: string

for await (const message of query({...})) {
  if (message.type === 'system' && message.subtype === 'init') {
    sessionId = message.session_id  // Guardar siempre
  }
}
```

### Resumir Sesión

```typescript
for await (const message of query({
  prompt: "Continue working",
  options: {
    resume: sessionId,
    forkSession: false  // true para crear rama
  }
})) {
  // Contexto previo disponible
}
```

---

## Control de Permisos

### Modos de permiso

| Modo | Descripción |
|------|-------------|
| `default` | Pide confirmación para operaciones peligrosas |
| `acceptEdits` | Auto-acepta ediciones, pide para bash |
| `bypassPermissions` | No pide confirmación (requiere flag especial) |
| `plan` | Solo planificación, no ejecuta |

### Custom Permission Handler

```typescript
canUseTool: async (toolName, input, { signal, suggestions }) => {
  if (toolName === "Bash" && input.command.includes("rm")) {
    return {
      behavior: "deny",
      message: "Destructive operations not allowed",
      interrupt: true
    }
  }
  return { behavior: "allow", updatedInput: input }
}
```

---

## Hooks de Auditoría

```typescript
hooks: {
  "PreToolUse": [{
    matcher: ".*",  // Regex para filtrar tools
    hooks: [async (input, toolUseId, { signal }) => {
      console.log(`About to use ${input.tool_name}`)
      return { continue: true }
    }]
  }],

  "PostToolUse": [{
    matcher: "Bash",
    hooks: [async (input) => {
      console.log(`Executed: ${input.tool_input.command}`)
      return {}
    }]
  }],

  "SessionEnd": [{
    hooks: [async (input) => {
      console.log(`Session ended: ${input.reason}`)
      return {}
    }]
  }]
}
```

---

## Control de Costos

```typescript
const options = {
  maxBudgetUsd: 10.0,  // Límite de $10
  maxThinkingTokens: 10000,
  // Contexto extendido (opcional)
  betas: ['context-1m-2025-08-07']
}
```

---

## Verificación de Permission Denials

**IMPORTANTE**: Siempre verificar denials en el resultado.

```typescript
if (message.type === 'result') {
  if (message.permission_denials?.length > 0) {
    console.warn('Operaciones denegadas:', message.permission_denials)
    // Manejar denials apropiadamente
  }
}
```

---

## Patrones de Error Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `AUTHENTICATION_FAILED` | API key inválida | Verificar ANTHROPIC_API_KEY |
| `RATE_LIMIT_EXCEEDED` | Muchas requests | Implementar retry con backoff |
| `CONTEXT_LENGTH_EXCEEDED` | Contexto muy largo | Usar session compaction o nueva sesión |

---

## Mejores Prácticas

1. **Rutas absolutas**: Siempre usar rutas absolutas en `cwd`
2. **Incluir Task**: Si usas subagentes, incluir `"Task"` en `allowedTools`
3. **Guardar session_id**: Siempre capturar y guardar el session_id para poder resumir
4. **Verificar denials**: Revisar `permission_denials` en el resultado
5. **Control de costos**: Usar `maxBudgetUsd` para limitar gastos
6. **Error handling**: Manejar errores específicos del SDK
7. **Zod para validación**: Usar Zod para schemas de herramientas

---

## Implementación en Este Proyecto

### Archivos principales:
- `/apps/agent/src/agent.ts` - Orquestador principal
- `/apps/agent/src/tools/index.ts` - Registry de MCP servers
- `/apps/agent/src/subagents/index.ts` - Definición de subagentes
- `/apps/agent/src/types.ts` - Tipos TypeScript

### MCP Servers disponibles:
- `bot-manager` - Gestión de bots de Telegram
- `github` - Operaciones de GitHub
- `coolify` - Deployment a Coolify
- `code-executor` - Ejecución segura de comandos

### Subagentes disponibles:
- `code-reviewer` (sonnet) - Revisión de código
- `test-runner` (inherit) - Ejecución de tests
- `planner` (sonnet) - Planificación
- `code-implementer` (inherit) - Implementación
- `researcher` (haiku) - Investigación
- `devops` (haiku) - DevOps

---

*Última actualización: 2025-01-10*
