import { useState } from 'react';
import { supabase } from '../supabase';

// ── Shared style constants ──────────────────────────────────────────────────
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

const linkBtn = {
  background: 'none',
  border: 'none',
  color: '#475569',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: "'IBM Plex Sans', sans-serif",
  textAlign: 'center',
  padding: 0,
};

const inlineLinkBtn = {
  background: 'none',
  border: 'none',
  color: '#818cf8',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: "'IBM Plex Sans', sans-serif",
  padding: 0,
  fontWeight: 500,
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

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

// Computes input border color from focus/error state without direct DOM mutations.
function inputStyle(focused, hasError) {
  if (focused) return { ...inputBase, border: '1px solid rgba(99,102,241,0.5)' };
  if (hasError) return { ...inputBase, border: '1px solid rgba(239,68,68,0.6)' };
  return inputBase;
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ef4444' }}>{msg}</p>;
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <span style={{ fontSize: 11, color: '#334155', fontWeight: 500 }}>or</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

function HRule() {
  return <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)' }} />;
}

// ── Google button (identical behaviour to original LoginScreen) ─────────────
function GoogleButton({ loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', padding: '10px 20px',
        background: loading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8,
        color: loading ? '#475569' : '#e2e8f0',
        fontSize: 14, fontWeight: 500,
        fontFamily: "'IBM Plex Sans', sans-serif",
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
    >
      {!loading && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
      )}
      {loading ? 'Signing in…' : 'Sign in with Google'}
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [view, setView] = useState('login'); // 'login'|'signup'|'forgot'|'confirmed'|'reset-sent'

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginFocused, setLoginFocused] = useState(null);

  // Signup
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupErrors, setSignupErrors] = useState({});
  const [signupTouched, setSignupTouched] = useState({});
  const [signupFocused, setSignupFocused] = useState(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState(null);
  const [confirmedEmail, setConfirmedEmail] = useState('');

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotFocused, setForgotFocused] = useState(false);
  const [resetSentEmail, setResetSentEmail] = useState('');

  // ── Google OAuth (unchanged from original) ──────────────────────────────
  async function handleGoogleSignIn() {
    setLoginLoading(true);
    setLoginError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { setLoginError(error.message); setLoginLoading(false); }
  }

  // ── Email/password sign-in ──────────────────────────────────────────────
  async function handleSignIn(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    if (error) setLoginError(error.message);
    setLoginLoading(false);
    // On success App.jsx's onAuthStateChange handles the redirect.
  }

  // ── Sign-up ─────────────────────────────────────────────────────────────
  function validateSignupField(field, values) {
    const errs = { ...signupErrors };
    if (field === 'email') {
      errs.email = isValidEmail(values.email) ? null : 'Enter a valid email address';
    }
    if (field === 'password') {
      errs.password = values.password.length >= 8 ? null : 'Password must be at least 8 characters';
      // Re-validate confirm only if already touched
      if (signupTouched.confirm) {
        errs.confirm = values.confirm === values.password ? null : 'Passwords do not match';
      }
    }
    if (field === 'confirm') {
      errs.confirm = values.confirm === values.password ? null : 'Passwords do not match';
    }
    return errs;
  }

  function handleSignupBlur(field) {
    const values = { email: signupEmail, password: signupPassword, confirm: signupConfirm };
    const errs = validateSignupField(field, values);
    setSignupTouched(prev => ({ ...prev, [field]: true }));
    setSignupErrors(errs);
  }

  async function handleSignUp(e) {
    e.preventDefault();
    const values = { email: signupEmail, password: signupPassword, confirm: signupConfirm };
    const errs = {};
    if (!isValidEmail(values.email)) errs.email = 'Enter a valid email address';
    if (values.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (values.confirm !== values.password) errs.confirm = 'Passwords do not match';
    setSignupTouched({ email: true, password: true, confirm: true });
    if (Object.values(errs).some(Boolean)) { setSignupErrors(errs); return; }

    setSignupLoading(true);
    setSignupError(null);
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
    });
    setSignupLoading(false);

    if (error) { setSignupError(error.message); return; }
    if (data.session) {
      // Email confirmation disabled in this project — user is already logged in;
      // App.jsx's onAuthStateChange will route them to the library.
      return;
    }
    // Confirmation email was sent.
    setConfirmedEmail(signupEmail.trim());
    setView('confirmed');
  }

  // ── Forgot password ─────────────────────────────────────────────────────
  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!isValidEmail(forgotEmail)) { setForgotError('Enter a valid email address'); return; }
    setForgotLoading(true);
    setForgotError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: window.location.origin,
    });
    setForgotLoading(false);
    if (error) { setForgotError(error.message); return; }
    setResetSentEmail(forgotEmail.trim());
    setView('reset-sent');
  }

  // ── Navigation helpers ──────────────────────────────────────────────────
  function goToSignup() {
    setSignupError(null); setSignupErrors({}); setSignupTouched({});
    setSignupEmail(''); setSignupPassword(''); setSignupConfirm('');
    setView('signup');
  }

  function goToLogin() { setLoginError(null); setView('login'); }

  function goToForgot() {
    setForgotEmail(loginEmail);
    setForgotError(null);
    setView('forgot');
  }

  // ── Password strength for signup form ───────────────────────────────────
  const strength = passwordStrength(signupPassword);
  const strengthInfo = strength ? strengthMeta[strength] : null;

  // ── Render ──────────────────────────────────────────────────────────────
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

        {/* Logo — always shown */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6366f1' }}>
            PERT
          </span>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>
            {view === 'signup' ? 'Create Account'
              : (view === 'forgot' || view === 'reset-sent') ? 'Reset Password'
              : 'Project Planner'}
          </h1>
          {view === 'login' && (
            <p style={{ margin: 0, fontSize: 13, color: '#475569', textAlign: 'center' }}>
              Visual PERT chart tool for planning task dependencies
            </p>
          )}
        </div>

        <HRule />

        {/* ─────────── LOGIN ──────────────────────────────────────────────── */}
        {view === 'login' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GoogleButton loading={loginLoading} onClick={handleGoogleSignIn} />

            <Divider />

            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email" autoComplete="email"
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  onFocus={() => setLoginFocused('email')}
                  onBlur={() => setLoginFocused(null)}
                  style={inputStyle(loginFocused === 'email', false)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input
                  type="password" autoComplete="current-password"
                  value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                  onFocus={() => setLoginFocused('password')}
                  onBlur={() => setLoginFocused(null)}
                  style={inputStyle(loginFocused === 'password', false)}
                  placeholder="••••••••"
                />
              </div>
              {loginError && <p style={{ margin: 0, fontSize: 12, color: '#ef4444' }}>{loginError}</p>}
              <button type="submit" disabled={loginLoading} style={{ ...btnPrimary, marginTop: 2 }}>
                Sign In
              </button>
            </form>

            <button style={linkBtn} onClick={goToForgot}>Forgot password?</button>

            <HRule />

            <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: '#475569' }}>
              Don't have an account?{' '}
              <button style={inlineLinkBtn} onClick={goToSignup}>Sign up</button>
            </p>
          </div>
        )}

        {/* ─────────── SIGN UP ────────────────────────────────────────────── */}
        {view === 'signup' && (
          <form onSubmit={handleSignUp} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email" autoComplete="email"
                value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                onFocus={() => setSignupFocused('email')}
                onBlur={() => { setSignupFocused(null); handleSignupBlur('email'); }}
                style={inputStyle(signupFocused === 'email', signupTouched.email && signupErrors.email)}
                placeholder="you@example.com"
              />
              <FieldError msg={signupTouched.email ? signupErrors.email : null} />
            </div>

            {/* Password + strength indicator */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password" autoComplete="new-password"
                value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                onFocus={() => setSignupFocused('password')}
                onBlur={() => { setSignupFocused(null); handleSignupBlur('password'); }}
                style={inputStyle(signupFocused === 'password', signupTouched.password && signupErrors.password)}
                placeholder="••••••••"
              />
              {signupPassword.length > 0 && (
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
              <FieldError msg={signupTouched.password ? signupErrors.password : null} />
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password" autoComplete="new-password"
                  value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)}
                  onFocus={() => setSignupFocused('confirm')}
                  onBlur={() => { setSignupFocused(null); handleSignupBlur('confirm'); }}
                  style={{
                    ...inputStyle(signupFocused === 'confirm', signupTouched.confirm && signupErrors.confirm),
                    paddingRight: 30,
                  }}
                  placeholder="••••••••"
                />
                {signupTouched.confirm && !signupErrors.confirm && signupConfirm.length > 0 && (
                  <svg width="14" height="14" viewBox="0 0 14 14"
                    style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                )}
              </div>
              <FieldError msg={signupTouched.confirm ? signupErrors.confirm : null} />
            </div>

            {signupError && (
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#ef4444' }}>{signupError}</p>
            )}

            <button type="submit" disabled={signupLoading} style={{ ...btnPrimary, marginBottom: 14 }}>
              {signupLoading ? 'Creating account…' : 'Create Account'}
            </button>

            <p style={{ margin: 0, textAlign: 'center', fontSize: 13, color: '#475569' }}>
              Already have an account?{' '}
              <button type="button" style={inlineLinkBtn} onClick={goToLogin}>Sign in</button>
            </p>
          </form>
        )}

        {/* ─────────── FORGOT PASSWORD ─────────────────────────────────────── */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Enter your email and we'll send you a link to reset your password.
            </p>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email" autoComplete="email"
                value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                onFocus={() => setForgotFocused(true)}
                onBlur={() => setForgotFocused(false)}
                style={inputStyle(forgotFocused, false)}
                placeholder="you@example.com"
              />
            </div>
            {forgotError && <p style={{ margin: 0, fontSize: 12, color: '#ef4444' }}>{forgotError}</p>}
            <button type="submit" disabled={forgotLoading} style={btnPrimary}>
              {forgotLoading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <button type="button" style={linkBtn} onClick={goToLogin}>Back to Sign In</button>
          </form>
        )}

        {/* ─────────── EMAIL CONFIRMED (after sign-up) ─────────────────────── */}
        {view === 'confirmed' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="22" fill="rgba(99,102,241,0.12)"/>
              <rect x="11" y="15" width="22" height="16" rx="2" stroke="#818cf8" strokeWidth="1.5"/>
              <path d="M11 18l11 8 11-8" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 14, color: '#f1f5f9', fontWeight: 600 }}>
                Check your email
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                We sent a confirmation link to<br />
                <span style={{ color: '#818cf8' }}>{confirmedEmail}</span><br />
                Click it to activate your account.
              </p>
            </div>
            <button style={{ ...btnPrimary, marginTop: 4 }} onClick={goToLogin}>
              Back to Sign In
            </button>
          </div>
        )}

        {/* ─────────── RESET LINK SENT (after forgot password) ─────────────── */}
        {view === 'reset-sent' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="22" fill="rgba(99,102,241,0.12)"/>
              <rect x="15" y="14" width="14" height="18" rx="2" stroke="#818cf8" strokeWidth="1.5"/>
              <path d="M19 14v-1.5a3 3 0 1 1 6 0V14" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="22" cy="24" r="2" fill="#818cf8"/>
            </svg>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 14, color: '#f1f5f9', fontWeight: 600 }}>
                Check your email
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                Password reset link sent to<br />
                <span style={{ color: '#818cf8' }}>{resetSentEmail}</span>
              </p>
            </div>
            <button style={{ ...btnPrimary, marginTop: 4 }} onClick={goToLogin}>
              Back to Sign In
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
