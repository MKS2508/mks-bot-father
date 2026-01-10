# WAXIN Agent - Debug Features Documentation

## Overview

WAXIN Agent includes comprehensive debugging tools inspired by `@mks2508/opentui-image` to help monitor performance, track keyboard events, inspect colors, and analyze application behavior.

## Version Information

- **@mks2508/opentui-image**: v0.2.3 (latest)
- **waxin-agent**: v0.1.0

## Quick Access

Press **F1** or **Ctrl+H** at any time to see the complete shortcuts reference.

---

## 🔧 Debug Modes

### Enable Debug Panel
- **Shortcut**: `Ctrl+D`
- **Description**: Toggle the debug panel overlay
- **Tabs**: Colors, Keypress, FPS, Performance

### Debug Tabs (when debug mode is active)

| Tab | Shortcut | Description |
|-----|----------|-------------|
| Colors | `Ctrl+1` | View theme color palette |
| Keypress | `Ctrl+2` | Monitor keyboard events in real-time |
| FPS | `Ctrl+3` | Display frame rate and memory stats |
| Performance | `Ctrl+4` | Show agent execution metrics |

### Close Debug Panel
- **Shortcut**: `Esc`
- **Description**: Close debug panel and return to normal mode

---

## 🎨 Colors Tab

Displays the WAXIN theme color palette with visual color blocks and hex values.

**Colors Shown:**
- Backgrounds: `bg`, `bgDark`, `bgPanel`
- Primary: `purple`, `magenta`, `cyan`, `blue`
- Accents: `green`, `yellow`, `orange`, `red`
- Text: `text`, `textDim`, `textMuted`

**Features:**
- Color swatches with 4-block preview
- Hex color codes
- Automatic text contrast calculation (light/dark text based on background brightness)

---

## ⌨️ Keypress Tab

Real-time keyboard event capture and display.

**Event Types Tracked:**
- `keypress` (↓) - Key down events
- `keyrelease` (↑) - Key up events
- `paste` (📋) - Clipboard paste events
- `raw-input` (⌨️) - Raw input sequences

**Information Displayed:**
- Key name (e.g., "return", "escape", "a")
- Modifiers (Ctrl, Meta, Shift, Option, Super, Hyper)
- Raw sequence codes
- Timestamp (ISO 8601 format)

**Export:**
- **Shortcut**: `Ctrl+S` (when in Keypress tab)
- **Format**: JSON file
- **Filename**: `keypress-debug-YYYY-MM-DDTHH-MM-SS.json`
- **Location**: `logs/` directory

**Sample Export:**
```json
{
  "exportedAt": "2025-01-09T12:34:56.789Z",
  "eventCount": 150,
  "events": [
    {
      "id": "evt-0",
      "timestamp": "2025-01-09T12:34:56.789Z",
      "type": "keypress",
      "event": {
        "name": "return",
        "sequence": "\r",
        "ctrl": false,
        "shift": false
      }
    }
  ]
}
```

---

## 📊 FPS Tab

Real-time frame rate and memory monitoring.

**Metrics Displayed:**
- **FPS**: Current frames per second
- **Frame Time**: Average frame time in milliseconds
- **Min/Max**: Minimum and maximum frame times
- **StdDev**: Standard deviation of frame times
- **Memory**: Heap usage in MB

**Update Rate:**
- Frame recording: ~60 FPS (every 16ms)
- Stats display: Every 500ms
- Memory stats: Updated with each frame

**Memory Breakdown:**
- `heapUsedMB`: Current heap memory in use
- `heapTotalMB`: Total allocated heap memory
- `arrayBuffersMB`: Memory used by ArrayBuffers
- `externalMB`: External memory usage

---

## ⚡ Performance Tab

Agent execution performance tracking.

**Metrics Tracked:**
- Agent execution time
- Tool call duration
- Render time
- Image decode time
- Memory usage

**Display Format:**
```
Model: claude-sonnet-4-5-20250929
──────────────────────────────
Agent:       1,234ms
Tools:         567ms
Render:        123ms
──────────────────────────────
Memory:        52.3 MB
──────────────────────────────
Tool calls:    15
Session:       3a4b5c6d
```

---

## 🧭 Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| `Shift+Tab` | Switch agent type (Build → Plan → Code) |
| `Ctrl+K` | Clear all messages (when not in debug) |

---

## ✏️ Editing Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send prompt |
| `Shift+Enter` | Insert new line in prompt |

---

## ⚙️ System Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Exit application |
| `F2` | Test single-select question modal |
| `F3` | Test multi-select question modal |
| `Esc` | Close debug panel / Skip splash screen / Close help |

---

## 📁 Debug Components Architecture

### Component Files

```
src/components/
├── ColorPalette.tsx       # Color palette utilities
├── KeypressDebug.tsx      # Keyboard event capture
├── FPSMonitor.tsx          # FPS/memory tracking
├── DebugPanel.tsx          # Integrated debug panel
└── DebugBox.tsx            # Shortcuts reference
```

### Library Files

```
src/lib/
└── performance-tracker.ts  # Performance tracking utilities
```

### Key Exports

**From `ColorPalette.tsx`:**
- `WAXIN_THEME_COLORS` - Array of theme color hex values
- `processColorPalette(colors)` - Process colors into display format
- `formatColorPaletteAsText(colors, type, columns, width)` - Format as text lines

**From `KeypressDebug.tsx`:**
- `useKeypressDebug(props)` - React hook for keyboard capture
- `formatEvent(event)` - Format event as display string
- `exportEventsToJSON(events)` - Convert events to JSON
- `getExportFilename()` - Generate timestamped filename

**From `FPSMonitor.tsx`:**
- `useFPSMonitor(props)` - React hook for FPS monitoring
- `getMemoryStats()` - Get current memory usage
- `FrameStats` interface - FPS metrics type
- `MemoryStats` interface - Memory metrics type

**From `DebugPanel.tsx`:**
- `useDebugPanel(props)` - React hook for debug panel
- `DebugTab` type - Tab identifier type

**From `DebugBox.tsx`:**
- `formatDebugBox()` - Format shortcuts as display text
- `getShortcutsByCategory(category)` - Get shortcuts by category
- `findShortcut(key)` - Find shortcut config by key
- `SHORTCUTS` - Complete shortcuts array
- `CATEGORIES` - Category configurations

**From `performance-tracker.ts`:**
- `PerformanceTracker` class - Mark-based timing
- `globalTracker` - Singleton instance
- `PerformanceMetrics` interface
- `FrameStats` interface
- `MemoryStats` interface

---

## 🔍 Usage Examples

### Enable FPS Monitoring

```typescript
import { useFPSMonitor } from './components/index.js'

function MyComponent() {
  const fpsMonitor = useFPSMonitor({
    visible: true,
    updateInterval: 500,
  })

  console.log(`Current FPS: ${fpsMonitor.stats.fps}`)
  console.log(`Memory: ${fpsMonitor.memoryStats.heapUsedMB} MB`)
}
```

### Track Performance

```typescript
import { globalTracker } from './lib/performance-tracker.js'

// Start timing
globalTracker.start('myOperation')

// ... do work ...

// End timing
const elapsed = globalTracker.end('myOperation')
console.log(`Operation took ${elapsed}ms`)

// Get metrics
const metrics = globalTracker.getMetrics()
console.log(`Total memory: ${metrics.memory} MB`)
```

### Capture Keypress Events

```typescript
import { useKeypressDebug } from './components/index.js'

function MyComponent() {
  const keypressDebug = useKeypressDebug({
    visible: true,
    maxEvents: 100,
    onExport: (events) => {
      console.log(`Exporting ${events.length} events`)
    }
  })

  return (
    <div>
      <h3>Events: {keypressDebug.events.length}</h3>
      <ul>
        {keypressDebug.formattedEvents.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 🐛 Troubleshooting

### Debug panel not appearing
- Ensure `Ctrl+D` is pressed when no question modal is active
- Check that debug mode state is toggled in app logs

### Keypress events not captured
- Ensure Keypress tab is active (`Ctrl+2` or `Ctrl+K`)
- Verify that other key handlers aren't preventing propagation

### FPS showing 0
- FPS monitoring only updates when debug panel is visible and FPS tab is active
- Frame recording simulates 14-30ms frame times for terminal environment

### Export file not created
- Export is currently logged to console
- File write implementation depends on your environment (browser vs Node.js)

---

## 📝 Integration with opentui-image

The following features were adapted from `@mks2508/opentui-image`:

1. **PerformanceTracker** - Based on `src/performance-tracker.ts`
   - Mark-based timing (`start()`/`end()`)
   - Memory tracking (`getMemoryMB()`)
   - Metrics formatting (`formatMetrics()`, `formatCompact()`)
   - FPS tracking additions (`recordFrameTime()`, `getFrameStats()`)

2. **ColorPalette** - Inspired by `docs-references/opentui/packages/core/src/examples/lib/`
   - `HexList.ts` - Color list with hex values
   - `PaletteGrid.ts` - Compact color grid
   - Brightness calculation for text contrast

3. **KeypressDebug** - Based on `docs-references/opentui/packages/core/src/examples/keypress-debug-demo.ts`
   - Event capture system
   - Formatted display with icons
   - JSON export functionality

4. **FPSMonitor** - Based on `docs-references/opentui/packages/core/src/benchmark/renderer-benchmark.ts`
   - Frame time statistics
   - FPS calculation
   - Standard deviation
   - Memory snapshots

---

## 🔧 Future Enhancements

Potential improvements to debug tools:

- [ ] File system export for keypress events
- [ ] Integration with renderer's native frame callback
- [ ] Historical FPS graph/chart
- [ ] Color palette editor (live theme modification)
- [ ] Event filtering and search in Keypress tab
- [ ] Performance regression alerts
- [ ] Automated benchmark suite

---

## 📚 Related Documentation

- **opentui-image**: https://www.npmjs.com/package/@mks2508/opentui-image
- **@opentui/core**: https://www.npmjs.com/package/@opentui/core
- **@opentui/react**: https://www.npmjs.com/package/@opentui/react
- **Main README**: `/Users/mks/mks-bot-father/README.md`

---

**Last Updated**: 2025-01-09
**opentui-image Version**: 0.2.3
