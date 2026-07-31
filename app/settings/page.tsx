'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useCounters } from '@/lib/CounterContext';
import { AppSettings } from '@/lib/types';
import { BottomNav } from '@/components/BottomNav';
import { Smartphone, Trash2, Bell, BellOff, Send } from 'lucide-react';
import { requestNotificationPermission, sendTestNotification } from '@/lib/notifications';

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`toggle${checked ? ' toggle--on' : ''}`}
      onClick={() => onChange(!checked)}>
      <span className="toggle__thumb" />
    </button>
  );
}

function SettingRow({
  icon,
  label,
  description,
  right,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="setting-row">
      <span className="setting-row__icon">{icon}</span>
      <div className="setting-row__text">
        <p className="setting-row__label">{label}</p>
        {description && <p className="setting-row__desc">{description}</p>}
      </div>
      {right && <div className="setting-row__right">{right}</div>}
    </div>
  );
}

function SortOption({
  value,
  current,
  onSelect,
  label,
}: {
  value: AppSettings['sortOrder'];
  current: AppSettings['sortOrder'];
  onSelect: (v: AppSettings['sortOrder']) => void;
  label: string;
}) {
  const isSelected = value === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`chip${isSelected ? ' chip--selected' : ''}`}>
      {label}
    </button>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings } = useCounters();
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleNotificationsToggle = async (v: boolean) => {
    if (v) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    updateSettings({ notificationsEnabled: v });
  };

  const handleTestNotification = async () => {
    if (!settings.notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setTestStatus('error');
        return;
      }
      updateSettings({ notificationsEnabled: true });
    }
    setTestStatus('sending');
    try {
      await sendTestNotification();
      setTestStatus('sent');
    } catch {
      setTestStatus('error');
    }
  };

  return (
    <div className="page page--home">
      <div className="scroll-root">
        <div className="settings-content">
          <h1 className="home-header__title" style={{ marginBottom: 8 }}>
            Settings
          </h1>

          <p className="settings-section-title">Preferences</p>
          <div className="settings-card">
            <SettingRow
              icon={<Smartphone size={20} />}
              label="Haptic Feedback"
              description="Vibrate when tapping a counter"
              right={
                <Toggle
                  checked={settings.hapticFeedback}
                  onChange={v => updateSettings({ hapticFeedback: v })}
                  label="Haptic Feedback"
                />
              }
            />
            <SettingRow
              icon={<Trash2 size={20} />}
              label="Confirm Deletion"
              description="Ask before deleting a counter"
              right={
                <Toggle
                  checked={settings.confirmDelete}
                  onChange={v => updateSettings({ confirmDelete: v })}
                  label="Confirm Deletion"
                />
              }
            />
            <SettingRow
              icon={settings.notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
              label="Notifications"
              description="Training reminders and alerts"
              right={
                <Toggle
                  checked={settings.notificationsEnabled}
                  onChange={handleNotificationsToggle}
                  label="Notifications"
                />
              }
            />
            {settings.notificationsEnabled && (
              <button
                type="button"
                className="setting-row setting-row--action"
                onClick={handleTestNotification}
                disabled={testStatus === 'sending'}>
                <span className="setting-row__icon">
                  <Send size={20} />
                </span>
                <div className="setting-row__text">
                  <p className="setting-row__label">Send Test Notification</p>
                  <p className="setting-row__desc">
                    {testStatus === 'sending'
                      ? 'Sending…'
                      : testStatus === 'sent'
                        ? 'Sent — check your notifications'
                        : testStatus === 'error'
                          ? 'Failed — check app notification permission'
                          : 'Shows a test notification in a few seconds'}
                  </p>
                </div>
              </button>
            )}
          </div>

          <p className="settings-section-title">Sort Order</p>
          <div className="settings-card">
            <div className="chip-row">
              <SortOption
                value="newest"
                current={settings.sortOrder}
                onSelect={v => updateSettings({ sortOrder: v })}
                label="Newest"
              />
              <SortOption
                value="oldest"
                current={settings.sortOrder}
                onSelect={v => updateSettings({ sortOrder: v })}
                label="Oldest"
              />
              <SortOption
                value="name"
                current={settings.sortOrder}
                onSelect={v => updateSettings({ sortOrder: v })}
                label="Name"
              />
              <SortOption
                value="remaining"
                current={settings.sortOrder}
                onSelect={v => updateSettings({ sortOrder: v })}
                label="Lowest"
              />
            </div>
          </div>

          <div className="about-section">
            <p className="about-section__text">PassCount v2.0.0</p>
            <p className="about-section__subtext">Simple pass tracking for everyday use</p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
