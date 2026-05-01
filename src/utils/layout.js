import { DEFAULT_NODE_W, DEFAULT_NODE_H } from './constants';

export function nodeOutputAnchor(node) {
  const w = node.w ?? DEFAULT_NODE_W;
  const h = node.h ?? DEFAULT_NODE_H;
  return { x: node.x + w, y: node.y + h / 2 };
}

export function nodeInputAnchor(node) {
  const h = node.h ?? DEFAULT_NODE_H;
  return { x: node.x, y: node.y + h / 2 };
}

/** Kept for any legacy callers; prefer anchor helpers above. */
export function nodeCenter(node) {
  const w = node.w ?? DEFAULT_NODE_W;
  const h = node.h ?? DEFAULT_NODE_H;
  return { x: node.x + w / 2, y: node.y + h / 2 };
}

export function computeLaneOffsets(lanes) {
  let y = 0;
  return lanes.map((l) => {
    const result = { ...l, yOffset: y };
    y += l.height;
    return result;
  });
}

export function computePhaseOffsets(phases) {
  let x = 0;
  return phases.map((p) => {
    const result = { ...p, xOffset: x };
    x += p.width;
    return result;
  });
}
