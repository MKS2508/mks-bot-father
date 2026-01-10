# Eventos y Hooks en OpenTUI

Guía completa del sistema de eventos (mouse, teclado) y hooks de React en OpenTUI.

## Tabla de Contenidos

- [Sistema de Eventos](#sistema-de-eventos)
- [Eventos de Teclado](#eventos-de-teclado)
- [Eventos de Mouse](#eventos-de-mouse)
- [Hooks de React](#hooks-de-react)
- [Patrones de Event Handling](#patrones-de-event-handling)
- [Ejemplos Prácticos](#ejemplos-prácticos)

---

## Sistema de Eventos

OpenTUI tiene un sistema de eventos completo que soporta:

- **Eventos de teclado**: Incluyendo modificadores (ctrl, shift, meta, super)
- **Eventos de mouse**: Click, drag, scroll
- **Event bubbling**: Los eventos propagan hacia arriba en el árbol
- **Global y local events**: Manejo a nivel renderer o componente

### Event Bubbling

```typescript
// Los eventos bubblingean hacia arriba automáticamente
parent.on("mouse-down", (event) => {
  // Event bubbles from child to parent
})

// Detener propagación
child.on("mouse-down", (event) => {
  event.stopPropagation()  // No bubble al padre
})
```

---

## Eventos de Teclado

### KeyEvent Interface

```typescript
interface KeyEvent {
  name: string           // "a", "return", "escape", "space", etc.
  sequence: string       // Secuencia cruda de caracteres
  ctrl: boolean          // Ctrl pressed
  shift: boolean         // Shift pressed
  meta: boolean          // Alt/Option pressed
  super: boolean         // Windows/Command pressed
  hyper: boolean
}
```

### Nombres de Teclas Comunes

| Categoría | Teclas |
|-----------|--------|
| **Letras** | `a` - `z` |
| **Números** | `0` - `9` |
| **Función** | `f1` - `f12` |
| **Especiales** | `return`, `enter`, `escape`, `tab`, `backspace`, `delete`, `space` |
| **Navigación** | `up`, `down`, `left`, `right`, `home`, `end`, `pageup`, `pagedown` |
| **Símbolos** | `+`, `-`, `=`, `[`, `]`, `\`, `;`, `'`, `,`, `.`, `/`, `` ` `` |

### useKeyboard Hook

```typescript
import { useKeyboard } from "@opentui/react"

function App() {
  useKeyboard((key: KeyEvent) => {
    if (key.name === "escape") {
      process.exit(0)
    }

    if (key.ctrl && key.name === "c") {
      console.log("Ctrl+C pressed")
    }

    if (key.ctrl && key.shift && key.name === "d") {
      console.log("Ctrl+Shift+D pressed")
    }
  })

  // ...
}
```

### Opciones de useKeyboard

```typescript
useKeyboard(handler, {
  release: true  // Incluir key release events (default: false)
})

// Solo key press
useKeyboard((key) => {
  if (key.name === "a") console.log("A pressed")
})

// Key press + release
useKeyboard((key) => {
  if (key.name === "a") console.log("A:", key)
}, { release: true })
```

### KeyBindings System

```typescript
import {
  mergeKeyBindings,
  buildKeyBindingsMap,
  getKeyBindingKey
} from "@opentui/core"

interface KeyBinding<T> {
  name: string
  ctrl?: boolean
  shift?: boolean
  meta?: boolean
  super?: boolean
  action: T
}

const bindings: KeyBinding<string>[] = [
  { name: "left", action: "move-left" },
  { name: "a", ctrl: true, action: "line-home" },
  { name: "c", ctrl: true, shift: true, action: "copy" }
]

// Construir map para lookup rápido
const keyMap = buildKeyBindingsMap(bindings)

// Buscar binding
const binding = keyMap.get(getKeyBindingKey({
  name: "a",
  ctrl: true,
  shift: false
}))
// → "line-home"
```

### KeyBindings en Componentes

```typescript
// Input component
const input = Input({
  keyBindings: [
    { name: "left", action: "move-left" },
    { name: "right", action: "move-right" },
    { name: "a", ctrl: true, action: "line-home" },
    { name: "e", ctrl: true, action: "line-end" }
  ]
})

// Select component
const select = Select({
  keyBindings: [
    { name: "up", action: "move-up" },
    { name: "down", action: "move-down" },
    { name: "k", action: "move-up" },      // Vim-style
    { name: "j", action: "move-down" }     // Vim-style
  ]
})
```

### KeyAliasMap

```typescript
// Mapear mnemónicos custom a teclas
const aliasMap: KeyAliasMap = {
  "quit": ["q", "escape"],
  "save": ["s", "F1"],
  "help": ["?", "F10"]
}

const textarea = Textarea({
  keyAliasMap: aliasMap
})
```

---

## Eventos de Mouse

### MouseEvent Interface

```typescript
interface MouseEvent {
  type: MouseEventType
  x: number
  y: number
  button: number        // 0 = left, 1 = middle, 2 = right
  ctrl: boolean
  shift: boolean
  meta: boolean
}

enum MouseEventType {
  MOUSE_DOWN = "mouse-down",
  MOUSE_UP = "mouse-up",
  MOUSE_MOVE = "mouse-move",
  MOUSE_DRAG = "mouse-drag",
  SCROLL = "scroll",
  WHEEL = "wheel"
}
```

### Event Handlers en Componentes

```typescript
const box = new BoxRenderable(renderer, {
  width: 20,
  height: 10
})

// Mouse down
box.onMouseDown = (event: MouseEvent) => {
  console.log("Click en", event.x, event.y)
}

// Mouse up
box.onMouseUp = (event: MouseEvent) => {
  console.log("Released")
}

// Mouse move
box.onMouseMove = (event: MouseEvent) => {
  console.log("Moved to", event.x, event.y)
}

// Mouse drag
box.onMouseDrag = (event: MouseEvent) => {
  console.log("Dragging to", event.x, event.y)
}
```

### Draggable Component

```typescript
class DraggableBox extends BoxRenderable {
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0

  constructor(renderer, options) {
    super(renderer, options)

    this.onMouseDown = (event) => {
      this.isDragging = true
      this.dragStartX = event.x - this.x
      this.dragStartY = event.y - this.y
    }

    this.onMouseUp = () => {
      this.isDragging = false
    }

    this.onMouseDrag = (event) => {
      if (this.isDragging) {
        this.x = event.x - this.dragStartX
        this.y = event.y - this.dragStartY
        this.requestRender()
      }
    }
  }
}
```

### Click Detection

```typescript
class ClickableBox extends BoxRenderable {
  private mouseDownX = 0
  private mouseDownY = 0

  constructor(renderer, options) {
    super(renderer, options)

    this.onMouseDown = (event) => {
      this.mouseDownX = event.x
      this.mouseDownY = event.y
    }

    this.onMouseUp = (event) => {
      // Verificar si fue un click (no drag)
      const dx = Math.abs(event.x - this.mouseDownX)
      const dy = Math.abs(event.y - this.mouseDownY)

      if (dx < 3 && dy < 3) {
        this.onClick(event)
      }
    }
  }

  private onClick(event: MouseEvent) {
    console.log("Clicked!")
  }
}
```

### Scroll Events

```typescript
// ScrollBox maneja scroll automáticamente
const scrollBox = ScrollBox({
  scrollY: true
})

// Detectar scroll
scrollBox.on("scroll", (event) => {
  console.log("Scrolled to", event.scrollTop)
})
```

---

## Hooks de React

OpenTUI proporciona hooks específicos para integración con React.

### useRenderer

```typescript
import { useRenderer } from "@opentui/react"

function App() {
  const renderer = useRenderer()

  // Acceder al renderer
  const toggleConsole = () => {
    renderer.console.toggle()
  }

  const toggleDebug = () => {
    renderer.toggleDebugOverlay()
  }

  return Box({},
    Text({ content: "Press C for console" })
  )
}
```

### useTerminalDimensions

```typescript
import { useTerminalDimensions } from "@opentui/react"

function ResponsiveBox() {
  const { width, height } = useTerminalDimensions()

  return Box({
    width: width * 0.8,
    height: height * 0.6
  },
    Text({ content: `Terminal: ${width}x${height}` })
  )
}
```

### useOnResize

```typescript
import { useOnResize } from "@opentui/react"

function App() {
  useOnResize((width, height) => {
    console.log(`Resized to ${width}x${height}`)
  })

  // ...
}
```

### useTimeline

```typescript
import { useTimeline } from "@opentui/react"

function AnimatedBox() {
  const boxRef = useRef(null)

  const timeline = useTimeline({
    duration: 2000,
    loop: false,
    autoplay: true
  })

  useEffect(() => {
    if (boxRef.current) {
      timeline.add(
        { width: 0 },
        { width: 50, duration: 2000, ease: "linear" }
      )
    }
  }, [])

  return Box({
    ref: boxRef
  },
    Text({ content: "Animado!" })
  )
}
```

### useFocus

```typescript
import { useFocus } from "@opentui/react"

function FocusableInput() {
  const [focused, bind] = useFocus()

  return Input({
    ...bind,
    placeholder: focused ? "Escribiendo..." : "Click para enfocar"
  })
}
```

### useEffectEvent (Custom Hook)

```typescript
// Hook custom para ejecutar efectos periódicamente
function useFrameCallback(callback: () => void, fps: number = 30) {
  const renderer = useRenderer()

  useEffect(() => {
    let frameCount = 0

    const handler = renderer.setFrameCallback(() => {
      frameCount++
      if (frameCount % Math.round(60 / fps) === 0) {
        callback()
      }
    })

    return () => {
      renderer.clearFrameCallback(handler)
    }
  }, [callback, fps])
}

// Uso
function Clock() {
  const [time, setTime] = useState(new Date())

  useFrameCallback(() => {
    setTime(new Date())
  }, 1)  // 1 FPS

  return Text({ content: time.toLocaleTimeString() })
}
```

---

## Patrones de Event Handling

### Shortcut Keys Globales

```typescript
function App() {
  useKeyboard((key) => {
    // Shortcuts globales
    switch (key.name) {
      case "q":
      case "escape":
        process.exit(0)
      case "?":
        toggleHelp()
        break
      case "c":
        if (key.ctrl) toggleConsole()
        break
    }
  })

  return // ...
}
```

### Modos de Input

```typescript
function App() {
  const [mode, setMode] = useState("normal") // "normal" | "insert" | "command"

  useKeyboard((key) => {
    if (mode === "normal") {
      // Vim-style navigation
      if (key.name === "i") setMode("insert")
      if (key.name === ":") setMode("command")
    } else if (mode === "insert") {
      // Escape para volver a normal
      if (key.name === "escape") setMode("normal")
    }
  })

  return Box({},
    Text({ content: `Mode: ${mode}` }),
    mode === "insert" ? Input() : Text({ content: "Normal mode" })
  )
}
```

### Multi-Key Shortcuts

```typescript
function App() {
  const [pendingKeys, setPendingKeys] = useState([])

  useKeyboard((key) => {
    const newKeys = [...pendingKeys, key.name]

    // Detectar secuencia "g", "g" (vim-style go to top)
    if (newKeys.join(",") === "g,g") {
      scrollToTop()
      setPendingKeys([])
      return
    }

    // Reset si no hay match en 500ms
    setTimeout(() => {
      setPendingKeys([])
    }, 500)

    setPendingKeys(newKeys.slice(-2))  // Mantener último 2
  })

  return // ...
}
```

### Context Menu en Click Derecho

```typescript
function ContextMenu() {
  const [visible, setVisible] = useState(false)
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)

  const container = useRef(null)

  useEffect(() => {
    if (!container.current) return

    container.current.onMouseUp = (event) => {
      // Click derecho
      if (event.button === 2) {
        setX(event.x)
        setY(event.y)
        setVisible(true)
      }
    }
  }, [])

  if (!visible) return null

  return Box({
    position: "absolute",
    x, y,
    border: true,
    backgroundColor: "#333"
  },
    Text({ content: "Option 1" }),
    Text({ content: "Option 2" })
  )
}
```

---

## Ejemplos Prácticos

### Editor de Texto con Shortcuts

```tsx
function TextEditor() {
  const [content, setContent] = useState("")
  const [cursor, setCursor] = useState(0)

  useKeyboard((key) => {
    if (key.ctrl) {
      switch (key.name) {
        case "s":
          saveFile(content)
          break
        case "o":
          openFile()
          break
        case "f":
          searchInFile()
          break
      }
    }
  })

  return Box({},
    Text({ content: "Ctrl+S: Save | Ctrl+O: Open | Ctrl+F: Find" }),
    Textarea({
      value: content,
      onChange: setContent
    })
  )
}
```

### Slider con Drag

```tsx
class DraggableSlider extends BoxRenderable {
  private value: number = 50
  private isDragging: boolean = false

  constructor(renderer, options) {
    super(renderer, {
      width: 50,
      height: 3,
      border: true,
      ...options
    })

    this.onMouseDown = (event) => {
      this.isDragging = true
      this.updateValue(event.x)
    }

    this.onMouseUp = () => {
      this.isDragging = false
    }

    this.onMouseDrag = (event) => {
      if (this.isDragging) {
        this.updateValue(event.x)
      }
    }
  }

  private updateValue(mouseX: number) {
    const relativeX = mouseX - this.x
    const percentage = Math.max(0, Math.min(1, relativeX / this.width))
    this.value = Math.round(percentage * 100)
    this.requestRender()
  }

  protected renderSelf(buffer): void {
    super.renderSelf(buffer)

    // Draw filled portion
    const filledWidth = Math.round(this.width * (this.value / 100))
    buffer.fillRect(
      this.x + 1,
      this.y + 1,
      filledWidth,
      this.height - 2,
      RGBA.green()
    )

    // Draw value text
    buffer.drawText(
      `${this.value}%`,
      this.x + Math.round(this.width / 2) - 2,
      this.y + 1,
      RGBA.white()
    )
  }
}
```

### Lista con Keyboard Navigation

```tsx
function KeyboardList({ items }) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useKeyboard((key) => {
    switch (key.name) {
      case "up":
      case "k":
        setSelectedIndex(Math.max(0, selectedIndex - 1))
        break
      case "down":
      case "j":
        setSelectedIndex(Math.min(items.length - 1, selectedIndex + 1))
        break
      case "enter":
        console.log("Selected:", items[selectedIndex])
        break
    }
  })

  return Box({},
    items.map((item, index) => (
      Box({
        key: index,
        backgroundColor: index === selectedIndex ? "#555" : "#333",
        padding: 1
      },
        Text({
          content: `${index === selectedIndex ? "> " : "  "}${item.name}`
        })
      )
    ))
  )
}
```

---

## Referencias

- Fuente: `/Users/mks/opentui-original/packages/core/src/lib/KeyHandler.ts`
- Fuente: `/Users/mks/opentui-original/packages/core/src/lib/parse.keypress.ts`
- Fuente: `/Users/mks/opentui-original/packages/react/src/hooks/`
- Ejemplos: `/Users/mks/opentui-original/packages/core/src/examples/keypress-debug-demo.ts`
