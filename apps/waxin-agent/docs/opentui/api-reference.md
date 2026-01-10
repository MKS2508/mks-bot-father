# API Reference de OpenTUI

Referencia completa de las APIs principales: CliRenderer, Renderable, OptimizedBuffer y utilidades.

## Tabla de Contenidos

- [CliRenderer](#clirenderer)
- [Renderable](#renderable)
- [OptimizedBuffer](#optimizedbuffer)
- [Utilidades](#utilidades)
- [Constantes y Enums](#constantes-y-enums)

---

## CliRenderer

El corazón de OpenTUI - maneja terminal I/O, renderizado y eventos.

### Constructor

```typescript
import { CliRenderer } from "@opentui/core"

const renderer = new CliRenderer(options?: CliRendererOptions)
```

### Opciones del Renderer

```typescript
interface CliRendererOptions {
  targetFps?: number        // FPS objetivo (default: 30)
  maxFps?: number           // FPS máximo (default: 60)
  useThreading?: boolean    // Usar threading (default: true, false en Linux)
  debugOverlay?: boolean    // Mostrar debug overlay (default: false)
}
```

### Propiedades Principales

```typescript
renderer.root              // Renderable raíz del árbol
renderer.isRunning         // boolean: está corriendo
renderer.width             // ancho de la terminal
renderer.height            // alto de la terminal
```

### Métodos de Ciclo de Vida

```typescript
// Iniciar renderer
renderer.start()

// Detener renderer
renderer.stop()

// Limpiar recursos
renderer.destroy()
```

### Console Overlay

```typescript
// Toggle console overlay (backtick por defecto)
renderer.console.toggle()

// Mostrar/ocultar
renderer.console.show()
renderer.console.hide()

// Posicionar console
renderer.console.setPosition("top" | "bottom" | "left" | "right")
renderer.console.setHeight(lines: number)

// Captura console.log/warn/error automáticamente
console.log("Esto aparece en el overlay")
```

### Debug Overlay

```typescript
// Toggle debug overlay (Ctrl+K por defecto)
renderer.toggleDebugOverlay()

// Habilitar/deshabilitar
renderer.showDebugOverlay = true
renderer.showDebugOverlay = false
```

### Métodos de Renderizado

```typescript
// Solicitar re-render
renderer.requestRender()

// Limpiar pantalla
renderer.clear()

// Refrescar pantalla
renderer.refresh()
```

### Eventos del Renderer

```typescript
// Evento de resize
renderer.on("resize", (width, height) => {
  console.log(`Terminal resized to ${width}x${height}`)
})

// Evento de focus/blur (terminal focus)
renderer.on("focus", () => console.log("Terminal focused"))
renderer.on("blur", () => console.log("Terminal blurred"))
```

### Frame Callbacks

```typescript
// Set callback que se ejecuta cada frame
const handler = renderer.setFrameCallback(() => {
  // Actualizar animaciones, stats, etc.
  updateStats()
})

// Clear callback
renderer.clearFrameCallback(handler)
```

### Mount de Componentes (React)

```typescript
// Mount React component
renderer.mount(<App />)

// Unmount
renderer.unmount()
```

---

## Renderable

Clase base para todos los componentes renderizables.

### Jerarquía de Clases

```
BaseRenderable
    ↓
Renderable
    ↓
BoxRenderable, TextRenderable, InputRenderable, etc.
```

### Propiedades de Layout (Yoga)

```typescript
renderable.yogaNode        // Yoga.Node para layout

// Dimensiones
renderable.width           // number | "auto" | `${number}%`
renderable.height          // number | "auto" | `${number}%`
renderable.minWidth        // number | `${number}%`
renderable.minHeight       // number | `${number}%`
renderable.maxWidth        // number | `${number}%`
renderable.maxHeight       // number | `${number}%`

// Layout
renderable.flexDirection   // "row" | "column"
renderable.justifyContent  // Yoga flex justify
renderable.alignItems      // Yoga flex align
renderable.flexGrow        // number
renderable.flexShrink      // number
renderable.flexBasis       // number | "auto"

// Posicionamiento
renderable.position        // "relative" | "absolute"
renderable.top             // number | `${number}%`
renderable.left            // number | `${number}%`
renderable.bottom          // number | `${number}%`
renderable.right           // number | `${number}%`

// Spacing
renderable.padding         // number | `${number}%`
renderable.margin          // number | `${number}%` | "auto"
renderable.gap             // number | `${number}%`
```

### Propiedades de Estilo

```typescript
// Visibilidad
renderable.visible         // boolean
renderable.opacity         // number (0-1)
renderable.zIndex          // number

// Background
renderable.backgroundColor // string | RGBA

// Focus
renderable.focused         // boolean
```

### Posición Calculada

```typescript
// Después del layout
renderable.x               // posición X calculada
renderable.y               // posición Y calculada
renderable.computedWidth   // ancho calculado
renderable.computedHeight  // alto calculado
```

### Gestión de Hijos

```typescript
// Agregar hijo
renderable.add(child: Renderable)

// Agregar múltiples hijos
renderable.add(child1, child2, child3)

// Remover hijo
renderable.remove(child: Renderable)

// Remover todos los hijos
renderable.removeAll()

// Obtener hijos
renderable.children        // Renderable[]

// Buscar hijo por ID
renderable.findById(id: string)  // Renderable | undefined
```

### Ciclo de Vida

```typescript
// Solicitar re-render de este componente
renderable.requestRender()

// Destruir componente
renderable.destroy()

// Destruir recursivamente (hijos incluidos)
renderable.destroyRecursively()
```

### Hooks de Renderizado

```typescript
// Antes de renderizar
renderable.renderBefore = (buffer: OptimizedBuffer) => {
  // Custom drawing antes del render normal
}

// Después de renderizar
renderable.renderAfter = (buffer: OptimizedBuffer) => {
  // Custom drawing después del render normal
}
```

### Eventos

```typescript
// Mouse events
renderable.onMouseDown = (event: MouseEvent) => {}
renderable.onMouseUp = (event: MouseEvent) => {}
renderable.onMouseMove = (event: MouseEvent) => {}
renderable.onMouseDrag = (event: MouseEvent) => {}

// Keyboard events (si tiene focus)
renderable.onKeyDown = (event: KeyEvent) => {}

// Focus events
renderable.onFocus = () => {}
renderable.onBlur = () => {}
```

### Focus Management

```typescript
// Enfocar componente
renderable.focus()

// Desenfocar
renderable.blur()

// Verificar si tiene focus
renderable.isFocused()  // boolean
```

### Eventos Personalizados (Emitter)

```typescript
// Emitir evento
renderable.emit("custom-event", data)

// Escuchar evento
renderable.on("custom-event", (data) => {
  console.log("Event received:", data)
})

// Dejar de escuchar
renderable.off("custom-event", handler)

// Una sola vez
renderable.once("custom-event", (data) => {})
```

---

## OptimizedBuffer

Surface de renderizado 2D optimizado para dibujar celdas, texto y formas.

### Creación

```typescript
import { OptimizedBuffer } from "@opentui/core"

const buffer = new OptimizedBuffer(width: number, height: number)
```

### Métodos de Dibujo

#### setCell

```typescript
// Set celda individual
buffer.setCell(
  x: number,
  y: number,
  char: string,
  fg: RGBA,
  bg: RGBA
)
```

#### setCellWithAlphaBlending

```typescript
// Set celda con alpha blending
buffer.setCellWithAlphaBlending(
  x: number,
  y: number,
  char: string,
  fg: RGBA,
  bg: RGBA,
  alpha: number  // 0-255
)
```

#### drawText

```typescript
// Dibujar texto
buffer.drawText(
  text: string,
  x: number,
  y: number,
  color: RGBA
)

// Con límite de ancho
buffer.drawText(
  text: string,
  x: number,
  y: number,
  color: RGBA,
  maxWidth: number
)
```

#### fillRect

```typescript
// Dibujar rectángulo relleno
buffer.fillRect(
  x: number,
  y: number,
  width: number,
  height: number,
  color: RGBA
)
```

#### drawBox

```typescript
// Dibujar caja con bordes
buffer.drawBox(
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fg?: RGBA,
    bg?: RGBA,
    borderStyle?: "single" | "double" | "rounded" | "dashed" | "thick"
    title?: string
  }
)
```

### Lectura de Buffer

```typescript
// Obtener celda
const cell = buffer.getCell(x: number, y: number)
// → { char: string, fg: RGBA, bg: RGBA }

### Dimensión

```typescript
buffer.width   // number
buffer.height  // number
```

### Limpiar

```typescript
// Limpiar todo el buffer
buffer.clear()

// Limpiar región
buffer.clearRect(x, y, width, height)
```

---

## Utilidades

### RGBA

```typescript
import { RGBA, parseColor } from "@opentui/core"

// Creación
RGBA.fromInts(r, g, b, a)        // 0-255
RGBA.fromValues(r, g, b, a)      // 0.0-1.0
RGBA.fromHex(hex)                // "#RRGGBB" o "#RRGGBBAA"
RGBA.fromAnsi(ansiCode)          // 0-255
parseColor(name)                 // "red", "blue", etc.

// Conversión
color.toInts()      // [r, g, b, a] 0-255
color.toHex()       // "#RRGGBBAA"
color.toAnsi()      // number

// Modificación
color.withAlpha(a)  // Nuevo color con alpha cambiado
color.withRed(r)    // Nuevo color con red cambiado
// ... withGreen, withBlue
```

### Styled Text

```typescript
import { t, bold, italic, underline, fg, bg, dim, blink, inverse, strikethrough } from "@opentui/core"

// Template literal
const text = t`Normal ${bold("negrita")} normal`

// Funciones de estilo
bold("text")
italic("text")
underline("text")
fg("red")("text")
bg("yellow")("text")
dim("text")
blink("text")
inverse("text")
strikethrough("text")

// Composición
t`${bold(underline(fg("red")("texto")))}`
```

### KeyHandler

```typescript
import {
  mergeKeyBindings,
  buildKeyBindingsMap,
  getKeyBindingKey
} from "@opentui/core"

// Merge keybindings
const merged = mergeKeyBindings(bindings1, bindings2)

// Construir map
const map = buildKeyBindingsMap(bindings)

// Obtener key de binding
const key = getKeyBindingKey({
  name: "a",
  ctrl: true,
  shift: false
})
// → "ctrl+a"
```

### Border Characters

```typescript
import { BorderCharacters, getBorderChars } from "@opentui/core"

// Obtener caracteres de borde
const chars = getBorderChars("single")
// → { topLeft: "┌", topRight: "┐", ... }

// Custom
const custom: BorderCharacters = {
  topLeft: "╔",
  topRight: "╗",
  bottomLeft: "╚",
  bottomRight: "╝",
  horizontal: "═",
  vertical: "║"
}
```

### TextAttributes

```typescript
import { TextAttributes } from "@opentui/core"

// Valores
TextAttributes.NONE            // 0
TextAttributes.BOLD            // 1
TextAttributes.DIM             // 2
TextAttributes.ITALIC          // 4
TextAttributes.UNDERLINE       // 8
TextAttributes.BLINK           // 16
TextAttributes.INVERSE         // 32
TextAttributes.HIDDEN          // 64
TextAttributes.STRIKETHROUGH   // 128

// Combinar
const boldUnderline = TextAttributes.BOLD | TextAttributes.UNDERLINE
```

---

## Constantes y Enums

### MouseEventType

```typescript
enum MouseEventType {
  MOUSE_DOWN = "mouse-down",
  MOUSE_UP = "mouse-up",
  MOUSE_MOVE = "mouse-move",
  MOUSE_DRAG = "mouse-drag",
  SCROLL = "scroll",
  WHEEL = "wheel"
}
```

### LogLevel (para logging)

```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}
```

### InputRenderableEvents

```typescript
enum InputRenderableEvents {
  INPUT = "input",       // En cada cambio
  CHANGE = "change",     // En blur
  ENTER = "enter"        // Al presionar Enter
}
```

### SelectRenderableEvents

```typescript
enum SelectRenderableEvents {
  SELECTION_CHANGED = "selection-changed",
  ITEM_SELECTED = "item-selected"
}
```

### BorderStyle

```typescript
type BorderStyle =
  | "single"
  | "double"
  | "rounded"
  | "dashed"
  | "thick"
```

### Alignment Values

```typescript
// Flex direction
type FlexDirection = "row" | "column"

// Justify content
type JustifyContent =
  | "flex-start"
  | "center"
  | "flex-end"
  | "space-between"
  | "space-around"
  | "space-evenly"

// Align items
type AlignItems =
  | "flex-start"
  | "center"
  | "flex-end"
  | "stretch"

// Position
type Position = "relative" | "absolute"
```

---

## Referencias

- Fuente: `/Users/mks/opentui-original/packages/core/src/renderer.ts`
- Fuente: `/Users/mks/opentui-original/packages/core/src/Renderable.ts`
- Fuente: `/Users/mks/opentui-original/packages/core/src/buffer.ts`
- Fuente: `/Users/mks/opentui-original/packages/core/src/types.ts`
