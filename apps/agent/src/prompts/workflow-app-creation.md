# How to Proceed: App Creation Pipeline

## Workflow Overview

Cuando el usuario pida crear una app ("creame una app para...", "crea un bot de...", etc.), seguir este pipeline completo:

1. **Scaffolding** - bunx create bunspace@latest
2. **Validacion** - typecheck, lint, build
3. **Commit inicial** - siguiendo MUST-FOLLOW-GUIDELINES.md
4. **GitHub** - crear repo y push
5. **Coolify** - crear app y deploy
6. **Bot Config** - (si es template bot) crear bot y configurar

---

## Plan Tracking

**OBLIGATORIO**: Crear y mantener un plan file:
- Ruta: `workspaces/plans/actual-plan-{project-name}-{YYYY-MM-DD}.md`
- Actualizar despues de cada fase
- Registrar commits, errores y sesiones

---

## Fase 1: Scaffolding

### Objetivo
Crear estructura del proyecto usando bunspace con las **scaffolder tools dedicadas**

### Templates disponibles
| Template | Descripcion |
|----------|-------------|
| `monorepo` | Bun monorepo para npm packages con workspaces |
| `telegram-bot` | Bot de Telegram con Telegraf, Docker-ready |
| `fumadocs` | Documentacion con Next.js + MDX bilingue |

### Herramientas MCP - USAR SCAFFOLDER
```
mcp__scaffolder__scaffold_project({
  name: "{project-name}",
  template: "telegram-bot",  // o monorepo, fumadocs
  skipGit: false,
  skipInstall: false
})
```

### Verificacion
La tool retorna automaticamente:
- [ ] Lista de archivos creados
- [ ] Confirmacion de package.json
- [ ] Next steps sugeridos

### Si falla
- Verificar que directorio no existe o esta vacio
- Probar con nombre diferente si ya existe

---

## Fase 2: Setup y Validacion

### Objetivo
Verificar que el proyecto compila y pasa lint

### Herramientas MCP - USAR SCAFFOLDER
```
mcp__scaffolder__validate_project({
  projectPath: "/path/to/project",
  fix: true,  // auto-fix lint errors
  skipSteps: []  // ejecutar todos: install, typecheck, lint, build
})
```

### Pipeline ejecutado automaticamente
1. **install** - Detecta package manager y ejecuta install
2. **typecheck** - TypeScript check (bun run typecheck || npx tsc --noEmit)
3. **lint** - Lint con --fix si fix=true
4. **build** - Build del proyecto

### Verificacion
La tool retorna metricas por paso:
- [ ] install: success + duration_ms
- [ ] typecheck: success + errorCount
- [ ] lint: success + warningCount + fixedCount
- [ ] build: success + duration_ms

### Si falla
- Leer errores en steps.{step}.output
- Usar Read + Edit tools para arreglar
- Re-ejecutar `validate_project` hasta 0 errores

### Personalizar archivos (opcional)
```
mcp__scaffolder__update_project_files({
  projectPath: "/path/to/project",
  updates: {
    readme: { title: "Mi Proyecto", description: "..." },
    envExample: { variables: { TG_BOT_TOKEN: "Token del bot" } },
    gitignore: { add: [".env.local"] }
  }
})
```

---

## Fase 3: Commit Inicial

### Objetivo
Commit siguiendo el formato de MUST-FOLLOW-GUIDELINES.md

### Formato de commit
```
feat({project-name}) - {titulo descriptivo}

<technical>
- Scaffolded con bunspace template {template}
- Stack: Bun + TypeScript + {framework}
- Configuracion: strict mode, oxlint, prettier
</technical>

<changelog>
## Features
- Estructura inicial del proyecto
- Configuracion de desarrollo lista
- [Otros features especificos]
</changelog>
```

### Herramientas MCP
- `mcp__github__commit_and_push` con newBranch opcional

### Verificacion
- [ ] Mensaje sigue formato con <technical> y <changelog>
- [ ] Commit creado localmente

---

## Fase 4: GitHub Publication

### Objetivo
Crear repo en GitHub y push del codigo

### Herramientas MCP
- `mcp__github__get_authenticated_user` - Obtener usuario autenticado
- `mcp__github__repo_exists` - Verificar si repo ya existe
- `mcp__github__create_repo` - Crear repositorio nuevo
- `mcp__github__commit_and_push` - Push codigo al remote

### Secuencia
1. Obtener usuario autenticado para determinar owner
2. Verificar que repo no existe (evitar conflictos)
3. Crear repo:
   - name: {project-name}
   - private: true (por defecto)
   - description: descripcion del proyecto
4. Configurar remote origin y push

### Verificacion
- [ ] Repo creado en GitHub
- [ ] Codigo pushed correctamente
- [ ] Remote origin configurado
- [ ] README visible en GitHub

### Si falla
- Si repo existe: preguntar al usuario si renombrar o usar existente
- Si auth falla: verificar GITHUB_TOKEN en env

---

## Fase 5: Coolify Deployment

### Objetivo
Crear app en Coolify conectada al repo y deployar

### Herramientas MCP
- `mcp__coolify__list_servers` - Listar servers disponibles
- `mcp__coolify__get_server_destinations` - Obtener destinations del server
- `mcp__coolify__create_application` - Crear app desde GitHub repo
- `mcp__coolify__set_env_vars` - Setear variables de entorno
- `mcp__coolify__deploy` - Trigger deploy
- `mcp__coolify__get_deployment_status` - Verificar status

### Secuencia
1. Listar servers: obtener lista con UUIDs
2. Obtener destinations del server seleccionado
3. Crear aplicacion:
   ```
   name: {project-name}
   serverUuid: del paso 1
   destinationUuid: del paso 2
   githubRepoUrl: https://github.com/{user}/{repo}
   branch: 'main'
   buildPack: 'nixpacks' | 'dockerfile'
   ```
4. Setear env vars basicas:
   ```
   NODE_ENV: 'production'
   TG_ENV: 'production' (si es bot)
   ```
5. Trigger deploy
6. Poll status hasta success o fail

### Verificacion
- [ ] App creada en Coolify (UUID obtenido)
- [ ] Env vars seteadas
- [ ] Deploy triggered
- [ ] Deploy exitoso (status = 'running')

### Si falla
- `mcp__coolify__get_application_logs` para ver errores
- Arreglar problema (env vars, Dockerfile, etc.)
- `mcp__coolify__deploy` de nuevo

---

## Fase 6: Bot Configuration (solo si template bot)

### Objetivo
Crear bot en BotFather, configurar y conectar con Coolify

### Herramientas MCP
- `mcp__bot-manager__create_bot` - Crear bot via BotFather
- `mcp__bot-manager__configure_bot` - Configurar commands, description
- `mcp__coolify__set_env_vars` - Setear TG_BOT_TOKEN
- `mcp__coolify__deploy` - Redeploy con token

### Secuencia
1. Crear bot via BotFather:
   ```
   name: nombre descriptivo
   description: que hace el bot
   createGithub: false (ya existe)
   deployToCoolify: false (ya existe)
   ```
2. Capturar token del resultado
3. Configurar bot:
   ```
   botUsername: del paso 1
   commands: [{command: 'start', description: 'Iniciar bot'}, ...]
   aboutText: texto corto del about
   ```
4. Setear en Coolify:
   ```
   TG_BOT_TOKEN: {token del paso 1}
   TG_MODE: 'webhook' | 'polling'
   TG_ENV: 'production'
   ```
5. Redeploy para aplicar token

### Verificacion
- [ ] Bot creado en BotFather
- [ ] Token obtenido y guardado
- [ ] Commands configurados
- [ ] Token en Coolify env vars
- [ ] Redeploy exitoso
- [ ] Bot respondiendo a /start

---

## Plan File Format

Crear en: `workspaces/plans/actual-plan-{name}-{YYYY-MM-DD}.md`

```markdown
# Actual Plan: {project-name}

**Created:** {ISO timestamp}
**Last Updated:** {ISO timestamp}
**Status:** in_progress | completed | blocked | failed

## Project Info
- **Name:** {project-name}
- **Type:** telegram-bot | monorepo | fumadocs
- **Template:** {template usado}
- **Repository:** {github-url}
- **Coolify App UUID:** {uuid}
- **Bot Username:** @{username} (si aplica)

## Progress Tracking

### Phase 1: Scaffolding
- [x] Project created
- [x] Structure verified
- **Timestamp:** {ISO}
- **Notes:** {observaciones}

### Phase 2: Setup & Validation
- [ ] Dependencies installed
- [ ] Type check passed
- [ ] Lint passed
- [ ] Build successful
- **Timestamp:**
- **Notes:**

### Phase 3: Initial Commit
- [ ] Commit message formatted
- [ ] Commit created
- **Timestamp:**
- **Commit Hash:** {hash}

### Phase 4: GitHub
- [ ] Repo created
- [ ] Code pushed
- **Timestamp:**
- **Repo URL:** {url}

### Phase 5: Coolify
- [ ] App created
- [ ] Env vars set
- [ ] Deployed
- [ ] Running successfully
- **Timestamp:**
- **App UUID:** {uuid}

### Phase 6: Bot Config (if applicable)
- [ ] Bot created
- [ ] Token obtained
- [ ] Commands set
- [ ] Token in env
- [ ] Redeploy successful
- **Timestamp:**
- **Bot Username:** @{username}

## Commits Log
| Hash | Message | Timestamp |
|------|---------|-----------|
| abc123 | feat(name) - Initial | 2026-01-10T12:00:00Z |

## Errors & Recovery
| Phase | Error | Resolution | Timestamp |
|-------|-------|------------|-----------|
| 2 | TypeScript error | Fixed import | 2026-01-10T12:30:00Z |

## Session History
| Session ID | Action | Result | Timestamp |
|------------|--------|--------|-----------|
| sess_abc | Scaffold | Success | 2026-01-10T12:00:00Z |
```

---

## Subagent Usage

### Cuando delegar a subagentes

| Tarea | Subagente | Razon |
|-------|-----------|-------|
| Planificar feature compleja | `planner` | Analisis previo a implementacion |
| Escribir codigo nuevo | `code-implementer` | Especializado en codigo |
| Review pre-commit | `code-reviewer` | Seguridad y calidad |
| Correr tests extensivos | `test-runner` | Especializado en testing |
| Debug de deploy fallido | `devops` | Logs y troubleshooting |

### Sincronizacion entre agentes

1. **Antes de delegar**: Leer plan file actual
2. **Al delegar**: Pasar contexto relevante del plan al subagente
3. **Despues de completar**: Actualizar plan file con resultados
4. **Si hubo cambios de codigo**: Crear commit apropiado

---

## Commit Strategy

| Evento | Commit? | Pattern |
|--------|---------|---------|
| Post-scaffold | Si | `feat({name}) - Initial scaffolding` |
| Post-fix TS/lint errors | Si | `fix({name}) - Fix TypeScript/lint errors` |
| Pre-deploy | Si | `feat({name}) - Prepare for deployment` |
| Post-config changes | Si | `refactor({name}) - Configure {what}` |
| Feature added | Si | `feat({name}) - Add {feature}` |
| Bug fixed | Si | `fix({name}) - Fix {bug}` |

---

## Error Recovery

### Rollback Points

El workflow puede resumirse desde cualquier fase:

- **Scaffold OK, GitHub fail**: Resume desde Fase 4
- **GitHub OK, Coolify fail**: Resume desde Fase 5
- **Deploy fail**: Check logs, fix, redeploy
- **Bot creation fail**: Retry con diferente nombre

### Common Fixes

| Error | Causa tipica | Solucion |
|-------|--------------|----------|
| TypeScript errors | Imports mal, tipos incorrectos | Read error, Edit file, re-typecheck |
| Lint errors | Formato, unused vars | Run lint --fix, manual si persiste |
| Build fail | tsconfig, deps missing | Check config, reinstall deps |
| Deploy fail | Env vars, Dockerfile | Check logs, fix config, redeploy |
| Bot name taken | Nombre muy comun | Probar nombre mas unico |
| Auth fail (GitHub) | Token expirado | Renovar GITHUB_TOKEN |
| Auth fail (Coolify) | Token/URL incorrectos | Verificar COOLIFY_URL y COOLIFY_TOKEN |

---

## Quick Reference: Tools por Fase

### Fase 1-2: Scaffolding y Validacion (USAR SCAFFOLDER)
```
mcp__scaffolder__scaffold_project      # Crear proyecto con bunspace
mcp__scaffolder__validate_project      # Pipeline: install -> typecheck -> lint -> build
mcp__scaffolder__update_project_files  # Personalizar README, .env.example, etc.
```

### Fase 1-2: Alternativa Code Executor (solo si scaffolder falla)
```
mcp__code-executor__execute_command
mcp__code-executor__get_project_structure
mcp__code-executor__install_dependencies
mcp__code-executor__type_check
mcp__code-executor__lint_project
mcp__code-executor__build_project
```

### Fase 3-4: Commit y GitHub
```
mcp__github__get_authenticated_user
mcp__github__repo_exists
mcp__github__create_repo
mcp__github__commit_and_push
```

### Fase 5: Coolify
```
mcp__coolify__list_servers
mcp__coolify__get_server_destinations
mcp__coolify__create_application
mcp__coolify__set_env_vars
mcp__coolify__deploy
mcp__coolify__get_deployment_status
mcp__coolify__get_application_logs
```

### Fase 6: Bot
```
mcp__bot-manager__create_bot
mcp__bot-manager__configure_bot
mcp__bot-manager__get_bot_token
```
