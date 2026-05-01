import NodeCard from './NodeCard';
import EdgePath from './EdgePath';
import { nodeOutputAnchor, nodeInputAnchor } from '../utils/layout';

export default function PertCanvas({
  nodes,           // enriched nodes (with CPM fields)
  edges,
  cpmMap,          // Map<nodeId, cpmFields>
  criticalEdgeIds,
  nearCriticalEdgeIds,
  lanes,           // lanes with yOffset
  phases,          // phases with xOffset
  pan,             // { x, y } — translate applied to <g>
  rubberBand,      // null | { fromNodeId, fromPos, currentPos }
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onNodeMouseDown,
  onNodeDoubleClick,
  onResizeMouseDown,
  onOutputAnchorMouseDown,
  onInputAnchorMouseUp,
  onEdgeClick,
}) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const totalCanvasW = phases.length
    ? phases[phases.length - 1].xOffset + phases[phases.length - 1].width + 800
    : 3000;
  const totalCanvasH = lanes.length
    ? lanes[lanes.length - 1].yOffset + lanes[lanes.length - 1].height + 400
    : 2000;

  return (
    <svg
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'default' }}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
    >
      <defs>
        {[
          { id: 'arrow-default',      fill: '#4a5568' },
          { id: 'arrow-critical',     fill: '#f59e0b' },
          { id: 'arrow-near-critical',fill: '#fb923c' },
          { id: 'arrow-hover',        fill: '#ef4444' },
        ].map(({ id, fill }) => (
          <marker key={id} id={id} markerWidth="10" markerHeight="7"
            refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={fill} />
          </marker>
        ))}
      </defs>

      <g transform={`translate(${pan.x}, ${pan.y})`}>

        {/* Phase column backgrounds */}
        {phases.map((phase) => (
          <g key={phase.id}>
            <rect
              x={phase.xOffset} y={0}
              width={phase.width} height={totalCanvasH}
              fill={phase.color}
            />
            <line
              x1={phase.xOffset} y1={0} x2={phase.xOffset} y2={totalCanvasH}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1}
            />
          </g>
        ))}

        {/* Swim lane backgrounds */}
        {lanes.map((lane) => (
          <g key={lane.id}>
            <rect
              x={0} y={lane.yOffset}
              width={totalCanvasW} height={lane.height}
              fill={lane.color}
            />
            <line
              x1={0} y1={lane.yOffset} x2={totalCanvasW} y2={lane.yOffset}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1}
            />
          </g>
        ))}

        {/* Edges */}
        {edges.map((edge) => {
          const fromNode = nodeMap[edge.from];
          const toNode = nodeMap[edge.to];
          if (!fromNode || !toNode) return null;
          return (
            <EdgePath
              key={edge.id}
              edge={edge}
              from={nodeOutputAnchor(fromNode)}
              to={nodeInputAnchor(toNode)}
              isCritical={criticalEdgeIds.has(edge.id)}
              isNearCritical={nearCriticalEdgeIds.has(edge.id)}
              onEdgeClick={onEdgeClick}
            />
          );
        })}

        {/* Rubber-band preview */}
        {rubberBand && (() => {
          const { fromPos, currentPos } = rubberBand;
          const cp = 80;
          const d = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + cp} ${fromPos.y}, ${currentPos.x - cp} ${currentPos.y}, ${currentPos.x} ${currentPos.y}`;
          return (
            <path
              d={d} fill="none"
              stroke="#6366f1" strokeWidth={2}
              strokeDasharray="6 4"
              markerEnd="url(#arrow-default)"
              style={{ pointerEvents: 'none' }}
            />
          );
        })()}

        {/* Nodes */}
        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            cpm={cpmMap.get(node.id) ?? null}
            rubberBandActive={!!rubberBand}
            onMouseDown={onNodeMouseDown}
            onDoubleClick={onNodeDoubleClick}
            onResizeMouseDown={onResizeMouseDown}
            onOutputAnchorMouseDown={onOutputAnchorMouseDown}
            onInputAnchorMouseUp={onInputAnchorMouseUp}
          />
        ))}

      </g>
    </svg>
  );
}
