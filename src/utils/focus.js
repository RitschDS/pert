/**
 * Given a focused node ID and the full edge list, compute:
 *   - focusedNodeIds: the node itself + all ancestors + all descendants
 *   - focusedEdgeIds: every edge where both endpoints are in focusedNodeIds
 */
export function computeFocusedSet(nodeId, edges) {
  // Build predecessor / successor maps
  const pred = {}; // id → [ids that point TO id]
  const succ = {}; // id → [ids that id points TO]
  for (const e of edges) {
    (succ[e.from] ??= []).push(e.to);
    (pred[e.to]  ??= []).push(e.from);
  }

  // BFS backwards → ancestors
  const ancestors = new Set();
  const aq = [nodeId];
  const av = new Set([nodeId]);
  while (aq.length) {
    const id = aq.shift();
    for (const p of (pred[id] ?? [])) {
      if (!av.has(p)) { av.add(p); ancestors.add(p); aq.push(p); }
    }
  }

  // BFS forwards → descendants
  const descendants = new Set();
  const dq = [nodeId];
  const dv = new Set([nodeId]);
  while (dq.length) {
    const id = dq.shift();
    for (const s of (succ[id] ?? [])) {
      if (!dv.has(s)) { dv.add(s); descendants.add(s); dq.push(s); }
    }
  }

  const focusedNodeIds = new Set([nodeId, ...ancestors, ...descendants]);

  const focusedEdgeIds = new Set();
  for (const e of edges) {
    if (focusedNodeIds.has(e.from) && focusedNodeIds.has(e.to)) {
      focusedEdgeIds.add(e.id);
    }
  }

  return { focusedNodeIds, focusedEdgeIds };
}
