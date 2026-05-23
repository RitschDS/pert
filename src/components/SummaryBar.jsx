import { SUMMARY_BAR_H } from '../utils/constants';
import { offsetToDateStr, formatDate } from '../utils/dateUtils';

export default function SummaryBar({
  projectEnd,
  projectStartDate,
  criticalCount,
  nearCriticalThreshold,
  onThresholdChange,
  completeCount,
  totalCount,
  scale,
  deleteMessage,
  externalNodes,
  simulation,
  baselineProjectEnd,
}) {
  const pct = Math.round((scale ?? 1) * 100);

  const today = new Date().toISOString().split('T')[0];
  const extTotal = externalNodes?.length ?? 0;
  const extOverdue = externalNodes?.filter(n => n.readyDate && n.readyDate < today && n.status !== 'Complete').length ?? 0;
  const extDueSoon = externalNodes?.filter(n => {
    if (!n.readyDate || n.status === 'Complete' || n.readyDate < today) return false;
    const diff = Math.round((new Date(n.readyDate + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    return diff >= 0 && diff <= 3;
  }).length ?? 0;

  const projectEndDate = projectStartDate ? offsetToDateStr(projectStartDate, projectEnd) : null;
  const impact = simulation ? projectEnd - baselineProjectEnd : 0;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center gap-4 px-4"
      style={{
        height: SUMMARY_BAR_H,
        background: '#161923',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        zIndex: 40,
        fontSize: 12,
        flexWrap: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <Stat label="Project End">
        <strong style={{ color: '#f1f5f9' }}>
          {projectEndDate || projectEnd}
        </strong>
        {projectEndDate && <span style={{ color: '#475569' }}> ({projectEnd}d)</span>}
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

      {extTotal > 0 && (
        <>
          <Sep />
          <Stat label="Ext Deps">
            <strong style={{ color: extOverdue > 0 ? '#ef4444' : extDueSoon > 0 ? '#f59e0b' : '#94a3b8' }}>
              {extTotal}
            </strong>
            {extOverdue > 0 && <span style={{ color: '#ef4444' }}> · {extOverdue} overdue</span>}
            {extDueSoon > 0 && <span style={{ color: '#f59e0b' }}> · {extDueSoon} due soon</span>}
          </Stat>
        </>
      )}

      <Sep />

      <Stat label="Zoom">
        <strong style={{ color: '#94a3b8' }}>{pct}%</strong>
      </Stat>

      {simulation && (
        <>
          <Sep />
          <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {`Simulating: ${simulation.nodeLabel} · ${formatDate(simulation.originalDate)} → ${formatDate(simulation.slippedDate)}`}
            {impact !== 0 && (
              <span style={{ color: impact > 0 ? '#ef4444' : '#22c55e' }}>
                {` | Impact: ${impact > 0 ? '+' : ''}${impact}d`}
              </span>
            )}
          </span>
        </>
      )}

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
  return <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />;
}
