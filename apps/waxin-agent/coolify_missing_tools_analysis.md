# Análisis de Herramientas Faltantes - Coolify MCP Server

## Estado Actual

### Herramientas Disponibles ✅
1. `deploy` - Realizar deploy de aplicaciones existentes
2. `get_deployment_status` - Obtener estado del deployment
3. `set_env_vars` - Configurar variables de entorno

### Herramientas Faltantes ❌

#### 1. Gestión de Aplicaciones
```typescript
// Crear nueva aplicación
createApplication({
  teamId: string,
  projectId: string,
  name: string,
  description?: string,
  type: 'public-github' | 'private-github' | 'gitlab' | 'bitbucket' | 'docker' | 'nixpacks',
  repository: string,
  branch: string,
  buildPack?: string,
  // Configuración avanzada
  port?: number,
  installCommand?: string,
  buildCommand?: string,
  startCommand?: string,
  // Recursos
  cpu?: number,
  memory?: number,
  disk?: number
})

// Listar aplicaciones
listApplications({ teamId?, projectId? })

// Obtener detalles de aplicación
getApplication({ uuid })

// Eliminar aplicación
deleteApplication({ uuid })

// Actualizar configuración de aplicación
updateApplication({ uuid, ...config })
```

#### 2. Conexión con GitHub/Git
```typescript
// Conectar repositorio GitHub
connectGitHubRepository({
  applicationUuid: string,
  repository: string,  // owner/repo
  branch: string,
  githubAppId?: string,  // Si hay múltiples GitHub Apps
  autoDeploy?: boolean,
  webhookSecret?: string
})

// Sincronizar repositorio
syncRepository({ uuid })

// Obtener branches disponibles
getRepositoryBranches({ uuid })

// Cambiar branch
changeBranch({ uuid, branch })
```

#### 3. Configuración de Build
```typescript
// Configurar Nixpacks
configureNixpacks({
  uuid,
  nixpacksFilePath?: string,
  nixpacksConfig?: object
})

// Configurar Dockerfile
configureDockerfile({
  uuid,
  dockerfilePath: string,
  dockerContext?: string,
  dockerArgs?: string[]
})

// Configurar Docker Compose
configureDockerCompose({
  uuid,
  composeFilePath: string
})

// Configurar Docker Image
configureDockerImage({
  uuid,
  imageName: string,
  imageTag?: string,
  privateRegistry?: boolean,
  registryCredentials?: {
    username: string,
    password: string
  }
})
```

#### 4. Gestión de Dominios y SSL
```typescript
// Agregar dominio
addDomain({
  applicationUuid: string,
  domain: string,
  type: 'production' | 'redirect',
  redirectPath?: string
})

// Configurar SSL
configureSSL({
  domain: string,
  forceSSL: boolean,
  certificateType?: 'letsencrypt' | 'custom'
})

// Eliminar dominio
removeDomain({ domain })

// Listar dominios
listDomains({ applicationUuid })
```

#### 5. Gestión de Proyectos y Teams
```typescript
// Crear proyecto
createProject({
  teamId: string,
  name: string,
  description?: string
})

// Listar proyectos
listProjects({ teamId })

// Crear team
createTeam({ name })

// Listar teams
listTeams()
```

#### 6. Bases de Datos y Servicios
```typescript
// Crear base de datos
createDatabase({
  teamId: string,
  projectId: string,
  name: string,
  type: 'postgres' | 'mysql' | 'mongodb' | 'redis' | 'mariadb' | 'memcached',
  version: string,
  port?: number
})

// Listar bases de datos
listDatabases({ teamId, projectId })

// Eliminar base de datos
deleteDatabase({ uuid })

// Restart base de datos
restartDatabase({ uuid })
```

#### 7. Configuración de Webhooks
```typescript
// Configurar webhook
configureWebhook({
  applicationUuid: string,
  branch: string,
  events?: string[],  // ['push', 'pull_request']
  secret?: string
})

// Test webhook
testWebhook({ applicationUuid })

// Eliminar webhook
deleteWebhook({ applicationUuid, branch })
```

#### 8. Configuración de Recursos
```typescript
// Configurar recursos
configureResources({
  uuid,
  cpu: number,
  memory: number,
  disk: number
})

// Configurar límites
configureLimits({
  uuid,
  maxCpu?: number,
  maxMemory?: number,
  maxDisk?: number
})
```

#### 9. Gestión de Destinations (Servidores)
```typescript
// Crear destination
createDestination({
  teamId: string,
  name: string,
  type: 'ssh' | 'ip' | 'docker-compose',
  server: {
    host: string,
    port: number,
    user: string,
    sshKey?: string
  }
})

// Listar destinations
listDestinations({ teamId })

// Probar conexión
testDestination({ destinationId })
```

#### 10. Logs y Monitoring
```typescript
// Obtener logs
getLogs({
  applicationUuid: string,
  type?: 'build' | 'deploy' | 'application',
  limit?: number
})

// Obtener métricas
getMetrics({
  applicationUuid: string,
  period?: '1h' | '24h' | '7d' | '30d'
})

// Obtener estadísticas
getStats({ applicationUuid })
```

## Propuesta de Implementación

### Prioridad Alta (Para crear apps desde cero)
1. ✅ `createApplication` - Crear nueva aplicación
2. ✅ `connectGitHubRepository` - Conectar repo GitHub
3. ✅ `listApplications` - Listar apps existentes
4. ✅ `getApplication` - Obtener detalles de app
5. ✅ `configureNixpacks` / `configureDockerfile` - Configurar build

### Prioridad Media (Gestión avanzada)
6. ✅ `addDomain` / `configureSSL` - Dominios
7. ✅ `configureResources` - Recursos
8. ✅ `getLogs` - Logs
9. ✅ `deleteApplication` - Eliminar apps

### Prioridad Baja (Nice to have)
10. ✅ `createProject` / `createTeam` - Organización
11. ✅ `createDatabase` - Bases de datos
12. ✅ `getMetrics` - Monitoring

## Ejemplo de Flujo Completo con Nuevas Herramientas

```typescript
// 1. Crear aplicación desde GitHub repo
const app = await createApplication({
  teamId: "team_123",
  projectId: "project_456",
  name: "my-telegram-bot",
  type: "public-github",
  repository: "mks2508/telegram-bot",
  branch: "main",
  buildPack: "nixpacks"
});

// 2. Configurar variables de entorno
await set_env_vars({
  uuid: app.uuid,
  envVars: {
    BOT_TOKEN: "123:ABC",
    TELEGRAM_API_ID: "12345"
  }
});

// 3. Configurar dominio
await addDomain({
  applicationUuid: app.uuid,
  domain: "bot.example.com"
});

// 4. Realizar deploy
await deploy({ uuid: app.uuid });

// 5. Verificar deployment
const status = await get_deployment_status({ uuid: app.uuid });
```

## Referencia de API de Coolify

Endpoint base: `https://coolify.mks2508.dev/api/v1`

- `GET /applications` - Listar apps
- `POST /applications` - Crear app
- `GET /applications/{uuid}` - Detalles de app
- `DELETE /applications/{uuid}` - Eliminar app
- `POST /applications/{uuid}/deploy` - Deploy
- `GET /applications/{uuid}/deployment` - Status deployment
- `POST /applications/{uuid}/environment-variables` - Env vars
- `GET /applications/{uuid}/domains` - Listar dominios
- `POST /applications/{uuid}/domains` - Agregar dominio

## Recomendación

Crear un nuevo servidor MCP: **`@mks2508/mks-coolify`** con todas estas herramientas para tener gestión completa de Coolify.
