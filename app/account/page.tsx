'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Cloud, CloudOff, RefreshCw, LogOut, Check } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useCounters } from '@/lib/CounterContext';
import { ApiError } from '@/lib/api';

type Mode = 'login' | 'register';

function SyncBadge() {
  const { syncStatus, syncError, lastSyncedAt } = useCounters();

  if (syncStatus === 'disabled') return null;

  const label =
    syncStatus === 'syncing'
      ? 'Syncing…'
      : syncStatus === 'error'
        ? syncError || 'Sync error'
        : syncStatus === 'conflict'
          ? 'Waiting for your choice below'
          : lastSyncedAt
            ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : 'Synced';

  const icon =
    syncStatus === 'syncing' ? (
      <RefreshCw size={16} className="spin" />
    ) : syncStatus === 'error' ? (
      <CloudOff size={16} />
    ) : (
      <Cloud size={16} />
    );

  return (
    <div className={`sync-badge sync-badge--${syncStatus}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function ConflictPrompt() {
  const { syncConflict, resolveSyncConflict } = useCounters();
  const [resolving, setResolving] = useState<'local' | 'remote' | null>(null);

  if (!syncConflict) return null;

  const choose = async (choice: 'local' | 'remote') => {
    setResolving(choice);
    await resolveSyncConflict(choice);
    setResolving(null);
  };

  return (
    <div className="settings-card" style={{ padding: 'var(--space-md)' }}>
      <p className="setting-row__label" style={{ marginBottom: 4 }}>
        Data found on both this device and the cloud
      </p>
      <p className="setting-row__desc" style={{ marginBottom: 'var(--space-md)' }}>
        Choose which version to keep. The other will be replaced.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <button
          type="button"
          className="form__action-btn"
          disabled={resolving !== null}
          onClick={() => choose('local')}>
          {resolving === 'local' ? 'Applying…' : 'Keep data from this device'}
        </button>
        <button
          type="button"
          className="form__action-btn"
          disabled={resolving !== null}
          onClick={() => choose('remote')}>
          {resolving === 'remote' ? 'Applying…' : 'Use cloud data instead'}
        </button>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { email, isAuthenticated, login, register, logout } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('Enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register(trimmedEmail, password);
      } else {
        await login(trimmedEmail, password);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setSubmitting(true);
    try {
      await logout();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page page--modal">
      <div className="toolbar">
        <button
          type="button"
          className="toolbar__btn"
          aria-label="Close"
          onClick={() => router.back()}>
          <X size={20} />
        </button>
        <span className="toolbar__title">Account</span>
        <span style={{ width: 36 }} />
      </div>

      <div className="scroll-root">
        {isAuthenticated ? (
          <div className="settings-content">
            <p className="settings-section-title">Signed in</p>
            <div className="settings-card">
              <div className="setting-row">
                <span className="setting-row__icon">
                  <Check size={20} />
                </span>
                <div className="setting-row__text">
                  <p className="setting-row__label">{email}</p>
                  <p className="setting-row__desc">Your counters, logs and lists sync to the cloud</p>
                </div>
              </div>
            </div>

            <p className="settings-section-title">Sync</p>
            <div className="settings-card" style={{ padding: 'var(--space-md)' }}>
              <SyncBadge />
            </div>

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <ConflictPrompt />
            </div>

            <button
              type="button"
              className="form__delete-btn"
              style={{ marginTop: 'var(--space-lg)' }}
              disabled={submitting}
              onClick={handleLogout}>
              <LogOut size={18} style={{ marginRight: 6 }} />
              Sign Out
            </button>
          </div>
        ) : (
          <form
            className="form"
            onSubmit={e => {
              e.preventDefault();
              handleSubmit();
            }}>
            <div className="account-tabs">
              <button
                type="button"
                className={`account-tab${mode === 'login' ? ' account-tab--active' : ''}`}
                onClick={() => {
                  setMode('login');
                  setError('');
                }}>
                Sign In
              </button>
              <button
                type="button"
                className={`account-tab${mode === 'register' ? ' account-tab--active' : ''}`}
                onClick={() => {
                  setMode('register');
                  setError('');
                }}>
                Create Account
              </button>
            </div>

            <p className="setting-row__desc" style={{ padding: '0 4px' }}>
              Optional — sign in to back up and sync your counters, logs, trainings and
              equipment lists across devices. The app fully works offline without an account.
            </p>

            <div className="form__group">
              <label className="form__label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="form__input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form__group">
              <label className="form__label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="form__input"
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {mode === 'register' && (
              <div className="form__group">
                <label className="form__label" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  className="form__input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            {error && <p className="form__error">{error}</p>}

            <button type="submit" className="form__action-btn" disabled={submitting}>
              {submitting
                ? 'Please wait…'
                : mode === 'register'
                  ? 'Create Account'
                  : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
