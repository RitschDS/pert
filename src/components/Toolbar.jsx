export default function Toolbar({ edgeMode, onToggleEdgeMode, onAddNode }) {
  return (
    <div
      className="absolute top-4 left-4 flex gap-2 items-center px-3 py-2 rounded-xl"
      style={{ background: '#1e2130', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.5)', zIndex: 40 }}
    >
      <span className="text-slate-400 text-xs font-semibold tracking-widest uppercase mr-1">PERT</span>

      <Divider />

      <ToolBtn title="Add Node" onClick={onAddNode}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="4.5" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4.5" y1="8" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </ToolBtn>

      <ToolBtn
        title={edgeMode ? 'Exit Edge Mode (active)' : 'Draw Edge'}
        onClick={onToggleEdgeMode}
        active={edgeMode}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="13" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
          <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <polygon points="10,5.5 14,8 10,10.5" fill="currentColor" />
        </svg>
      </ToolBtn>
    </div>
  );
}

function ToolBtn({ title, onClick, active, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
      style={{
        background: active ? 'rgba(129,140,248,0.2)' : 'transparent',
        color: active ? '#818cf8' : '#94a3b8',
        border: active ? '1px solid rgba(129,140,248,0.4)' : '1px solid transparent',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />;
}
