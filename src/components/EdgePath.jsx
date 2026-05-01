import { useState } from 'react';
import { NODE_W, NODE_H } from '../utils/layout';

export default function EdgePath({ edge, from, to, onEdgeClick }) {
  const [hovered, setHovered] = useState(false);

  const dx = to.x - from.x;
  const cpOffset = Math.max(Math.abs(dx) * 0.45, 60);

  const d = `M ${from.x} ${from.y} C ${from.x + cpOffset} ${from.y}, ${to.x - cpOffset} ${to.y}, ${to.x} ${to.y}`;

  return (
    <g>
      {/* Wide invisible hit area */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onEdgeClick(edge.id); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {/* Visible path */}
      <path
        d={d}
        fill="none"
        stroke={hovered ? '#ef4444' : '#4a5568'}
        strokeWidth={2}
        markerEnd={hovered ? 'url(#arrowhead-hover)' : 'url(#arrowhead)'}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}
