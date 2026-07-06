# Statuses Management — Technical Documentation

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Message Protocol](#message-protocol)
- [Plugin Thread (`main.ts`)](#plugin-thread-maints)
- [UI Thread](#ui-thread)
  - [State Management (`App.tsx`)](#state-management-apptsx)
  - [Components](#components)
- [Type System](#type-system)
- [Styling](#styling)
- [Build System](#build-system)
- [Known Limitations](#known-limitations)

---

## Overview

**Statuses Management** is a Figma plugin that lets designers and developers view and manage Figma Dev Mode statuses (`Ready for dev` / `Completed`) for all Frames and Sections across one or all pages of a file.

**UI size:** 720 × 580 px
**Supported node types:** `FRAME`, `SECTION` (recursive, any depth)
**Supported statuses:** `READY_FOR_DEV`, `COMPLETED`

---

## Architecture

The plugin follows the standard Figma two-thread model:

```
┌─────────────────────────┐          postMessage           ┌─────────────────────────┐
│   Plugin Thread         │ ─────────────────────────────► │   UI Thread             │
│   src/main.ts           │                                 │   src/ui.tsx            │
│                         │ ◄───────────────────────────── │   src/components/       │
│  - Figma API access     │          postMessage           │  - Preact app           │
│  - Node scanning        │                                 │  - All user interaction │
│  - Status reads/writes  │                                 │  - Filtering/pagination │
│  - Navigation           │                                 │                         │
└─────────────────────────┘                                 └─────────────────────────┘
```

- The **plugin thread** is the only side that can call the Figma Plugin API.
- The **UI thread** is a sandboxed web page (Preact + CSS) with no direct Figma access.
- All communication goes through typed `postMessage` calls defined in `src/types.ts`.

---

## Message Protocol

All messages are defined in `src/types.ts`.

### UI → Plugin (`UiMessage`)

| `type` | Payload | Description |
|--------|---------|-------------|
| `SCAN` | `scope: 'current' \| 'all'` | Scan current page or all pages for nodes with a dev status |
| `SET_STATUS` | `nodeIds: string[]`, `status: SetStatusType` | Set dev status on one or more nodes |
| `SELECT_NODES` | `nodeIds: string[]` | Highlight nodes in the Figma canvas (switches page if needed) |
| `NAVIGATE_TO_NODE` | `nodeId: string`, `pageId: string` | Switch to page and zoom to a single node |

### Plugin → UI (`PluginMessage`)

| `type` | Payload | Description |
|--------|---------|-------------|
| `SCAN_RESULT` | `nodes: NodeInfo[]`, `scope: Scope` | Returns all scanned nodes with their status info |
| `STATUS_UPDATED` | `updates: Array<{ nodeId, status }>` | Confirms which nodes had their status updated |
| `ERROR` | `message: string` | Communicates any exception from the plugin thread |

---

## Plugin Thread (`main.ts`)

Entry point exported as `default function()` (required by `create-figma-plugin`).

### UI Initialization

```ts
figma.showUI(__html__, { width: 720, height: 580, title: 'Statuses Management', themeColors: true });
```

### Helper Functions

#### `isFrameOrSection(node)`
Type guard — returns `true` if the node is a `FrameNode` or `SectionNode`.

#### `readStatus(node)`
Reads `node.devStatus.type` and maps it to `DevStatusType | null`.
Returns `null` if the node has no dev status set.

#### `collectNodes(nodes, pageName, pageId, result)`
Recursively walks the node tree. For each `FRAME` or `SECTION` that has a non-null dev status, pushes a `NodeInfo` object into `result`. Recurses into any node that has `children`.

#### `scanPage(page)`
Wraps `collectNodes` for a single `PageNode`. Returns `NodeInfo[]`.

#### `findParentPage(node)`
Walks up the parent chain until it finds the child of the `DOCUMENT` node — i.e., the containing `PageNode`. Used for `SELECT_NODES` to determine which page each node belongs to.

### Message Handlers

#### `SCAN`
- Calls `scanPage(figma.currentPage)` for `scope: 'current'`
- Calls `figma.root.children.flatMap(p => scanPage(p))` for `scope: 'all'`
- Replies with `SCAN_RESULT` or `ERROR`

#### `SET_STATUS`
- Iterates `nodeIds`, calls `figma.getNodeById`, sets `node.devStatus = { type: status }` directly on each valid Frame/Section
- Replies with `STATUS_UPDATED` containing only the nodeIds that were successfully updated

#### `SELECT_NODES`
- Groups nodes by page, targets the first found page
- Sets `figma.currentPage`, updates `figma.currentPage.selection`, calls `figma.viewport.scrollAndZoomIntoView`

#### `NAVIGATE_TO_NODE`
- Finds page by `pageId`, sets it as current, selects the node, zooms to it

---

## UI Thread

### Entry Point (`ui.tsx`)

Mounts the `<App />` Preact component into the root DOM node provided by `create-figma-plugin`.

CSS is injected as raw text by `scripts/create-html.js` (bypasses create-figma-plugin v4 CSS-modules name mangling).

---

### State Management (`App.tsx`)

All application state lives in a single `App` component using Preact hooks.

#### State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `nodes` | `NodeInfo[]` | Full list of nodes returned by last scan |
| `scope` | `Scope` | Active scan scope: `'current'` or `'all'` |
| `selectedIds` | `Set<string>` | Node IDs checked in the table |
| `page` | `number` | Current pagination page (1-based) |
| `filterStatus` | `FilterStatus` | Active status filter: `'ALL'`, `'READY_FOR_DEV'`, or `'COMPLETED'` |
| `searchQuery` | `string` | Text search input value |
| `loading` | `boolean` | `true` while a scan is in progress |
| `hasScanned` | `boolean` | `true` after the first scan completes (controls empty-state message) |
| `error` | `string \| null` | Error message from the plugin thread, if any |

#### Derived Data (via `useMemo`)

- **`filteredNodes`** — `nodes` filtered by `filterStatus` and `searchQuery` (matches node name or page name)
- **`pagedNodes`** — slice of `filteredNodes` for the current page (page size: 20)
- **`allSelected`** / **`someSelected`** — computed from `selectedIds` vs `pageIds` for header checkbox state

#### Auto-scan on Mount

```ts
useEffect(() => { triggerScan('current'); }, []);
```

The plugin immediately scans the current page when the UI opens.

#### Message Listener

```ts
window.addEventListener('message', onMessage);
```

Handles `SCAN_RESULT`, `STATUS_UPDATED`, and `ERROR` messages from the plugin thread.

#### Key Actions

| Function | Description |
|----------|-------------|
| `triggerScan(scope)` | Sets loading state and sends `SCAN` message |
| `handleSetStatus(nodeIds, status)` | Sends `SET_STATUS` message |
| `handleNavigate(nodeId, pageId)` | Sends `NAVIGATE_TO_NODE` message |
| `handleSelectInFigma(nodeIds)` | Sends `SELECT_NODES` message |
| `setAllStatus(status)` | Sets status on all nodes in `filteredNodes` (respects current search + filter) |

#### Pagination

- Page size: `20` (constant `PAGE_SIZE`)
- `totalPages = Math.ceil(filteredNodes.length / PAGE_SIZE)`
- `safePage = Math.min(page, totalPages)` — prevents stale page after filtering reduces total

#### "Set All" Buttons (footer)

The **All → Ready for dev** and **All → Completed** footer buttons operate on the full `filteredNodes` array — not just the current page. This allows bulk-setting all search results across all pages in one click.

---

### Components

#### `FilterBar`

**File:** `src/components/FilterBar.tsx`

Top bar with four controls:

| Control | Behaviour |
|---------|-----------|
| Scope toggle (`Current page` / `All pages`) | Clicking immediately triggers a rescan |
| Search input | Filters by node name or page name; resets page to 1 |
| Status dropdown | `All statuses` / `Ready for dev` / `Completed`; resets page to 1 |
| Rescan button | Re-runs scan with the current scope; shows `Scanning…` while loading |

Props:

```ts
{
  scope: Scope;
  filterStatus: FilterStatus;
  searchQuery: string;
  loading: boolean;
  onScopeChange: (scope: Scope) => void;
  onFilterStatusChange: (status: FilterStatus) => void;
  onSearchChange: (query: string) => void;
}
```

---

#### `BulkActions`

**File:** `src/components/BulkActions.tsx`

Appears only when `selectedIds.size > 0`. Floats below the filter bar as a blue-tinted action strip.

| Control | Behaviour |
|---------|-----------|
| `N selected` counter | Shows count of checked nodes |
| `→ Ready for dev` | Sets status for all selected nodes |
| `→ Completed` | Sets status for all selected nodes |
| `Select in Figma` | Highlights selected nodes in canvas (switches page if needed) |
| `✕` | Clears the selection |

Props:

```ts
{
  selectedCount: number;
  onSetStatus: (status: SetStatusType) => void;
  onSelectInFigma: () => void;
  onClearSelection: () => void;
}
```

---

#### `NodeTable`

**File:** `src/components/NodeTable.tsx`

Data table showing the current page of filtered nodes. Renders nothing if `nodes` is empty.

**Columns:**

| Column | Width | Content |
|--------|-------|---------|
| Checkbox | 36 px | Row selection; header checkbox is `all` / `indeterminate` / unchecked |
| Name | auto | SVG node-type icon + truncated node name with tooltip |
| Type | 74 px | `Frame` or `Section` chip |
| Status | 118 px | `<StatusBadge>` |
| Page | 90 px | Page name (truncated with tooltip) |
| Actions | 72 px | `↗` navigate button (always visible) + `R` / `C` quick-set buttons (visible on row hover) |

**`HeaderCheckbox`** is an internal sub-component that imperatively sets `input.indeterminate` via a `ref` (the indeterminate state cannot be set declaratively in HTML).

**Icons:** `FrameIcon` and `SectionIcon` are inline SVGs — solid-border rect for Frame, dashed-border rect for Section.

---

#### `Pagination`

**File:** `src/components/Pagination.tsx`

Simple `‹ N / M ›` navigation. Previous button disabled on page 1, next disabled on last page.

Props:

```ts
{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
```

---

#### `StatusBadge`

**File:** `src/components/StatusBadge.tsx`

Pill badge with a coloured dot.

| Status | Label | CSS class |
|--------|-------|-----------|
| `READY_FOR_DEV` | Ready for dev | `badge badge-ready` (amber) |
| `COMPLETED` | Completed | `badge badge-done` (green) |

---

## Type System

**File:** `src/types.ts`

```ts
type Scope         = 'current' | 'all';
type NodeKind      = 'FRAME' | 'SECTION';
type DevStatusType = 'READY_FOR_DEV' | 'COMPLETED';
type SetStatusType = DevStatusType;
type FilterStatus  = 'ALL' | DevStatusType;

interface NodeInfo {
  id:       string;       // Figma node ID
  name:     string;       // node.name
  type:     NodeKind;     // 'FRAME' | 'SECTION'
  status:   DevStatusType;
  pageName: string;
  pageId:   string;
}

type UiMessage =
  | { type: 'SCAN';            scope: Scope }
  | { type: 'SET_STATUS';      nodeIds: string[]; status: SetStatusType }
  | { type: 'SELECT_NODES';    nodeIds: string[] }
  | { type: 'NAVIGATE_TO_NODE'; nodeId: string; pageId: string };

type PluginMessage =
  | { type: 'SCAN_RESULT';    nodes: NodeInfo[]; scope: Scope }
  | { type: 'STATUS_UPDATED'; updates: Array<{ nodeId: string; status: DevStatusType }> }
  | { type: 'ERROR';          message: string };
```

---

## Styling

**File:** `src/styles.css`

Custom CSS — no external framework. Colour tokens follow the **shadcn/ui zinc palette**.

### CSS Variables

```css
--bg, --fg               /* white / near-black */
--muted, --muted-fg      /* light gray background / gray text */
--border                 /* subtle border color */
--primary, --primary-fg  /* near-black / white — used for active states, buttons */
--accent, --accent-fg    /* hover background */
--ring                   /* focus ring */
--radius: 5px

/* Status colours */
--ready-color, --ready-bg, --ready-border   /* amber */
--done-color,  --done-bg,  --done-border    /* green */
```

### Key Layout Rules

- `.app` — full-height flex column, no overflow
- `.filter-bar` — `flex-shrink: 0`, sits at the top
- `.bulk-actions` — `flex-shrink: 0`, appears below filter bar when items are selected
- `.table-wrap` — `flex: 1`, takes remaining height; contains the scrollable table
- `.table-container` — `overflow-y: auto`, scrolls independently
- `thead` — `position: sticky; top: 0` — header stays visible while scrolling
- `.footer` — `flex-shrink: 0`, pagination + "Set All" buttons at the bottom
- `.limitation-notice` — amber strip pinned at the very bottom

### Row Hover Actions

Quick-set `R` / `C` buttons in the Actions column are hidden by default and revealed on row hover:

```css
.row-hover-actions { visibility: hidden; opacity: 0; }
tbody tr:hover .row-hover-actions { visibility: visible; opacity: 1; }
```

---

## Build System

**Tool:** [`create-figma-plugin`](https://github.com/yuanqing/create-figma-plugin) v4 (esbuild-based)

| Script | Command | Description |
|--------|---------|-------------|
| `build` | `build-figma-plugin --typecheck --minify && node scripts/create-html.js` | Production build |
| `dev` | `build-figma-plugin --typecheck --watch && node scripts/create-html.js` | Watch mode |
| `check` | `tsc --noEmit` | Type-check only |

**`scripts/create-html.js`** post-processes the build output to inline `styles.css` as a `<style>` tag inside `build/ui.html`. This is required because `create-figma-plugin` v4 mangles CSS module class names, which would break the plain class names used throughout the components.

The final build artifacts are:
- `build/main.js` — plugin thread bundle
- `build/ui.html` — UI iframe (JS + CSS inlined)
- `build/manifest.json` — Figma plugin manifest

---

## Change Tracking (baseline fingerprints)

Because the Plugin API does not expose Figma's native "Changed" indicator (see
Known Limitations below), the plugin tracks its own equivalent in
`src/fingerprint.ts`:

- **Baseline** — `{ v, h, t, s }` (algorithm version, subtree hash, timestamp,
  status at capture time) stored on the node via
  `setPluginData('baseline', …)`. pluginData lives in the Figma file, so
  baselines persist across sessions and are shared between users.
- **Fingerprint** — FNV-1a hash (two seeded 32-bit passes) over an iterative
  serialization of the subtree: geometry, layout, shape, text and paint
  properties. Normalization mirrors Figma's own exceptions: instance children
  are skipped (main component id + component properties are hashed instead),
  and variable/style **ids** are hashed rather than resolved values, so value
  changes of attached variables/styles don't count as changes. The root node's
  own x/y is excluded — repositioning a frame on canvas is not a content
  change.
- **State derivation** (`getChangedState`, evaluated during `SCAN`):
  - `NO_BASELINE` — no pluginData, unparsable/version-mismatched data, or the
    stored status differs from the current one (status changed outside the
    plugin → baseline is stale).
  - `CHANGED` / `UNCHANGED` — recomputed hash vs. stored hash.
- **Baseline writes** — on `SET_STATUS` (automatic) and on the explicit
  `SET_BASELINE` message (per-row **B** button or bulk **Set baseline**). The
  plugin replies with `STATUS_UPDATED` (now carrying `changed` + `baselineTs`)
  or `BASELINE_SET` respectively; the UI patches its local state without a
  rescan.
- **UI** — `NodeInfo.changed` / `NodeInfo.baselineTs` render as the **Changes**
  column (`ChangedBadge`: Changed / In sync / No baseline) with a matching
  filter select in the `FilterBar`.

State is only re-evaluated on scan — there is no `documentchange` listener.

---

## Known Limitations

### "Completed Changed" state is not exposed by the Plugin API

Figma visually shows a **yellow "Changed"** indicator when a node marked `Completed` is subsequently modified. However, the Figma Plugin API does **not** expose this state — `node.devStatus.type` returns only `'READY_FOR_DEV'` or `'COMPLETED'`.

> From the official Figma docs: *"Currently, the Plugin API does not reflect if a node has been changed since a status was set, but this can be seen in the app."*

The plugin surfaces this limitation via a persistent notice bar at the bottom of the UI and works around it with its own baseline tracking (see **Change Tracking** above). The plugin-tracked state is independent of Figma's native indicator: it only updates through plugin actions and cannot read or clear the indicator shown in the Figma app.

Deliberate gaps of the fingerprint heuristic:
- Edits **inside component instances** are not detected (children are skipped).
- Value changes of **attached variables/styles** are intentionally ignored (matches Figma's behaviour).
- Detection happens only on **Rescan**, not live.
