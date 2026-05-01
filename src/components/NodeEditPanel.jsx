import { useState, useEffect } from 'react';

const STATUSES = ['Not Started', 'In Progress', 'Complete'];

export default function NodeEditPanel({ node, lanes, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ ...node });

  useEffect(() => { setForm({ ...node }); }, [node]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div
      className="absolute top-0 right-0 h-full w-72 flex flex-col"
      style={{
        background: '#161923',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 50,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="text-sm font-semibold text-slate-200">Edit Node</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-xl leading-none">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <Field label="Label">
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            value={form.label}
            onChange={(e) => set('label', e.target.value)}
          />
        </Field>

        <Field label="Duration (days)">
          <input
            type="number" min={1}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            value={form.duration}
            onChange={(e) => set('duration', Number(e.target.value))}
          />
        </Field>

        <Field label="Assignee">
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            value={form.assignee}
            onChange={(e) => set('assignee', e.target.value)}
          />
        </Field>

        <Field label="Lane">
          <select
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            value={form.laneId}
            onChange={(e) => set('laneId', e.target.value)}
          >
            {lanes.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <div className="flex flex-col gap-1.5">
            {STATUSES.map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio" name="status"
                  checked={form.status === s}
                  onChange={() => set('status', s)}
                  className="accent-indigo-500"
                />
                <span className="text-sm text-slate-300">{s}</span>
              </label>
            ))}
          </div>
        </Field>
      </div>

      <div
        className="flex gap-2 px-5 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button
          onClick={() => onSave(form)}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded px-3 py-1.5 transition-colors"
        >
          Save
        </button>
        <button
          onClick={() => onDelete(node.id)}
          className="bg-red-900 hover:bg-red-700 text-red-200 text-sm font-medium rounded px-3 py-1.5 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
