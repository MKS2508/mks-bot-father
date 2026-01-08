# MUST-FOLLOW-GUIDELINES.md

> **IMPORTANTE**: Este documento es la fuente de verdad para todas las reglas de desarrollo en este proyecto.
> **El incumplimiento de estas reglas sera motivo de correccion obligatoria en code review.**

---

## Stack Definitivo

| Herramienta | Version/Configuracion | Uso |
|-------------|----------------------|-----|
| **Runtime** | Bun v1.1.43+ | Package manager + runtime |
| **Bundling** | Rolldown v1.0.0-beta.58 | Build de packages |
| **Type Checking** | TSGO v7.0.0-dev (@typescript/native-preview) | TypeScript compiler |
| **Linting** | Oxlint v0.11.1 | Linting rapido (OxC-based) |
| **Formatting** | Prettier v3.4.2 + organize-imports | Formato de codigo |
| **Validation** | Arktype | Validacion de esquemas |
| **Versioning** | Changesets v2.27.11 | Versionado de packages |
| **Logging** | @mks2508/better-logger v4.0.0 | Logging estructurado |
| **Error Handling** | @mks2508/no-throw v0.1.0 | Result pattern |

---

## Estructura de Carpetas Obligatoria

### Root del Monorepo
```
mks-bot-father/
├── docs/                    # Documentacion del proyecto
├── tools/                   # Scripts y herramientas de desarrollo
├── core/
│   └── packages/
│       ├── main/
│       └── utils/
└── apps/
    └── example/
```

### Estructura de un Package
```
core/packages/main/
├── src/
│   ├── utils/               # Utilidades locales del package
│   │   └── index.ts         # Barrel export
│   ├── types/               # Tipos del dominio del package
│   │   ├── *.types.ts       # Tipos especificos
│   │   ├── constants.ts     # Constantes del package
│   │   └── index.ts         # Barrel export
│   ├── *.ts                 # Codigo fuente principal
│   └── index.ts             # Export principal
├── dist/                    # Build output
├── package.json
├── rolldown.config.ts
└── tsconfig.json
```

---

## REGLA 1: JSDoc Completo Profesional

### Requerimientos Obligatorios

TODA funcion, clase, metodo, interface, type, y constante exportada DEBE tener JSDoc completo:

```typescript
/**
 * Descripcion clara y concisa de que hace y por que.
 *
 * @example
 * ```typescript
 * // Codigo ejecutable que demuestra uso tipico
 * const result = await myFunction('example');
 * if (result.isErr()) {
 *   log.error('Failed', result.error);
 *   return;
 * }
 * console.log(result.value);
 * ```
 *
 * @param paramName - Descripcion del parametro
 * @returns Result<T, E> Descripcion del valor de retorno
 * @throws {AppError} Cuando y por que se lanza este error
 * @see {@link IOptions} Referencias a tipos relacionados
 */
export async function myFunction(
  param: string,
  options?: IOptions
): Promise<Result<string, AppError>> {
  // ...
}
```

### Tags Obligatorios

| Tag | Cuando usar | Formato |
|-----|-------------|---------|
| `@description` | Siempre | Primera linea (implicita) |
| `@param` | Cada parametro | `@param name - Description` |
| `@returns` | Siempre | `@returns Type - Description` |
| `@example` | Funciones publicas | Codigo TypeScript ejecutable |
| `@throws` | Si puede lanzar | `@throws {ErrorType} Cuando` |
| `@see` | Referencias | `@see {@link ISomething}` |

---

## REGLA 2: Logging - NUNCA console.log

### Obligatorio

```typescript
import { createLogger } from 'mks2508/utils/logger';

const log = createLogger('MyComponent');

// CORRECTO
log.info('Started');
log.success('Completed');
log.warn('High memory usage');
log.error('Failed to connect', { error });
log.critical('System failure');
```

### Prohibido

```typescript
// INCORRECTO
console.log('Started');
console.error('Failed');
console.info('Info');
console.warn('Warning');
```

---

## REGLA 3: Result Pattern - SIEMPRE

### Obligatorio

TODA operacion que pueda fallar DEBE usar `Result<T, E>` del package `mks2508/utils/result`:

```typescript
import {
  ok,
  tryCatch,
  type Result
} from 'mks2508/utils/result';
import {
  createAppError,
  AppErrorCode
} from 'mks2508/utils/result';

async function fetchData(
  url: string
): Promise<Result<string, AppError>> {
  const result = await tryCatch(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    },
    AppErrorCode.NetworkError
  );

  if (result.isErr()) {
    return createAppError(
      AppErrorCode.NetworkError,
      `Failed to fetch from ${url}`,
      result.error
    );
  }

  return ok(result.value);
}
```

---

## REGLA 4: Nomenclatura - Prefijo I

### Interfaces

```typescript
// CORRECTO - Prefijo I
export interface IOptions {
  url: string;
  timeout?: number;
}

export interface ICallback {
  onSuccess: () => void;
  onError: (error: Error) => void;
}
```

### Types (sin prefijo)

```typescript
// CORRECTO - Sin prefijo
export type Options = {
  url: string;
  timeout?: number;
};

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED';
```

---

## REGLA 5: Barrel Exports - SIEMPRE

TODA carpeta con multiples archivos DEBE tener un `index.ts` que exporte todo:

```typescript
// src/types/index.ts
export * from './main.types';
export * from './constants';
```

---

## REGLA 6: Async/Await - Preferencia

```typescript
// CORRECTO - Async/await
async function processFile(path: string): Promise<void> {
  const content = await readFile(path);
  const processed = await transform(content);
  await writeFile(path, processed);
}

// INCORRECTO - Promise chaining
function processFile(path: string) {
  return readFile(path)
    .then(content => transform(content))
    .then(processed => writeFile(path, processed));
}
```

---

## Checklist Pre-Commit

Antes de hacer commit de codigo, verificar:

- [ ] Todo codigo nuevo tiene JSDoc completo
- [ ] No hay `console.log/debug/error/info/warn`
- [ ] Todo lo que puede fallar usa `Result<T, E>`
- [ ] Interfaces tienen prefijo `I`
- [ ] Barrel exports en todas las carpetas
- [ ] Async/await en lugar de Promise chaining
- [ ] `bun run typecheck` pasa
- [ ] `bun run lint` pasa
- [ ] `bun run format` aplicado

---

## Fuentes de Referencia

- **CLAUDE.md** - Guia de arquitectura del monorepo
- **@mks2508/better-logger** - Documentacion del logger
- **@mks2508/no-throw** - Documentacion del Result pattern
- **Arktype** - https://arktype.io/
- **Rolldown** - https://rollup.rs/
- **Oxlint** - https://oxlint.com/
