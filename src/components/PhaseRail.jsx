import { useState, useEffect, useRef } from 'react';
import { MIN_PHASE_W, LANE_RAIL_W, PHASE_RAIL_H } from '../utils/constants';

export default function PhaseRail({
  phases,          // [{ id, label, width, color, xOffset }]
  panX,
  scale,
  onResizePhase,   // (id, newWidth) => void
  onRenamePhase,   // (id, label) => void
  onAddPhase,      // () => void
}) {
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const resizeRef = useRef(null);

  // ── Resize ────────────────────────────────────────────────────────────
  function startResize(e, phase) {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { phaseId: phase.id, startX: e.clientX, startWidth: phase.width };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeUp);
  }

  function onResizeMove(e) {
    if (!resizeRef.current) return;
    const { phaseId, startX, startWidth } = resizeRef.current;
    const newW = Math.max(MIN_PHASE_W, startWidth + (e.clientX - startX) / scale);
    onResizePhase(phaseId, newW);
  }

  function onResizeUp() {
    resizeRef.current = null;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeUp);
  }

  useEffect(() => () => {
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeUp);
  }, []);

  const totalWidth = phases.reduce((acc, p) => acc + p.width, 0);

  return (
    <div
      className="absolute top-0 left-0 right-0"
      style={{
        height: PHASE_RAIL_H,
        background: '#0d1017',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        zIndex: 30,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Left spacer matching lane rail */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: LANE_RAIL_W,
          height: '100%',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      />

      {phases.map((phase) => {
        const left = phase.xOffset * scale + panX + LANE_RAIL_W;
        const isEditing = editingId === phase.id;
        const isHovered = hoveredId === phase.id;

        return (
          <div
            key={phase.id}
            style={{
              position: 'absolute',
              left,
              top: 0,
              width: phase.width * scale,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: '1px solid rgba(255,255,255,0.05)',
            }}
            onMouseEnter={() => setHoveredId(phase.id)}
            onMouseLeave={() => setHoveredId(null)}
            onDoubleClick={() => { setEditingId(phase.id); setEditLabel(phase.label); }}
          >
            {isEditing ? (
              <input
                autoFocus
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onBlur={() => { onRenamePhase(phase.id, editLabel || phase.label); setEditingId(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { onRenamePhase(phase.id, editLabel || phase.label); setEditingId(null); }
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(99,102,241,0.6)',
                  borderRadius: 4,
                  color: '#e2e8f0',
                  fontSize: 10,
                  padding: '1px 6px',
                  width: Math.min(phase.width * scale - 24, 120),
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: isHovered ? '#6366f1' : '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'default',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: phase.width * scale - 24,
                  transition: 'color 0.15s',
                }}
              >
                {phase.label}
              </span>
            )}

            {/* Resize handle (right border strip) */}
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: 6,
                height: '100%',
                cursor: 'col-resize',
                borderRight: isHovered
                  ? '2px solid rgba(99,102,241,0.5)'
                  : '1px solid rgba(255,255,255,0.04)',
              }}
              onMouseDown={(e) => startResize(e, phase)}
            />
          </div>
        );
      })}

      {/* Add Phase button */}
      <div
        style={{
          position: 'absolute',
          left: totalWidth * scale + panX + LANE_RAIL_W + 8,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        <button
          onClick={onAddPhase}
          style={{
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 6,
            color: '#6366f1',
            fontSize: 14,
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            lineHeight: 1,
          }}
          title="Add Phase"
        >
          +
        </button>
      </div>
    </div>
  );
}
