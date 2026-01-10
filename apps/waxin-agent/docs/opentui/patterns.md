# Patrones y Best Practices en OpenTUI

Patrones comunes de uso, consideraciones de performance y mejores prácticas.

## Tabla de Contenidos

- [Patrones Comunes](#patrones-comunes)
- [Performance](#performance)
- [Best Practices](#best-practices)
- [Anti-Patrones](#anti-patrones)
- [Arquitectura de Aplicaciones](#arquitectura-de-aplicaciones)

---

## Patrones Comunes

### 1. Container Component Pattern

Separar presentación de lógica de negocio.

```tsx
// Container (lógica)
function UserListContainer() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetchUsers().then(setUsers)
  }, [])

  const handleSelect = (user) => {
    console.log("Selected:", user)
  }

  return <UserList users={users} onSelect={handleSelect} />
}

// Presentational (UI)
function UserList({ users, onSelect }) {
  return Box({ flexDirection: "column" },
    ...users.map(user =>
      Box({
        key: user.id,
        padding: 1,
        backgroundColor: "#333"
      },
        Text({ content: user.name })
      )
    )
  )
}
```

### 2. Render Props Pattern

```tsx
function ScrollContainer({ children, renderHeader, renderFooter }) {
  return Box({ flexDirection: "column" },
    renderHeader?.(),
    ScrollBox({ scrollY: true },
      children
    ),
    renderFooter?.()
  )
}

// Uso
ScrollContainer({
  renderHeader: () => Text({ content: "Header" }),
  renderFooter: () => Text({ content: "Footer" })
},
  // Contenido
)
```

### 3. Compound Components Pattern

```typescript
class Modal extends BoxRenderable {
  static Header = class extends BoxRenderable {}
  static Body = class extends BoxRenderable {}
  static Footer = class extends BoxRenderable {}

  constructor(renderer, options) {
    super(renderer, {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
      ...options
    })
  }
}

// Uso
const modal = new Modal(renderer)
modal.add(new Modal.Header(renderer, { padding: 2 }))
modal.add(new Modal.Body(renderer, { padding: 2 }))
modal.add(new Modal.Footer(renderer, { padding: 2 }))
```

### 4. Higher-Order Component Pattern

```typescript
function withBorder(WrappedComponent) {
  return class extends BoxRenderable {
    constructor(renderer, options) {
      super(renderer, {
        border: true,
        padding: 1,
        ...options
      })

      this.wrapped = new WrappedComponent(renderer, options)
      this.add(this.wrapped)
    }
  }
}

// Uso
const BorderedInput = withBorder(InputRenderable)
const input = new BorderedInput(renderer, { placeholder: "..." })
```

### 5. Delegate Pattern (VNode)

```typescript
import { delegate, instantiate } from "@opentui/core"

function LabeledInput(props) {
  return delegate(
    { focus: `${props.id}-input` },
    Box(
      { flexDirection: "row", gap: 1 },
      Text({ content: props.label }),
      Input({ id: `${props.id}-input`, placeholder: props.placeholder })
    )
  )
}

const input = LabeledInput({ id: "username", label: "Name:" })
input.focus()  // Automáticamente rutea al Input interno
```

### 6. State Reducer Pattern

```typescript
function createListReducer() {
  return (state, action) => {
    switch (action.type) {
      case "SELECT":
        return { ...state, selectedIndex: action.index }
      case "FILTER":
        return { ...state, filter: action.filter }
      case "LOAD":
        return { ...state, items: action.items, loading: false }
      default:
        return state
    }
  }
}

// Uso
const reducer = createListReducer()
const [state, dispatch] = useReducer(reducer, {
  items: [],
  selectedIndex: 0,
  loading: true
})
```

### 7. Render Array Pattern

```tsx
// Renderizar arrays de componentes eficientemente
function List({ items }) {
  return Box({ flexDirection: "column" },
    ...items.map((item, index) =>
      Box({
        key: item.id,  // Importante para re-renders eficientes
        padding: 1,
        backgroundColor: index % 2 === 0 ? "#333" : "#3A3A3A"
      },
        Text({ content: item.name })
      )
    )
  )
}
```

---

## Performance

### Viewport Culling

**CRITICAL** para listas largas - solo renderiza items visibles.

```tsx
// ✅ CORRECTO: Con viewport culling
const scrollBox = ScrollBox({
  scrollY: true,
  viewportCulling: true,  // Solo renderiza visible
  height: 20
})

for (let i = 0; i < 10000; i++) {
  scrollBox.content.add(
    Box({ height: 2 }, Text({ content: `Item ${i}` }))
  )
}

// ❌ INCORRECTO: Sin viewport culling
const scrollBox = ScrollBox({
  scrollY: true,
  viewportCulling: false,  // Renderiza TODO (muy lento)
  height: 20
})
```

### Buffered Rendering

Usar `buffered: true` solo para componentes que cambian raramente.

```tsx
// ✅ CORRECTO: Para contenido estático
Box({
  buffered: true  // Cache de render
},
  Text({ content: "Texto estático" })
)

// ❌ INCORRECTO: Para contenido dinámico
Box({
  buffered: true  // Innecesario si cambia seguido
},
  Text({ content: timestamp })  // Cambia cada segundo
)
```

### Live Rendering

Usar `live: true` solo para animaciones.

```tsx
// ✅ CORRECTO: Para animaciones
Box({
  live: true  // Force re-render cada frame
})

// ❌ INCORRECTO: Para contenido estático
Box({
  live: true  // Desperdicia CPU
})
```

### Frame Callbacks

Limitar actualizaciones periódicas en frame callbacks.

```typescript
const renderer = useRenderer()

renderer.setFrameCallback(() => {
  // ✅ CORRECTO: Limitar actualizaciones
  if (frameCounter % 30 === 0) {  // ~2 veces por segundo a 60 FPS
    updateStats()
  }

  // ❌ INCORRECTO: Actualizar cada frame
  updateStats()  // Demasiado frecuente
})
```

### Optimize Re-renders

Evitar re-renders innecesarios.

```tsx
// ✅ CORRECTO: Usar useMemo/useCallback
function Component() {
  const items = useMemo(() => generateItems(), [deps])
  const handleClick = useCallback(() => {}, [deps])

  return Box({}, ...items.map(item => <Item onClick={handleClick} />))
}

// ❌ INCORRECTO: Recrear en cada render
function Component() {
  const items = generateItems()  // Nueva array cada render
  const handleClick = () => {}    // Nueva función cada render

  return Box({}, ...items.map(item => <Item onClick={handleClick} />))
}
```

### Minimize DOM Manipulation

```typescript
// ✅ CORRECTO: Actualizar propiedades existentes
textComponent.content = newText
textComponent.requestRender()

// ❌ INCORRECTO: Recrear componente
parent.remove(textComponent)
parent.add(new TextRenderable(renderer, { content: newText }))
```

---

## Best Practices

### 1. Usar VNodes para Composición Declarativa

```tsx
// ✅ CORRECTO: Declarativo con VNodes
function App() {
  return Box(
    { padding: 2, border: true },
    Text({ content: "Hola!" })
  )
}

// ⚠️ ACCEPTABLE: Imperativo para casos especiales
const box = new BoxRenderable(renderer, { padding: 2 })
const text = new TextRenderable(renderer, { content: "Hola!" })
box.add(text)
renderer.root.add(box)
```

### 2. Separar Estilos y Contenido

```tsx
// ✅ CORRECTO: Estilos separados
const cardStyles = {
  padding: 2,
  border: true,
  backgroundColor: "#333"
}

function Card({ children }) {
  return Box(cardStyles, ...children)
}

// ❌ INCORRECTO: Estilos inline
function Card({ children }) {
  return Box({ padding: 2, border: true, backgroundColor: "#333" }, ...children)
}
```

### 3. Usar Constantes para Strings

```typescript
// ✅ CORRECTO: Constantes
const EVENTS = {
  SAVE: "save",
  DELETE: "delete",
  UPDATE: "update"
}

component.emit(EVENTS.SAVE, data)

// ❌ INCORRECTO: Strings literales
component.emit("save", data)  // Typos no detectados
```

### 4. Type Safety con Interfaces

```typescript
// ✅ CORRECTO: Interfaces explícitas
interface UserCardProps {
  user: {
    id: string
    name: string
    email: string
  }
  onSelect: (user: User) => void
}

function UserCard({ user, onSelect }: UserCardProps) {
  // ...
}

// ❌ INCORRECTO: Any
function UserCard({ user, onSelect }: any) {
  // Sin type safety
}
```

### 5. Manejo de Errors con Boundaries

```typescript
// Error boundary component
class ErrorBoundary extends BoxRenderable {
  private fallback: Renderable

  constructor(renderer, options) {
    super(renderer, options)
    this.fallback = options.fallback
  }

  protected renderSelf(buffer): void {
    try {
      super.renderSelf(buffer)
    } catch (error) {
      // Render fallback
      this.fallback.render(buffer)
      console.error("Render error:", error)
    }
  }
}
```

### 6. Lazy Loading de Componentes

```typescript
// ✅ CORRECTO: Lazy loading
let HeavyComponent = null

function showHeavyComponent() {
  if (!HeavyComponent) {
    HeavyComponent = require("./HeavyComponent").default
  }
  return HeavyComponent
}

// Cargar solo cuando se necesita
if (shouldShowHeavy) {
  const Component = showHeavyComponent()
  container.add(new Component(renderer))
}
```

### 7. Cleanup en useEffect

```tsx
// ✅ CORRECTO: Cleanup apropiado
useEffect(() => {
  const handler = renderer.setFrameCallback(() => {
    update()
  })

  return () => {
    renderer.clearFrameCallback(handler)  // Cleanup
  }
}, [renderer])

// ❌ INCORRECTO: Sin cleanup
useEffect(() => {
  renderer.setFrameCallback(() => {
    update()
  })
  // Memory leak!
}, [])
```

---

## Anti-Patrones

### 1. NO Actualizar Estado en Render

```tsx
// ❌ INCORRECTO: Loop infinito
function Component() {
  const [count, setCount] = useState(0)

  setCount(count + 1)  // Se ejecuta en cada render

  return Text({ content: String(count) })
}

// ✅ CORRECTO: Usar useEffect
function Component() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(1)
  }, [])

  return Text({ content: String(count) })
}
```

### 2. NO Usar index como Key sin ID único

```tsx
// ❌ INCORRECTO: index como key (problemas con reordering)
function List({ items }) {
  return Box({},
    items.map((item, index) =>
      Box({ key: index }, Text({ content: item.name }))
    )
  )
}

// ✅ CORRECTO: ID único
function List({ items }) {
  return Box({},
    items.map(item =>
      Box({ key: item.id }, Text({ content: item.name }))
    )
  )
}
```

### 3. NO Olvidar useCallback en Event Handlers

```tsx
// ❌ INCORRECTO: Nueva función cada render
function Parent() {
  const handleClick = () => console.log("Click")
  return <Child onClick={handleClick} />
}

// ✅ CORRECTO: useCallback
function Parent() {
  const handleClick = useCallback(() => console.log("Click"), [])
  return <Child onClick={handleClick} />
}
```

### 4. NO Ignorar TypeScript Errors

```typescript
// ❌ INCORRECTO: @ts-ignore
// @ts-ignore
component.method(invalidArg)

// ✅ CORRECTO: Fix the type
interface ValidType {
  property: string
}
const validArg: ValidType = { property: "value" }
component.method(validArg)
```

---

## Arquitectura de Aplicaciones

### Estructura Recomendada

```
src/
├── components/          # Componentes reutilizables
│   ├── layout/         # Layout components
│   ├── input/          # Input components
│   └── display/        # Display components
├── views/              # Vistas principales
│   ├── Home.tsx
│   ├── Settings.tsx
│   └── About.tsx
├── hooks/              # Custom hooks
├── utils/              # Utilidades
├── types/              # Tipos TypeScript
├── constants/          # Constantes
└── app.tsx             # App entry point
```

### Service Layer Pattern

```typescript
// Separar lógica de negocio de componentes

// services/userService.ts
class UserService {
  async getUsers(): Promise<User[]> {
    const response = await fetch("/api/users")
    return response.json()
  }

  async getUser(id: string): Promise<User> {
    const response = await fetch(`/api/users/${id}`)
    return response.json()
  }
}

// components/UserList.tsx
function UserList() {
  const [users, setUsers] = useState([])
  const userService = useMemo(() => new UserService(), [])

  useEffect(() => {
    userService.getUsers().then(setUsers)
  }, [userService])

  return Box({ flexDirection: "column" },
    ...users.map(user => Text({ content: user.name }))
  )
}
```

### State Management Pattern

```typescript
// Para apps complejas, usar Zustand o similar

// stores/appStore.ts
import create from 'zustand'

interface AppState {
  users: User[]
  selectedUser: User | null
  setUsers: (users: User[]) => void
  selectUser: (user: User) => void
}

export const useAppStore = create<AppState>((set) => ({
  users: [],
  selectedUser: null,
  setUsers: (users) => set({ users }),
  selectUser: (user) => set({ selectedUser: user })
}))

// components/UserList.tsx
function UserList() {
  const users = useAppStore(state => state.users)
  const selectUser = useAppStore(state => state.selectUser)

  return Box({ flexDirection: "column" },
    ...users.map(user =>
      Box({ key: user.id },
        Text({
          content: user.name,
          onPress: () => selectUser(user)
        })
      )
    )
  )
}
```

### Routing Pattern (Simple)

```typescript
// Router simple basado en estado
type Route = "home" | "settings" | "about"

function App() {
  const [route, setRoute] = useState<Route>("home")

  useKeyboard((key) => {
    if (key.ctrl) {
      switch (key.name) {
        case "1": setRoute("home"); break
        case "2": setRoute("settings"); break
        case "3": setRoute("about"); break
      }
    }
  })

  return Box({},
    Text({ content: `Route: ${route} (Ctrl+1/2/3 to switch)` }),
    route === "home" && <Home />,
    route === "settings" && <Settings />,
    route === "about" && <About />
  )
}
```

---

## Referencias

- Ejemplos: `/Users/mks/opentui-original/packages/core/src/examples/`
- React Best Practices: Documentación oficial de React
- Yoga Layout: [yogalayout.com](https://yogalayout.com/)
