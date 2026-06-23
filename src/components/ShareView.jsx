import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { computeLaneOffsets, computePhaseOffsets } from '../utils/layout';
import { computeCPM } from '../utils/cpm';
import { computeFocusedSet } from '../utils/focus';
import { LANE_RAIL_W, PHASE_RAIL_H, SUMMARY_BAR_H } from '../utils/constants';
import { isoToday } from '../utils/dateUtils';
import PertCanvas from './PertCanvas';
import LaneRail from './LaneRail';
import PhaseRail from './PhaseRail';
import SummaryBar from './SummaryBar';

const SCALE_MIN = 0.25;
const SCALE_MAX = 3;

function InvalidLink() {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#0f1117', fontFamily: "'IBM Plex Sans', sans-serif", gap: 16,
    }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="19" stroke="rgba(255,255,255,0.08)" strokeWidth="2"/>
        <path d="M20 12v10" stroke="#475569" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="20" cy="27" r="1.5" fill="#475569"/>
      </svg>
      <p style={{ color: '#475569', fontSize: 14, margin: 0, fontFamily: "'IBM Plex Sans', sans-serif" }}>
        This link is invalid or has been disabled
      </p>
    </div>
  );
}

export default function ShareView({ token }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'found' | 'invalid'
  const [project, setProject] = useState(null);

  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .eq('share_token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setStatus('invalid');
        } else {
          setProject(data);
          setStatus('found');
        }
      });
  }, [token]);

  if (status === 'loading') return null;
  if (status === 'invalid') return <InvalidLink />;
  return <ShareCanvas project={project} />;
}

function ShareCanvas({ project }) {
  const data = project.data ?? {};

  const [nodes] = useState(data.nodes ?? []);
  const [edges] = useState(data.edges ?? []);
  const [lanes] = useState(data.lanes ?? []);
  const [phases] = useState(data.phases ?? []);
  const [pan, setPan] = useState(
    data.viewport
      ? { x: data.viewport.panX, y: data.viewport.panY }
      : { x: LANE_RAIL_W + 20, y: PHASE_RAIL_H + 20 }
  );
  const [scale, setScale] = useState(data.viewport?.scale ?? 1);
  const [focusedNodeId, setFocusedNodeId] = useState(null);

  const nearCriticalThreshold = data.nearCriticalThreshold ?? 2;
  const projectStartDate = data.projectStartDate ?? isoToday();

  const panRef = useRef(pan);
  const scaleRef = useRef(data.viewport?.scale ?? 1);
  const interactionRef = useRef(null);
  const canvasDivRef = useRef(null);

  const lanesWithOffset = useMemo(() => computeLaneOffsets(lanes), [lanes]);
  const phasesWithOffset = useMemo(() => computePhaseOffsets(phases), [phases]);

  const { enriched: enrichedNodes, criticalEdgeIds, nearCriticalEdgeIds, projectEnd } = useMemo(
    () => computeCPM(nodes, edges, nearCriticalThreshold, projectStartDate),
    [nodes, edges, nearCriticalThreshold, projectStartDate]
  );

  const cpmMap = useMemo(() => {
    const m = new Map();
    for (const n of enrichedNodes) {
      m.set(n.id, { ES: n.ES, EF: n.EF, LS: n.LS, LF: n.LF, slack: n.slack, isCritical: n.isCritical, isNearCritical: n.isNearCritical });
    }
    return m;
  }, [enrichedNodes]);

  const criticalCount = enrichedNodes.filter(n => n.isCritical).length;

  const focusedSet = useMemo(
    () => focusedNodeId ? computeFocusedSet(focusedNodeId, edges) : null,
    [focusedNodeId, edges]
  );
  const focusedNodeLabel = focusedNodeId
    ? (nodes.find(n => n.id === focusedNodeId)?.label ?? '')
    : '';

  // ── Zoom ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const div = canvasDivRef.current;
    if (!div) return;
    let zoomRAF = null;
    function onWheel(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const oldScale = scaleRef.current;
      const dy = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      const factor = Math.exp(-dy * 0.002);
      const newScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, oldScale * factor));
      if (newScale === oldScale) return;
      const rect = div.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cpx = panRef.current.x - LANE_RAIL_W;
      const cpy = panRef.current.y - PHASE_RAIL_H;
      const zf = newScale / oldScale;
      const newPan = { x: mx - zf * (mx - cpx) + LANE_RAIL_W, y: my - zf * (my - cpy) + PHASE_RAIL_H };
      scaleRef.current = newScale;
      panRef.current = newPan;
      if (zoomRAF) cancelAnimationFrame(zoomRAF);
      zoomRAF = requestAnimationFrame(() => { setScale(scaleRef.current); setPan(panRef.current); zoomRAF = null; });
    }
    div.addEventListener('wheel', onWheel, { passive: false });
    return () => { div.removeEventListener('wheel', onWheel); if (zoomRAF) cancelAnimationFrame(zoomRAF); };
  }, []);

  // ── Pan + click-to-focus ──────────────────────────────────────────────────
  const handleCanvasMouseDown = useCallback((e) => {
    const tag = e.target.tagName.toLowerCase();
    if (tag !== 'svg' && tag !== 'rect' && tag !== 'line' && tag !== 'g') return;
    setFocusedNodeId(null);
    interactionRef.current = { type: 'pan', startX: e.clientX, startY: e.clientY, originPan: panRef.current };
  }, []);

  const handleCanvasMouseMove = useCallback((e) => {
    const ix = interactionRef.current;
    if (ix?.type === 'pan') {
      const newPan = { x: ix.originPan.x + (e.clientX - ix.startX), y: ix.originPan.y + (e.clientY - ix.startY) };
      panRef.current = newPan;
      setPan(newPan);
    }
    if (ix?.type === 'nodeDrag') {
      const dx = e.clientX - ix.startMouseX;
      const dy = e.clientY - ix.startMouseY;
      if (!ix.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) ix.moved = true;
    }
  }, []);

  const handleCanvasMouseUp = useCallback(() => {
    const ix = interactionRef.current;
    interactionRef.current = null;
    if (ix?.type === 'nodeDrag' && !ix.moved) {
      setFocusedNodeId(prev => prev === ix.nodeId ? null : ix.nodeId);
    }
  }, []);

  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.preventDefault();
    interactionRef.current = { type: 'nodeDrag', nodeId, startMouseX: e.clientX, startMouseY: e.clientY, moved: false };
  }, []);

  // Escape clears focus
  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') setFocusedNodeId(null); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const canvasPan = { x: pan.x - LANE_RAIL_W, y: pan.y - PHASE_RAIL_H };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#0f1117' }}>

      {/* Read-only banner */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 16px',
        background: '#1e2130',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        zIndex: 40,
        whiteSpace: 'nowrap',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6366f1' }}>PERT</span>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{project.name}</span>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontSize: 11, color: '#475569' }}>View only</span>
      </div>

      <PhaseRail
        phases={phasesWithOffset}
        panX={pan.x - LANE_RAIL_W}
        scale={scale}
        canEdit={false}
        onResizePhase={() => {}}
        onRenamePhase={() => {}}
        onAddPhase={() => {}}
      />

      <LaneRail
        lanes={lanesWithOffset}
        panY={pan.y}
        scale={scale}
        canEdit={false}
        onResizeLane={() => {}}
        onRenameLane={() => {}}
        onDeleteLane={() => {}}
        onReorderLanes={() => {}}
        onAddLane={() => {}}
      />

      <div
        ref={canvasDivRef}
        style={{ position: 'absolute', top: PHASE_RAIL_H, left: LANE_RAIL_W, right: 0, bottom: SUMMARY_BAR_H }}
      >
        <PertCanvas
          nodes={enrichedNodes}
          edges={edges}
          cpmMap={cpmMap}
          criticalEdgeIds={criticalEdgeIds}
          nearCriticalEdgeIds={nearCriticalEdgeIds}
          lanes={lanesWithOffset}
          phases={phasesWithOffset}
          pan={canvasPan}
          scale={scale}
          rubberBand={null}
          selectRect={null}
          selectedIds={new Set()}
          focusedNodeIds={focusedSet?.focusedNodeIds ?? null}
          focusedEdgeIds={focusedSet?.focusedEdgeIds ?? null}
          projectStartDate={projectStartDate}
          canEdit={false}
          onCanvasMouseDown={handleCanvasMouseDown}
          onCanvasMouseMove={handleCanvasMouseMove}
          onCanvasMouseUp={handleCanvasMouseUp}
          onNodeMouseDown={handleNodeMouseDown}
          onNodeDoubleClick={() => {}}
          onResizeMouseDown={() => {}}
          onOutputAnchorMouseDown={() => {}}
          onInputAnchorMouseUp={() => {}}
          onEdgeClick={() => {}}
        />
      </div>

      {/* Focus chip */}
      {focusedNodeId && (
        <div style={{
          position: 'absolute',
          top: PHASE_RAIL_H + 12,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 12px',
          background: '#1e2130',
          border: '1px solid rgba(99,102,241,0.4)',
          borderRadius: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          zIndex: 50, fontSize: 12, whiteSpace: 'nowrap',
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}>
          <span style={{ color: '#6366f1', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Focus</span>
          <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{focusedNodeLabel}</span>
          <button
            onClick={() => setFocusedNodeId(null)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4, color: '#64748b', fontSize: 10, fontWeight: 600,
              padding: '1px 6px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            ESC
          </button>
        </div>
      )}

      <SummaryBar
        projectEnd={projectEnd}
        projectStartDate={projectStartDate}
        criticalCount={criticalCount}
        nearCriticalThreshold={nearCriticalThreshold}
        onThresholdChange={() => {}}
        completeCount={nodes.filter(n => n.status === 'Complete').length}
        totalCount={nodes.length}
        scale={scale}
        deleteMessage={null}
        externalNodes={nodes.filter(n => n.type === 'external')}
        simulation={null}
        baselineProjectEnd={projectEnd}
      />
    </div>
  );
}
