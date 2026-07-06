/// <reference types="@figma/plugin-typings" />

import type { ChangedState, DevStatusType } from './types';

/**
 * Content fingerprinting + baseline storage for change tracking.
 *
 * The Plugin API does not expose Figma's native "Changed" indicator, so the
 * plugin keeps its own reference point: a hash of the node's subtree stored in
 * pluginData at the moment a status is set (or a baseline is set explicitly).
 * Comparing a freshly computed hash against the stored one yields the
 * CHANGED / UNCHANGED state.
 *
 * Mirrors Figma's own exceptions — the following do NOT count as changes:
 * - edits inside component instances (subtree traversal skips their children);
 * - value changes of variables/styles already attached to a layer (only the
 *   variable/style id is hashed, never the resolved value).
 * Additionally, the root node's own x/y is excluded: repositioning a frame on
 * the canvas is not a content change.
 */

const BASELINE_KEY = 'baseline';
/** Bump when the fingerprint algorithm changes — stale baselines become NO_BASELINE. */
const FP_VERSION = 1;

export interface Baseline {
  v: number;
  h: string;
  t: number;
  s: DevStatusType;
}

// ── Hashing ───────────────────────────────────────────────────────────────────

function fnv1a(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Two independently seeded FNV-1a passes → 64 hash bits as a hex string. */
function hash64(str: string): string {
  const a = fnv1a(str, 0x811c9dc5);
  const b = fnv1a(str, 0xcbf29ce4);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

// ── Serialization ─────────────────────────────────────────────────────────────

/** figma.mixed is a unique symbol; JSON.stringify would drop it silently. */
function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'symbol' ? 'MIXED' : value;
}

/** Not every property exists on every node type, and some getters throw. */
function readProp(node: SceneNode, key: string): unknown {
  try {
    return (node as unknown as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

const COMMON_KEYS = ['name', 'visible', 'opacity', 'blendMode'] as const;
const SIZE_KEYS = ['width', 'height', 'rotation'] as const;
const POSITION_KEYS = ['x', 'y'] as const;
const LAYOUT_KEYS = [
  'layoutMode',
  'layoutWrap',
  'primaryAxisSizingMode',
  'counterAxisSizingMode',
  'primaryAxisAlignItems',
  'counterAxisAlignItems',
  'itemSpacing',
  'counterAxisSpacing',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'layoutAlign',
  'layoutGrow',
  'layoutPositioning',
] as const;
const SHAPE_KEYS = [
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius',
  'strokeWeight',
  'strokeAlign',
] as const;
const TEXT_STYLE_KEYS = [
  'fontSize',
  'fontName',
  'textAlignHorizontal',
  'textAlignVertical',
  'letterSpacing',
  'lineHeight',
  'textCase',
  'textDecoration',
] as const;

/**
 * Drop the resolved values of variable-bound fields from a paint/effect,
 * keeping the binding ids (via boundVariables) and all literal fields.
 */
function stripBoundValues(obj: Record<string, unknown>): Record<string, unknown> {
  const bound = obj.boundVariables as Record<string, unknown> | undefined;
  if (!bound || Object.keys(bound).length === 0) return obj;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (key !== 'boundVariables' && key in bound) continue;
    out[key] = obj[key];
  }
  return out;
}

function normalizeList(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map(item =>
    item && typeof item === 'object' ? stripBoundValues(item as Record<string, unknown>) : item,
  );
}

/**
 * Serialize fills/strokes/effects. When the whole property comes from a style,
 * only the style id matters — style value changes must not count as changes.
 */
function collectPaintProps(node: SceneNode, rec: Record<string, unknown>): void {
  const groups: Array<[valueKey: string, styleIdKey: string]> = [
    ['fills', 'fillStyleId'],
    ['strokes', 'strokeStyleId'],
    ['effects', 'effectStyleId'],
  ];
  for (const [valueKey, styleIdKey] of groups) {
    const styleId = readProp(node, styleIdKey);
    if (typeof styleId === 'string' && styleId !== '') {
      rec[styleIdKey] = styleId;
    } else {
      if (styleId !== undefined) rec[styleIdKey] = styleId; // symbol → 'MIXED'
      const value = readProp(node, valueKey);
      if (value !== undefined) rec[valueKey] = normalizeList(value);
    }
  }
}

function serializeNode(node: SceneNode, isRoot: boolean): string {
  const rec: Record<string, unknown> = { type: node.type };

  for (const key of COMMON_KEYS) rec[key] = readProp(node, key);
  for (const key of SIZE_KEYS) rec[key] = readProp(node, key);
  if (!isRoot) for (const key of POSITION_KEYS) rec[key] = readProp(node, key);
  for (const key of LAYOUT_KEYS) {
    const value = readProp(node, key);
    if (value !== undefined) rec[key] = value;
  }
  for (const key of SHAPE_KEYS) {
    const value = readProp(node, key);
    if (value !== undefined) rec[key] = value;
  }

  collectPaintProps(node, rec);

  if (node.type === 'TEXT') {
    rec.characters = readProp(node, 'characters');
    const textStyleId = readProp(node, 'textStyleId');
    if (typeof textStyleId === 'string' && textStyleId !== '') {
      rec.textStyleId = textStyleId;
    } else {
      if (textStyleId !== undefined) rec.textStyleId = textStyleId;
      for (const key of TEXT_STYLE_KEYS) rec[key] = readProp(node, key);
    }
  }

  if (node.type === 'INSTANCE') {
    const main = readProp(node, 'mainComponent') as { id?: string } | null | undefined;
    rec.mainComponentId = main?.id ?? null;
    try {
      rec.componentProperties = (node as InstanceNode).componentProperties;
    } catch {
      // instances without component properties throw — nothing to record
    }
  }

  // Node-level variable bindings: hash the binding ids, not resolved values.
  const bound = readProp(node, 'boundVariables') as Record<string, unknown> | undefined;
  if (bound && Object.keys(bound).length > 0) {
    for (const key of Object.keys(bound)) {
      if (key in rec) rec[key] = 'BOUND';
    }
    rec.boundVariables = bound;
  }

  return JSON.stringify(rec, jsonReplacer);
}

function serializeSubtree(root: FrameNode | SectionNode): string {
  const parts: string[] = [];
  const stack: SceneNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    parts.push(serializeNode(node, node === root));
    // Mirrors Figma: library instance updates don't count as changes.
    if (node.type === 'INSTANCE') continue;
    if ('children' in node) {
      const children = node.children;
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
    }
  }
  return parts.join('\n');
}

// ── Public API ────────────────────────────────────────────────────────────────

export function computeFingerprint(node: FrameNode | SectionNode): string {
  return hash64(serializeSubtree(node));
}

export function readBaseline(node: FrameNode | SectionNode): Baseline | null {
  const raw = node.getPluginData(BASELINE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Baseline;
    if (parsed.v !== FP_VERSION || typeof parsed.h !== 'string' || typeof parsed.t !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeBaseline(node: FrameNode | SectionNode, status: DevStatusType): Baseline {
  const baseline: Baseline = {
    v: FP_VERSION,
    h: computeFingerprint(node),
    t: Date.now(),
    s: status,
  };
  node.setPluginData(BASELINE_KEY, JSON.stringify(baseline));
  return baseline;
}

export function getChangedState(
  node: FrameNode | SectionNode,
  currentStatus: DevStatusType,
): { changed: ChangedState; baselineTs: number | null } {
  const baseline = readBaseline(node);
  // A status changed outside the plugin makes the stored snapshot meaningless.
  if (!baseline || baseline.s !== currentStatus) {
    return { changed: 'NO_BASELINE', baselineTs: null };
  }
  return {
    changed: computeFingerprint(node) === baseline.h ? 'UNCHANGED' : 'CHANGED',
    baselineTs: baseline.t,
  };
}
