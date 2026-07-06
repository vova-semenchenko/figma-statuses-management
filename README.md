# Statuses Management — Figma Plugin

Manage Figma Dev Mode statuses (**Ready for dev** / **Completed**) for all
Frames and Sections in your file.

## Features

| Feature | Details |
|---|---|
| Scope | Current page or all pages |
| Node types | `FRAME`, `SECTION` (recursive scan) |
| Statuses shown | Ready for dev, Completed, No status |
| Statuses settable | Ready for dev, Completed |
| Bulk select | Per-page checkboxes + select-all |
| Bulk set status | Sets status for all selected nodes |
| Set all visible | "All →" buttons act on all filtered results |
| Per-row actions | Hover a row → **R** / **C** quick-set + **B** (set baseline) buttons |
| Navigate | ↗ button — switches page + zooms to node in canvas |
| Search | Filter by node name or page name |
| Status filter | Dropdown: All / Ready for dev / Completed / No status |
| Change tracking | **Changes** column: Changed / In sync / No baseline (plugin-tracked, see below) |
| Set baseline | Records the current state as the reference for change tracking (per-row + bulk) |
| Changes filter | Dropdown: All changes / Changed / In sync / No baseline |
| Pagination | 20 items per page |

## Change Tracking (plugin-side "Changed" equivalent)

### ⚠ Figma's native "Changed" indicator is NOT available via Plugin API

Figma displays a **"Changed"** indicator in its UI when a design node marked
`Ready for dev` / `Completed` is subsequently modified. However, the official
Figma Plugin API **does not expose this state** — `node.devStatus.type` returns
only `READY_FOR_DEV` or `COMPLETED`.

From the official docs:
> *"Currently, the Plugin API does not reflect if a node has been changed
> since a status was set, but this can be seen in the app."*

### How the plugin works around it

The plugin keeps its **own** reference point (`src/fingerprint.ts`): when a
status is set via the plugin (or you click **Set baseline**), a fingerprint of
the node's subtree is hashed and stored on the node via `setPluginData`. Each
scan recomputes the fingerprint and compares it, yielding the **Changes**
column state:

- **Changed** — content differs from the stored baseline.
- **In sync** — content matches the baseline.
- **No baseline** — no snapshot exists: the status was set outside the plugin,
  or was changed outside the plugin after a baseline was recorded.

Baselines live in the Figma file itself (pluginData), so they persist across
plugin restarts and are shared between all users of the file.

**Deliberate limits** (mirroring Figma's own rules where possible):
- Value changes of variables/styles already attached to a layer do **not**
  count as changes (only the variable/style id is hashed).
- Edits inside component instances are not detected (instance children are
  skipped; the main component id and component properties are hashed).
- Moving a frame on the canvas does not count as a change.
- The state is only re-evaluated on **Rescan** — there is no live detection.

## Getting Started

```bash
# Install dependencies
npm install

# Development build (watch mode — rebuilds on save)
npm run dev

# Production build
npm run build

# Type-check only (no output)
npm run check
```

**Load in Figma:**
1. Open any Figma file.
2. **Main Menu → Plugins → Development → Import plugin from manifest…**
3. Navigate to `build/manifest.json`.
4. Run: **Plugins → Development → Statuses Management**.

## Publishing

1. Go to [figma.com/plugin-dev](https://www.figma.com/plugin-dev/) and create a new plugin entry to get your plugin ID.
2. Replace `"REPLACE_WITH_YOUR_PLUGIN_ID"` in `package.json` with that ID.
3. Run `npm run build`.
4. Submit via the Figma community dashboard.

## Project Structure

```
src/
  main.ts              Plugin thread — all Figma API calls
  fingerprint.ts       Subtree fingerprinting + baseline storage (pluginData)
  ui.tsx               UI entry point — mounts Preact app
  types.ts             Shared TypeScript types (messages, node info)
  styles.css           shadcn/ui-inspired stylesheet (zinc palette)
  components/
    App.tsx            Root component + all state management
    FilterBar.tsx      Scope toggle, search input, status + changes filters, rescan btn
    BulkActions.tsx    Bulk action bar (appears when items are selected)
    NodeTable.tsx      Data table + NodeRow (checkbox, name, type, status, changes, page, actions)
    Pagination.tsx     Page navigation (‹ N/M ›)
    StatusBadge.tsx    Coloured status chip
    ChangedBadge.tsx   Changed / In sync / No baseline chip
```

## Tech Stack

- **Build tool:** [`create-figma-plugin`](https://github.com/yuanqing/create-figma-plugin) v4 (esbuild-based)
- **UI framework:** [Preact](https://preactjs.com/) 10
- **Styling:** Custom CSS — shadcn/ui zinc colour palette, no external CSS framework
- **Language:** TypeScript 5 (strict mode)
- **Figma types:** Official `@figma/plugin-typings`
