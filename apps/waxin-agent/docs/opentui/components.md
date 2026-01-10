# Componentes de OpenTUI

Guía completa de todos los componentes disponibles en OpenTUI.

## Tabla de Contenidos

- [Box](#box)
- [Text](#text)
- [Input](#input)
- [Textarea](#textarea)
- [Select](#select)
- [TabSelect](#tabselect)
- [ScrollBox](#scrollbox)
- [ScrollBar](#scrollbar)
- [Slider](#slider)
- [Code](#code)
- [Diff](#diff)
- [ASCIIFont](#asciifont)
- [FrameBuffer](#framebuffer)

---

## Box

Contenedor fundamental con soporte para bordes, padding, margin y layout.

### Props

```typescript
interface BoxOptions {
  // Dimensiones
  width?: number | "auto" | `${number}%`
  height?: number | "auto" | `${number}%`
  minWidth?: number | `${number}%`
  minHeight?: number | `${number}%`
  maxWidth?: number | `${number}%`
  maxHeight?: number | `${number}%`

  // Layout (Yoga)
  flexDirection?: "row" | "column"
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly"
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch"
  flexWrap?: "nowrap" | "wrap"
  flexGrow?: number
  flexShrink?: number
  flexBasis?: number | "auto"

  // Posicionamiento
  position?: "relative" | "absolute"
  top?: number | `${number}%`
  left?: number | `${number}%`
  bottom?: number | `${number}%`
  right?: number | `${number}%`

  // Spacing
  padding?: number | `${number}%`
  margin?: number | `${number}%` | "auto"
  gap?: number | `${number}%`
  rowGap?: number | `${number}%`
  columnGap?: number | `${number}%`

  // Estilos
  backgroundColor?: string | RGBA
  opacity?: number
  zIndex?: number

  // Bordes
  border?: boolean | BorderSides[]  // ["top", "right", "bottom", "left"]
  borderStyle?: "single" | "double" | "rounded" | "dashed" | "thick"
  borderColor?: string | RGBA
  focusedBorderColor?: string | RGBA
  customBorderChars?: BorderCharacters

  // Título
  title?: string
  titleAlignment?: "left" | "center" | "right"

  // Otros
  shouldFill?: boolean  // Llenar con backgroundColor
  visible?: boolean
  focused?: boolean
}
```

### Ejemplo

```tsx
import { Box, Text } from "@opentui/react"
import { bold } from "@opentui/core"

// Contenedor básico
Box({ padding: 2, border: true },
  Text({ content: "Contenido" })
)

// Layout con Flexbox
Box({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 1,
  gap: 2
},
  Text({ content: "Izquierda" }),
  Text({ content: "Derecha" })
)

// Posicionamiento absoluto
Box({ position: "absolute", top: 10, left: 5 },
  Text({ content: "Posicionado" })
)
```

---

## Text

Componente para texto estilizado con soporte para colores y atributos.

### Props

```typescript
interface TextOptions {
  content?: StyledText | string
  fg?: string | RGBA
  bg?: string | RGBA
  attributes?: TextAttributes  // BOLD, ITALIC, UNDERLINE, etc.
}
```

### Styled Text (Template Literals)

```typescript
import { t, bold, fg, bg, underline, italic } from "@opentui/core"

// Composición de estilos
const styled = t`${bold(underline(fg("red")("Importante!")))}`

// Colores
const colored = t`${fg("#FF0000")("Rojo")} y ${fg("blue")("Azul")}`

// Background
const withBg = t`${bg("yellow")("Fondo amarillo")}`

// Combinar múltiples estilos
const complex = t`${bold(italic(fg("green")("Texto complejo")))}`
```

### TextAttributes (Bitwise)

```typescript
enum TextAttributes {
  NONE = 0,
  BOLD = 1 << 0,        // 1
  DIM = 1 << 1,         // 2
  ITALIC = 1 << 2,      // 4
  UNDERLINE = 1 << 3,   // 8
  BLINK = 1 << 4,       // 16
  INVERSE = 1 << 5,     // 32
  HIDDEN = 1 << 6,      // 64
  STRIKETHROUGH = 1 << 7 // 128
}

// Combinar con bitwise OR
const boldUnderline = TextAttributes.BOLD | TextAttributes.UNDERLINE
```

### Ejemplo

```tsx
import { Text } from "@opentui/react"
import { t, bold, fg, underline } from "@opentui/core"

// Simple
Text({ content: "Texto simple" })

// Con estilos directos
Text({
  content: "Texto azul bold",
  fg: "blue",
  attributes: TextAttributes.BOLD
})

// Con styled text
Text({
  content: t`${bold(underline(fg("red")("Alerta!")))}} Normal`
})
```

---

## Input

Campo de entrada de texto single-line con soporte para placeholder, cursor y validación.

### Props

```typescript
interface InputRenderableOptions {
  // Contenido
  value?: string
  placeholder?: string
  maxLength?: number

  // Estilos
  backgroundColor?: string | RGBA
  textColor?: string | RGBA
  focusedBackgroundColor?: string | RGBA
  focusedTextColor?: string | RGBA
  placeholderColor?: string | RGBA

  // Cursor
  cursorColor?: string | RGBA
  cursorStyle?: {
    style: "block" | "line" | "underline"
    blinking: boolean
  }

  // Keybindings
  keyBindings?: InputKeyBinding[]
  keyAliasMap?: KeyAliasMap

  // Layout
  width?: number | "auto" | `${number}%`
  height?: number | "auto" | `${number}%`
}
```

### Eventos

```typescript
// Eventos disponibles
enum InputRenderableEvents {
  INPUT = "input",       // Emitido en cada cambio
  CHANGE = "change",     // Emitido en blur
  ENTER = "enter"        // Emitido al presionar Enter
}

// Uso
input.on(InputRenderableEvents.INPUT, (value: string) => {
  console.log("Input:", value)
})
```

### KeyBindings por Defecto

| Key | Action |
|-----|--------|
| `left` / `b` | Mover cursor izquierda |
| `right` / `f` | Mover cursor derecha |
| `home` / `a` + ctrl | Inicio de línea |
| `end` / `e` + ctrl | Fin de línea |
| `backspace` | Borrar carácter anterior |
| `delete` | Borrar carácter siguiente |
| `delete` + ctrl | Borrar palabra siguiente |
| `backspace` + ctrl | Borrar palabra anterior |
| `enter` | Submit |

### Ejemplo

```tsx
import { Input } from "@opentui/react"

// Básico
Input({
  placeholder: "Escribe algo...",
  focused: true
})

// Con eventos
const input = Input({
  placeholder: "Username...",
  backgroundColor: "#333",
  focusedBackgroundColor: "#444"
})

input.on(InputRenderableEvents.INPUT, (value) => {
  console.log("Escribiendo:", value)
})

input.on(InputRenderableEvents.ENTER, (value) => {
  console.log("Enviado:", value)
})
```

---

## Textarea

Área de texto multi-line con soporte para edición completa.

### Props

```typescript
interface TextareaOptions extends EditBufferOptions {
  initialValue?: string
  placeholder?: StyledText | string | null
  onSubmit?: (event: SubmitEvent) => void
  keyBindings?: KeyBinding[]
  keyAliasMap?: KeyAliasMap

  // EditBufferOptions
  wordWrap?: boolean
  tabSize?: number
  maxLines?: number
}
```

### Eventos

```typescript
// onSubmit event
textarea.onSubmit = (event: SubmitEvent) => {
  console.log("Enviado:", textarea.value)
}
```

### KeyBindings

| Key | Action |
|-----|--------|
| `enter` | Nueva línea |
| `enter` + ctrl | Submit |
| `tab` | Insertar tabulación |

### Ejemplo

```tsx
import { Textarea } from "@opentui/react"

const textarea = Textarea({
  initialValue: "Texto inicial\n",
  placeholder: "Escribe algo...",
  wordWrap: true,
  onSubmit: (event) => {
    console.log("Contenido:", textarea.value)
  }
})
```

---

## Select

Lista de selección con navegación por teclado y soporte para descripciones.

### Props

```typescript
interface SelectRenderableOptions {
  options?: SelectOption[]  // { name, description, value }
  selectedIndex?: number
  wrapSelection?: boolean
  showDescription?: boolean
  showScrollIndicator?: boolean
  itemSpacing?: number
  fastScrollStep?: number

  // Fuente para scroll indicator
  font?: "tiny" | "block" | "slick" | "shade"

  // Estilos
  backgroundColor?: string | RGBA
  selectedBackgroundColor?: string | RGBA

  // Keybindings
  keyBindings?: SelectKeyBinding[]
}

interface SelectOption {
  name: string | StyledText
  description?: string | StyledText
  value?: any
}
```

### Eventos

```typescript
enum SelectRenderableEvents {
  SELECTION_CHANGED = "selection-changed",
  ITEM_SELECTED = "item-selected"
}

select.on(SelectRenderableEvents.SELECTION_CHANGED, (index: number) => {
  console.log("Selección cambiada:", index)
})

select.on(SelectRenderableEvents.ITEM_SELECTED, (option: SelectOption) => {
  console.log("Item seleccionado:", option)
})
```

### KeyBindings

| Key | Action |
|-----|--------|
| `up` / `k` | Mover arriba |
| `down` / `j` | Mover abajo |
| `home` | Ir al inicio |
| `end` | Ir al final |
| `enter` | Seleccionar item |
| `pageup` | Scroll rápido arriba |
| `pagedown` | Scroll rápido abajo |

### Ejemplo

```tsx
import { Select } from "@opentui/react"

const select = Select({
  options: [
    { name: "Opción 1", description: "Descripción 1", value: 1 },
    { name: "Opción 2", description: "Descripción 2", value: 2 },
    { name: "Opción 3", description: "Descripción 3", value: 3 },
  ],
  selectedIndex: 0,
  showDescription: true,
  showScrollIndicator: true,
  backgroundColor: "#333",
  selectedBackgroundColor: "#555"
})

select.on(SelectRenderableEvents.ITEM_SELECTED, (option) => {
  console.log("Seleccionado:", option.value)
})
```

---

## TabSelect

Selección horizontal con tabs.

### Props

```typescript
interface TabSelectOptions {
  options?: string[] | StyledText[]
  selectedIndex?: number
  wrapSelection?: boolean

  // Estilos
  backgroundColor?: string | RGBA
  selectedBackgroundColor?: string | RGBA

  // Keybindings
  keyBindings?: TabSelectKeyBinding[]
}
```

### KeyBindings

| Key | Action |
|-----|--------|
| `left` / `[` | Tab anterior |
| `right` / `]` | Siguiente tab |
| `enter` | Seleccionar tab |

### Ejemplo

```tsx
import { TabSelect } from "@opentui/react"

const tabs = TabSelect({
  options: ["Tab 1", "Tab 2", "Tab 3"],
  selectedIndex: 0,
  selectedBackgroundColor: "#555"
})
```

---

## ScrollBox

Contenedor con scroll horizontal y/o vertical.

### Props

```typescript
interface ScrollBoxOptions {
  rootOptions?: BoxOptions
  wrapperOptions?: BoxOptions
  viewportOptions?: BoxOptions
  contentOptions?: BoxOptions
  scrollbarOptions?: ScrollBarOptions

  // Scroll
  scrollX?: boolean
  scrollY?: boolean
  stickyScroll?: boolean
  stickyStart?: "bottom" | "top" | "left" | "right"

  // Comportamiento
  scrollAcceleration?: "linear" | "macos"
  viewportCulling?: boolean  // Solo renderiza visible
}
```

### Propiedades

```typescript
scrollBox.scrollTop       // Posición scroll Y
scrollBox.scrollLeft      // Posición scroll X
scrollBox.scrollHeight    // Altura total del contenido
scrollBox.scrollWidth     // Ancho total del contenido
```

### Métodos

```typescript
// Scroll a posición
scrollBox.scrollTop = 100
scrollBox.scrollLeft = 50

// Scroll relativo
scrollBox.scrollTop += 10
```

### Ejemplo

```tsx
import { ScrollBox, Box } from "@opentui/react"

const scrollBox = ScrollBox({
  scrollY: true,
  viewportCulling: true,  // Performance
  height: 20
})

// Agregar items
for (let i = 0; i < 100; i++) {
  scrollBox.content.add(
    Box({ height: 2, backgroundColor: "#333" },
      Text({ content: `Item ${i}` })
    )
  )
}
```

---

## ScrollBar

Barra de scroll vertical u horizontal.

### Props

```typescript
interface ScrollBarOptions {
  orientation?: "vertical" | "horizontal"
  length?: number

  // Estilos
  backgroundColor?: string | RGBA
  trackColor?: string | RGBA
  thumbColor?: string | RGBA
  arrowColor?: string | RGBA

  // Flechas
  showArrows?: boolean
  arrowChars?: {
    up?: string
    down?: string
    left?: string
    right?: string
  }
}
```

### Ejemplo

```tsx
import { ScrollBar } from "@opentui/react"

const scrollbar = ScrollBar({
  orientation: "vertical",
  length: 20,
  thumbColor: "#555",
  trackColor: "#333"
})
```

---

## Slider

Slider numérico para selección de valores.

### Props

```typescript
interface SliderOptions {
  min?: number
  max?: number
  value?: number
  step?: number
  showValue?: boolean

  // Estilos
  backgroundColor?: string | RGBA
  filledColor?: string | RGBA
  thumbColor?: string | RGBA
  textColor?: string | RGBA
}
```

### Eventos

```typescript
slider.on("change", (value: number) => {
  console.log("Valor:", value)
})
```

### Ejemplo

```tsx
import { Slider } from "@opentui/react"

const slider = Slider({
  min: 0,
  max: 100,
  value: 50,
  step: 1,
  showValue: true,
  filledColor: "#555"
})
```

---

## Code

Bloque de código con syntax highlighting usando Tree-sitter.

### Props

```typescript
interface CodeOptions {
  content: string
  filetype?: string  // "javascript", "typescript", "zig", "markdown", etc.
  syntaxStyle?: SyntaxStyle
  wordWrap?: boolean
}
```

### Syntax Styles

```typescript
// Predefined styles
import { SyntaxStyle } from "@opentui/core"

const style = SyntaxStyle.fromHex({
  keyword: "#FF79C6",
  string: "#F1FA8C",
  comment: "#6272A4",
  // ...
})
```

### Lenguajes Soportados

- JavaScript
- TypeScript
- Zig
- Markdown
- Y más...

### Ejemplo

```tsx
import { Code } from "@opentui/react"

const code = Code({
  content: `function hello() {
  console.log("Hello!");
}`,
  filetype: "typescript",
  wordWrap: true
})
```

---

## Diff

Visor de diffs unificado o split.

### Props

```typescript
interface DiffOptions {
  filepath?: string
  oldContent?: string
  newContent?: string
  viewMode?: "unified" | "split"
  language?: string
  syntaxStyle?: SyntaxStyle
  wordWrap?: boolean
}
```

### Ejemplo

```tsx
import { Diff } from "@opentui/react"

const diff = Diff({
  oldContent: "const x = 1;",
  newContent: "const x = 2;",
  viewMode: "unified",
  language: "typescript"
})
```

---

## ASCIIFont

Texto ASCII art en diferentes estilos de fuente.

### Props

```typescript
interface ASCIIFontOptions {
  text: string
  font?: "tiny" | "block" | "slick" | "shade" | "pallet" | "huge"
  color?: string | RGBA
}
```

### Fuentes Disponibles

| Font | Descripción |
|------|-------------|
| `tiny` | Fuente pequeña |
| `block` | Bloques |
| `slick` | Estilo slick |
| `shade` | Sombras |
| `pallet` | Paleta |
| `huge` | Fuente grande |

### Ejemplo

```tsx
import { ASCIIFont } from "@opentui/react"

const ascii = ASCIIFont({
  text: "HOLA",
  font: "block",
  color: "yellow"
})
```

---

## FrameBuffer

Canvas personalizado para renderizado directo a nivel de celda.

### Props

```typescript
interface FrameBufferOptions {
  width: number
  height: number
}
```

### Métodos de Dibujo

```typescript
// Dibujar texto
frameBuffer.drawText(text, x, y, color)

// Dibujar rectángulo
frameBuffer.fillRect(x, y, width, height, color)

// Set celda individual
frameBuffer.setCell(x, y, char, fg, bg)

// Alpha blending
frameBuffer.setCellWithAlphaBlending(x, y, char, fg, bg, alpha)
```

### Ejemplo

```tsx
import { FrameBuffer } from "@opentui/react"

const canvas = FrameBuffer({ width: 40, height: 20 })

// Dibujar formas
canvas.frameBuffer.fillRect(5, 5, 10, 5, RGBA.red())
canvas.frameBuffer.drawText("Hola!", 10, 10, RGBA.white())
```

---

## Referencias

- Fuente: `/Users/mks/opentui-original/packages/core/src/renderables/`
- Ejemplos: `/Users/mks/opentui-original/packages/core/src/examples/`
