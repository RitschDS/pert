import { useState } from 'react';
import { formatDate, calendarDaysUntil, isoToday } from '../utils/dateUtils';

function trunc(str, maxChars) {
  return str.length > maxChars ? str.slice(0, maxChars - 1) + '…' : str;
}

export default function ExternalDependencyCard({
  node,
  cpm,
  rubberBandActive,
  isSelected,
  projectStartDate,
  onMouseDown,
  onDoubleClick,
  onResizeMouseDown,
  onOutputAnchorMouseDown,
  onInputAnchorMouseUp,
}) {
  const [hovered, setHovered] = useState(false);

  const w = node.w ?? 120;
  const h = node.h ?? 80;
  const cx = w / 2;
  const cy = h / 2;
  const points = `${cx},0 ${w},${cy} ${cx},${h} 0,${cy}`;
  const clipId = `clip-ext-${node.id}`;

  const today = isoToday();
  const isComplete = node.status === 'Complete';
  const isOverdue = node.readyDate && node.readyDate < today && !isComplete;
  const isDueSoon = !isOverdue && node.readyDate && !isComplete &&
    calendarDaysUntil(today, node.readyDate) >= 0 &&
    calendarDaysUntil(today, node.readyDate) <= 3;

  let stroke = '#8b5cf6';
  let strokeW = 1.5;
  let bodyFill = '#1e2130';

  if (isOverdue) { stroke = '#ef4444'; strokeW = 2; bodyFill = 'rgba(239,68,68,0.06)'; }
  else if (cpm?.isCritical && !isComplete) { stroke = '#f59e0b'; strokeW = 2; bodyFill = 'rgba(245,158,11,0.06)'; }
  else if (cpm?.isNearCritical) { stroke = '#fb923c'; strokeW = 1.5; }
  if (isComplete) { stroke = 'rgba(34,197,94,0.25)'; strokeW = 1; bodyFill = 'rgba(15,23,30,0.7)'; }

  const showAnchors = hovered || rubberBandActive;
  const anchorColor = '#6366f1';

  const readyLabel = node.readyDate ? `Ready: ${formatDate(node.readyDate)}` : 'No date';

  // Expanded diamond for selection ring
  const ex = 3;
  const selPoints = `${cx},${-ex} ${w + ex},${cy} ${cx},${h + ex} ${-ex},${cy}`;

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
          <polygon points={points} />
        </clipPath>
      </defs>

      {/* Drop shadow */}
      <polygon points={points} fill="rgba(0,0,0,0.45)" transform="translate(3,4)" />

      {/* Diamond body */}
      <polygon
        points={points}
        fill={bodyFill}
        stroke={stroke}
        strokeWidth={strokeW}
      />

      {/* Clipped content */}
      <g clipPath={`url(#${clipId})`} style={{ pointerEvents: 'none' }}>
        {/* Label */}
        <text x={cx} y={cy - 11} fill="#f1f5f9" fontSize={9} fontWeight="700"
          textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif">
          {trunc(node.label, Math.floor(w * 0.6 / 5.5))}
        </text>

        {/* Ready date */}
        <text x={cx} y={cy + 1} fill="#94a3b8" fontSize={8}
          textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif">
          {readyLabel}
        </text>

        {/* Warning / status badge */}
        {isOverdue && (
          <text x={cx} y={cy + 13} fill="#ef4444" fontSize={8} fontWeight="700"
            textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif">Overdue</text>
        )}
        {isDueSoon && (
          <text x={cx} y={cy + 13} fill="#f59e0b" fontSize={8} fontWeight="700"
            textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif">Due Soon</text>
        )}
        {isComplete && (
          <text x={cx} y={cy + 13} fill="#22c55e" fontSize={8} fontWeight="600"
            textAnchor="middle" fontFamily="'IBM Plex Sans', sans-serif">✓ Complete</text>
        )}
      </g>

      {/* Selection ring */}
      {isSelected && (
        <polygon
          points={selPoints}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Resize handle (bottom-right quadrant) */}
      <rect
        x={w - 11} y={cy + 6} width={8} height={8} rx={2}
        fill="rgba(255,255,255,0.12)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={0.5}
        style={{ cursor: 'se-resize' }}
        onMouseDown={(e) => { e.stopPropagation(); onResizeMouseDown(e, node.id); }}
      />

      {/* Input anchor (left tip) */}
      {showAnchors && (
        <circle cx={0} cy={cy} r={5}
          fill={rubberBandActive ? 'rgba(99,102,241,0.2)' : 'transparent'}
          stroke={anchorColor} strokeWidth={1.5}
          style={{ pointerEvents: 'none' }}
        />
      )}
      <circle cx={0} cy={cy} r={9} fill="transparent"
        style={{ cursor: 'crosshair' }}
        onMouseUp={(e) => { e.stopPropagation(); onInputAnchorMouseUp(e, node.id); }}
      />

      {/* Output anchor (right tip) */}
      {showAnchors && (
        <circle cx={w} cy={cy} r={5}
          fill={anchorColor} opacity={0.9}
          style={{ pointerEvents: 'none' }}
        />
      )}
      <circle cx={w} cy={cy} r={9} fill="transparent"
        style={{ cursor: 'crosshair' }}
        onMouseDown={(e) => { e.stopPropagation(); onOutputAnchorMouseDown(e, node.id); }}
      />
    </g>
  );
}
