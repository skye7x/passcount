'use client';

import { useRouter } from 'next/navigation';
import { useCounters } from '@/lib/CounterContext';
import { BottomNav } from '@/components/BottomNav';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { EmptyState } from '@/components/EmptyState';
import { Dumbbell, Clock, Bell, BellOff } from 'lucide-react';
import { requestNotificationPermission } from '@/lib/notifications';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TrainingsPage() {
  const { trainings, updateTraining, deleteTraining, settings } = useCounters();
  const router = useRouter();

  const handleToggle = async (id: string, enabled: boolean) => {
    if (enabled && settings.notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    updateTraining(id, { enabled: !enabled });
  };

  return (
    <div className="page page--home">
      <div className="scroll-root">
        <div style={{ padding: 'calc(16px + var(--safe-top)) 24px 0' }}>
          <h1 className="home-header__title">Trainings</h1>
          <p className="home-header__summary">
            {trainings.length > 0
              ? `${trainings.filter(t => t.enabled).length} active reminders`
              : 'Never miss a workout'}
          </p>
        </div>

        {trainings.length === 0 ? (
          <EmptyState
            title="No trainings yet"
            subtitle="Add your first training to get reminded"
          />
        ) : (
          <ul className="training-list" style={{ marginTop: 16 }}>
            {trainings.map(t => (
              <li key={t.id} className="training-card">
                <button
                  className="training-card__icon"
                  onClick={() => router.push(`/add-training/?id=${t.id}`)}
                  style={{ cursor: 'pointer', border: 'none', background: 'var(--surface-secondary)' }}>
                  <Dumbbell size={22} strokeWidth={1.5} />
                </button>
                <div className="training-card__body">
                  <p className="training-card__name">{t.name}</p>
                  <p className="training-card__time">
                    <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {String(t.hour).padStart(2, '0')}:{String(t.minute).padStart(2, '0')}
                  </p>
                  <div className="training-card__days">
                    {DAY_LABELS.map((label, i) => (
                      <span
                        key={i}
                        className={`training-card__day${t.days.includes(i) ? ' training-card__day--active' : ''}`}>
                        {label[0]}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  className="training-card__toggle toggle"
                  style={{ background: t.enabled ? 'var(--green)' : 'var(--separator-light)' }}
                  onClick={() => handleToggle(t.id, t.enabled)}
                  aria-label={t.enabled ? 'Disable reminder' : 'Enable reminder'}>
                  <span
                    className="toggle__thumb"
                    style={{ transform: t.enabled ? 'translateX(16px)' : undefined }}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FloatingActionButton onPress={() => router.push('/add-training/')} />
      <BottomNav />
    </div>
  );
}
