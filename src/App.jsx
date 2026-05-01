import { useState, useCallback, useRef, useEffect } from 'react';
import { INITIAL_NODES, INITIAL_EDGES } from './data/initialData';
import { wouldCreateCycle } from './utils/graph';
import { NODE_W, NODE_H, nodeCenter } from './utils/layout';
import PertCanvas from './components/PertCanvas';
import Toolbar from './components/Toolbar';
import NodeEditPanel from './components/NodeEditPanel';
import CycleBanner from './components/CycleBanner';
import LaneRail from './components/LaneRail';
import PhaseRail from './components/PhaseRail';

const LANE_RAIL_W = 140;
const PHASE_RAIL_H = 36;

let nextNodeId = 100;
let nextEdgeId = 100;

function makeId(prefix) {
  return `${prefix}${++nextNodeId}`;
}

export default function App() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const nodesRef = useRef(INITIAL_NODES);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  const [edges, setEdges] = useState(INITIAL_EDGES);
  const [pan, setPan] = useState({ x: LANE_RAIL_W + 20, y: PHASE_RAIL_H + 20 });
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [edgeMode, setEdgeMode] = useState(false);
  const [edgeSource, setEdgeSource] = useState(null);
  const [rubberBandEnd, setRubberBandEnd] = useState(null);
  const [cycleWarning, setCycleWarning] = useState(false);

  // Drag state stored in ref to avoid stale closures during mousemove
  const dragRef = useRef(null);
  // Pan state stored in ref too
  const panRef = useRef({ isPanning: false, startX: 0, startY: 0, originPan: { x: 0, y: 0 } });

  // ─── Pan ────────────────────────────────────────────────────────────
  const handleCanvasMouseDown = useCallback((e) => {
    // Only pan on the SVG background itself (target is svg or rect/line backgrounds)
    const tag = e.target.tagName.toLowerCase();
    const isBackground = tag === 'svg' || tag === 'rect' || tag === 'line' || tag === 'g';
    // But we must NOT pan when clicking a node group — those are stopped with stopPropagation
    if (!isBackground) return;

    panRef.current = {
      isPanning: true,
      startX: e.clientX,
      startY: e.clientY,
      originPan: pan,
    };
  }, [pan]);

  const handleCanvasMouseMove = useCallback((e) => {
    // Pan
    if (panRef.current.isPanning) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setPan({
        x: panRef.current.originPan.x + dx,
        y: panRef.current.originPan.y + dy,
      });
    }

    // Drag node
    if (dragRef.current) {
      const { nodeId, startMouseX, startMouseY, startNodeX, startNodeY } = dragRef.current;
      const dx = e.clientX - startMouseX;
      const dy = e.clientY - startMouseY;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, x: startNodeX + dx, y: startNodeY + dy } : n
        )
      );
    }

    // Rubber band
    if (edgeMode && edgeSource) {
      const svgEl = e.currentTarget;
      const rect = svgEl.getBoundingClientRect();
      setRubberBandEnd({
        x: e.clientX - rect.left - pan.x,
        y: e.clientY - rect.top - pan.y,
      });
    }
  }, [edgeMode, edgeSource, pan]);

  const handleCanvasMouseUp = useCallback(() => {
    panRef.current.isPanning = false;
    dragRef.current = null;
  }, []);

  // ─── Node drag ──────────────────────────────────────────────────────
  const handleNodeMouseDown = useCallback((e, nodeId) => {
    if (edgeMode) {
      // In edge mode, click selects source or creates edge
      if (!edgeSource) {
        setEdgeSource(nodeId);
        setRubberBandEnd(null);
      } else if (edgeSource !== nodeId) {
        // Attempt to create edge
        if (wouldCreateCycle(edges, edgeSource, nodeId)) {
          setCycleWarning(true);
        } else {
          const isDuplicate = edges.some((ed) => ed.from === edgeSource && ed.to === nodeId);
          if (!isDuplicate) {
            setEdges((prev) => [...prev, { id: `e${++nextEdgeId}`, from: edgeSource, to: nodeId }]);
          }
        }
        setEdgeSource(null);
        setRubberBandEnd(null);
      }
      return;
    }

    // Normal drag
    e.preventDefault();
    const n = nodesRef.current.find((nd) => nd.id === nodeId);
    dragRef.current = {
      nodeId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: n ? n.x : 0,
      startNodeY: n ? n.y : 0,
    };
  }, [edgeMode, edgeSource, edges]);

  // ─── Edit panel ─────────────────────────────────────────────────────
  const handleNodeDoubleClick = useCallback((nodeId) => {
    if (edgeMode) return;
    setEditingNodeId(nodeId);
  }, [edgeMode]);

  const handleSaveNode = useCallback((updated) => {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setEditingNodeId(null);
  }, []);

  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
    setEditingNodeId(null);
  }, []);

  // ─── Edge deletion ──────────────────────────────────────────────────
  const handleEdgeClick = useCallback((edgeId) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  }, []);

  // ─── Add node ───────────────────────────────────────────────────────
  const handleAddNode = useCallback(() => {
    const id = makeId('n');
    const newNode = {
      id,
      label: 'New Task',
      duration: 3,
      assignee: '',
      laneId: 'de',
      status: 'Not Started',
      // Place at canvas center (accounting for current pan)
      x: -pan.x + window.innerWidth / 2 - NODE_W / 2,
      y: -pan.y + window.innerHeight / 2 - NODE_H / 2,
    };
    setNodes((prev) => [...prev, newNode]);
    setEditingNodeId(id);
  }, [pan]);

  // ─── Edge mode ──────────────────────────────────────────────────────
  const handleToggleEdgeMode = useCallback(() => {
    setEdgeMode((v) => !v);
    setEdgeSource(null);
    setRubberBandEnd(null);
  }, []);

  const editingNode = editingNodeId ? nodes.find((n) => n.id === editingNodeId) : null;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#0f1117' }}>

      {/* Phase rail (top) */}
      <PhaseRail panX={pan.x - LANE_RAIL_W} laneRailWidth={LANE_RAIL_W} />

      {/* Lane rail (left) — rendered on top of SVG */}
      <LaneRail panY={pan.y} />

      {/* Canvas area */}
      <div
        style={{
          position: 'absolute',
          top: PHASE_RAIL_H,
          left: LANE_RAIL_W,
          right: 0,
          bottom: 0,
        }}
      >
        <PertCanvas
          nodes={nodes}
          edges={edges}
          pan={{ x: pan.x - LANE_RAIL_W, y: pan.y - PHASE_RAIL_H }}
          setPan={setPan}
          edgeMode={edgeMode}
          edgeSource={edgeSource}
          onNodeMouseDown={handleNodeMouseDown}
          onNodeDoubleClick={handleNodeDoubleClick}
          onCanvasMouseDown={handleCanvasMouseDown}
          onCanvasMouseMove={handleCanvasMouseMove}
          onCanvasMouseUp={handleCanvasMouseUp}
          onEdgeClick={handleEdgeClick}
          rubberBandEnd={rubberBandEnd}
        />
      </div>

      {/* Toolbar */}
      <Toolbar
        edgeMode={edgeMode}
        onToggleEdgeMode={handleToggleEdgeMode}
        onAddNode={handleAddNode}
      />

      {/* Node edit panel */}
      {editingNode && (
        <NodeEditPanel
          node={editingNode}
          onSave={handleSaveNode}
          onDelete={handleDeleteNode}
          onClose={() => setEditingNodeId(null)}
        />
      )}

      {/* Cycle warning */}
      {cycleWarning && <CycleBanner onDismiss={() => setCycleWarning(false)} />}
    </div>
  );
}
