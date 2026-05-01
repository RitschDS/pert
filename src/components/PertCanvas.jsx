import { useRef, useCallback } from 'react';
import { LANES, PHASES } from '../data/initialData';
import { NODE_W, NODE_H, nodeCenter } from '../utils/layout';
import NodeCard from './NodeCard';
import EdgePath from './EdgePath';

const CANVAS_W = 1600;
const CANVAS_H = 800;

const STATUS_COLORS = {
  'Complete':    '#22c55e',
  'In Progress': '#f59e0b',
  'Not Started': '#64748b',
};

export default function PertCanvas({
  nodes, edges, pan, setPan,
  edgeMode, edgeSource,
  onNodeMouseDown, onNodeDoubleClick,
  onCanvasMouseMove, onCanvasMouseUp, onCanvasMouseDown,
  onEdgeClick,
  rubberBandEnd,
  selectedEdgeSource,
}) {
  const svgRef = useRef(null);

  const getNodeById = useCallback(
    (id) => nodes.find((n) => n.id === id),
    [nodes]
  );

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block', cursor: edgeMode ? 'crosshair' : 'default' }}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10" markerHeight="7"
          refX="9" refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#4a5568" />
        </marker>
        <marker
          id="arrowhead-hover"
          markerWidth="10" markerHeight="7"
          refX="9" refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
        </marker>
      </defs>

      {/* Pannable group */}
      <g transform={`translate(${pan.x}, ${pan.y})`}>

        {/* Phase columns */}
        {PHASES.map((phase) => (
          <g key={phase.id}>
            <rect
              x={phase.xOffset} y={0}
              width={phase.width} height={CANVAS_H}
              fill={phase.color}
            />
            {/* subtle column divider */}
            <line
              x1={phase.xOffset} y1={0}
              x2={phase.xOffset} y2={CANVAS_H}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1"
            />
          </g>
        ))}

        {/* Swim lanes */}
        {LANES.map((lane) => (
          <g key={lane.id}>
            <rect
              x={0} y={lane.yOffset}
              width={CANVAS_W} height={lane.height}
              fill={lane.color}
            />
            <line
              x1={0} y1={lane.yOffset}
              x2={CANVAS_W} y2={lane.yOffset}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1"
            />
          </g>
        ))}

        {/* Edges */}
        {edges.map((edge) => {
          const fromNode = getNodeById(edge.from);
          const toNode = getNodeById(edge.to);
          if (!fromNode || !toNode) return null;
          return (
            <EdgePath
              key={edge.id}
              edge={edge}
              from={nodeCenter(fromNode)}
              to={nodeCenter(toNode)}
              onEdgeClick={onEdgeClick}
            />
          );
        })}

        {/* Rubber-band line in edge mode */}
        {edgeMode && edgeSource && rubberBandEnd && (() => {
          const src = getNodeById(edgeSource);
          if (!src) return null;
          const c = nodeCenter(src);
          return (
            <line
              x1={c.x} y1={c.y}
              x2={rubberBandEnd.x} y2={rubberBandEnd.y}
              stroke="#818cf8" strokeWidth="2"
              strokeDasharray="6 4"
              style={{ pointerEvents: 'none' }}
            />
          );
        })()}

        {/* Nodes */}
        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            isEdgeSource={node.id === edgeSource}
            edgeMode={edgeMode}
            statusColor={STATUS_COLORS[node.status]}
            onMouseDown={onNodeMouseDown}
            onDoubleClick={onNodeDoubleClick}
          />
        ))}

      </g>
    </svg>
  );
}
