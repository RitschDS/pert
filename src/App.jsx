import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { INITIAL_NODES, INITIAL_EDGES, INITIAL_LANES, INITIAL_PHASES } from './data/initialData';
import { wouldCreateCycle } from './utils/graph';
import { computeLaneOffsets, computePhaseOffsets, nodeOutputAnchor, nodeInputAnchor } from './utils/layout';
import { computeCPM } from './utils/cpm';
import { computeFocusedSet } from './utils/focus';
import { LANE_RAIL_W, PHASE_RAIL_H, SUMMARY_BAR_H, MIN_NODE_W, MIN_NODE_H, DEFAULT_NODE_W, DEFAULT_NODE_H, DEFAULT_EXT_W, DEFAULT_EXT_H } from './utils/constants';
import { isoToday } from './utils/dateUtils';
import { supabase } from './supabase';
import PertCanvas from './components/PertCanvas';
import Toolbar from './components/Toolbar';
import NodeEditPanel from './components/NodeEditPanel';
import CycleBanner from './components/CycleBanner';
import LaneRail from './components/LaneRail';
import PhaseRail from './components/PhaseRail';
import SummaryBar from './components/SummaryBar';
import LoginScreen from './components/LoginScreen';
import ProjectLibrary from './components/ProjectLibrary';
import ExternalDependencyEditPanel from './components/ExternalDependencyEditPanel';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import ShareModal from './components/ShareModal';

const SCALE_MIN = 0.25;
const SCALE_MAX = 3;

let _nodeId = 100;
let _edgeId = 100;
let _laneId = 10;
let _phaseId = 10;

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = no session
  const [view, setView] = useState('library');        // 'library' | 'canvas'
  const [currentProject, setCurrentProject] = useState(null);
  const [projectMeta, setProjectMeta] = useState({ isOwner: true, canEdit: true, sharedBy: null });
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked a password-reset link — show the set-new-password screen.
        setSession(session);
        setIsRecovery(true);
      } else if (event === 'SIGNED_IN') {
        // PASSWORD_RECOVERY fires first, then SIGNED_IN immediately after.
        // Don't touch isRecovery here — it's only cleared by onDone() or sign-out.
        setSession(session);
      } else {
        setSession(session);
        setIsRecovery(false);
        if (!session) { setView('library'); setCurrentProject(null); }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (!session) return <LoginScreen />;
  if (isRecovery) return <ResetPasswordScreen onDone={() => setIsRecovery(false)} />;

  if (view === 'canvas' && currentProject) {
    return (
      <AppCanvas
        user={session.user}
        project={currentProject}
        isOwner={projectMeta.isOwner}
        canEdit={projectMeta.canEdit}
        sharedBy={projectMeta.sharedBy}
        onBack={() => { setView('library'); setCurrentProject(null); }}
      />
    );
  }

  return (
    <ProjectLibrary
      user={session.user}
      onOpenProject={(project, meta = { isOwner: true, canEdit: true, sharedBy: null }) => {
        setCurrentProject(project);
        setProjectMeta(meta);
        setView('canvas');
      }}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}

function AppCanvas({ user, project, onBack, isOwner, canEdit, sharedBy }) {
  const projectData = project?.data ?? {};

  const [nodes, setNodes] = useState(projectData.nodes ?? INITIAL_NODES);
  const [edges, setEdges] = useState(projectData.edges ?? INITIAL_EDGES);
  const [lanes, setLanes] = useState(projectData.lanes ?? INITIAL_LANES);
  const [phases, setPhases] = useState(projectData.phases ?? INITIAL_PHASES);
  const [pan, setPan] = useState(
    projectData.viewport
      ? { x: projectData.viewport.panX, y: projectData.viewport.panY }
      : { x: LANE_RAIL_W + 20, y: PHASE_RAIL_H + 20 }
  );
  const [scale, setScale] = useState(projectData.viewport?.scale ?? 1);
  const [projectName, setProjectName] = useState(project?.name ?? 'Untitled Project');
  const [projectStartDate, setProjectStartDate] = useState(projectData.projectStartDate ?? isoToday());
  const [simulation, setSimulation] = useState(null); // { nodeId, slippedDate, originalDate, nodeLabel }
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [rubberBand, setRubberBand] = useState(null);        // anchor edge rubber band
  const [selectRect, setSelectRect] = useState(null);        // bulk-select rubber band
  const [selectedIds, setSelectedIds] = useState(new Set()); // selected node IDs
  const [cycleWarning, setCycleWarning] = useState(false);
  const [nearCriticalThreshold, setNearCriticalThreshold] = useState(2);
  const [deleteMessage, setDeleteMessage] = useState(null);
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [accessRevoked, setAccessRevoked] = useState(false);

  // Stable refs so event handlers don't go stale
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const panRef = useRef(pan);
  const scaleRef = useRef(projectData.viewport?.scale ?? 1);
  const selectedIdsRef = useRef(selectedIds);
  const rubberBandRef = useRef(null);
  const selectRectRef = useRef(null);
  const interactionRef = useRef(null);
  // interaction types:
  //   { type:'pan', startX, startY, originPan }
  //   { type:'nodeDrag', nodeId, startMouseX, startMouseY, startNodeX, startNodeY }
  //   { type:'nodeResize', nodeId, startMouseX, startMouseY, startW, startH }
  //   { type:'selectRect' }
  //   { type:'bulkDrag', nodeIds, startMouseX, startMouseY, startPositions:{id:{x,y}} }

  const canvasDivRef = useRef(null);

  // canEdit/isOwner refs — updated synchronously each render so callbacks never see stale values
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;
  const isOwnerRef = useRef(isOwner);
  isOwnerRef.current = isOwner;

  // ── Save state ──────────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle'|'unsaved'|'saving'|'saved'|'error'
  const [savedAt, setSavedAt] = useState(null);
  const latestSaveDataRef = useRef(null);
  const saveTimerRef = useRef(null);
  const retryTimerRef = useRef(null);
  const isFirstRenderRef = useRef(true);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  // panRef and scaleRef are kept authoritative at every mutation site;
  // no useEffect sync so rapid wheel events can't see stale values.
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  // Sync module-level ID counters so new IDs don't collide with loaded data
  useEffect(() => {
    for (const n of (projectData.nodes ?? [])) {
      const num = parseInt(n.id.replace('n', ''), 10);
      if (!isNaN(num) && num > _nodeId) _nodeId = num;
    }
    for (const e of (projectData.edges ?? [])) {
      const num = parseInt(e.id.replace('e', ''), 10);
      if (!isNaN(num) && num > _edgeId) _edgeId = num;
    }
    for (const l of (projectData.lanes ?? [])) {
      const num = parseInt(l.id.replace('lane', ''), 10);
      if (!isNaN(num) && num > _laneId) _laneId = num;
    }
    for (const p of (projectData.phases ?? [])) {
      const num = parseInt(p.id.replace('phase', ''), 10);
      if (!isNaN(num) && num > _phaseId) _phaseId = num;
    }
  }, []); // eslint-disable-line -- projectData is stable for component lifetime

  // ── Computed ────────────────────────────────────────────────────────────
  const lanesWithOffset = useMemo(() => computeLaneOffsets(lanes), [lanes]);
  const phasesWithOffset = useMemo(() => computePhaseOffsets(phases), [phases]);

  // Baseline CPM (no simulation) — used for impact calculation
  const { projectEnd: baselineProjectEnd } = useMemo(
    () => computeCPM(nodes, edges, nearCriticalThreshold, projectStartDate),
    [nodes, edges, nearCriticalThreshold, projectStartDate]
  );

  // Apply simulation override if active
  const nodesForCPM = useMemo(() => {
    if (!simulation) return nodes;
    return nodes.map(n =>
      n.id === simulation.nodeId ? { ...n, readyDate: simulation.slippedDate } : n
    );
  }, [nodes, simulation]);

  const { enriched: enrichedNodes, criticalEdgeIds, nearCriticalEdgeIds, projectEnd } = useMemo(
    () => computeCPM(nodesForCPM, edges, nearCriticalThreshold, projectStartDate),
    [nodesForCPM, edges, nearCriticalThreshold, projectStartDate]
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

  // Focus mode: null when inactive; otherwise the set of node/edge IDs in focus
  const focusedSet = useMemo(
    () => focusedNodeId ? computeFocusedSet(focusedNodeId, edges) : null,
    [focusedNodeId, edges]
  );
  const focusedNodeLabel = focusedNodeId
    ? (nodes.find((n) => n.id === focusedNodeId)?.label ?? '')
    : '';

  // ── Coord helpers ───────────────────────────────────────────────────────
  // Convert viewport client coords → canvas coords (accounts for pan + scale)
  function toCanvas(clientX, clientY) {
    const p = panRef.current;
    const s = scaleRef.current;
    return { x: (clientX - p.x) / s, y: (clientY - p.y) / s };
  }

  // ── Zoom (Ctrl/Cmd + Scroll) ────────────────────────────────────────────
  useEffect(() => {
    const div = canvasDivRef.current;
    if (!div) return;
    let zoomRAF = null;

    function onWheel(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const oldScale = scaleRef.current;

      // Proportional zoom proportional to scroll speed; normalize line-mode.
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
      const newPan = {
        x: mx - zf * (mx - cpx) + LANE_RAIL_W,
        y: my - zf * (my - cpy) + PHASE_RAIL_H,
      };

      // Write refs immediately so the next wheel event reads correct values.
      scaleRef.current = newScale;
      panRef.current = newPan;

      // Coalesce React state updates to one per animation frame — eliminates
      // the per-event re-render churn that causes visible jolting.
      if (zoomRAF) cancelAnimationFrame(zoomRAF);
      zoomRAF = requestAnimationFrame(() => {
        setScale(scaleRef.current);
        setPan(panRef.current);
        zoomRAF = null;
      });
    }

    div.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      div.removeEventListener('wheel', onWheel);
      if (zoomRAF) cancelAnimationFrame(zoomRAF);
    };
  }, []);

  // ── Reset zoom ──────────────────────────────────────────────────────────
  const handleResetZoom = useCallback(() => {
    const newPan = { x: LANE_RAIL_W + 20, y: PHASE_RAIL_H + 20 };
    scaleRef.current = 1;
    panRef.current = newPan;
    setScale(1);
    setPan(newPan);
  }, []);

  // ── Sign out ─────────────────────────────────────────────────────────────
  const handleSignOut = useCallback(() => {
    supabase.auth.signOut();
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────
  const performSave = useCallback(async () => {
    if (!latestSaveDataRef.current) return;
    if (!canEditRef.current) return;
    setSaveStatus('saving');
    const { name, data } = latestSaveDataRef.current;
    const query = isOwnerRef.current
      ? supabase.from('projects').upsert({ id: project.id, user_id: user.id, name, data })
      : supabase.from('projects').update({ name, data }).eq('id', project.id);
    const { error } = await query;
    if (error) {
      if (error.code === '42501') {
        setAccessRevoked(true);
      } else {
        setSaveStatus('error');
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(performSave, 5000);
      }
    } else {
      setSaveStatus('saved');
      setSavedAt(new Date());
      clearTimeout(retryTimerRef.current);
    }
  }, []); // project.id and user.id are stable for the lifetime of this component

  const handleManualSave = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    if (latestSaveDataRef.current) performSave();
  }, [performSave]);

  const handleBack = useCallback(() => {
    if (saveStatus === 'unsaved' || saveStatus === 'saving') {
      if (!window.confirm('You have unsaved changes. Leave anyway?')) return;
    }
    clearTimeout(saveTimerRef.current);
    clearTimeout(retryTimerRef.current);
    onBack();
  }, [saveStatus, onBack]);

  // Auto-save: debounce all canvas state changes by 2 seconds
  useEffect(() => {
    if (isFirstRenderRef.current) { isFirstRenderRef.current = false; return; }
    if (!canEdit) return;
    latestSaveDataRef.current = {
      name: projectName,
      data: {
        version: 1,
        nodes,
        edges,
        lanes,
        phases,
        nearCriticalThreshold,
        projectStartDate,
        viewport: { panX: pan.x, panY: pan.y, scale },
      },
    };
    setSaveStatus('unsaved');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(performSave, 2000);
  }, [nodes, edges, lanes, phases, nearCriticalThreshold, pan, scale, projectName, projectStartDate]); // eslint-disable-line

  // Cleanup timers on unmount
  useEffect(() => {
    return () => { clearTimeout(saveTimerRef.current); clearTimeout(retryTimerRef.current); };
  }, []);

  // ── Keyboard: Delete/Backspace bulk delete, Escape deselect ────────────
  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setFocusedNodeId(null);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!canEditRef.current) return;
        setSelectedIds((prev) => {
          if (prev.size === 0) return prev;
          const count = prev.size;
          setNodes((ns) => ns.filter((n) => !prev.has(n.id)));
          setEdges((es) => es.filter((ed) => !prev.has(ed.from) && !prev.has(ed.to)));
          setDeleteMessage(`Deleted ${count} node${count !== 1 ? 's' : ''}`);
          setTimeout(() => setDeleteMessage(null), 2000);
          return new Set();
        });
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // ── Pan / selection rubber band (canvas background mousedown) ───────────
  const handleCanvasMouseDown = useCallback((e) => {
    const tag = e.target.tagName.toLowerCase();
    if (tag !== 'svg' && tag !== 'rect' && tag !== 'line' && tag !== 'g') return;
    if (rubberBandRef.current) return;

    if (e.shiftKey && canEditRef.current) {
      // Start bulk-select rubber band — clears focus mode (mutually exclusive)
      setFocusedNodeId(null);
      const pos = toCanvas(e.clientX, e.clientY);
      selectRectRef.current = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
      setSelectRect({ ...selectRectRef.current });
      interactionRef.current = { type: 'selectRect' };
      return;
    }

    // Plain canvas click → exit focus mode and clear selection, then pan
    setFocusedNodeId(null);
    setSelectedIds(new Set());
    interactionRef.current = {
      type: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      originPan: panRef.current,
    };
  }, []);

  const handleCanvasMouseMove = useCallback((e) => {
    const ix = interactionRef.current;
    const s = scaleRef.current;

    if (ix?.type === 'pan') {
      const newPan = {
        x: ix.originPan.x + (e.clientX - ix.startX),
        y: ix.originPan.y + (e.clientY - ix.startY),
      };
      panRef.current = newPan;
      setPan(newPan);
    }

    if (ix?.type === 'nodeDrag') {
      const dx = (e.clientX - ix.startMouseX) / s;
      const dy = (e.clientY - ix.startMouseY) / s;
      if (!ix.moved && (Math.abs(dx) > 4 / s || Math.abs(dy) > 4 / s)) ix.moved = true;
      if (canEditRef.current) setNodes((prev) => prev.map((n) =>
        n.id === ix.nodeId ? { ...n, x: ix.startNodeX + dx, y: ix.startNodeY + dy } : n
      ));
    }

    if (ix?.type === 'nodeResize' && canEditRef.current) {
      const dx = (e.clientX - ix.startMouseX) / s;
      const dy = (e.clientY - ix.startMouseY) / s;
      setNodes((prev) => prev.map((n) =>
        n.id === ix.nodeId
          ? { ...n, w: Math.max(MIN_NODE_W, ix.startW + dx), h: Math.max(MIN_NODE_H, ix.startH + dy) }
          : n
      ));
    }

    if (ix?.type === 'bulkDrag') {
      const dx = (e.clientX - ix.startMouseX) / s;
      const dy = (e.clientY - ix.startMouseY) / s;
      if (!ix.moved && (Math.abs(dx) > 4 / s || Math.abs(dy) > 4 / s)) ix.moved = true;
      if (canEditRef.current) setNodes((prev) => prev.map((n) => {
        const start = ix.startPositions[n.id];
        if (!start) return n;
        return { ...n, x: start.x + dx, y: start.y + dy };
      }));
    }

    if (ix?.type === 'selectRect' && selectRectRef.current && canEditRef.current) {
      const pos = toCanvas(e.clientX, e.clientY);
      selectRectRef.current = { ...selectRectRef.current, x2: pos.x, y2: pos.y };
      setSelectRect({ ...selectRectRef.current });
    }

    if (rubberBandRef.current) {
      const pos = toCanvas(e.clientX, e.clientY);
      rubberBandRef.current = { ...rubberBandRef.current, currentPos: pos };
      setRubberBand({ ...rubberBandRef.current });
    }
  }, []);

  const handleCanvasMouseUp = useCallback((e) => {
    const ix = interactionRef.current;
    interactionRef.current = null;

    // Click detection: node drag or bulk drag that never moved → treat as click → focus mode
    if ((ix?.type === 'nodeDrag' || ix?.type === 'bulkDrag') && !ix.moved) {
      const clickedId = ix.nodeId ?? ix.clickedNodeId;
      if (clickedId) {
        setFocusedNodeId((prev) => (prev === clickedId ? null : clickedId));
        setSelectedIds(new Set()); // entering focus clears bulk selection
        return;
      }
    }

    if (ix?.type === 'selectRect' && selectRectRef.current) {
      const { x1, y1, x2, y2 } = selectRectRef.current;
      const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
      const hitIds = nodesRef.current
        .filter((n) => {
          const nw = n.w ?? DEFAULT_NODE_W;
          const nh = n.h ?? DEFAULT_NODE_H;
          return n.x < maxX && n.x + nw > minX && n.y < maxY && n.y + nh > minY;
        })
        .map((n) => n.id);
      // Always additive (rubber band requires Shift to start)
      setSelectedIds((prev) => {
        const next = new Set(prev);
        hitIds.forEach((id) => next.add(id));
        return next;
      });
      selectRectRef.current = null;
      setSelectRect(null);
    }

    if (rubberBandRef.current) {
      rubberBandRef.current = null;
      setRubberBand(null);
    }
  }, []);

  // ── Node drag / shift-click / bulk drag ─────────────────────────────────
  const handleNodeMouseDown = useCallback((e, nodeId) => {
    if (rubberBandRef.current) return;

    if (e.shiftKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
        return next;
      });
      return;
    }

    e.preventDefault();

    if (selectedIdsRef.current.has(nodeId)) {
      // Bulk drag: move all selected nodes together
      const positions = {};
      for (const id of selectedIdsRef.current) {
        const n = nodesRef.current.find((nd) => nd.id === id);
        if (n) positions[id] = { x: n.x, y: n.y };
      }
      interactionRef.current = {
        type: 'bulkDrag',
        clickedNodeId: nodeId,
        nodeIds: [...selectedIdsRef.current],
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPositions: positions,
        moved: false,
      };
      return;
    }

    // Non-selected node: deselect all, single drag
    setSelectedIds(new Set());
    const n = nodesRef.current.find((nd) => nd.id === nodeId);
    interactionRef.current = {
      type: 'nodeDrag',
      nodeId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: n?.x ?? 0,
      startNodeY: n?.y ?? 0,
      moved: false,
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
    if (!canEditRef.current) return;
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
    const s = scaleRef.current;
    const newNode = {
      id,
      type: 'task',
      label: 'New Task',
      duration: 3,
      assignee: '',
      laneId: lanes[0]?.id ?? 'de',
      status: 'Not Started',
      x: (window.innerWidth / 2 - p.x) / s - DEFAULT_NODE_W / 2,
      y: (window.innerHeight / 2 - p.y) / s - DEFAULT_NODE_H / 2,
      w: DEFAULT_NODE_W,
      h: DEFAULT_NODE_H,
    };
    setNodes((prev) => [...prev, newNode]);
    setEditingNodeId(id);
  }, [lanes]);

  const handleAddExternalNode = useCallback(() => {
    const id = `n${++_nodeId}`;
    const p = panRef.current;
    const s = scaleRef.current;
    const newNode = {
      id,
      type: 'external',
      label: 'External Dependency',
      readyDate: isoToday(),
      assignee: '',
      status: 'Not Started',
      x: (window.innerWidth / 2 - p.x) / s - DEFAULT_EXT_W / 2,
      y: (window.innerHeight / 2 - p.y) / s - DEFAULT_EXT_H / 2,
      w: DEFAULT_EXT_W,
      h: DEFAULT_EXT_H,
    };
    setNodes((prev) => [...prev, newNode]);
    setEditingNodeId(id);
  }, []);

  // ── Simulation ───────────────────────────────────────────────────────────
  const handleSimulate = useCallback((nodeId, slippedDate, originalDate, nodeLabel) => {
    setSimulation({ nodeId, slippedDate, originalDate, nodeLabel });
  }, []);

  const handleStopSimulation = useCallback(() => {
    setSimulation(null);
  }, []);

  // ── Lane operations ─────────────────────────────────────────────────────
  const handleResizeLane = useCallback((laneId, newH) => {
    setLanes((prev) => prev.map((l) => l.id === laneId ? { ...l, height: newH } : l));
  }, []);

  const handleRenameLane = useCallback((laneId, label) => {
    setLanes((prev) => prev.map((l) => l.id === laneId ? { ...l, label } : l));
  }, []);

  const handleDeleteLane = useCallback((laneId) => {
    setLanes((prev) => prev.filter((l) => l.id !== laneId));
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

      <PhaseRail
        phases={phasesWithOffset}
        panX={pan.x - LANE_RAIL_W}
        scale={scale}
        canEdit={canEdit}
        onResizePhase={handleResizePhase}
        onRenamePhase={handleRenamePhase}
        onAddPhase={handleAddPhase}
      />

      <LaneRail
        lanes={lanesWithOffset}
        panY={pan.y}
        scale={scale}
        canEdit={canEdit}
        onResizeLane={handleResizeLane}
        onRenameLane={handleRenameLane}
        onDeleteLane={handleDeleteLane}
        onReorderLanes={handleReorderLanes}
        onAddLane={handleAddLane}
      />

      {/* Canvas area */}
      <div
        ref={canvasDivRef}
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
          scale={scale}
          rubberBand={rubberBand}
          selectRect={selectRect}
          selectedIds={selectedIds}
          focusedNodeIds={focusedSet?.focusedNodeIds ?? null}
          focusedEdgeIds={focusedSet?.focusedEdgeIds ?? null}
          projectStartDate={projectStartDate}
          onCanvasMouseDown={handleCanvasMouseDown}
          onCanvasMouseMove={handleCanvasMouseMove}
          onCanvasMouseUp={handleCanvasMouseUp}
          onNodeMouseDown={handleNodeMouseDown}
          onNodeDoubleClick={handleNodeDoubleClick}
          onResizeMouseDown={handleResizeMouseDown}
          onOutputAnchorMouseDown={handleOutputAnchorMouseDown}
          onInputAnchorMouseUp={handleInputAnchorMouseUp}
          onEdgeClick={handleEdgeClick}
          canEdit={canEdit}
        />

        {/* Simulation banner */}
        {simulation && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: 8, padding: '6px 14px', color: '#f59e0b', fontSize: 11, fontWeight: 600,
            zIndex: 45, whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            Simulation mode — not saved
          </div>
        )}

        {/* Access revoked banner */}
        {accessRevoked && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            padding: '8px 16px', color: '#fca5a5', fontSize: 12, fontWeight: 600,
            zIndex: 50, textAlign: 'center',
          }}>
            Access removed — this project is no longer shared with you
          </div>
        )}

        {/* View-only banner */}
        {!canEdit && !accessRevoked && sharedBy && (
          <div style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 8, padding: '5px 14px', color: '#818cf8', fontSize: 11, fontWeight: 600,
            zIndex: 45, whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            View only — shared by {sharedBy}
          </div>
        )}

        {/* Shared-edit banner */}
        {canEdit && !isOwner && sharedBy && (
          <div style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 8, padding: '5px 14px', color: '#4ade80', fontSize: 11, fontWeight: 600,
            zIndex: 45, whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            Shared project — owned by {sharedBy}
          </div>
        )}
      </div>

      <Toolbar
        onAddNode={handleAddNode}
        onAddExternalNode={handleAddExternalNode}
        scale={scale}
        onResetZoom={handleResetZoom}
        user={user}
        onSignOut={handleSignOut}
        onBack={handleBack}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        saveStatus={saveStatus}
        savedAt={savedAt}
        onSave={handleManualSave}
        projectStartDate={projectStartDate}
        onProjectStartDateChange={setProjectStartDate}
        isOwner={isOwner}
        canEdit={canEdit}
        onShare={() => setShowShareModal(true)}
      />

      {/* Focus mode indicator chip */}
      {focusedNodeId && (
        <div
          style={{
            position: 'absolute',
            top: PHASE_RAIL_H + 12,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            background: '#1e2130',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            zIndex: 50,
            fontSize: 12,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: '#6366f1', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Focus</span>
          <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{focusedNodeLabel}</span>
          <button
            onClick={() => setFocusedNodeId(null)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              color: '#64748b',
              fontSize: 10,
              fontWeight: 600,
              padding: '1px 6px',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            ESC
          </button>
        </div>
      )}

      {canEdit && editingNode && (editingNode.type ?? 'task') === 'external' ? (
        <ExternalDependencyEditPanel
          node={editingNode}
          onSave={handleSaveNode}
          onDelete={handleDeleteNode}
          onClose={() => setEditingNodeId(null)}
          simulation={simulation}
          onSimulate={handleSimulate}
          onStopSimulation={handleStopSimulation}
        />
      ) : canEdit && editingNode ? (
        <NodeEditPanel
          node={editingNode}
          lanes={lanes}
          onSave={handleSaveNode}
          onDelete={handleDeleteNode}
          onClose={() => setEditingNodeId(null)}
        />
      ) : null}

      {cycleWarning && <CycleBanner onDismiss={() => setCycleWarning(false)} />}

      {showShareModal && (
        <ShareModal
          projectId={project.id}
          userId={user.id}
          onClose={() => setShowShareModal(false)}
        />
      )}

      <SummaryBar
        projectEnd={projectEnd}
        projectStartDate={projectStartDate}
        criticalCount={criticalCount}
        nearCriticalThreshold={nearCriticalThreshold}
        onThresholdChange={setNearCriticalThreshold}
        completeCount={completeCount}
        totalCount={nodes.length}
        scale={scale}
        deleteMessage={deleteMessage}
        externalNodes={nodes.filter(n => n.type === 'external')}
        simulation={simulation}
        baselineProjectEnd={baselineProjectEnd}
      />
    </div>
  );
}
