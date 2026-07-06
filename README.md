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
| Per-row actions | Hover a row → **R** / **C** quick-set buttons |
| Navigate | ↗ button — switches page + zooms to node in canvas |
| Search | Filter by node name or page name |
| Status filter | Dropdown: All / Ready for dev / Completed / No status |
| Pagination | 20 items per page |

## Known Limitations

### ⚠ "Completed Changed" is NOT available via Plugin API

Figma displays a **"Completed Changed"** indicator in its UI when a design
node marked as `Completed` is subsequently modified. However, the official
Figma Plugin API **does not expose this state**.

From the official docs:
> *"Currently, the Plugin API does not reflect if a node has been changed
> since a status was set, but this can be seen in the app."*

**What this means for the plugin:**
- The plugin can only read `READY_FOR_DEV` or `COMPLETED` (or null/none).
- There is no API field to detect the "changed since completed" state.
- The plugin correctly omits this status rather than inventing a workaround.
- The limitation is surfaced in the UI via a persistent notice bar.

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
  ui.tsx               UI entry point — mounts Preact app
  types.ts             Shared TypeScript types (messages, node info)
  styles.css           shadcn/ui-inspired stylesheet (zinc palette)
  components/
    App.tsx            Root component + all state management
    FilterBar.tsx      Scope toggle, search input, status filter, rescan btn
    BulkActions.tsx    Bulk action bar (appears when items are selected)
    NodeTable.tsx      Data table + NodeRow (checkbox, name, type, status, page, actions)
    Pagination.tsx     Page navigation (‹ N/M ›)
    StatusBadge.tsx    Coloured status chip
```

## Tech Stack

- **Build tool:** [`create-figma-plugin`](https://github.com/yuanqing/create-figma-plugin) v4 (esbuild-based)
- **UI framework:** [Preact](https://preactjs.com/) 10
- **Styling:** Custom CSS — shadcn/ui zinc colour palette, no external CSS framework
- **Language:** TypeScript 5 (strict mode)
- **Figma types:** Official `@figma/plugin-typings`
