export const NODE_W = 200;
export const NODE_H = 100;

export function nodeCenter(node) {
  return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 };
}
