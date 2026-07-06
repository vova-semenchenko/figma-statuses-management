# Figma Plugin Stack — Quick-Start Reference

Use this document to bootstrap a new Figma plugin with the same stack.

---

## Part 1 — Platform Constants

These are enforced by the Figma platform. They apply regardless of build tool,
UI framework, or plugin type.

### Two isolated environments

Every Figma plugin with a UI runs in two sandboxes that cannot share memory.
They communicate only via serialised message passing.

```
┌──────────────────────────────────┐     postMessage      ┌──────────────────────────────────┐
│  Plugin sandbox  (main.ts)       │ ──────────────────▶  │  UI iframe  (ui.tsx / ui.html)   │
│  Runs in Figma's JS engine       │ ◀──────────────────  │  Runs in a sandboxed browser     │
│  Full access to figma.* API      │     postMessage      │  No figma.* access               │
│  No DOM access                   │                      │  No figma.* access               │
└──────────────────────────────────┘                      └──────────────────────────────────┘
```

**Plugin sandbox** — reads and writes Figma nodes, receives UI messages via
`figma.ui.onmessage`, sends back with `figma.ui.postMessage`.

**UI iframe** — any web tech (React, Preact, Svelte, vanilla). Receives plugin
messages via `window.addEventListener('message')`, sends via
`parent.postMessage({ pluginMessage: msg }, '*')`.

### `manifest.json` — the platform entry point

Required fields for every plugin:

```json
{
  "api": "1.0.0",
  "editorType": ["figma"],
  "id": "YOUR_PLUGIN_ID",
  "name": "My Plugin",
  "main": "build/main.js",
  "ui": "build/ui.html"
}
```

Omit `"ui"` entirely for headless (no-UI) plugins.

### Message passing pattern

This pattern is the same regardless of framework or build tool.

**UI → Plugin:**
```ts
parent.postMessage({ pluginMessage: { type: 'SCAN', scope: 'current' } }, '*');
```

**Plugin receives:**
```ts
figma.ui.onmessage = (msg) => {
  switch (msg.type) {
    case 'SCAN': { /* ... */ break; }
  }
};
```

**Plugin → UI:**
```ts
figma.ui.postMessage({ type: 'SCAN_RESULT', nodes });
```

**UI receives:**
```ts
window.addEventListener('message', (event) => {
  const msg = event.data?.pluginMessage;
  if (!msg) return;
  switch (msg.type) {
    case 'SCAN_RESULT': { /* ... */ break; }
  }
});
```

### Plugin types — what the platform offers

| Type | Has UI | figma.* API | Notes |
|---|---|---|---|
| **UI plugin** | Yes | Full | Standard — this repo's model |
| **Headless plugin** | No | Full | No `ui` in manifest; just `main.ts` |
| **Multiple-command plugin** | Optional | Full | `manifest.json` uses `"menu"` array; `main.ts` switches on `figma.command` |
| **Figma Widget** | No (canvas-native) | `figma.widget.*` subset | Completely different paradigm — React-like declarative API, persistent on canvas, no message passing |

---

## Part 2 — Stack Choices

Everything below is a choice, not a platform requirement. Each item can be
swapped independently.

### This repo's choices

| Layer | Choice | Why / trade-off |
|---|---|---|
| Language | TypeScript 5.x | Type-safe message protocol across both environments |
| UI framework | **Preact** | React-compatible API, ~3 KB vs ~40 KB. Use React if you need the ecosystem. |
| Build tool | **`@create-figma-plugin/build`** | Zero-config esbuild wrapper for the two-entry plugin structure. Vite is a popular alternative. |
| Figma typings | `@figma/plugin-typings` | Official; always pin to `"*"` to track API changes |
| TSConfig base | `@create-figma-plugin/tsconfig` | Pre-configured for the plugin sandbox target |

### Alternatives by layer

**Build tool:**
- `@create-figma-plugin/build` (this repo) — zero-config, opinionated, CSS gotcha in v4
- **Vite** — handles HTML natively, no CSS workaround needed, more flexible
- **esbuild** directly — maximum control, more boilerplate

**UI framework:**
- **Preact** (this repo) — lightest, same hooks API as React
- **React** — larger bundle, full ecosystem; change `jsxImportSource` to `react` in tsconfig
- **Svelte / Vue** — possible with Vite; require custom build config
- **Vanilla JS** — fine for simple plugins; no framework overhead

**Styling:**
- Plain CSS injected via post-build script (this repo, workaround for v4 CSS mangling)
- CSS Modules with Vite — works without workarounds
- Tailwind — works with Vite setup
- Figma DS components — [`@create-figma-plugin/ui`](https://yuanqing.github.io/create-figma-plugin/) provides ready-made Figma-styled components

---

## Part 3 — This Repo's Setup

### File structure

```
my-plugin/
├── src/
│   ├── main.ts              # Plugin sandbox entry (export default function)
│   ├── ui.tsx               # UI entry (export default function(rootNode))
│   ├── types.ts             # Shared message + domain types
│   ├── styles.css           # Global styles — plain CSS, NOT CSS Modules
│   ├── styles.css.d.ts      # Manual type shim for the CSS file
│   └── components/
│       └── App.tsx          # Root Preact component
├── scripts/
│   └── create-html.js       # Post-build: inlines CSS + JS → build/ui.html
├── build/                   # Generated — do not edit
│   ├── main.js
│   ├── ui.js
│   └── ui.html
├── manifest.json            # Patched by create-html.js on every build
├── package.json
└── tsconfig.json
```

### Dependency install

```bash
npm install preact

npm install -D \
  @create-figma-plugin/build \
  @create-figma-plugin/tsconfig \
  @figma/plugin-typings \
  typescript
```

### `package.json` scripts + figma-plugin config

```json
{
  "scripts": {
    "build": "build-figma-plugin --typecheck --minify && node scripts/create-html.js",
    "dev":   "build-figma-plugin --typecheck --watch && node scripts/create-html.js",
    "check": "tsc --noEmit"
  },
  "figma-plugin": {
    "editorType": ["figma"],
    "id": "REPLACE_WITH_YOUR_PLUGIN_ID",
    "name": "My Plugin",
    "main": "src/main.ts",
    "ui":   "src/ui.tsx"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "esModuleInterop":    true,
    "isolatedModules":    true,
    "jsx":                "react-jsx",
    "jsxImportSource":    "preact",
    "lib":                ["DOM", "ES2020"],
    "module":             "ES2020",
    "moduleResolution":   "Node",
    "strict":             true,
    "skipLibCheck":       true
  },
  "include": ["src/**/*"]
}
```

### CSS workaround — `@create-figma-plugin/build` v4 gotcha

v4 treats any imported `.css` file as CSS Modules and mangles class names.
This breaks plain string class names in JSX.

**Workaround used here:**
1. Do not import `styles.css` at runtime — the build ignores it.
2. `scripts/create-html.js` reads `src/styles.css` after the build and inlines
   it as a raw `<style>` block in `build/ui.html`.
3. Use plain string class names in JSX (`class="my-class"`) — they match the
   unmangled CSS.

This workaround is not needed with Vite (which handles CSS and HTML natively).

### Type-safe message protocol

Define all cross-environment messages as discriminated unions in `types.ts`:

```ts
export type UiMessage =
  | { type: 'SCAN'; scope: 'current' | 'all' }
  | { type: 'SET_STATUS'; nodeIds: string[]; status: 'READY_FOR_DEV' | 'COMPLETED' };

export type PluginMessage =
  | { type: 'SCAN_RESULT'; nodes: NodeInfo[] }
  | { type: 'ERROR'; message: string };
```

Use `satisfies PluginMessage` on `postMessage` calls to catch missing/wrong
fields at compile time:

```ts
figma.ui.postMessage({ type: 'SCAN_RESULT', nodes } satisfies PluginMessage);
```

### Entry point signatures

`@create-figma-plugin/build` requires specific export shapes:

```ts
// src/main.ts
export default function () {
  figma.showUI(__html__, { width: 720, height: 580, themeColors: true });
  figma.ui.onmessage = (msg: UiMessage) => { /* ... */ };
}
```

```ts
// src/ui.tsx
import { render } from 'preact';
import { App } from './components/App';

export default function (rootNode: HTMLElement) {
  render(<App />, rootNode);
}
```

### Commands

| Command | What it does |
|---|---|
| `npm run build` | Typecheck + minify + assemble `ui.html` |
| `npm run dev` | Watch mode (re-build on save) |
| `npm run check` | Type-check only, no emit |

### Loading in Figma

1. Open Figma desktop.
2. Menu → Plugins → Development → Import plugin from manifest…
3. Select `manifest.json` from the project root.
4. Use `npm run build` before first load; `npm run dev` during development.
   Reload the plugin in Figma after each rebuild.
