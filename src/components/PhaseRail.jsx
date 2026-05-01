import { PHASES } from '../data/initialData';

export default function PhaseRail({ panX, laneRailWidth }) {
  return (
    <div
      className="absolute top-0 left-0 right-0"
      style={{ height: 36, background: '#0f1117', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 30, pointerEvents: 'none' }}
    >
      {PHASES.map((phase) => (
        <div
          key={phase.id}
          className="absolute flex items-center justify-center"
          style={{
            left: phase.xOffset + panX + laneRailWidth,
            width: phase.width,
            top: 0,
            height: '100%',
            borderLeft: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              userSelect: 'none',
            }}
          >
            {phase.label}
          </span>
        </div>
      ))}
    </div>
  );
}
