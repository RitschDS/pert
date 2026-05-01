export default function CycleBanner({ onDismiss }) {
  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm"
      style={{
        background: '#2d1b1b',
        border: '1px solid rgba(239,68,68,0.4)',
        color: '#fca5a5',
        zIndex: 60,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5" />
        <line x1="8" y1="5" x2="8" y2="9" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11.5" r="0.75" fill="#ef4444" />
      </svg>
      This edge would create a cycle — not added.
      <button
        onClick={onDismiss}
        className="ml-1 text-red-400 hover:text-red-200 font-bold leading-none"
      >
        &times;
      </button>
    </div>
  );
}
