# Sistema de Layout en OpenTUI

OpenTUI utiliza **Yoga**, un layout engine CSS Flexbox-like, para posicionar y dimensionar componentes. Esto permite crear layouts complejos con una API familiar para desarrolladores web.

## Tabla de Contenidos

- [Conceptos Básicos](#conceptos-básicos)
- [Flexbox Layout](#flexbox-layout)
- [Posicionamiento](#posicionamiento)
- [Spacing](#spacing)
- [Responsive Sizing](#responsive-sizing)
- [Alignment](#alignment)
- [Ejemplos Prácticos](#ejemplos-prácticos)

---

## Conceptos Básicos

### Yoga Node

Cada renderable tiene un `yogaNode` que controla su layout:

```typescript
const box = new BoxRenderable(renderer, {
  width: 50,
  height: 10,
})

// Acceder al yoga node directamente
box.yogaNode.setWidth(50)
box.yogaNode.setHeightAuto()
```

### Direcciones del Layout

```
flexDirection: "row"
┌─────┬─────┬─────┐
│  1  │  2  │  3  │
└─────┴─────┴─────┘

flexDirection: "column"
┌─────┐
│  1  │
├─────┤
│  2  │
├─────┤
│  3  │
└─────┘
```

---

## Flexbox Layout

### flexDirection

Define la dirección principal del layout.

```typescript
Box({
  flexDirection: "row"     // Horizontal (default)
})

Box({
  flexDirection: "column"  // Vertical
})
```

### Flex Wrap

Controla si los hijos pueden wrappear a múltiples líneas.

```typescript
Box({
  flexWrap: "nowrap"  // Todo en una línea (default)
})

Box({
  flexWrap: "wrap"    // Permite wrapping
})
```

### Flex Properties de Hijos

Controla cómo los hijos crecen y se encogen.

```typescript
// flexGrow: El hijo crecerá para ocupar espacio disponible
child.flexGrow = 1

// flexShrink: El hijo puede encogerse si es necesario
child.flexShrink = 0  // Nunca encoger

// flexBasis: Tamaño base antes de aplicar flexGrow/shrink
child.flexBasis = "auto"  // (default)
child.flexBasis = 100     // Tamaño base específico
```

### Ejemplo Flex

```tsx
// 3 hijos que comparten espacio igualmente
Box({ flexDirection: "row" },
  Box({ flexGrow: 1 }, Text("1/3")),
  Box({ flexGrow: 1 }, Text("1/3")),
  Box({ flexGrow: 1 }, Text("1/3"))
)

// 2 hijos: fijo + flexible
Box({ flexDirection: "row" },
  Box({ width: 20 }, Text("Fijo")),
  Box({ flexGrow: 1 }, Text("Flexible"))
)

// Hijo centrado con anchos fijos en los extremos
Box({
  flexDirection: "row",
  justifyContent: "center"
},
  Box({ width: 10 }, Text("Izq")),
  Box({ flexGrow: 1 }, Text("Centro")),
  Box({ width: 10 }, Text("Der"))
)
```

---

## Posicionamiento

### Position Types

```typescript
// relative (default)
Box({ position: "relative" })

// absolute (respecto al padre posicionado)
Box({
  position: "absolute",
  top: 5,
  left: 10
})
```

### Offset Props

```typescript
Box({
  position: "absolute",
  top: 10,
  left: 20,
  bottom: 5,
  right: 15
})
```

### Ejemplo Posicionamiento

```tsx
// Overlay absoluto
Box({ width: 50, height: 20, position: "relative" },
  // Contenido normal
  Text({ content: "Contenido" }),

  // Overlay superpuesto
  Box({
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)"
  })
)

// Badge en esquina
Box({ position: "relative", width: 30, height: 10 },
  Text({ content: "Botón" }),

  Box({
    position: "absolute",
    top: -1,
    right: -1,
    width: 3,
    height: 3,
    backgroundColor: "red"
  })
)
```

---

## Spacing

### Padding

Espacio interno del componente.

```typescript
// Todos los lados
Box({ padding: 2 })

// Individual
Box({
  paddingTop: 2,
  paddingRight: 1,
  paddingBottom: 2,
  paddingLeft: 1
})

// Vertical y horizontal
Box({
  paddingVertical: 2,
  paddingHorizontal: 1
})
```

### Margin

Espacio externo entre componentes.

```typescript
// Todos los lados
Box({ margin: 2 })

// Auto (centrar horizontalmente en flex container)
Box({ margin: "auto" })

// Individual
Box({
  marginTop: 2,
  marginRight: 1,
  marginBottom: 2,
  marginLeft: 1
})
```

### Gap

Espacio entre hijos de un flex/grid container.

```typescript
// Gap en ambos ejes
Box({ gap: 2 })

// Gap específico por eje
Box({
  rowGap: 1,      // Espacio entre filas
  columnGap: 2    // Espacio entre columnas
})
```

### Ejemplo Spacing

```tsx
// Card con padding
Box({
  border: true,
  padding: 2,
  gap: 1
},
  Text({ content: "Título" }),
  Text({ content: "Descripción" })
)

// Lista con gap entre items
Box({ flexDirection: "column", gap: 1 },
  Box({ padding: 1 }, Text("Item 1")),
  Box({ padding: 1 }, Text("Item 2")),
  Box({ padding: 1 }, Text("Item 3"))
)

// Layout con spacing complejo
Box({
  flexDirection: "row",
  gap: 2,
  padding: 2
},
  Box({ padding: 1 }, Text("Panel 1")),
  Box({ padding: 1 }, Text("Panel 2"))
)
```

---

## Responsive Sizing

### Tipos de Tamaño

```typescript
// Fixed (píxeles/celdas)
Box({ width: 50, height: 20 })

// Auto (ajusta al contenido)
Box({ width: "auto", height: "auto" })

// Porcentaje (respecto al padre)
Box({ width: "100%", height: "50%" })
```

### Min/Max Constraints

```typescript
// Tamaño con constraints
Box({
  width: "100%",
  minWidth: 20,
  maxWidth: 80,
  height: "auto",
  minHeight: 10,
  maxHeight: 30
})
```

### Aspect Ratio

OpenTUI soporta aspect ratio a través de cálculos manuales:

```typescript
// Aspect ratio 16:9
const width = 80
const height = Math.round(width * 9 / 16)

Box({ width, height })
```

### Ejemplo Responsive

```tsx
// Sidebar + Content
Box({ flexDirection: "row", width: "100%" },
  // Sidebar: 20% mínimo, 30% máximo
  Box({
    width: "25%",
    minWidth: 20,
    maxWidth: 30
  },
    Text({ content: "Sidebar" })
  ),

  // Content: Resto del espacio
  Box({
    flexGrow: 1
  },
    Text({ content: "Content" })
  )
)

// Contenedor responsivo
Box({
  width: "100%",
  height: "100%",
  padding: 2
},
  // Contenido centrado
  Box({
    width: "auto",
    height: "auto",
    margin: "auto"
  },
    Text({ content: "Centrado" })
  )
)
```

---

## Alignment

### Justify Content

Alineación de hijos en el eje principal.

```typescript
Box({
  flexDirection: "row",
  justifyContent: "flex-start"      // (default)
  // justifyContent: "center"
  // justifyContent: "flex-end"
  // justifyContent: "space-between"
  // justifyContent: "space-around"
  // justifyContent: "space-evenly"
})
```

### Align Items

Alineación de hijos en el eje cruzado.

```typescript
Box({
  flexDirection: "row",
  alignItems: "flex-start"      // (default)
  // alignItems: "center"
  // alignItems: "flex-end"
  // alignItems: "stretch"
})
```

### Align Self

Override individual del alignItem del hijo.

```typescript
// En el hijo
child.alignSelf = "center"
child.alignSelf = "flex-start"
child.alignSelf = "flex-end"
child.alignSelf = "stretch"
```

### Ejemplos Alignment

```tsx
// Centrado horizontal y vertical
Box({
  width: 50,
  height: 20,
  justifyContent: "center",
  alignItems: "center"
},
  Text({ content: "Centrado" })
)

// Espacio entre items
Box({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center"
},
  Text({ content: "Izquierda" }),
  Text({ content: "Centro" }),
  Text({ content: "Derecha" })
)

// Align self override
Box({
  flexDirection: "row",
  alignItems: "flex-start"
},
  Text({ content: "Default" }),
  Text({ content: "Override", alignSelf: "center" })
)
```

---

## Ejemplos Prácticos

### Login Form

```tsx
function LoginForm() {
  return Box({
    width: 50,
    height: "auto",
    margin: "auto",
    flexDirection: "column",
    gap: 1,
    padding: 3,
    border: true,
    title: "Login"
  },
    Text({ content: "Username:" }),
    Input({ placeholder: "Enter username..." }),

    Text({ content: "Password:" }),
    Input({ placeholder: "Enter password..." }),

    Box({
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 1
    },
      Text({ content: "[ Cancel ]  [ Login ]" })
    )
  )
}
```

### Dashboard Layout

```tsx
function Dashboard() {
  return Box({
    flexDirection: "column",
    width: "100%",
    height: "100%"
  },
    // Header
    Box({
      height: 3,
      padding: 1,
      backgroundColor: "#333"
    },
      Text({ content: "Dashboard" })
    ),

    // Main content
    Box({
      flexDirection: "row",
      flexGrow: 1
    },
      // Sidebar
      Box({
        width: 20,
        padding: 1,
        backgroundColor: "#222"
      },
        Text({ content: "Menu..." })
      ),

      // Content
      Box({
        flexGrow: 1,
        padding: 2
      },
        Text({ content: "Main content..." })
      )
    ),

    // Footer
    Box({
      height: 2,
      padding: 1,
      backgroundColor: "#333"
    },
      Text({ content: "Status: OK" })
    )
  )
}
```

### Card Grid

```tsx
function CardGrid() {
  const cards = Array.from({ length: 6 }, (_, i) => (
    Box({
      width: "30%",
      padding: 2,
      border: true,
      gap: 1
    },
      Text({ content: `Card ${i + 1}`, bold: true }),
      Text({ content: "Description..." })
    )
  ))

  return Box({
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    padding: 2
  }, ...cards)
}
```

### Split Pane

```tsx
function SplitPane() {
  return Box({
    flexDirection: "row",
    width: "100%",
    height: "100%"
  },
    // Left pane
    Box({
      width: "50%",
      border: true,
      borderStyle: ["right"]
    },
      Text({ content: "Left pane" })
    ),

    // Right pane
    Box({
      width: "50%",
      padding: 1
    },
      Text({ content: "Right pane" })
    )
  )
}
```

### Modal Overlay

```tsx
function Modal({ isOpen, onClose }) {
  if (!isOpen) return null

  return Box({
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center"
  },
    Box({
      width: 50,
      height: 15,
      backgroundColor: "#333",
      border: true,
      padding: 2
    },
      Text({ content: "Modal Title", bold: true }),
      Text({ content: "Modal content..." }),
      Text({ content: "[ Close ]", marginTop: 2 })
    )
  )
}
```

---

## Referencias

- Yoga Documentation: [yogalayout.com](https://yogalayout.com/)
- Fuente: `/Users/mks/opentui-original/packages/core/src/lib/yoga.options.ts`
- Ejemplos: `/Users/mks/opentui-original/packages/core/src/examples/box.tsx`
