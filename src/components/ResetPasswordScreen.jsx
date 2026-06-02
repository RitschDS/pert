import { useState } from 'react';
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

const labelStyle = {
  fontSize: 11,
  color: '#475569',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 5,
  display: 'block',
};

const btnPrimary = {
  width: '100%',
  padding: '10px',
  background: 'rgba(99,102,241,0.15)',
  border: '1px solid rgba(99,102,241,0.35)',
  borderRadius: 8,
  color: '#818cf8',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "'IBM Plex Sans', sans-serif",
  cursor: 'pointer',
};

function passwordStrength(pwd) {
  if (pwd.length < 8) return null;
  let score = 0;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return 'weak';
  if (score <= 2) return 'good';
  return 'strong';
}

const strengthMeta = {
  weak:   { color: '#ef4444', width: '33%', label: 'Weak' },
  good:   { color: '#f59e0b', width: '66%', label: 'Good' },
  strong: { color: '#22c55e', width: '100%', label: 'Strong' },
};

function inputStyle(focused, hasError) {
  if (focused) return { ...inputBase, border: '1px solid rgba(99,102,241,0.5)' };
  if (hasError) return { ...inputBase, border: '1px solid rgba(239,68,68,0.6)' };
  return inputBase;
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ef4444' }}>{msg}</p>;
}

// Shown when the user lands on the app after clicking a password-reset email link.
// App.jsx renders this when Supabase fires the PASSWORD_RECOVERY auth event.
// On success, onDone() is called and App.jsx routes to the project library.
export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleBlur(field) {
    const errs = { ...errors };
    if (field === 'password') {
      errs.password = password.length >= 8 ? null : 'Password must be at least 8 characters';
      if (touched.confirm) errs.confirm = confirm === password ? null : 'Passwords do not match';
    }
    if (field === 'confirm') {
      errs.confirm = confirm === password ? null : 'Passwords do not match';
    }
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(errs);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (confirm !== password) errs.confirm = 'Passwords do not match';
    setTouched({ password: true, confirm: true });
    if (Object.values(errs).some(Boolean)) { setErrors(errs); return; }

    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    onDone(); // clears recovery state; App.jsx routes to project library
  }

  const strength = passwordStrength(password);
  const strengthInfo = strength ? strengthMeta[strength] : null;

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#0f1117',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '40px 36px',
        background: '#1e2130',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        width: 340,
        boxSizing: 'border-box',
        gap: 20,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6366f1' }}>
            PERT
          </span>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Set New Password</h1>
        </div>

        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)' }} />

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* New password */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>New Password</label>
            <input
              type="password" autoComplete="new-password"
              value={password} onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused('password')}
              onBlur={() => { setFocused(null); handleBlur('password'); }}
              style={inputStyle(focused === 'password', touched.password && errors.password)}
              placeholder="••••••••"
            />
            {password.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: strengthInfo ? strengthInfo.width : '10%',
                    background: strengthInfo ? strengthInfo.color : '#ef4444',
                    borderRadius: 2,
                    transition: 'width 0.2s, background 0.2s',
                  }} />
                </div>
                {strengthInfo && (
                  <span style={{ fontSize: 10, color: strengthInfo.color, marginTop: 3, display: 'block' }}>
                    {strengthInfo.label}
                  </span>
                )}
              </div>
            )}
            <FieldError msg={touched.password ? errors.password : null} />
          </div>

          {/* Confirm password */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password" autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                onFocus={() => setFocused('confirm')}
                onBlur={() => { setFocused(null); handleBlur('confirm'); }}
                style={{ ...inputStyle(focused === 'confirm', touched.confirm && errors.confirm), paddingRight: 30 }}
                placeholder="••••••••"
              />
              {touched.confirm && !errors.confirm && confirm.length > 0 && (
                <svg width="14" height="14" viewBox="0 0 14 14"
                  style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)' }}
                >
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              )}
            </div>
            <FieldError msg={touched.confirm ? errors.confirm : null} />
          </div>

          {error && <p style={{ margin: '0 0 12px', fontSize: 12, color: '#ef4444' }}>{error}</p>}

          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? 'Updating password…' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
