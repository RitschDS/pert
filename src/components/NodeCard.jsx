import { NODE_W, NODE_H } from '../utils/layout';

const STATUS_LABELS = {
  'Not Started': 'Not Started',
  'In Progress': 'In Progress',
  'Complete':    'Complete',
};

const STATUS_BG = {
  'Complete':    'rgba(34,197,94,0.18)',
  'In Progress': 'rgba(245,158,11,0.18)',
  'Not Started': 'rgba(100,116,139,0.18)',
};

export default function NodeCard({ node, isEdgeSource, edgeMode, statusColor, onMouseDown, onDoubleClick }) {
  const highlight = edgeMode && isEdgeSource;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      style={{ cursor: edgeMode ? 'pointer' : 'grab' }}
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, node.id); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(node.id); }}
    >
      {/* Drop shadow */}
      <rect
        x={3} y={4}
        width={NODE_W} height={NODE_H}
        rx={10} ry={10}
        fill="rgba(0,0,0,0.45)"
      />

      {/* Card body */}
      <rect
        x={0} y={0}
        width={NODE_W} height={NODE_H}
        rx={10} ry={10}
        fill="#1e2130"
        stroke={highlight ? '#818cf8' : 'rgba(255,255,255,0.08)'}
        strokeWidth={highlight ? 2 : 1}
      />

      {/* Status bar */}
      <rect
        x={0} y={0}
        width={NODE_W} height={6}
        rx={10} ry={10}
        fill={statusColor}
      />
      <rect x={0} y={3} width={NODE_W} height={3} fill={statusColor} />

      {/* Label */}
      <text
        x={12} y={28}
        fill="#f1f5f9"
        fontSize={13}
        fontWeight="600"
        fontFamily="'IBM Plex Sans', sans-serif"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {truncate(node.label, 22)}
      </text>

      {/* Duration */}
      <text
        x={12} y={48}
        fill="#94a3b8"
        fontSize={11}
        fontFamily="'IBM Plex Sans', sans-serif"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {node.duration}d
      </text>

      {/* Assignee */}
      <text
        x={12} y={64}
        fill="#64748b"
        fontSize={11}
        fontFamily="'IBM Plex Sans', sans-serif"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {node.assignee}
      </text>

      {/* Status badge */}
      <rect
        x={12} y={74}
        width={statusBadgeWidth(node.status)} height={16}
        rx={4} ry={4}
        fill={STATUS_BG[node.status]}
      />
      <text
        x={16} y={86}
        fill={statusColor}
        fontSize={10}
        fontWeight="500"
        fontFamily="'IBM Plex Sans', sans-serif"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {STATUS_LABELS[node.status]}
      </text>
    </g>
  );
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function statusBadgeWidth(status) {
  return status === 'Not Started' ? 72 : status === 'In Progress' ? 68 : 60;
}
