import { useState, useEffect, useRef } from 'react';
import { MIN_LANE_H, PHASE_RAIL_H, SUMMARY_BAR_H } from '../utils/constants';

let laneCounter = 10;

export default function LaneRail({
  lanes,           // [{ id, label, height, color, yOffset }]
  panY,
  scale,
  canEdit,
  onResizeLane,    // (id, newHeight) => void
  onRenameLane,    // (id, label) => void
  onDeleteLane,    // (id) => void
  onReorderLanes,  // (newLanesArray) => void
  onAddLane,       // () => void
}) {
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [hoveredId, setHoveredId] = useState(null);

  // Resize state
  const resizeRef = useRef(null);

  // Reorder state
  const reorderRef = useRef(null);
  const [reorderDrag, setReorderDrag] = useState(null);
  // { draggingId, localOrder, currentY, startY }

  // ── Resize ────────────────────────────────────────────────────────────
  function startResize(e, lane) {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { laneId: lane.id, startY: e.clientY, startHeight: lane.height };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeUp);
  }

  function onResizeMove(e) {
    if (!resizeRef.current) return;
    const { laneId, startY, startHeight } = resizeRef.current;
    const newH = Math.max(MIN_LANE_H, startHeight + (e.clientY - startY) / scale);
    onResizeLane(laneId, newH);
  }

  function onResizeUp() {
    resizeRef.current = null;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeUp);
  }

  // ── Reorder ───────────────────────────────────────────────────────────
  function startReorder(e, lane) {
    e.preventDefault();
    e.stopPropagation();
    const localOrder = [...lanes];
    reorderRef.current = {
      draggingId: lane.id,
      startY: e.clientY,
      currentY: e.clientY,
      localOrder,
    };
    setReorderDrag({ draggingId: lane.id, localOrder, currentY: e.clientY });
    document.addEventListener('mousemove', onReorderMove);
    document.addEventListener('mouseup', onReorderUp);
  }

  function onReorderMove(e) {
    if (!reorderRef.current) return;
    const { draggingId, localOrder } = reorderRef.current;
    const currentY = e.clientY;
    reorderRef.current.currentY = currentY;

    // Find current index of dragged lane
    const curIdx = localOrder.findIndex((l) => l.id === draggingId);

    // Compute where cursor is relative to lane midpoints
    let y = panY;
    const mids = localOrder.map((l) => {
      const mid = y + (l.height * scale) / 2;
      y += l.height * scale;
      return mid;
    });

    let targetIdx = curIdx;
    for (let i = 0; i < mids.length; i++) {
      if (currentY < mids[i]) { targetIdx = i; break; }
      targetIdx = i;
    }

    if (targetIdx !== curIdx) {
      const newOrder = [...localOrder];
      const [dragged] = newOrder.splice(curIdx, 1);
      newOrder.splice(targetIdx, 0, dragged);
      reorderRef.current.localOrder = newOrder;
      setReorderDrag({ draggingId, localOrder: newOrder, currentY });
    } else {
      setReorderDrag((prev) => prev ? { ...prev, currentY } : null);
    }
  }

  function onReorderUp() {
    if (reorderRef.current) {
      onReorderLanes(reorderRef.current.localOrder);
      reorderRef.current = null;
      setReorderDrag(null);
    }
    document.removeEventListener('mousemove', onReorderMove);
    document.removeEventListener('mouseup', onReorderUp);
  }

  // Cleanup on unmount
  useEffect(() => () => {
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeUp);
    document.removeEventListener('mousemove', onReorderMove);
    document.removeEventListener('mouseup', onReorderUp);
  }, []);

  const displayLanes = reorderDrag ? reorderDrag.localOrder : lanes;

  // Recompute yOffsets for display order
  let y = 0;
  const displayWithOffset = displayLanes.map((l) => {
    const off = y;
    y += l.height;
    return { ...l, yOffset: off };
  });

  const totalH = displayWithOffset.reduce((acc, l) => acc + l.height, 0);

  return (
    <div
      className="absolute left-0"
      style={{
        top: 0,
        bottom: SUMMARY_BAR_H,
        width: 140,
        background: '#0d1017',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        zIndex: 30,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Top spacer matching phase rail */}
      <div style={{ height: PHASE_RAIL_H, borderBottom: '1px solid rgba(255,255,255,0.07)' }} />

      {/* Lane rows */}
      {displayWithOffset.map((lane) => {
        const isDragging = reorderDrag?.draggingId === lane.id;
        const isEditing = editingId === lane.id;

        return (
          <div
            key={lane.id}
            className="absolute"
            style={{
              top: lane.yOffset * scale + panY,
              left: 0,
              width: '100%',
              height: lane.height * scale,
              opacity: isDragging ? 0.45 : 1,
              transition: reorderDrag ? 'top 0.1s' : 'none',
            }}
            onMouseEnter={() => setHoveredId(lane.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Label area (grab to reorder) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                bottom: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canEdit ? 'grab' : 'default',
                paddingInline: 10,
              }}
              onMouseDown={canEdit ? (e) => startReorder(e, lane) : undefined}
              onDoubleClick={canEdit ? () => {
                setEditingId(lane.id);
                setEditLabel(lane.label);
              } : undefined}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={() => { onRenameLane(lane.id, editLabel || lane.label); setEditingId(null); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { onRenameLane(lane.id, editLabel || lane.label); setEditingId(null); }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(99,102,241,0.6)',
                    borderRadius: 4,
                    color: '#e2e8f0',
                    fontSize: 10,
                    padding: '2px 4px',
                    width: '100%',
                    outline: 'none',
                    textAlign: 'center',
                    writingMode: 'horizontal-tb',
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {lane.label}
                </span>
              )}
            </div>

            {/* Delete button (hover only, owner/edit mode) */}
            {canEdit && hoveredId === lane.id && !isEditing && (
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDeleteLane(lane.id); }}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 3,
                  color: '#ef4444',
                  fontSize: 11,
                  cursor: 'pointer',
                  lineHeight: 1,
                  zIndex: 10,
                }}
              >
                ×
              </button>
            )}

            {/* Resize handle (bottom border strip) */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 6,
                cursor: canEdit ? 'row-resize' : 'default',
                borderBottom: hoveredId === lane.id
                  ? '2px solid rgba(99,102,241,0.5)'
                  : '1px solid rgba(255,255,255,0.07)',
              }}
              onMouseDown={canEdit ? (e) => startResize(e, lane) : undefined}
            />
          </div>
        );
      })}

      {/* Add Lane button — hidden in view-only mode */}
      {canEdit && <div
        style={{
          position: 'absolute',
          left: 0,
          width: '100%',
          top: totalH * scale + panY,
          display: 'flex',
          justifyContent: 'center',
          padding: '6px 0',
        }}
      >
        <button
          onClick={onAddLane}
          style={{
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 6,
            color: '#6366f1',
            fontSize: 16,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            lineHeight: 1,
          }}
          title="Add Lane"
        >
          +
        </button>
      </div>}
    </div>
  );
}
