/// <reference types="@figma/plugin-typings" />

import type { UiMessage, PluginMessage, NodeInfo, DevStatusType, ChangedState } from './types';
import { getChangedState, writeBaseline } from './fingerprint';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isFrameOrSection(node: BaseNode): node is FrameNode | SectionNode {
  return node.type === 'FRAME' || node.type === 'SECTION';
}

function readStatus(node: FrameNode | SectionNode): DevStatusType | null {
  return node.devStatus?.type ?? null;
}

function collectNodes(
  nodes: readonly SceneNode[],
  pageName: string,
  pageId: string,
  result: NodeInfo[],
): void {
  for (const node of nodes) {
    if (isFrameOrSection(node)) {
      const status = readStatus(node);
      if (status !== null) {
        const { changed, baselineTs } = getChangedState(node, status);
        result.push({
          id: node.id,
          name: node.name,
          type: node.type,
          status,
          pageName,
          pageId,
          changed,
          baselineTs,
        });
      }
    }
    if ('children' in node) {
      collectNodes(node.children, pageName, pageId, result);
    }
  }
}

function scanPage(page: PageNode): NodeInfo[] {
  const result: NodeInfo[] = [];
  collectNodes(page.children, page.name, page.id, result);
  return result;
}

/** Walk up the parent chain to find the containing PageNode. */
function findParentPage(node: BaseNode): PageNode | null {
  let cur: BaseNode = node;
  while (cur.parent) {
    if (cur.parent.type === 'DOCUMENT') return cur as PageNode;
    cur = cur.parent;
  }
  return null;
}

// ── Entry point (required by create-figma-plugin) ────────────────────────────

export default function () {
  figma.showUI(__html__, {
    width: 780,
    height: 580,
    title: 'Statuses Management',
    themeColors: true,
  });

  figma.ui.onmessage = (raw: UiMessage) => {
  switch (raw.type) {
    // ── SCAN ─────────────────────────────────────────────────────────────────
    case 'SCAN': {
      try {
        const nodes: NodeInfo[] =
          raw.scope === 'current'
            ? scanPage(figma.currentPage)
            : figma.root.children.flatMap(p => scanPage(p));

        figma.ui.postMessage({
          type: 'SCAN_RESULT',
          nodes,
          scope: raw.scope,
        } satisfies PluginMessage);
      } catch (err) {
        figma.ui.postMessage({
          type: 'ERROR',
          message: err instanceof Error ? err.message : 'Scan failed.',
        } satisfies PluginMessage);
      }
      break;
    }

    // ── SET_STATUS ────────────────────────────────────────────────────────────
    case 'SET_STATUS': {
      const updates: Array<{
        nodeId: string;
        status: DevStatusType;
        changed: ChangedState;
        baselineTs: number;
      }> = [];
      for (const nodeId of raw.nodeIds) {
        const node = figma.getNodeById(nodeId);
        if (node && isFrameOrSection(node)) {
          node.devStatus = { type: raw.status };
          const baseline = writeBaseline(node, raw.status);
          updates.push({ nodeId, status: raw.status, changed: 'UNCHANGED', baselineTs: baseline.t });
        }
      }
      figma.ui.postMessage({ type: 'STATUS_UPDATED', updates } satisfies PluginMessage);
      break;
    }

    // ── SET_BASELINE ──────────────────────────────────────────────────────────
    case 'SET_BASELINE': {
      const updates: Array<{ nodeId: string; baselineTs: number }> = [];
      for (const nodeId of raw.nodeIds) {
        const node = figma.getNodeById(nodeId);
        if (node && isFrameOrSection(node)) {
          const status = readStatus(node);
          if (status !== null) {
            const baseline = writeBaseline(node, status);
            updates.push({ nodeId, baselineTs: baseline.t });
          }
        }
      }
      figma.ui.postMessage({ type: 'BASELINE_SET', updates } satisfies PluginMessage);
      break;
    }

    // ── SELECT_NODES ──────────────────────────────────────────────────────────
    case 'SELECT_NODES': {
      if (raw.nodeIds.length === 0) break;

      // Group by page; select only nodes on the first found page
      let targetPage: PageNode | null = null;
      const toSelect: SceneNode[] = [];

      for (const nodeId of raw.nodeIds) {
        const node = figma.getNodeById(nodeId);
        if (!node) continue;
        const page = findParentPage(node);
        if (!page) continue;
        if (!targetPage) targetPage = page;
        if (page.id === targetPage.id) toSelect.push(node as SceneNode);
      }

      if (targetPage && toSelect.length > 0) {
        figma.currentPage = targetPage;
        figma.currentPage.selection = toSelect;
        figma.viewport.scrollAndZoomIntoView(toSelect);
      }
      break;
    }

    // ── NAVIGATE_TO_NODE ──────────────────────────────────────────────────────
    case 'NAVIGATE_TO_NODE': {
      const page = figma.root.children.find(p => p.id === raw.pageId);
      if (!page) break;
      const node = figma.getNodeById(raw.nodeId);
      if (!node) break;
      figma.currentPage = page;
      figma.currentPage.selection = [node as SceneNode];
      figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      break;
    }
  }
  };
}
