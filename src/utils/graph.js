/** Returns true if adding edge from->to would create a cycle. */
export function wouldCreateCycle(edges, fromId, toId) {
  // Build adjacency list
  const adj = {};
  for (const e of edges) {
    if (!adj[e.from]) adj[e.from] = [];
    adj[e.from].push(e.to);
  }
  if (!adj[fromId]) adj[fromId] = [];
  adj[fromId].push(toId);

  // DFS from toId — if we can reach fromId, there's a cycle
  const visited = new Set();
  const stack = [toId];
  while (stack.length) {
    const node = stack.pop();
    if (node === fromId) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const neighbor of (adj[node] || [])) {
      stack.push(neighbor);
    }
  }
  return false;
}
