/**
 * AquaPure Admin — Login Page
 * Protected entry point for admin access.
 */

import { useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useAdminAuth } from '../../services/authContext';
import { AquaPureLogo } from '../../components/AquaPureLogo';
import './LoginPage.css';

/* ---------- Small inline icons (no extra dependencies) ---------- */

function Icon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const MailIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </Icon>
);
const LockIcon = () => (
  <Icon>
    <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Icon>
);
const EyeIcon = ({ off }: { off: boolean }) => (
  <Icon>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </Icon>
);
const BoxIcon = () => (
  <Icon>
    <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
    <path d="m3 8 9 5 9-5M12 13v8" />
  </Icon>
);
const DealerIcon = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="m16 11 2 2 4-4" />
  </Icon>
);
const WrenchIcon = () => (
  <Icon>
    <path d="M14.5 6.5a4 4 0 0 0 5 5l-9.7 9.7a2.1 2.1 0 0 1-3-3L16.5 8.5" />
    <path d="M14.5 6.5a4 4 0 0 1 5-3.2L17 5.8l1.2 1.2 2.5-2.5a4 4 0 0 1-3.2 5" />
  </Icon>
);
const ShieldIcon = () => (
  <Icon size={14}>
    <path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.2 7.5 9.5 4.4-1.3 7.5-5.1 7.5-9.5V6L12 3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Icon>
);

const WAVE_PATH = 'M0 60 Q300 0 600 60 T1200 60 T1800 60 T2400 60 V120 H0 Z';

const HIGHLIGHTS = [
  { icon: <BoxIcon />, title: 'Orders', text: 'Fulfill and track customer orders' },
  { icon: <DealerIcon />, title: 'Dealers', text: 'Review and approve applications' },
  { icon: <WrenchIcon />, title: 'Service', text: 'Dispatch requests to technicians' },
];

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function LoginPage() {
  const { signIn, loading, error } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  const emailInvalid = emailTouched && email.trim() !== '' && !EMAIL_PATTERN.test(email.trim());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    await signIn(email.trim(), password.trim());
  };

  // Soft light that follows the pointer over the brand panel (no re-render)
  const handlePointerMove = (e: PointerEvent<HTMLElement>) => {
    const el = asideRef.current;
    if (!el || e.pointerType !== 'mouse') return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  const handleCaps = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState?.('CapsLock') ?? false);
  };

  return (
    <div className="login-page">
      <aside className="login-aside" ref={asideRef} onPointerMove={handlePointerMove}>
        <div className="login-glow" aria-hidden="true" />

        <div className="login-aside-inner">
          <div className="login-brand-logo-badge">
            <AquaPureLogo height={48} variant="badge" />
          </div>
          <span className="login-chip">
            <ShieldIcon /> Staff-only access
          </span>
          <h1 className="login-title">AquaPure Admin</h1>
          <p className="login-subtitle">
            Staff-only dashboard for order fulfillment, dealer approvals, and service dispatch
          </p>

          <ul className="login-highlights">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title}>
                <span className="login-highlight-icon">{h.icon}</span>
                <span className="login-highlight-text">
                  <strong>{h.title}</strong>
                  <span>{h.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="login-waves" aria-hidden="true">
          <svg className="login-wave login-wave-back" viewBox="0 0 2400 120" preserveAspectRatio="none">
            <path d={WAVE_PATH} />
          </svg>
          <svg className="login-wave login-wave-mid" viewBox="0 0 2400 120" preserveAspectRatio="none">
            <path d={WAVE_PATH} />
          </svg>
          <svg className="login-wave login-wave-front" viewBox="0 0 2400 120" preserveAspectRatio="none">
            <path d={WAVE_PATH} />
          </svg>
        </div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <div className="login-card-head">
            <div className="login-card-logo">
              <AquaPureLogo height={34} variant="badge" badgeText="Admin" />
            </div>
            <h2>Welcome back</h2>
            <p>Sign in with your admin account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {error && (
              <div className="login-error" role="alert">
                <span aria-hidden="true">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="login-field">
              <label htmlFor="admin-email">Admin Email</label>
              <div className="login-control" data-invalid={emailInvalid || undefined}>
                <span className="login-control-icon"><MailIcon /></span>
                <input
                  id="admin-email"
                  type="email"
                  className="input"
                  placeholder="admin@aquapure.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  autoComplete="email"
                  inputMode="email"
                  disabled={loading}
                  aria-invalid={emailInvalid || undefined}
                  aria-describedby={emailInvalid ? 'admin-email-hint' : undefined}
                />
              </div>
              {emailInvalid && (
                <p id="admin-email-hint" className="login-hint login-hint-error">
                  Enter a valid email address, like name@company.com.
                </p>
              )}
            </div>

            <div className="login-field">
              <label htmlFor="admin-password">Password</label>
              <div className="login-control">
                <span className="login-control-icon"><LockIcon /></span>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={handleCaps}
                  onKeyDown={handleCaps}
                  onBlur={() => setCapsLock(false)}
                  autoComplete="current-password"
                  disabled={loading}
                  aria-describedby={capsLock ? 'admin-caps-hint' : undefined}
                />
                <button
                  type="button"
                  className="login-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  disabled={loading}
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
              {capsLock && (
                <p id="admin-caps-hint" className="login-hint">
                  Caps Lock is on.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={loading || !email.trim() || !password.trim()}
              aria-busy={loading}
            >
              {loading && <span className="login-spinner" aria-hidden="true" />}
              <span>{loading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
            </button>
          </form>

          <div className="login-footer">
            <p>
              Admin accounts are assigned by the system administrator.
              Contact support if you need access.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}