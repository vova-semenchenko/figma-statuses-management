# Statuses Management — Figma Plugin

Manages Figma Dev Mode statuses (`Ready for dev` / `Completed`) for Frames and Sections across one or all pages.

## Rules

- **Git workflow** — `.claude/rules/git-workflow.md`. Always work on feature
  branches following this workflow. **Never merge to `main` without my explicit
  request.**

@.claude/rules/git-workflow.md

## Commands

- `npm run dev` — watch build (typecheck + esbuild + inline CSS into `build/ui.html`)
- `npm run build` — production build (minified)
- `npm run check` — `tsc --noEmit` only, no bundling

There is no lint/test setup. There is currently no git repo initialized in this directory either — if git workflow is needed, run `git init` first (see the imported git-workflow rule above).

## Architecture

Two isolated threads, communicating only via typed `postMessage` (`src/types.ts`):

- **Plugin thread** — `src/main.ts`. Only place with `figma.*` API access. No DOM.
- **UI thread** — `src/ui.tsx` + `src/components/*`. Preact app, sandboxed iframe, no `figma.*` access.

When adding a feature, extend the `UiMessage`/`PluginMessage` union types in `src/types.ts` first, then implement the handler in `main.ts` and the sender/listener in `App.tsx`. Never call `figma.*` from anything under `src/components` or `src/ui.tsx`.

State lives entirely in `App.tsx` via Preact hooks — there is no store/reducer library. Derived data (`filteredNodes`, `pagedNodes`, selection flags) is computed with `useMemo`, not stored as state.

## Build quirk

`create-figma-plugin` v4 mangles CSS module class names. `scripts/create-html.js` post-processes the esbuild output to inline `src/styles.css` as a raw `<style>` tag in `build/ui.html`, bypassing that mangling. Don't introduce CSS modules — plain class names in `styles.css` are required for this to keep working.

## Known platform limitation

The Figma Plugin API does not expose the "Completed Changed" indicator that the Figma app shows visually (`node.devStatus.type` only ever returns `READY_FOR_DEV` or `COMPLETED`). This is surfaced to users via a persistent notice in the UI — don't try to "fix" this by reading some other node property, it isn't exposed anywhere in the API.
