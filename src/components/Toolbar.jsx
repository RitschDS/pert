export default function Toolbar({ onAddNode, scale, onResetZoom, user, onSignOut }) {
  const pct = Math.round((scale ?? 1) * 100);
  const isDefaultZoom = pct === 100;
  const displayName = user?.user_metadata?.full_name || user?.email || '';

  return (
    <div
      className="absolute top-4 left-4 flex gap-2 items-center px-3 py-2 rounded-xl"
      style={{
        background: '#1e2130',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        zIndex: 40,
      }}
    >
      <span className="text-slate-400 text-xs font-semibold tracking-widest uppercase mr-1">PERT</span>

      <Divider />

      <ToolBtn title="Add Node" onClick={onAddNode}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="14" height="14" rx="3"
            stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="4.5" x2="8" y2="11.5"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4.5" y1="8" x2="11.5" y2="8"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </ToolBtn>

      <Divider />

      {/* Zoom display + reset */}
      <button
        title="Reset Zoom (100%)"
        onClick={onResetZoom}
        style={{
          background: isDefaultZoom ? 'transparent' : 'rgba(99,102,241,0.12)',
          border: isDefaultZoom ? '1px solid transparent' : '1px solid rgba(99,102,241,0.3)',
          borderRadius: 6,
          color: isDefaultZoom ? '#475569' : '#818cf8',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "'IBM Plex Sans', sans-serif",
          padding: '2px 8px',
          cursor: 'pointer',
          minWidth: 44,
          textAlign: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.18)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = isDefaultZoom ? 'transparent' : 'rgba(99,102,241,0.12)'; }}
      >
        {pct}%
      </button>

      <div
        style={{ fontSize: 10, lineHeight: '12px', maxWidth: 86, color: '#334155' }}
      >
        Hover node to<br />draw edges
      </div>

      <Divider />

      {/* User info + sign out */}
      <span style={{ fontSize: 11, color: '#475569', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {displayName}
      </span>
      <ToolBtn title="Sign out" onClick={onSignOut}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 2H2.5A1.5 1.5 0 0 0 1 3.5v7A1.5 1.5 0 0 0 2.5 12H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M9.5 9.5 13 7l-3.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="13" y1="7" x2="5" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </ToolBtn>
    </div>
  );
}

function ToolBtn({ title, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
      style={{ background: 'transparent', color: '#94a3b8', border: '1px solid transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />;
}
