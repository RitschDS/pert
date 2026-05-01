import { LANES } from '../data/initialData';

export default function LaneRail({ panY }) {
  return (
    <div
      className="absolute left-0 top-0 bottom-0 flex flex-col"
      style={{ width: 140, background: '#0f1117', borderRight: '1px solid rgba(255,255,255,0.06)', zIndex: 30, pointerEvents: 'none' }}
    >
      {LANES.map((lane) => (
        <div
          key={lane.id}
          className="absolute flex items-center"
          style={{
            top: lane.yOffset + panY,
            height: lane.height,
            width: '100%',
            paddingLeft: 12,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              userSelect: 'none',
            }}
          >
            {lane.label}
          </span>
        </div>
      ))}
    </div>
  );
}
