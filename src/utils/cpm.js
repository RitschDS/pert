/**
 * Compute CPM (Critical Path Method) for the given nodes and edges.
 * Returns enriched nodes with ES/EF/LS/LF/slack and sets of critical/near-critical edge IDs.
 */
export function computeCPM(nodes, edges, nearCriticalThreshold = 2) {
  if (!nodes.length) {
    return { enriched: [], criticalEdgeIds: new Set(), nearCriticalEdgeIds: new Set(), projectEnd: 0 };
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const successors = {};
  const predecessors = {};
  const inDegree = {};

  for (const n of nodes) {
    successors[n.id] = [];
    predecessors[n.id] = [];
    inDegree[n.id] = 0;
  }

  for (const e of edges) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) continue;
    successors[e.from].push(e.to);
    predecessors[e.to].push(e.from);
    inDegree[e.to]++;
  }

  // Kahn's topological sort
  const queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
  const topoOrder = [];
  const tempDeg = { ...inDegree };
  while (queue.length) {
    const id = queue.shift();
    topoOrder.push(id);
    for (const s of successors[id]) {
      if (--tempDeg[s] === 0) queue.push(s);
    }
  }

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const ES = {};
  const EF = {};

  // Forward pass
  for (const id of topoOrder) {
    const dur = nodeMap[id].status === 'Complete' ? 0 : (nodeMap[id].duration || 0);
    ES[id] = predecessors[id].length ? Math.max(...predecessors[id].map((p) => EF[p] ?? 0)) : 0;
    EF[id] = ES[id] + dur;
  }

  const projectEnd = topoOrder.length ? Math.max(...topoOrder.map((id) => EF[id] ?? 0)) : 0;

  const LF = {};
  const LS = {};

  // Backward pass
  for (const id of [...topoOrder].reverse()) {
    const dur = nodeMap[id].status === 'Complete' ? 0 : (nodeMap[id].duration || 0);
    LF[id] = successors[id].length ? Math.min(...successors[id].map((s) => LS[s] ?? projectEnd)) : projectEnd;
    LS[id] = LF[id] - dur;
  }

  const slack = {};
  for (const id of topoOrder) {
    slack[id] = (LS[id] ?? 0) - (ES[id] ?? 0);
  }

  const enriched = nodes.map((n) => ({
    ...n,
    ES: ES[n.id] ?? 0,
    EF: EF[n.id] ?? 0,
    LS: LS[n.id] ?? 0,
    LF: LF[n.id] ?? 0,
    slack: slack[n.id] ?? 0,
    isCritical: (slack[n.id] ?? 0) === 0,
    isNearCritical: (slack[n.id] ?? 0) > 0 && (slack[n.id] ?? 0) <= nearCriticalThreshold,
  }));

  const criticalEdgeIds = new Set();
  const nearCriticalEdgeIds = new Set();

  for (const e of edges) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) continue;
    const sf = slack[e.from] ?? 0;
    const st = slack[e.to] ?? 0;
    if (sf === 0 && st === 0 && EF[e.from] === ES[e.to]) {
      criticalEdgeIds.add(e.id);
    } else if (sf <= nearCriticalThreshold && st <= nearCriticalThreshold) {
      nearCriticalEdgeIds.add(e.id);
    }
  }

  return { enriched, criticalEdgeIds, nearCriticalEdgeIds, projectEnd };
}
