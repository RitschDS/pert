import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const inputBase = {
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

const PERMISSION_LABELS = { view: 'View', edit: 'Edit' };

export default function ShareModal({ projectId, userId, onClose }) {
  const [shares, setShares] = useState([]);
  const [loadingShares, setLoadingShares] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState('view');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(null);

  useEffect(() => { loadShares(); }, []);

  async function loadShares() {
    setLoadingShares(true);
    const { data } = await supabase
      .from('project_shares')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    setShares(data ?? []);
    setLoadingShares(false);
  }

  async function handleInvite(e) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    setInviteLoading(true);
    setInviteError(null);

    // Check if the email belongs to an existing user
    const { data: resolvedUserId } = await supabase.rpc('get_user_id_by_email', {
      email_address: email,
    });

    const { data: newShare, error } = await supabase
      .from('project_shares')
      .insert({
        project_id: projectId,
        shared_by: userId,
        shared_with_email: email,
        shared_with_user_id: resolvedUserId ?? null,
        permission: invitePermission,
      })
      .select()
      .single();

    if (error) {
      setInviteError(
        error.message.includes('duplicate') || error.code === '23505'
          ? 'This email is already invited.'
          : error.message
      );
    } else {
      setShares(prev => [...prev, newShare]);
      setInviteEmail('');
    }
    setInviteLoading(false);
  }

  async function handleRemove(shareId) {
    setRemoveLoading(shareId);
    await supabase.from('project_shares').delete().eq('id', shareId);
    setShares(prev => prev.filter(s => s.id !== shareId));
    setRemoveLoading(null);
  }

  async function handlePermissionChange(shareId, permission) {
    await supabase.from('project_shares').update({ permission }).eq('id', shareId);
    setShares(prev => prev.map(s => s.id === shareId ? { ...s, permission } : s));
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 420,
        background: '#1e2130',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="12" cy="3" r="2" stroke="#818cf8" strokeWidth="1.4"/>
              <circle cx="12" cy="12" r="2" stroke="#818cf8" strokeWidth="1.4"/>
              <circle cx="3" cy="7.5" r="2" stroke="#818cf8" strokeWidth="1.4"/>
              <path d="M5 7.5h4M10.3 4.5 5.7 6.8M10.3 10.5 5.7 8.2" stroke="#818cf8" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Share Project</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Invite section */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Invite someone
            </p>
            <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                style={{ ...inputBase, flex: 1 }}
                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <select
                value={invitePermission}
                onChange={e => setInvitePermission(e.target.value)}
                style={{
                  ...inputBase,
                  width: 'auto',
                  padding: '7px 8px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <option value="view">View</option>
                <option value="edit">Edit</option>
              </select>
              <button
                type="submit"
                disabled={inviteLoading || !inviteEmail.trim()}
                style={{
                  padding: '7px 14px',
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.35)',
                  borderRadius: 6,
                  color: '#818cf8',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: inviteLoading || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
                  opacity: inviteLoading || !inviteEmail.trim() ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {inviteLoading ? '…' : 'Invite'}
              </button>
            </form>
            {inviteError && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444' }}>{inviteError}</p>
            )}
          </div>

          {/* Current shares list */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Shared with
            </p>

            {loadingShares ? (
              <p style={{ fontSize: 13, color: '#334155', margin: 0 }}>Loading…</p>
            ) : shares.length === 0 ? (
              <p style={{ fontSize: 13, color: '#334155', margin: 0 }}>No one yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {shares.map(share => (
                  <div key={share.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(99,102,241,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#818cf8',
                      flexShrink: 0,
                    }}>
                      {share.shared_with_email[0].toUpperCase()}
                    </div>

                    {/* Email */}
                    <span style={{
                      flex: 1, fontSize: 13, color: share.shared_with_user_id ? '#e2e8f0' : '#64748b',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {share.shared_with_email}
                      {!share.shared_with_user_id && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: '#475569' }}>(pending)</span>
                      )}
                    </span>

                    {/* Permission selector */}
                    <select
                      value={share.permission}
                      onChange={e => handlePermissionChange(share.id, e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 5,
                        color: '#94a3b8',
                        fontSize: 11,
                        padding: '3px 6px',
                        cursor: 'pointer',
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        flexShrink: 0,
                      }}
                    >
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                    </select>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(share.id)}
                      disabled={removeLoading === share.id}
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 5,
                        color: '#ef4444',
                        fontSize: 11,
                        padding: '3px 8px',
                        cursor: removeLoading === share.id ? 'not-allowed' : 'pointer',
                        opacity: removeLoading === share.id ? 0.5 : 1,
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        flexShrink: 0,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
