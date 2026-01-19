# Plan: Implementación del Comando /restart

**Fecha:** 2026-01-14
**Status:** Pending Implementation
**Prioridad:** Medium

---

## Objetivo

Implementar comando `/restart` en el bot de Telegram que permita reiniciar el bot remotamente sin necesidad de acceder al servidor físicamente.

---

## Contexto Actual

### Sistema actual
- Bot ejecutado con: `bun start` → `bun src/bot.ts`
- Para reiniciar: acceso manual al PC, kill process, start again
- Ya existe manejo de SIGINT/SIGTERM (bot.ts líneas 98-108)

### Problema
- Cada cambio en código requiere acceso físico al PC
- No hay forma remota de aplicar cambios
- Proceso manual, lento y tedioso

---

## Solución Elegida: PM2 Process Manager

### Por qué PM2
✅ **Robusto** - Gestión de procesos battle-tested
✅ **Auto-restart** - Si el bot crashea, PM2 lo reinicia automáticamente
✅ **Simple** - Bot solo hace `process.exit(0)`, PM2 se encarga del resto
✅ **Logs** - Sistema de logs rotados integrado
✅ **Métricas** - CPU, memoria, uptime, restart count
✅ **Startup script** - Puede iniciar con el sistema operativo

### Alternativas descartadas
- **Spawn process**: Complejo, puede fallar, no tiene recovery
- **Nodemon/Bun watch**: Solo para file changes, no para restart manual

---

## Pasos de Implementación

### 1. Instalar PM2 globalmente
```bash
bun add -g pm2
```

**Verificación:**
```bash
pm2 --version
```

---

### 2. Crear archivo de configuración PM2

**Archivo:** `apps/telegram-bot/ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'waxin-bot',
    script: 'bun',
    args: 'src/bot.ts',
    cwd: './',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 1000,
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M'
  }]
}
```

**Configuración explicada:**
- `name`: Identificador del proceso
- `script`: Comando a ejecutar (bun)
- `args`: Argumentos (src/bot.ts)
- `autorestart`: Reinicio automático en crash
- `max_restarts`: Máximo 10 restarts en `min_uptime`
- `min_uptime`: Tiempo mínimo funcionando para considerar startup exitoso
- `restart_delay`: Espera 1s antes de reiniciar
- `max_memory_restart`: Reinicia si excede 500MB RAM

---

### 3. Implementar comando /restart

**Archivo:** `apps/telegram-bot/src/handlers/commands.ts`

**Agregar al final del archivo:**

```typescript
/** /restart command - Only for authorized users */
export async function handleRestart(ctx: Context): Promise<void> {
  commandLogger.debug(
    `${badge('CMD', 'rounded')} ${kv({
      cmd: '/restart',
      user: colorText(String(ctx.from?.id), colors.cyan),
    })}`
  )

  const userId = ctx.from?.id.toString()
  const authorizedUsers = process.env.ADMIN_USER_IDS?.split(',') || []

  // Check authorization
  if (!authorizedUsers.includes(userId)) {
    commandLogger.warn(
      `${badge('UNAUTHORIZED', 'rounded')} ${kv({
        user: userId,
        cmd: '/restart'
      })}`
    )
    await ctx.reply('❌ No tienes permisos para reiniciar el bot.')
    return
  }

  // Confirm restart to user
  await ctx.reply(
    '🔄 <b>Reiniciando bot...</b>\n\n' +
    'Volveré en unos segundos. Si no respondo en 10 segundos, ' +
    'revisa los logs con <code>pm2 logs waxin-bot</code>',
    { parse_mode: 'HTML' }
  )

  commandLogger.info(
    `${badge('RESTART', 'pill')} ${kv({
      requestedBy: colorText(userId, colors.cyan),
      reason: 'Manual restart via /restart command'
    })}`
  )

  // Give time for message to be sent
  setTimeout(() => {
    process.exit(0) // PM2 will restart automatically
  }, 500)
}
```

---

### 4. Exportar comando en index

**Archivo:** `apps/telegram-bot/src/handlers/index.ts`

**Agregar a las exportaciones:**

```typescript
export { handleRestart } from './commands.js'
```

---

### 5. Registrar comando en bot

**Archivo:** `apps/telegram-bot/src/bot.ts`

**Importar el handler (línea 24-35):**

```typescript
import {
  handleStart,
  handleHelp,
  handleMenu,
  handleStatus,
  handleHistory,
  handleCancel,
  handleClear,
  handleRestart,  // ← AGREGAR
  handleCallback,
  handleTextMessage,
  handleBots
} from './handlers/index.js'
```

**Registrar el comando (después de línea 89):**

```typescript
bot.command('restart', handleRestart)
```

---

### 6. Configurar variable de entorno

**Archivo:** `apps/telegram-bot/.env`

**Agregar:**

```env
# Admin users que pueden reiniciar el bot (comma-separated)
ADMIN_USER_IDS=265889349
```

**Para múltiples admins:**
```env
ADMIN_USER_IDS=265889349,123456789,987654321
```

---

### 7. Actualizar package.json scripts

**Archivo:** `apps/telegram-bot/package.json`

**Reemplazar sección scripts:**

```json
{
  "scripts": {
    "dev": "bun --watch src/bot.ts",
    "start": "bun src/bot.ts",
    "start:pm2": "pm2 start ecosystem.config.js",
    "stop:pm2": "pm2 stop waxin-bot",
    "restart:pm2": "pm2 restart waxin-bot",
    "delete:pm2": "pm2 delete waxin-bot",
    "logs:pm2": "pm2 logs waxin-bot --lines 100",
    "logs:pm2:follow": "pm2 logs waxin-bot",
    "status:pm2": "pm2 status",
    "monit:pm2": "pm2 monit",
    "build": "bun build ./src/bot.ts --outfile ./dist/bot.js --target node",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Proceso de Deploy

### Primera vez - Migrar de `bun start` a PM2

1. **Detener bot actual:**
   ```bash
   # Si está corriendo con bun start, hacer Ctrl+C
   # O matar el proceso:
   pkill -f "bun src/bot.ts"
   ```

2. **Verificar que no hay instancias corriendo:**
   ```bash
   ps aux | grep "bun src/bot.ts"
   ```

3. **Iniciar con PM2:**
   ```bash
   cd apps/telegram-bot
   bun run start:pm2
   ```

4. **Verificar que arrancó:**
   ```bash
   bun run status:pm2
   ```

   Debería mostrar:
   ```
   ┌─────┬──────────────┬─────────┬─────────┬──────────┐
   │ id  │ name         │ status  │ cpu     │ memory   │
   ├─────┼──────────────┼─────────┼─────────┼──────────┤
   │ 0   │ waxin-bot    │ online  │ 0.2%    │ 45.3 MB  │
   └─────┴──────────────┴─────────┴─────────┴──────────┘
   ```

5. **Ver logs en vivo:**
   ```bash
   bun run logs:pm2:follow
   ```

---

## Uso Post-Implementación

### Desde Telegram
```
/restart
```

El bot responde:
> 🔄 **Reiniciando bot...**
>
> Volveré en unos segundos. Si no respondo en 10 segundos, revisa los logs con `pm2 logs waxin-bot`

Bot se apaga → PM2 detecta → PM2 reinicia automáticamente en ~1-2 segundos.

### Desde Terminal

**Ver status:**
```bash
bun run status:pm2
```

**Ver logs últimas 100 líneas:**
```bash
bun run logs:pm2
```

**Seguir logs en tiempo real:**
```bash
bun run logs:pm2:follow
```

**Reiniciar manualmente:**
```bash
bun run restart:pm2
```

**Detener bot:**
```bash
bun run stop:pm2
```

**Eliminar de PM2 (sin delete):**
```bash
bun run delete:pm2
```

**Monitoreo visual:**
```bash
bun run monit:pm2
```

---

## Testing Plan

### Test 1: Restart básico
1. Bot corriendo con PM2
2. Enviar `/restart` desde Telegram
3. **Esperado:** Bot responde "Reiniciando...", desaparece ~1-2seg, vuelve online
4. **Verificar:** Bot responde a `/status` después del restart

### Test 2: Restart sin permisos
1. Pedir a otro usuario (no admin) que envíe `/restart`
2. **Esperado:** Bot responde "❌ No tienes permisos..."
3. **Verificar:** Bot NO se reinicia

### Test 3: Crash recovery
1. Bot corriendo con PM2
2. Simular crash: `pm2 stop waxin-bot`
3. **Esperado:** PM2 detecta y reinicia automáticamente
4. **Verificar:** Bot vuelve online en <5 segundos

### Test 4: Memory leak protection
1. Forzar consumo de memoria (opcional, solo si se sospecha leak)
2. **Esperado:** PM2 reinicia si excede 500MB
3. **Verificar:** Bot vuelve con memoria normal

---

## Rollback Plan

Si PM2 causa problemas:

1. **Detener PM2:**
   ```bash
   pm2 stop waxin-bot
   pm2 delete waxin-bot
   ```

2. **Volver a `bun start`:**
   ```bash
   bun start
   ```

3. **Comentar comando /restart en bot.ts:**
   ```typescript
   // bot.command('restart', handleRestart) // Disabled until PM2 is fixed
   ```

---

## Consideraciones de Seguridad

### Autenticación
- Solo usuarios en `ADMIN_USER_IDS` pueden ejecutar `/restart`
- Logs registran quién solicitó el restart
- Si alguien no autorizado intenta, se loggea como WARNING

### Rate Limiting (futuro)
- Considerar implementar cooldown de 30s entre restarts
- Prevenir spam de restarts que podría causar downtime

### Monitoreo
- PM2 loggea todos los restarts en `logs/pm2-*.log`
- Bot loggea request de restart con user ID
- Revisar logs periódicamente para detectar abusos

---

## Checklist de Implementación

- [ ] Instalar PM2 globalmente
- [ ] Crear `ecosystem.config.js`
- [ ] Agregar `handleRestart()` en `commands.ts`
- [ ] Exportar en `handlers/index.ts`
- [ ] Importar y registrar en `bot.ts`
- [ ] Agregar `ADMIN_USER_IDS` en `.env`
- [ ] Actualizar scripts en `package.json`
- [ ] Detener bot actual (Ctrl+C o kill)
- [ ] Iniciar con PM2: `bun run start:pm2`
- [ ] Verificar status: `bun run status:pm2`
- [ ] Test 1: `/restart` desde Telegram
- [ ] Test 2: `/restart` con usuario no-admin
- [ ] Test 3: Simular crash y verificar recovery
- [ ] Verificar logs: `bun run logs:pm2`
- [ ] Documentar en README (opcional)

---

## Notas Adicionales

### PM2 Startup Script (opcional)
Para que el bot arranque automáticamente al iniciar el sistema:

```bash
pm2 startup
pm2 save
```

Esto genera un script de systemd/launchd/etc. que inicia PM2 al boot.

### PM2 en Producción
Si se despliega en un servidor remoto:
- Usar `pm2 deploy` para automatizar deploys
- Configurar `pm2-logrotate` para rotar logs
- Monitorear con PM2 Plus (servicio cloud de PM2)

### Alternativa: systemd
Si PM2 no funciona bien, se puede usar systemd:
```ini
[Unit]
Description=Waxin Telegram Bot
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/apps/telegram-bot
ExecStart=/usr/bin/bun src/bot.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Pero PM2 es más fácil y tiene mejores features.

---

## Status Updates

| Fecha | Status | Notas |
|-------|--------|-------|
| 2026-01-14 | Plan creado | Esperando aprobación para implementar |
| | | |

---

## Recursos

- [PM2 Docs](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)
- [PM2 Process Management](https://pm2.keymetrics.io/docs/usage/process-management/)
