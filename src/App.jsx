import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { INITIAL_NODES, INITIAL_EDGES, INITIAL_LANES, INITIAL_PHASES } from './data/initialData';
import { wouldCreateCycle } from './utils/graph';
import { computeLaneOffsets, computePhaseOffsets, nodeOutputAnchor, nodeInputAnchor } from './utils/layout';
import { computeCPM } from './utils/cpm';
import { LANE_RAIL_W, PHASE_RAIL_H, SUMMARY_BAR_H, MIN_NODE_W, MIN_NODE_H, DEFAULT_NODE_W, DEFAULT_NODE_H } from './utils/constants';
import PertCanvas from './components/PertCanvas';
import Toolbar from './components/Toolbar';
import NodeEditPanel from './components/NodeEditPanel';
import CycleBanner from './components/CycleBanner';
import LaneRail from './components/LaneRail';
import PhaseRail from './components/PhaseRail';
import SummaryBar from './components/SummaryBar';

let _nodeId = 100;
let _edgeId = 100;
let _laneId = 10;
let _phaseId = 10;

function uid(prefix) { return `${prefix}${++_nodeId}`; }

export default function App() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [edges, setEdges] = useState(INITIAL_EDGES);
  const [lanes, setLanes] = useState(INITIAL_LANES);
  const [phases, setPhases] = useState(INITIAL_PHASES);
  const [pan, setPan] = useState({ x: LANE_RAIL_W + 20, y: PHASE_RAIL_H + 20 });
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [rubberBand, setRubberBand] = useState(null);
  const [cycleWarning, setCycleWarning] = useState(false);
  const [nearCriticalThreshold, setNearCriticalThreshold] = useState(2);

  // Refs for stable event handlers
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const panRef = useRef(pan);
  const rubberBandRef = useRef(null);
  const interactionRef = useRef(null);
  // { type: 'pan', startX, startY, originPan }
  // { type: 'nodeDrag', nodeId, startMouseX, startMouseY, startNodeX, startNodeY }
  // { type: 'nodeResize', nodeId, startMouseX, startMouseY, startW, startH }

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  // ── Computed ───────────────────────────────────────────────────────────
  const lanesWithOffset = useMemo(() => computeLaneOffsets(lanes), [lanes]);
  const phasesWithOffset = useMemo(() => computePhaseOffsets(phases), [phases]);

  const { enriched: enrichedNodes, criticalEdgeIds, nearCriticalEdgeIds, projectEnd } = useMemo(
    () => computeCPM(nodes, edges, nearCriticalThreshold),
    [nodes, edges, nearCriticalThreshold]
  );

  const cpmMap = useMemo(() => {
    const m = new Map();
    for (const n of enrichedNodes) {
      m.set(n.id, { ES: n.ES, EF: n.EF, LS: n.LS, LF: n.LF, slack: n.slack, isCritical: n.isCritical, isNearCritical: n.isNearCritical });
    }
    return m;
  }, [enrichedNodes]);

  const criticalCount = enrichedNodes.filter((n) => n.isCritical).length;
  const completeCount = nodes.filter((n) => n.status === 'Complete').length;

  // ── Canvas coord helper ─────────────────────────────────────────────────
  // Canvas coords = client coords − pan (pan includes rail offsets)
  function toCanvas(clientX, clientY) {
    const p = panRef.current;
    return { x: clientX - p.x, y: clientY - p.y };
  }

  // ── Pan ─────────────────────────────────────────────────────────────────
  const handleCanvasMouseDown = useCallback((e) => {
    const tag = e.target.tagName.toLowerCase();
    // Only pan on SVG background elements; node groups stopPropagation
    if (tag !== 'svg' && tag !== 'rect' && tag !== 'line' && tag !== 'g') return;
    // Don't start pan if something else is active
    if (rubberBandRef.current) return;
    interactionRef.current = {
      type: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      originPan: panRef.current,
    };
  }, []);

  const handleCanvasMouseMove = useCallback((e) => {
    const ix = interactionRef.current;

    if (ix?.type === 'pan') {
      setPan({
        x: ix.originPan.x + (e.clientX - ix.startX),
        y: ix.originPan.y + (e.clientY - ix.startY),
      });
    }

    if (ix?.type === 'nodeDrag') {
      const dx = e.clientX - ix.startMouseX;
      const dy = e.clientY - ix.startMouseY;
      setNodes((prev) => prev.map((n) =>
        n.id === ix.nodeId ? { ...n, x: ix.startNodeX + dx, y: ix.startNodeY + dy } : n
      ));
    }

    if (ix?.type === 'nodeResize') {
      const dx = e.clientX - ix.startMouseX;
      const dy = e.clientY - ix.startMouseY;
      setNodes((prev) => prev.map((n) =>
        n.id === ix.nodeId
          ? { ...n, w: Math.max(MIN_NODE_W, ix.startW + dx), h: Math.max(MIN_NODE_H, ix.startH + dy) }
          : n
      ));
    }

    if (rubberBandRef.current) {
      const pos = toCanvas(e.clientX, e.clientY);
      rubberBandRef.current = { ...rubberBandRef.current, currentPos: pos };
      setRubberBand({ ...rubberBandRef.current });
    }
  }, []);

  const handleCanvasMouseUp = useCallback(() => {
    interactionRef.current = null;
    if (rubberBandRef.current) {
      rubberBandRef.current = null;
      setRubberBand(null);
    }
  }, []);

  // ── Node drag ───────────────────────────────────────────────────────────
  const handleNodeMouseDown = useCallback((e, nodeId) => {
    if (rubberBandRef.current) return;
    e.preventDefault();
    const n = nodesRef.current.find((nd) => nd.id === nodeId);
    interactionRef.current = {
      type: 'nodeDrag',
      nodeId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: n?.x ?? 0,
      startNodeY: n?.y ?? 0,
    };
  }, []);

  // ── Node resize ─────────────────────────────────────────────────────────
  const handleResizeMouseDown = useCallback((e, nodeId) => {
    e.preventDefault();
    const n = nodesRef.current.find((nd) => nd.id === nodeId);
    interactionRef.current = {
      type: 'nodeResize',
      nodeId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startW: n?.w ?? DEFAULT_NODE_W,
      startH: n?.h ?? DEFAULT_NODE_H,
    };
  }, []);

  // ── Anchor edge drawing ─────────────────────────────────────────────────
  const handleOutputAnchorMouseDown = useCallback((e, nodeId) => {
    e.preventDefault();
    const n = nodesRef.current.find((nd) => nd.id === nodeId);
    if (!n) return;
    const fromPos = nodeOutputAnchor(n);
    rubberBandRef.current = { fromNodeId: nodeId, fromPos, currentPos: fromPos };
    setRubberBand({ ...rubberBandRef.current });
  }, []);

  const handleInputAnchorMouseUp = useCallback((e, targetId) => {
    e.stopPropagation();
    const rb = rubberBandRef.current;
    if (!rb || rb.fromNodeId === targetId) {
      rubberBandRef.current = null;
      setRubberBand(null);
      return;
    }
    const { fromNodeId } = rb;
    rubberBandRef.current = null;
    setRubberBand(null);
    interactionRef.current = null;

    if (wouldCreateCycle(edgesRef.current, fromNodeId, targetId)) {
      setCycleWarning(true);
    } else {
      const dup = edgesRef.current.some((ed) => ed.from === fromNodeId && ed.to === targetId);
      if (!dup) {
        setEdges((prev) => [...prev, { id: `e${++_edgeId}`, from: fromNodeId, to: targetId }]);
      }
    }
  }, []);

  // ── Edge deletion ───────────────────────────────────────────────────────
  const handleEdgeClick = useCallback((edgeId) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  }, []);

  // ── Node edit ───────────────────────────────────────────────────────────
  const handleNodeDoubleClick = useCallback((nodeId) => {
    setEditingNodeId(nodeId);
  }, []);

  const handleSaveNode = useCallback((updated) => {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setEditingNodeId(null);
  }, []);

  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
    setEditingNodeId(null);
  }, []);

  // ── Add node ────────────────────────────────────────────────────────────
  const handleAddNode = useCallback(() => {
    const id = `n${++_nodeId}`;
    const p = panRef.current;
    const newNode = {
      id,
      label: 'New Task',
      duration: 3,
      assignee: '',
      laneId: lanes[0]?.id ?? 'de',
      status: 'Not Started',
      x: -p.x + window.innerWidth / 2 - DEFAULT_NODE_W / 2,
      y: -p.y + window.innerHeight / 2 - DEFAULT_NODE_H / 2,
      w: DEFAULT_NODE_W,
      h: DEFAULT_NODE_H,
    };
    setNodes((prev) => [...prev, newNode]);
    setEditingNodeId(id);
  }, [lanes]);

  // ── Lane operations ─────────────────────────────────────────────────────
  const handleResizeLane = useCallback((laneId, newH) => {
    setLanes((prev) => prev.map((l) => l.id === laneId ? { ...l, height: newH } : l));
  }, []);

  const handleRenameLane = useCallback((laneId, label) => {
    setLanes((prev) => prev.map((l) => l.id === laneId ? { ...l, label } : l));
  }, []);

  const handleDeleteLane = useCallback((laneId) => {
    setLanes((prev) => prev.filter((l) => l.id !== laneId));
    // Unassign nodes in deleted lane
    setNodes((prev) => prev.map((n) => n.laneId === laneId ? { ...n, laneId: null } : n));
  }, []);

  const handleReorderLanes = useCallback((newLanesArray) => {
    setLanes(newLanesArray);
  }, []);

  const handleAddLane = useCallback(() => {
    const id = `lane${++_laneId}`;
    const n = lanes.length + 1;
    setLanes((prev) => [
      ...prev,
      { id, label: `Lane ${n}`, height: 160, color: 'rgba(148,163,184,0.05)' },
    ]);
  }, [lanes]);

  // ── Phase operations ────────────────────────────────────────────────────
  const handleResizePhase = useCallback((phaseId, newW) => {
    setPhases((prev) => prev.map((p) => p.id === phaseId ? { ...p, width: newW } : p));
  }, []);

  const handleRenamePhase = useCallback((phaseId, label) => {
    setPhases((prev) => prev.map((p) => p.id === phaseId ? { ...p, label } : p));
  }, []);

  const handleAddPhase = useCallback(() => {
    const id = `phase${++_phaseId}`;
    const n = phases.length + 1;
    setPhases((prev) => [
      ...prev,
      { id, label: `Phase ${n}`, width: 240, color: 'rgba(196,181,253,0.04)' },
    ]);
  }, [phases]);

  const editingNode = editingNodeId ? nodes.find((n) => n.id === editingNodeId) : null;

  const canvasPan = { x: pan.x - LANE_RAIL_W, y: pan.y - PHASE_RAIL_H };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#0f1117' }}>

      {/* Phase rail */}
      <PhaseRail
        phases={phasesWithOffset}
        panX={pan.x - LANE_RAIL_W}
        onResizePhase={handleResizePhase}
        onRenamePhase={handleRenamePhase}
        onAddPhase={handleAddPhase}
      />

      {/* Lane rail */}
      <LaneRail
        lanes={lanesWithOffset}
        panY={pan.y}
        onResizeLane={handleResizeLane}
        onRenameLane={handleRenameLane}
        onDeleteLane={handleDeleteLane}
        onReorderLanes={handleReorderLanes}
        onAddLane={handleAddLane}
      />

      {/* Canvas area */}
      <div
        style={{
          position: 'absolute',
          top: PHASE_RAIL_H,
          left: LANE_RAIL_W,
          right: 0,
          bottom: SUMMARY_BAR_H,
        }}
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
          rubberBand={rubberBand}
          onCanvasMouseDown={handleCanvasMouseDown}
          onCanvasMouseMove={handleCanvasMouseMove}
          onCanvasMouseUp={handleCanvasMouseUp}
          onNodeMouseDown={handleNodeMouseDown}
          onNodeDoubleClick={handleNodeDoubleClick}
          onResizeMouseDown={handleResizeMouseDown}
          onOutputAnchorMouseDown={handleOutputAnchorMouseDown}
          onInputAnchorMouseUp={handleInputAnchorMouseUp}
          onEdgeClick={handleEdgeClick}
        />
      </div>

      {/* Toolbar */}
      <Toolbar onAddNode={handleAddNode} />

      {/* Node edit panel */}
      {editingNode && (
        <NodeEditPanel
          node={editingNode}
          lanes={lanes}
          onSave={handleSaveNode}
          onDelete={handleDeleteNode}
          onClose={() => setEditingNodeId(null)}
        />
      )}

      {/* Cycle warning */}
      {cycleWarning && <CycleBanner onDismiss={() => setCycleWarning(false)} />}

      {/* Summary bar */}
      <SummaryBar
        projectEnd={projectEnd}
        criticalCount={criticalCount}
        nearCriticalThreshold={nearCriticalThreshold}
        onThresholdChange={setNearCriticalThreshold}
        completeCount={completeCount}
        totalCount={nodes.length}
      />
    </div>
  );
}
