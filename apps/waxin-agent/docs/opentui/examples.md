# Ejemplos Prácticos de OpenTUI

Colección de ejemplos prácticos del repositorio de OpenTUI para aprender patrones de uso.

## Tabla de Contenidos

- [Quick Start](#quick-start)
- [Componentes Básicos](#componentes-básicos)
- [Forms y Inputs](#forms-y-inputs)
- [Listas y Scroll](#listas-y-scroll)
- [Layouts Complejos](#layouts-complejos)
- [Animaciones](#animaciones)
- [Editores de Código](#editores-de-código)
- [Overlays y Modales](#overlays-y-modales)

---

## Quick Start

### Ejemplo Básico

```tsx
import { Box, Text } from "@opentui/react"
import { bold, fg } from "@opentui/core"

function App() {
  return Box({
    padding: 2,
    border: true,
    title: "Mi Primera App"
  },
    Text({
      content: `${bold(fg("yellow")("¡Hola OpenTUI!"))}`
    })
  )
}
```

### Contador Reactivo

```tsx
import { Box, Text } from "@opentui/react"
import { useState, useEffect } from "react"

function Counter() {
  const [count, setCount] = useState(0)

  useKeyboard((key) => {
    if (key.name === "up") setCount(c => c + 1)
    if (key.name === "down") setCount(c => c - 1)
  })

  return Box({
    padding: 2,
    border: true,
    justifyContent: "center",
    alignItems: "center"
  },
    Text({
      content: `Count: ${count}\n\nUse ↑/↓ to change`
    })
  )
}
```

---

## Componentes Básicos

### Cajas con Bordes

```tsx
import { Box, Text } from "@opentui/react"

function BorderDemo() {
  return Box({
    flexDirection: "column",
    gap: 2,
    padding: 2
  },
    // Single border
    Box({ border: true, title: "Single" },
      Text({ content: "Single border" })
    ),

    // Double border
    Box({ border: true, borderStyle: "double", title: "Double" },
      Text({ content: "Double border" })
    ),

    // Rounded border
    Box({ border: true, borderStyle: "rounded", title: "Rounded" },
      Text({ content: "Rounded border" })
    ),

    // Dashed border
    Box({ border: true, borderStyle: "dashed", title: "Dashed" },
      Text({ content: "Dashed border" })
    )
  )
}
```

### Textos Estilizados

```tsx
import { Text } from "@opentui/react"
import { t, bold, italic, underline, fg, bg } from "@opentui/core"

function StyledTextDemo() {
  return Box({
    flexDirection: "column",
    gap: 1,
    padding: 2
  },
    Text({ content: "Normal text" }),
    Text({ content: "Bold text", attributes: 1 /* BOLD */ }),
    Text({ content: t`${bold("Bold with styled text")}` }),
    Text({ content: t`${underline(fg("red")("Red underline"))}` }),
    Text({ content: t`${bg("yellow")("Yellow background")}` }),
    Text({ content: t`${bold(italic(underline("All styles!")))}` })
  )
}
```

### Layouts Flexbox

```tsx
function FlexboxDemo() {
  return Box({
    flexDirection: "column",
    gap: 2,
    padding: 2
  },
    // Row layout
    Box({
      flexDirection: "row",
      justifyContent: "space-between",
      border: true,
      title: "Row - Space Between"
    },
      Text({ content: "Left" }),
      Text({ content: "Center" }),
      Text({ content: "Right" })
    ),

    // Column layout
    Box({
      flexDirection: "column",
      alignItems: "center",
      border: true,
      title: "Column - Center"
    },
      Text({ content: "Top" }),
      Text({ content: "Middle" }),
      Text({ content: "Bottom" })
    ),

    // Flex grow
    Box({
      flexDirection: "row",
      border: true,
      title: "Flex Grow"
    },
      Box({ flexGrow: 1, backgroundColor: "blue" }),
      Box({ flexGrow: 2, backgroundColor: "red" }),
      Box({ flexGrow: 1, backgroundColor: "green" })
    )
  )
}
```

---

## Forms y Inputs

### Login Form

```tsx
import { Box, Text, Input } from "@opentui/react"
import { useState } from "react"

function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = () => {
    console.log("Login:", { username, password })
  }

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
    Input({
      value: username,
      onChange: setUsername,
      focused: true
    }),

    Text({ content: "Password:" }),
    Input({
      value: password,
      onChange: setPassword
    }),

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

### Form con Validación

```tsx
function ValidatedForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const handleChange = (value: string) => {
    setEmail(value)
    if (!validateEmail(value)) {
      setError("Invalid email format")
    } else {
      setError("")
    }
  }

  return Box({ flexDirection: "column", gap: 1, padding: 2 },
    Text({ content: "Email:" }),
    Input({ value: email, onChange: handleChange }),
    error && Text({
      content: error,
      fg: "red",
      attributes: TextAttributes.BOLD
    })
  )
}
```

### Textarea con Resumen

```tsx
import { Textarea } from "@opentui/react"

function TextareaDemo() {
  const [text, setText] = useState("")
  const [wordCount, setWordCount] = useState(0)

  const handleChange = (value: string) => {
    setText(value)
    setWordCount(value.trim().split(/\s+/).filter(w => w).length)
  }

  return Box({
    flexDirection: "column",
    gap: 1,
    padding: 2
  },
    Textarea({
      value: text,
      onChange: handleChange,
      placeholder: "Escribe algo...",
      height: 10,
      wordWrap: true
    }),
    Text({
      content: `Words: ${wordCount} | Chars: ${text.length}`
    })
  )
}
```

---

## Listas y Scroll

### Lista de Selección

```tsx
import { Select } from "@opentui/react"

function SelectDemo() {
  const [selected, setSelected] = useState(null)

  return Box({ padding: 2 },
    Select({
      options: [
        { name: "Opción 1", description: "Primera opción", value: 1 },
        { name: "Opción 2", description: "Segunda opción", value: 2 },
        { name: "Opción 3", description: "Tercera opción", value: 3 },
        { name: "Opción 4", description: "Cuarta opción", value: 4 },
      ],
      showDescription: true,
      selectedIndex: 0,
      showScrollIndicator: true
    }).on(SelectRenderableEvents.ITEM_SELECTED, (option) => {
      setSelected(option.value)
    }),

    selected && Text({
      content: `Seleccionado: ${selected}`,
      marginTop: 1
    })
  )
}
```

### ScrollBox con Muchos Items

```tsx
import { ScrollBox, Box, Text } from "@opentui/react"

function ScrollDemo() {
  const items = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i + 1}`,
    description: `Descripción del item ${i + 1}`
  }))

  const scrollBox = ScrollBox({
    scrollY: true,
    viewportCulling: true,  // Performance critical
    height: 20,
    width: 50
  })

  items.forEach(item => {
    scrollBox.content.add(
      Box({
        key: item.id,
        height: 2,
        padding: 1,
        backgroundColor: item.id % 2 === 0 ? "#333" : "#3A3A3A"
      },
        Text({
          content: `${item.id}. ${item.name}`,
          fg: item.id % 2 === 0 ? "white" : "cyan"
        })
      )
    )
  })

  return Box({ padding: 2 },
    Text({ content: "Use ↑/↓ or mouse wheel to scroll" }),
    scrollBox
  )
}
```

### Lista con Buscador

```tsx
function SearchableList({ items }) {
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  useKeyboard((key) => {
    if (key.name === "up") {
      setSelectedIndex(i => Math.max(0, i - 1))
    } else if (key.name === "down") {
      setSelectedIndex(i => Math.min(filteredItems.length - 1, i + 1))
    } else if (key.name === "enter") {
      console.log("Selected:", filteredItems[selectedIndex])
    }
  })

  return Box({ flexDirection: "column", gap: 1, padding: 2 },
    Input({
      placeholder: "Search...",
      value: search,
      onChange: setSearch
    }),
    Box({ flexDirection: "column" },
      filteredItems.map((item, index) =>
        Box({
          key: item.id,
          backgroundColor: index === selectedIndex ? "#555" : "#333",
          padding: 1
        },
          Text({
            content: `${index === selectedIndex ? "> " : "  "}${item.name}`
          })
        )
      )
    )
  )
}
```

---

## Layouts Complejos

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
      backgroundColor: "#222",
      borderBottom: true
    },
      Text({ content: "📊 Dashboard", bold: true }),
      Text({ content: "Ctrl+Q: Quit | ?: Help", fg: "#666" })
    ),

    // Main content
    Box({
      flexDirection: "row",
      flexGrow: 1
    },
      // Sidebar
      Box({
        width: 20,
        backgroundColor: "#1A1A1A",
        borderStyle: ["right"]
      },
        Box({ padding: 1, borderBottom: true },
          Text({ content: "📁 Files", bold: true })
        ),
        Box({ padding: 1 },
          Text({ content: "📄 file1.ts" }),
          Text({ content: "📄 file2.ts" }),
          Text({ content: "📄 file3.ts" })
        )
      ),

      // Content area
      Box({
        flexGrow: 1,
        flexDirection: "column"
      },
        // Toolbar
        Box({
          height: 2,
          padding: 1,
          backgroundColor: "#222",
          borderBottom: true
        },
          Text({ content: "File | Edit | View | Help" })
        ),

        // Editor
        Box({
          flexGrow: 1,
          padding: 1
        },
          Text({ content: "Editor content here..." })
        )
      )
    ),

    // Footer
    Box({
      height: 2,
      padding: 1,
      backgroundColor: "#222",
      borderTop: true
    },
      Text({ content: "Ln 1, Col 1 | UTF-8 | TypeScript" })
    )
  )
}
```

### Split Pane Layout

```tsx
function SplitPane() {
  const [splitPercent, setSplitPercent] = useState(50)

  return Box({
    flexDirection: "row",
    width: "100%",
    height: "100%"
  },
    // Left pane
    Box({
      width: `${splitPercent}%`,
      borderStyle: ["right"]
    },
      Box({ padding: 1, borderBottom: true },
        Text({ content: "Left Pane", bold: true })
      ),
      Text({ content: "Left content..." })
    ),

    // Divider
    Box({
      width: 1,
      backgroundColor: "#444"
    },
      Text({ content: "‖" })
    ),

    // Right pane
    Box({
      flexGrow: 1
    },
      Box({ padding: 1, borderBottom: true },
        Text({ content: "Right Pane", bold: true })
      ),
      Text({ content: "Right content..." })
    )
  )
}
```

### Tabs Layout

```tsx
function TabsLayout() {
  const [activeTab, setActiveTab] = useState(0)

  const tabs = ["Tab 1", "Tab 2", "Tab 3"]

  useKeyboard((key) => {
    if (key.name === "left") setActiveTab(i => Math.max(0, i - 1))
    if (key.name === "right") setActiveTab(i => Math.min(tabs.length - 1, i + 1))
  })

  return Box({
    flexDirection: "column",
    width: 60,
    height: 20
  },
    // Tab headers
    Box({
      flexDirection: "row",
      height: 3
    },
      tabs.map((tab, index) =>
        Box({
          key: index,
          padding: 1,
          backgroundColor: index === activeTab ? "#444" : "#333",
          borderStyle: index === activeTab ? ["bottom"] : undefined
        },
          Text({
            content: tab,
            fg: index === activeTab ? "yellow" : "white"
          })
        )
      )
    ),

    // Tab content
    Box({
      flexGrow: 1,
      padding: 2
    },
      Text({
        content: `Content of ${tabs[activeTab]}`,
        fg: "cyan"
      })
    )
  )
}
```

---

## Animaciones

### Timeline Animation

```tsx
import { useTimeline } from "@opentui/react"
import { useEffect, useRef } from "react"

function AnimatedBox() {
  const boxRef = useRef(null)
  const [width, setWidth] = useState(0)

  const timeline = useTimeline({
    duration: 2000,
    loop: true,
    autoplay: true
  })

  useEffect(() => {
    if (!boxRef.current) return

    // Animar width de 0 a 50
    timeline.add(
      { width: 0 },
      { width: 50, duration: 2000, ease: "linear" }
    )

    const unsubscribe = timeline.on("update", (state) => {
      setWidth(state.width)
    })

    return unsubscribe
  }, [timeline])

  return Box({
    ref: boxRef,
    width,
    height: 5,
    backgroundColor: "blue",
    justifyContent: "center",
    alignItems: "center"
  },
    Text({ content: `Width: ${Math.round(width)}` })
  )
}
```

### Progress Bar Animation

```tsx
function AnimatedProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => (p >= 100 ? 0 : p + 1))
    }, 50)  // 20 segundos para completar

    return () => clearInterval(interval)
  }, [])

  const filledWidth = Math.round(40 * progress / 100)

  return Box({
    flexDirection: "row",
    width: 42,
    height: 3
  },
    // Bar
    Box({
      width: filledWidth,
      height: 1,
      backgroundColor: "green"
    }),
    Box({
      flexGrow: 1,
      height: 1,
      backgroundColor: "#333"
    }),

    // Percentage
    Text({
      content: `${progress}%`,
      fg: "white"
    })
  )
}
```

---

## Editores de Código

### Syntax Highlighting Básico

```tsx
import { Code } from "@opentui/react"

function CodeDemo() {
  const code = `function greet(name: string) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));`

  return Box({ padding: 2 },
    Code({
      content: code,
      filetype: "typescript",
      wordWrap: true
    })
  )
}
```

### Diff Viewer

```tsx
import { Diff } from "@opentui/react"

function DiffDemo() {
  const oldContent = `const x = 1;
const y = 2;
console.log(x + y);`

  const newContent = `const x = 10;
const y = 20;
console.log(x + y);
console.log("Done!");`

  return Box({ padding: 2 },
    Diff({
      oldContent,
      newContent,
      viewMode: "unified",
      language: "typescript"
    })
  )
}
```

### Editor con Line Numbers

```tsx
function EditorWithLineNumbers() {
  const [content, setContent] = useState("line 1\nline 2\nline 3")

  return Box({
    flexDirection: "row"
  },
    // Line numbers
    Box({
      width: 5,
      backgroundColor: "#222",
      padding: 1,
      textAlign: "right"
    },
      ...content.split("\n").map((_, i) =>
        Text({
          key: i,
          content: `${i + 1}`,
          fg: "#666"
        })
      )
    ),

    // Editor
    Textarea({
      value: content,
      onChange: setContent,
      wordWrap: false
    })
  )
}
```

---

## Overlays y Modales

### Modal Overlay

```tsx
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  useKeyboard((key) => {
    if (key.name === "escape") onClose()
  })

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
      Box({
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 1
      },
        Text({ content: title, bold: true }),
        Text({ content: "[X]", fg: "red" })
      ),
      children,
      Box({ marginTop: 1 },
        Text({ content: "[ESC] to close" })
      )
    )
  )
}

// Uso
function App() {
  const [showModal, setShowModal] = useState(false)

  return Box({ padding: 2 },
    Text({
      content: "Press [M] to open modal",
      onPress: () => setShowModal(true)
    }),
    Modal({
      isOpen: showModal,
      onClose: () => setShowModal(false),
      title: "Example Modal"
    },
      Text({ content: "Modal content here..." })
    )
  )
}
```

### Console Overlay Toggle

```tsx
import { useRenderer } from "@opentui/react"

function ConsoleToggle() {
  const renderer = useRenderer()

  useKeyboard((key) => {
    if (key.name === "c" && key.ctrl) {
      renderer.console.toggle()
    }
  })

  return Box({ padding: 2 },
    Text({ content: "Press Ctrl+C to toggle console" }),
    Text({ content: "Press backtick ` to open console overlay" })
  )
}
```

### Tooltip

```tsx
function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false)
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)

  const container = useRef(null)

  useEffect(() => {
    if (!container.current) return

    container.current.onMouseMove = (event) => {
      setX(event.x)
      setY(event.y)
    }

    container.current.onMouseEnter = () => setVisible(true)
    container.current.onMouseLeave = () => setVisible(false)
  }, [])

  return Box({ ref: container },
    children,
    visible && Box({
      position: "absolute",
      x: x + 2,
      y: y + 1,
      backgroundColor: "#444",
      border: true,
      padding: 1
    },
      Text({ content: text })
    )
  )
}

// Uso
Tooltip({ text: "This is a tooltip" },
  Text({ content: "Hover me!" })
)
```

---

## Referencias

- Fuente de ejemplos: `/Users/mks/opentui-original/packages/core/src/examples/`
- Más ejemplos: 50+ ejemplos disponibles en el repositorio
