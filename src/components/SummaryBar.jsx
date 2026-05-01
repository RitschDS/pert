import { SUMMARY_BAR_H } from '../utils/constants';

export default function SummaryBar({
  projectEnd,
  criticalCount,
  nearCriticalThreshold,
  onThresholdChange,
  completeCount,
  totalCount,
  scale,
  deleteMessage,
}) {
  const pct = Math.round((scale ?? 1) * 100);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center gap-5 px-5"
      style={{
        height: SUMMARY_BAR_H,
        background: '#161923',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        zIndex: 40,
        fontSize: 12,
      }}
    >
      <Stat label="Project Duration">
        <strong style={{ color: '#f1f5f9' }}>{projectEnd}</strong>
        <span style={{ color: '#475569' }}> days</span>
      </Stat>

      <Sep />

      <Stat label="Critical Path">
        <strong style={{ color: '#f59e0b' }}>{criticalCount}</strong>
        <span style={{ color: '#475569' }}> tasks</span>
      </Stat>

      <Sep />

      <Stat label="Near-Critical ≤">
        <input
          type="number"
          min={0}
          max={30}
          value={nearCriticalThreshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          style={{
            width: 44,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            color: '#fb923c',
            fontSize: 12,
            padding: '1px 4px',
            outline: 'none',
            textAlign: 'center',
          }}
        />
        <span style={{ color: '#475569' }}> days slack</span>
      </Stat>

      <Sep />

      <Stat label="Tasks">
        <strong style={{ color: '#22c55e' }}>{completeCount}</strong>
        <span style={{ color: '#475569' }}> / {totalCount}</span>
      </Stat>

      <Sep />

      <Stat label="Zoom">
        <strong style={{ color: '#94a3b8' }}>{pct}%</strong>
      </Stat>

      {/* Delete confirmation flash */}
      {deleteMessage && (
        <>
          <Sep />
          <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>
            {deleteMessage}
          </span>
        </>
      )}
    </div>
  );
}

function Stat({ label, children }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color: '#334155', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
        {label}
      </span>
      <span>{children}</span>
    </div>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.06)' }} />;
}
