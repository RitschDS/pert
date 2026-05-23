import { businessDayOffset } from './dateUtils';

export function computeCPM(nodes, edges, nearCriticalThreshold = 2, projectStartDate = null) {
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

  function effectiveDur(node) {
    if (node.status === 'Complete' || node.type === 'external') return 0;
    return node.duration || 0;
  }

  // Forward pass
  for (const id of topoOrder) {
    const node = nodeMap[id];
    const predMax = predecessors[id].length
      ? Math.max(...predecessors[id].map((p) => EF[p] ?? 0))
      : 0;
    if (node.type === 'external' && node.readyDate && projectStartDate) {
      ES[id] = Math.max(predMax, businessDayOffset(projectStartDate, node.readyDate));
    } else {
      ES[id] = predMax;
    }
    EF[id] = ES[id] + effectiveDur(node);
  }

  const projectEnd = topoOrder.length ? Math.max(...topoOrder.map((id) => EF[id] ?? 0)) : 0;

  const LF = {};
  const LS = {};

  // Backward pass
  for (const id of [...topoOrder].reverse()) {
    const node = nodeMap[id];
    LF[id] = successors[id].length
      ? Math.min(...successors[id].map((s) => LS[s] ?? projectEnd))
      : projectEnd;
    LS[id] = LF[id] - effectiveDur(node);
  }

  const slack = {};
  for (const id of topoOrder) {
    slack[id] = (LS[id] ?? 0) - (ES[id] ?? 0);
  }

  const enriched = nodes.map((n) => {
    const nodeSlack = slack[n.id] ?? 0;
    const readyDateOffset =
      n.type === 'external' && n.readyDate && projectStartDate
        ? businessDayOffset(projectStartDate, n.readyDate)
        : null;
    return {
      ...n,
      type: n.type ?? 'task',
      ES: ES[n.id] ?? 0,
      EF: EF[n.id] ?? 0,
      LS: LS[n.id] ?? 0,
      LF: LF[n.id] ?? 0,
      slack: nodeSlack,
      readyDateOffset,
      isCritical: nodeSlack === 0,
      isNearCritical: nodeSlack > 0 && nodeSlack <= nearCriticalThreshold,
    };
  });

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
