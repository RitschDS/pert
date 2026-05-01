import { useState } from 'react';
import { MIN_NODE_W, MIN_NODE_H } from '../utils/constants';

const STATUS_COLOR = {
  'Complete':    '#22c55e',
  'In Progress': '#f59e0b',
  'Not Started': '#64748b',
};
const STATUS_BG = {
  'Complete':    'rgba(34,197,94,0.18)',
  'In Progress': 'rgba(245,158,11,0.18)',
  'Not Started': 'rgba(100,116,139,0.18)',
};
const STATUS_W = { 'Complete': 56, 'In Progress': 66, 'Not Started': 70 };

const ASSIGNEE_COLORS = ['#6366f1','#ec4899','#14b8a6','#f97316','#8b5cf6','#0ea5e9'];

function assigneeColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return ASSIGNEE_COLORS[h % ASSIGNEE_COLORS.length];
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0][0]).toUpperCase();
}

function trunc(str, px, fsize = 11) {
  const chars = Math.floor(px / (fsize * 0.55));
  return str.length > chars ? str.slice(0, chars - 1) + '…' : str;
}

export default function NodeCard({
  node,
  cpm,               // { ES, EF, LS, LF, slack, isCritical, isNearCritical } | null
  rubberBandActive,  // bool — show input anchor hint
  onMouseDown,       // (e, nodeId) => void  — node drag
  onDoubleClick,     // (nodeId) => void
  onResizeMouseDown, // (e, nodeId) => void
  onOutputAnchorMouseDown, // (e, nodeId) => void
  onInputAnchorMouseUp,    // (e, nodeId) => void
}) {
  const [hovered, setHovered] = useState(false);

  const w = node.w ?? 200;
  const h = node.h ?? 120;
  const statusColor = STATUS_COLOR[node.status] ?? '#64748b';
  const clipId = `clip-${node.id}`;

  // Card border based on CPM state
  let stroke = 'rgba(255,255,255,0.08)';
  let strokeW = 1;
  let strokeDash = null;
  let bodyFill = '#1e2130';

  if (cpm) {
    if (cpm.isCritical && node.status !== 'Complete') {
      stroke = '#f59e0b'; strokeW = 2; bodyFill = 'rgba(245,158,11,0.06)';
    } else if (cpm.isNearCritical) {
      stroke = '#fb923c'; strokeW = 1.5; strokeDash = '4 3';
    }
  }
  if (node.status === 'Complete') {
    stroke = 'rgba(34,197,94,0.2)'; strokeW = 1; bodyFill = 'rgba(15,23,30,0.7)';
  }

  const showAnchors = hovered || rubberBandActive;
  const anchorColor = '#6366f1';

  const slackColor = !cpm ? '#64748b'
    : cpm.slack === 0 ? '#ef4444'
    : cpm.isNearCritical ? '#fb923c'
    : '#22c55e';

  const showCpm = cpm && h >= 90;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      style={{ cursor: 'grab' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, node.id); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(node.id); }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={w} height={h} rx={9} />
        </clipPath>
      </defs>

      {/* Drop shadow */}
      <rect x={3} y={4} width={w} height={h} rx={9} fill="rgba(0,0,0,0.5)" />

      {/* Card body */}
      <rect
        x={0} y={0} width={w} height={h} rx={9}
        fill={bodyFill}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeDasharray={strokeDash ?? undefined}
      />

      {/* Content clipped to card bounds */}
      <g clipPath={`url(#${clipId})`} style={{ pointerEvents: 'none' }}>
        {/* Status bar */}
        <rect x={0} y={0} width={w} height={5} fill={statusColor} />
        <rect x={0} y={3} width={w} height={2} fill={statusColor} />

        {/* Label */}
        <text x={11} y={20} fill="#f1f5f9" fontSize={12} fontWeight="600"
          fontFamily="'IBM Plex Sans', sans-serif">
          {trunc(node.label, w - 22, 12)}
        </text>

        {/* Duration */}
        <text x={11} y={34} fill="#94a3b8" fontSize={10}
          fontFamily="'IBM Plex Sans', sans-serif">
          {node.duration}d
        </text>

        {/* Assignee initials badge */}
        <circle cx={w - 22} cy={28} r={10} fill={assigneeColor(node.assignee || '')} opacity={0.85} />
        <text x={w - 22} y={32} fill="#fff" fontSize={8} fontWeight="700"
          textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif">
          {initials(node.assignee || '')}
        </text>

        {/* Status badge */}
        <rect x={11} y={42} width={STATUS_W[node.status] ?? 70} height={14} rx={4}
          fill={STATUS_BG[node.status]} />
        <text x={14} y={53} fill={statusColor} fontSize={9} fontWeight="500"
          fontFamily="'IBM Plex Sans', sans-serif">
          {node.status}
        </text>

        {/* Complete checkmark */}
        {node.status === 'Complete' && (
          <text x={w - 14} y={14} fill="#22c55e" fontSize={10}
            textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif">✓</text>
        )}

        {/* CPM section */}
        {showCpm && (
          <>
            <line x1={11} y1={63} x2={w - 11} y2={63} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={11} y={73} fill="#475569" fontSize={9}
              fontFamily="'IBM Plex Sans', sans-serif">
              {`ES:${cpm.ES}  EF:${cpm.EF}`}
            </text>
            <text x={11} y={83} fill="#475569" fontSize={9}
              fontFamily="'IBM Plex Sans', sans-serif">
              {`LS:${cpm.LS}  LF:${cpm.LF}`}
            </text>
            {h >= 100 && (
              <text x={11} y={95} fill={slackColor} fontSize={9} fontWeight="500"
                fontFamily="'IBM Plex Sans', sans-serif">
                {`Slack: ${cpm.slack}d`}
              </text>
            )}
          </>
        )}
      </g>

      {/* Resize handle (bottom-right, not clipped) */}
      <rect
        x={w - 11} y={h - 11} width={9} height={9} rx={2}
        fill="rgba(255,255,255,0.12)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={0.5}
        style={{ cursor: 'se-resize' }}
        onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e, node.id); }}
      />

      {/* Input anchor (left center) */}
      {showAnchors && (
        <circle
          cx={0} cy={h / 2} r={5}
          fill={rubberBandActive ? 'rgba(99,102,241,0.2)' : 'transparent'}
          stroke={anchorColor}
          strokeWidth={1.5}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {/* Input anchor hit area */}
      <circle
        cx={0} cy={h / 2} r={9}
        fill="transparent"
        style={{ cursor: 'crosshair' }}
        onMouseUp={(e) => { e.stopPropagation(); onInputAnchorMouseUp(e, node.id); }}
      />

      {/* Output anchor (right center) */}
      {showAnchors && (
        <circle
          cx={w} cy={h / 2} r={5}
          fill={anchorColor}
          opacity={0.9}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {/* Output anchor hit area */}
      <circle
        cx={w} cy={h / 2} r={9}
        fill="transparent"
        style={{ cursor: 'crosshair' }}
        onMouseDown={(e) => { e.stopPropagation(); onOutputAnchorMouseDown(e, node.id); }}
      />
    </g>
  );
}
