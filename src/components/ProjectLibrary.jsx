import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { INITIAL_NODES, INITIAL_EDGES, INITIAL_LANES, INITIAL_PHASES } from '../data/initialData';
import { LANE_RAIL_W, PHASE_RAIL_H } from '../utils/constants';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const DEFAULT_PROJECT_DATA = {
  version: 1,
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,
  lanes: INITIAL_LANES,
  phases: INITIAL_PHASES,
  nearCriticalThreshold: 2,
  viewport: { panX: LANE_RAIL_W + 20, panY: PHASE_RAIL_H + 20, scale: 1 },
};

export default function ProjectLibrary({ user, onOpenProject, onSignOut }) {
  const [projects, setProjects] = useState([]);
  const [sharedProjects, setSharedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    const [ownResult, sharedResult] = await Promise.all([
      supabase.from('projects').select('id, name, updated_at').order('updated_at', { ascending: false }),
      supabase.rpc('get_shared_projects'),
    ]);
    if (ownResult.error) setError(`Unable to connect: ${ownResult.error.message} (code: ${ownResult.error.code})`);
    else setProjects(ownResult.data ?? []);
    setSharedProjects(sharedResult.data ?? []);
    setLoading(false);
  }

  async function handleNew() {
    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name: 'Untitled Project', data: DEFAULT_PROJECT_DATA })
      .select()
      .single();
    if (error) { setError('Failed to create project.'); return; }
    onOpenProject(data);
  }

  async function handleOpen(project) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project.id)
      .single();
    if (error) { setError('Could not open project.'); return; }
    onOpenProject(data, { isOwner: true, canEdit: true, sharedBy: null });
  }

  async function handleOpenShared(sharedProject) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', sharedProject.id)
      .single();
    if (error) { setError('Could not open project.'); return; }
    onOpenProject(data, {
      isOwner: false,
      canEdit: sharedProject.permission === 'edit',
      sharedBy: sharedProject.owner_email,
    });
  }

  async function handleDelete(project) {
    await supabase.from('projects').delete().eq('id', project.id);
    setProjects(prev => prev.filter(p => p.id !== project.id));
    setDeleteConfirm(null);
  }

  async function handleRenameBlur(id) {
    const name = renameValue.trim() || 'Untitled Project';
    await supabase.from('projects').update({ name }).eq('id', id);
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    setRenamingId(null);
  }

  const displayName = user?.user_metadata?.full_name || user?.email || '';

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f1117', fontFamily: "'IBM Plex Sans', sans-serif", overflow: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', background: '#161923', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6366f1' }}>PERT</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#475569' }}>{displayName}</span>
          <Btn onClick={onSignOut} variant="muted">Sign out</Btn>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Projects</h1>
          <Btn onClick={handleNew} variant="primary">+ New Project</Btn>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: '10px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#fca5a5', fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: '#475569', fontSize: 14 }}>Loading…</p>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <p style={{ color: '#475569', fontSize: 14, marginBottom: 24 }}>No projects yet. Create one to get started.</p>
            <Btn onClick={handleNew} variant="primary" style={{ padding: '10px 28px', fontSize: 14 }}>+ New Project</Btn>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                isRenaming={renamingId === project.id}
                renameValue={renameValue}
                deleteConfirm={deleteConfirm === project.id}
                onOpen={() => handleOpen(project)}
                onRenameStart={() => { setRenamingId(project.id); setRenameValue(project.name); }}
                onRenameChange={setRenameValue}
                onRenameBlur={() => handleRenameBlur(project.id)}
                onRenameCancel={() => setRenamingId(null)}
                onDeleteStart={() => setDeleteConfirm(project.id)}
                onDeleteConfirm={() => handleDelete(project)}
                onDeleteCancel={() => setDeleteConfirm(null)}
              />
            ))}
          </div>
        )}

        {/* Shared with me */}
        {!loading && sharedProjects.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#94a3b8' }}>
              Shared with me
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {sharedProjects.map(sp => (
                <SharedProjectCard
                  key={sp.id}
                  project={sp}
                  onOpen={() => handleOpenShared(sp)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, isRenaming, renameValue, deleteConfirm, onOpen, onRenameStart, onRenameChange, onRenameBlur, onRenameCancel, onDeleteStart, onDeleteConfirm, onDeleteCancel }) {
  return (
    <div style={{ background: '#1e2130', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={e => onRenameChange(e.target.value)}
          onBlur={onRenameBlur}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') onRenameCancel(); }}
          style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 4, padding: '2px 6px', outline: 'none', fontFamily: "'IBM Plex Sans', sans-serif" }}
        />
      ) : (
        <span onDoubleClick={onRenameStart} title="Double-click to rename" style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', cursor: 'default' }}>
          {project.name}
        </span>
      )}
      <span style={{ fontSize: 11, color: '#475569' }}>Edited {timeAgo(project.updated_at)}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Btn onClick={onOpen} variant="primary" style={{ flex: 1 }}>Open</Btn>
        {deleteConfirm ? (
          <>
            <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>Delete "{project.name}"?</span>
            <Btn onClick={onDeleteConfirm} variant="danger">Yes</Btn>
            <Btn onClick={onDeleteCancel} variant="muted">No</Btn>
          </>
        ) : (
          <Btn onClick={onDeleteStart} variant="muted">Delete</Btn>
        )}
      </div>
    </div>
  );
}

const BTN_VARIANTS = {
  primary: { background: 'rgba(99,102,241,0.12)',  border: '1px solid rgba(99,102,241,0.3)',  color: '#818cf8' },
  danger:  { background: 'rgba(239,68,68,0.12)',   border: '1px solid rgba(239,68,68,0.3)',   color: '#fca5a5' },
  muted:   { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' },
};

function SharedProjectCard({ project, onOpen }) {
  const permColor = project.permission === 'edit' ? '#22c55e' : '#818cf8';
  const permBg = project.permission === 'edit' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)';
  const permBorder = project.permission === 'edit' ? 'rgba(34,197,94,0.25)' : 'rgba(99,102,241,0.25)';
  return (
    <div style={{ background: '#1e2130', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{project.name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#475569' }}>
          By {project.owner_email}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 7px',
          background: permBg, border: `1px solid ${permBorder}`,
          borderRadius: 10, color: permColor,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {project.permission}
        </span>
      </div>
      <span style={{ fontSize: 11, color: '#475569' }}>Edited {timeAgo(project.updated_at)}</span>
      <Btn onClick={onOpen} variant="primary">Open</Btn>
    </div>
  );
}

function Btn({ onClick, variant = 'muted', children, style: extra }) {
  const v = BTN_VARIANTS[variant];
  return (
    <button
      onClick={onClick}
      style={{ ...v, borderRadius: 6, fontSize: 12, fontWeight: 500, padding: '5px 12px', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", ...extra }}
    >
      {children}
    </button>
  );
}
