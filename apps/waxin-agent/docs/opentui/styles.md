# Sistema de Estilos en OpenTUI

Guía completa del sistema de estilos: colores, texto estilizado, atributos de texto y bordes.

## Tabla de Contenidos

- [Colores (RGBA)](#colores-rgba)
- [Styled Text](#styled-text)
- [TextAttributes](#textattributes)
- [Bordes](#bordes)
- [Estilos de Componente](#estilos-de-componente)
- [Ejemplos Prácticos](#ejemplos-prácticos)

---

## Colores (RGBA)

OpenTUI usa la clase `RGBA` para representar colores con soporte alpha.

### Creación de Colores

```typescript
import { RGBA, parseColor } from "@opentui/core"

// Desde enteros 0-255
const red = RGBA.fromInts(255, 0, 0, 255)
const green = RGBA.fromInts(0, 255, 0, 255)
const blue = RGBA.fromInts(0, 0, 255, 255)

// Desde floats 0.0-1.0
const halfRed = RGBA.fromValues(0.5, 0.0, 0.0, 1.0)

// Desde hex string
const yellow = RGBA.fromHex("#FFFF00")
const cyan = RGBA.fromHex("#00FFFF")

// Colores con nombre
const white = parseColor("white")
const black = parseColor("black")
const transparent = parseColor("transparent")

// Colores ANSI
const ansiRed = RGBA.fromAnsi(1)    // ANSI red
const ansiBlue = RGBA.fromAnsi(4)   // ANSI blue
```

### Colores ANSI Disponibles

| Código | Color |
|--------|-------|
| 0 | Black |
| 1 | Red |
| 2 | Green |
| 3 | Yellow |
| 4 | Blue |
| 5 | Magenta |
| 6 | Cyan |
| 7 | White |

### Métodos de RGBA

```typescript
const color = RGBA.fromHex("#FF0000")

// Convertir a otros formatos
color.toInts()      // [255, 0, 0, 255]
color.toHex()       // "#FF0000"
color.toAnsi()      // 1

// Clonar con modificaciones
color.withAlpha(128)      // 50% opacity
color.withRed(0)          // Cambiar red component
```

### Uso en Componentes

```typescript
// En props de componente
Box({
  backgroundColor: RGBA.fromHex("#333333"),
  borderColor: RGBA.fromInts(255, 255, 255, 255)
})

Text({
  fg: "red",           // String también funciona
  bg: RGBA.fromHex("#FFFF00")
})
```

---

## Styled Text

El sistema de styled text usa **template literals** para componer estilos de forma declarativa.

### Funciones Base

```typescript
import { t, bold, italic, underline, fg, bg } from "@opentui/core"

// t() - Template literal base
const text = t`Texto normal`

// bold() - Negrita
const boldText = t`${bold("Negrita")}`

// italic() - Cursiva
const italicText = t`${italic("Cursiva")}`

// underline() - Subrayado
const underText = t`${underline("Subrayado")}`

// fg() - Color de texto (foreground)
const redText = t`${fg("red")("Rojo")}`
const hexText = t`${fg("#FF0000")("Rojo hex")}`

// bg() - Color de fondo
const yellowBg = t`${bg("yellow")("Fondo amarillo")}`
```

### Composición de Estilos

```typescript
// Múltiples estilos anidados
const alert = t`${bold(underline(fg("red")("¡ALERTA!")))}`

// Mezclar estilos
const mixed = t`${bold("Negrita")} normal ${italic("cursiva")}`

// Colores con atributos
const fancy = t`${bold(fg("#00FFFF")("Texto cyan bold"))}`

// Composición compleja
const complex = t`
  ${bold(fg("yellow")("Título:")}
  ${underline(fg("cyan")("Subtítulo"))}
  Normal ${italic("énfasis")} final
`
```

### Funciones de Styled Text

```typescript
// dim() - Texto dim
const dimText = t`${dim("Tenue")}`

// blink() - Texto parpadeante
const blinkText = t`${blink("Parpadea")}`

// inverse() - Invertir fg/bg
const inverseText = t`${inverse("Invertido")}`

// strikethrough() - Tachado
const struck = t`${strikethrough("Tachado")}`

// hidden() - Texto oculto
const hidden = t`${hidden("Oculto")}`
```

### RGBA con Styled Text

```typescript
import { RGBA } from "@opentui/core"

const customColor = RGBA.fromHex("#FF00FF")

// Usar RGBA directamente
const custom = t`${fg(customColor)("Color custom")}`

// Alpha blending en texto
const semiTransparent = t`${bg(RGBA.fromInts(255, 0, 0, 128))("Semi-transparente")}`
```

---

## TextAttributes

Los atributos de texto son valores **bitwise** que pueden combinarse.

### Enum TextAttributes

```typescript
enum TextAttributes {
  NONE = 0,
  BOLD = 1 << 0,         // 1
  DIM = 1 << 1,          // 2
  ITALIC = 1 << 2,       // 4
  UNDERLINE = 1 << 3,    // 8
  BLINK = 1 << 4,        // 16
  INVERSE = 1 << 5,      // 32
  HIDDEN = 1 << 6,       // 64
  STRIKETHROUGH = 1 << 7 // 128
}
```

### Combinación de Atributos

```typescript
import { TextAttributes } from "@opentui/core"

// Combinar con bitwise OR
const boldUnderline = TextAttributes.BOLD | TextAttributes.UNDERLINE
const boldItalicUnderline = TextAttributes.BOLD | TextAttributes.ITALIC | TextAttributes.UNDERLINE

// Usar en componentes
Text({
  content: "Texto",
  attributes: boldUnderline
})

// Quitar atributo con bitwise AND y NOT
const noBold = boldUnderline & ~TextAttributes.BOLD  // Solo UNDERLINE
```

### Uso Directo en Props

```typescript
Text({
  content: "Texto bold",
  attributes: TextAttributes.BOLD
})

Text({
  content: "Texto combinado",
  attributes: TextAttributes.BOLD | TextAttributes.ITALIC | TextAttributes.UNDERLINE
})
```

---

## Bordes

Los bordes se configuran a través de props específicas en componentes como `Box`.

### Tipos de Borde

```typescript
Box({
  borderStyle: "single"    // (default)
  // borderStyle: "double"
  // borderStyle: "rounded"
  // borderStyle: "dashed"
  // borderStyle: "thick"
})
```

### Apariencia de Cada Estilo

```
single:  ┌─────────┐
         │ Content │
         └─────────┘

double:  ╔═════════╗
         ║ Content ║
         ╚═════════╝

rounded: ╭─────────╮
         │ Content │
         ╰─────────╯

dashed:  ┌─────────┐  (pero con caracteres -)
         │ Content │
         └─────────┘

thick:   ┏━━━━━━━━━┓
         ┃ Content ┃
         ┗━━━━━━━━━┛
```

### Bordes Parciales

```typescript
// Solo algunos lados
Box({
  border: ["top", "bottom"]     // Borde superior e inferior
})

Box({
  border: ["left", "right"]     // Borde lateral
})

Box({
  border: ["top"]               // Solo superior
})
```

### Colores de Borde

```typescript
Box({
  border: true,
  borderColor: "red",
  focusedBorderColor: "yellow"  // Cuando tiene focus
})
```

### Caracteres Custom de Borde

```typescript
interface BorderCharacters {
  topLeft?: string
  topRight?: string
  bottomLeft?: string
  bottomRight?: string
  horizontal?: string
  vertical?: string
}

Box({
  border: true,
  customBorderChars: {
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    horizontal: "═",
    vertical: "║"
  }
})
```

### Título en Borde

```typescript
Box({
  border: true,
  title: "Mi Título",
  titleAlignment: "left"      // (default)
  // titleAlignment: "center"
  // titleAlignment: "right"
})
```

---

## Estilos de Componente

### Background y Foreground

```typescript
// Background
Box({
  backgroundColor: "blue"
})

Box({
  backgroundColor: RGBA.fromHex("#333333")
})

// Foreground (texto)
Text({
  fg: "yellow"
})

Text({
  fg: RGBA.fromInts(255, 255, 0, 255)
})
```

### Opacidad

```typescript
Box({
  opacity: 1.0    // 100% opaco (default)
  // opacity: 0.5  // 50% transparente
  // opacity: 0.0  // 100% transparente
})
```

### Z-Index

```typescript
// Para posicionamiento absoluto
Box({
  position: "absolute",
  zIndex: 10     // Mayor zIndex = renderizado después (encima)
})
```

### Visibility

```typescript
Box({
  visible: true   // (default)
  // visible: false  // Oculto pero ocupa espacio
})
```

---

## Ejemplos Prácticos

### Alertas

```tsx
function Alert({ type, message }) {
  const styles = {
    error: { bg: "red", fg: "white" },
    warning: { bg: "yellow", fg: "black" },
    success: { bg: "green", fg: "white" },
    info: { bg: "blue", fg: "white" }
  }

  const style = styles[type]

  return Box({
    padding: 1,
    backgroundColor: style.bg,
    border: true
  },
    Text({
      content: t`${bold(fg(style.fg)(message))}`
    })
  )
}

// Uso
Alert({ type: "error", message: "Error crítico!" })
Alert({ type: "success", message: "Operación completada" })
```

### Tarjeta con Estilos

```tsx
function Card({ title, content }) {
  return Box({
    border: true,
    borderStyle: "rounded",
    title: title,
    padding: 2,
    backgroundColor: "#222",
    borderColor: "#444"
  },
    Text({
      content: t`${bold(fg("yellow")(title))}`,
      marginBottom: 1
    }),
    Text({
      content: content,
      fg: "#CCC"
    })
  )
}
```

### Badge

```tsx
function Badge({ count }) {
  return Box({
    position: "absolute",
    top: -1,
    right: -1,
    padding: 1,
    backgroundColor: "red",
    border: true,
    borderRadius: 1  // Si está disponible
  },
    Text({
      content: String(count),
      fg: "white",
      attributes: TextAttributes.BOLD
    })
  )
}
```

### Input con Estilos de Focus

```tsx
function StyledInput({ placeholder }) {
  return Input({
    placeholder,
    backgroundColor: "#333",
    textColor: "#FFF",
    placeholderColor: "#666",
    focusedBackgroundColor: "#444",
    focusedTextColor: "#FFF",
    borderColor: "#555",
    focusedBorderColor: "yellow"
  })
}
```

### Lista de Items con Estilos Alternados

```tsx
function List({ items }) {
  return Box({ flexDirection: "column" },
    ...items.map((item, index) => (
      Box({
        key: index,
        padding: 1,
        backgroundColor: index % 2 === 0 ? "#333" : "#3A3A3A",
        width: "100%"
      },
        Text({ content: item.name })
      )
    ))
  )
}
```

### Syntax Highlighting Básico

```tsx
function HighlightedCode() {
  const code = "function hello() { return 'world'; }"

  return Box({
    padding: 1,
    backgroundColor: "#1E1E1E"
  },
    Text({
      content: t`
        ${fg("#569CD6")("function")} ${fg("#DCDCAA")("hello")}() {
          ${fg("#C586C0")("return")} ${fg("#CE9178")("'world'")};
        }
      `
    })
  )
}
```

### Progress Bar

```tsx
function ProgressBar({ progress, max }) {
  const percentage = Math.round((progress / max) * 100)
  const filledWidth = Math.round(40 * percentage / 100)

  return Box({
    flexDirection: "row",
    width: 42
  },
    // Filled portion
    Box({
      width: filledWidth,
      height: 1,
      backgroundColor: "green"
    }),
    // Empty portion
    Box({
      flexGrow: 1,
      height: 1,
      backgroundColor: "#333"
    }),
    // Percentage text
    Text({
      content: ` ${percentage}%`,
      fg: "white"
    })
  )
}
```

### Status Indicator

```tsx
function StatusIndicator({ status }) {
  const colors = {
    online: "green",
    offline: "red",
    away: "yellow",
    busy: "magenta"
  }

  return Box({
    flexDirection: "row",
    gap: 1
  },
    Box({
      width: 1,
      height: 1,
      backgroundColor: colors[status]
    }),
    Text({
      content: status,
      fg: colors[status],
      attributes: TextAttributes.BOLD
    })
  )
}
```

---

## Referencias

- Fuente: `/Users/mks/opentui-original/packages/core/src/lib/RGBA.ts`
- Styled Text: `/Users/mks/opentui-original/packages/core/src/lib/styled-text.ts`
- Bordes: `/Users/mks/opentui-original/packages/core/src/lib/border.ts`
- Ejemplos: `/Users/mks/opentui-original/packages/core/src/examples/styled-text-demo.ts`
