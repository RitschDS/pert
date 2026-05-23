import { useState, useEffect } from 'react';
import { isoToday } from '../utils/dateUtils';

export default function ExternalDependencyEditPanel({
  node,
  onSave,
  onDelete,
  onClose,
  simulation,
  onSimulate,
  onStopSimulation,
}) {
  const [label, setLabel] = useState(node.label ?? '');
  const [readyDate, setReadyDate] = useState(node.readyDate ?? isoToday());
  const [assignee, setAssignee] = useState(node.assignee ?? '');
  const [status, setStatus] = useState(node.status ?? 'Not Started');
  const [simActive, setSimActive] = useState(simulation?.nodeId === node.id);
  const [slippedDate, setSlippedDate] = useState(
    simulation?.nodeId === node.id ? simulation.slippedDate : node.readyDate ?? isoToday()
  );

  // Keep simActive in sync if simulation is cleared externally
  useEffect(() => {
    if (!simulation) setSimActive(false);
  }, [simulation]);

  function handleSimToggle(active) {
    setSimActive(active);
    if (active) {
      onSimulate(node.id, slippedDate, readyDate, label);
    } else {
      onStopSimulation();
    }
  }

  function handleSlippedDateChange(date) {
    setSlippedDate(date);
    if (simActive) onSimulate(node.id, date, readyDate, label);
  }

  function handleSave() {
    onSave({ ...node, label, readyDate, assignee, status });
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#f1f5f9',
    fontSize: 13,
    padding: '7px 10px',
    outline: 'none',
    fontFamily: "'IBM Plex Sans', sans-serif",
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 11,
    color: '#475569',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 5,
    display: 'block',
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0, right: 0, bottom: 44,
      width: 280,
      background: '#161923',
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      zIndex: 50,
      overflowY: 'auto',
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <polygon points="6,0 12,6 6,12 0,6" fill="none" stroke="#8b5cf6" strokeWidth="1.5"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>External Dependency</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Label */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Label</label>
          <input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        {/* Ready Date */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Ready Date</label>
          <input type="date" style={{ ...inputStyle, colorScheme: 'dark' }}
            value={readyDate} onChange={e => setReadyDate(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        {/* Assignee */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Assignee (optional)</label>
          <input style={inputStyle} value={assignee} onChange={e => setAssignee(e.target.value)}
            placeholder="e.g. Platform Team"
            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        {/* Status */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Status</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }}
            value={status} onChange={e => setStatus(e.target.value)}>
            <option value="Not Started">Not Started</option>
            <option value="Complete">Complete</option>
          </select>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 16 }} />

        {/* Simulate Slip */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <label style={{ ...labelStyle, marginBottom: 0, color: '#f59e0b' }}>Simulate Slip</label>
            <button
              onClick={() => handleSimToggle(!simActive)}
              style={{
                background: simActive ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${simActive ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 12,
                color: simActive ? '#f59e0b' : '#475569',
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 10px',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              {simActive ? 'ON' : 'OFF'}
            </button>
          </div>

          {simActive && (
            <div>
              <label style={{ ...labelStyle, color: '#f59e0b' }}>Slipped to</label>
              <input type="date" style={{ ...inputStyle, colorScheme: 'dark', borderColor: 'rgba(245,158,11,0.3)' }}
                value={slippedDate}
                min={readyDate}
                onChange={e => handleSlippedDateChange(e.target.value)}
              />
              <p style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>
                Canvas updates in real time. Not saved.
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 16 }} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSave}
            style={{ flex: 1, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 7, color: '#818cf8', fontSize: 13, fontWeight: 600, padding: '9px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Save
          </button>
          <button
            onClick={() => onDelete(node.id)}
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, color: '#f87171', fontSize: 13, fontWeight: 500, padding: '9px 14px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Delete
          </button>
        </div>

      </div>
    </div>
  );
}
