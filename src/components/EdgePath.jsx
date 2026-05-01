import { useState } from 'react';

const CP = 80; // bezier control point offset

export default function EdgePath({ edge, from, to, isCritical, isNearCritical, onEdgeClick }) {
  const [hovered, setHovered] = useState(false);

  const d = `M ${from.x} ${from.y} C ${from.x + CP} ${from.y}, ${to.x - CP} ${to.y}, ${to.x} ${to.y}`;

  let stroke, strokeW, dashArray, markerId;
  if (hovered) {
    stroke = '#ef4444'; strokeW = 2; dashArray = null; markerId = 'arrow-hover';
  } else if (isCritical) {
    stroke = '#f59e0b'; strokeW = 3; dashArray = null; markerId = 'arrow-critical';
  } else if (isNearCritical) {
    stroke = '#fb923c'; strokeW = 2; dashArray = '6 4'; markerId = 'arrow-near-critical';
  } else {
    stroke = '#4a5568'; strokeW = 2; dashArray = null; markerId = 'arrow-default';
  }

  return (
    <g>
      {/* Wide invisible hit area */}
      <path
        d={d} fill="none" stroke="transparent" strokeWidth={14}
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onEdgeClick(edge.id); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {/* Visible path */}
      <path
        d={d} fill="none"
        stroke={stroke}
        strokeWidth={strokeW}
        strokeDasharray={dashArray ?? undefined}
        markerEnd={`url(#${markerId})`}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}
