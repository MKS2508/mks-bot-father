# OpenTUI - Documentación Completa

**OpenTUI** es un framework para construir interfaces de usuario en terminal (TUI) con TypeScript/JavaScript. Combina la potencia del layout engine Yoga (CSS Flexbox-like) con un sistema de renderizado optimizado y componentes reutilizables.

## Características Principales

- **Layout CSS Flexbox-like** con Yoga
- **Sistema de componentes** reutilizables (Box, Text, Input, Textarea, Select, etc.)
- **Styled text** con template literals
- **Syntax highlighting** con Tree-sitter
- **Eventos** de mouse y teclado completos
- **Integración con React** y SolidJS
- **Soporte para animaciones** con Timeline
- **Console overlay** integrado
- **Performance optimizada** con viewport culling

## Estructura de la Documentación

| Documento | Descripción |
|-----------|-------------|
| [components.md](./components.md) | Guía completa de todos los componentes disponibles |
| [layout.md](./layout.md) | Sistema de layout Yoga (Flexbox, posicionamiento, spacing) |
| [styles.md](./styles.md) | Sistema de estilos: colores, styled text, TextAttributes |
| [events-hooks.md](./events-hooks.md) | Sistema de eventos y hooks de React |
| [api-reference.md](./api-reference.md) | Referencia de APIs: CliRenderer, Renderable, Buffer |
| [patterns.md](./patterns.md) | Patrones comunes y best practices |
| [examples.md](./examples.md) | Ejemplos prácticos del repositorio |

## Quick Start

### Instalación

```bash
bun add @opentui/core @opentui/react
# o
npm install @opentui/core @opentui/react
```

### Ejemplo Básico (React)

```tsx
import { Box, Text } from "@opentui/react"
import { useRenderer } from "@opentui/react"
import { bold, fg } from "@opentui/core"

function App() {
  const renderer = useRenderer()

  return (
    Box({
      padding: 2,
      border: true,
      title: "Mi App",
    },
      Text({
        content: `${bold(fg("yellow")("Hola OpenTUI!"))}`,
      })
    )
  )
}

renderer.mount(<App />)
```

### Ejemplo Básico (Vanilla)

```typescript
import { BoxRenderable, TextRenderable, CliRenderer } from "@opentui/core"

const renderer = new CliRenderer()

const box = new BoxRenderable(renderer, {
  border: true,
  title: "Mi App",
  padding: 2,
})

const text = new TextRenderable(renderer, {
  content: "Hola OpenTUI!",
  bold: true,
})

box.add(text)
renderer.root.add(box)

renderer.start()
```

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      CliRenderer                            │
│  - Maneja terminal I/O                                       │
│  - Sistema de eventos (mouse, keyboard)                      │
│  - Loop de renderizado                                       │
│  - Console/Debug overlay                                     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Renderable Tree                          │
│  - BaseRenderable → Renderable → Componentes concretos      │
│  - Sistema de layout Yoga                                    │
│  - Event bubbling                                            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   OptimizedBuffer                           │
│  - Surface de renderizado 2D                                 │
│  - Alpha blending                                            │
│  - Drawing primitives                                        │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Principales

### Layout
- **Box** - Contenedor con bordes, padding, margin
- **ScrollBox** - Contenedor con scroll
- **ScrollBar** - Barra de scroll

### Display
- **Text** - Texto estilizado
- **ASCIIFont** - Texto ASCII art

### Input
- **Input** - Campo de texto single-line
- **Textarea** - Campo de texto multi-line
- **Select** - Lista de selección
- **TabSelect** - Selección por tabs
- **Slider** - Slider numérico

### Code
- **Code** - Bloque de código con syntax highlighting
- **Diff** - Visor de diffs
- **LineNumber** - Números de línea con diagnostics

### Advanced
- **FrameBuffer** - Canvas personalizado
- **VRenderable** - Wrapper genérico

## Próximos Pasos

1. Lee [components.md](./components.md) para conocer todos los componentes
2. Lee [layout.md](./layout.md) para entender el sistema de layout
3. Lee [styles.md](./styles.md) para aprender sobre estilos
4. Revisa [examples.md](./examples.md) para ejemplos prácticos
5. Consulta [patterns.md](./patterns.md) para best practices

## Referencias

- **Repositorio original**: `/Users/mks/opentui-original`
- **Core package**: `@opentui/core`
- **React package**: `@opentui/react`
- **SolidJS package**: `@opentui/solid`
