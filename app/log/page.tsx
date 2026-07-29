'use client';

import { useMemo } from 'react';
import { useCounters } from '@/lib/CounterContext';
import { BottomNav } from '@/components/BottomNav';
import { History, Minus, RotateCcw, Plus, Trash2 } from 'lucide-react';

const TYPE_CONFIG = {
  decrement: { icon: Minus, bg: '#2c2c2e', color: '#8e8e93' },
  reset: { icon: RotateCcw, bg: '#3a3a3c', color: '#a1a1a6' },
  create: { icon: Plus, bg: '#1c1c1e', color: '#e5e5ea' },
  edit: { icon: Trash2, bg: '#48484a', color: '#636366' },
};

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  if (d.toDateString() === now.toDateString()) return `Today at ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
  return `${days[d.getDay()]}, ${time}`;
}

const TYPE_LABELS: Record<string, string> = {
  decrement: 'Used',
  reset: 'Reset',
  create: 'Created',
  edit: 'Edited',
};

export default function LogPage() {
  const { logs, clearLogs } = useCounters();

  const grouped = useMemo(() => {
    const groups: { date: string; entries: typeof logs }[] = [];
    let currentDate = '';
    let currentGroup: typeof logs = [];

    for (const log of logs) {
      const d = new Date(log.timestamp);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      if (dateStr !== currentDate) {
        if (currentGroup.length > 0) groups.push({ date: currentDate, entries: currentGroup });
        currentDate = dateStr;
        currentGroup = [];
      }
      currentGroup.push(log);
    }
    if (currentGroup.length > 0) groups.push({ date: currentDate, entries: currentGroup });
    return groups;
  }, [logs]);

  return (
    <div className="page page--home">
      <div className="scroll-root">
        <div style={{ padding: 'calc(16px + var(--safe-top)) 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 className="home-header__title">History</h1>
            {logs.length > 0 && (
              <button
                onClick={clearLogs}
                style={{
                  border: 'none', background: 'none', color: 'var(--blue)',
                  fontSize: 14, fontWeight: 500, padding: 8,
                }}>
                Clear
              </button>
            )}
          </div>
          <p className="home-header__summary">
            {logs.length > 0
              ? `${logs.length} entr${logs.length === 1 ? 'y' : 'ies'}`
              : 'No activity yet'}
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="log-empty">
            <History size={40} strokeWidth={1} style={{ opacity: 0.3 }} />
            <p style={{ margin: 0 }}>No activity logged yet</p>
            <p style={{ margin: 0, fontSize: 13 }}>
              Every pass use will be recorded here
            </p>
          </div>
        ) : (
          <div style={{ padding: '0 16px 80px' }}>
            {grouped.map(group => (
              <div key={group.date} style={{ marginBottom: 24 }}>
                <p style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--label-tertiary)',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  padding: '0 16px', marginBottom: 8,
                }}>
                  {group.date}
                </p>
                <ul className="log-list">
                  {group.entries.map(log => {
                    const config = TYPE_CONFIG[log.type];
                    const Icon = config?.icon || History;
                    return (
                      <li key={log.id} className="log-item">
                        <div
                          className="log-item__icon"
                          style={{ background: config?.bg || '#f2f2f7' }}>
                          <Icon size={16} color={config?.color || '#8e8e93'} strokeWidth={2} />
                        </div>
                        <div className="log-item__body">
                          <p className="log-item__title">{log.counterName}</p>
                          <p className="log-item__meta">
                            {TYPE_LABELS[log.type] || log.type} &middot; {formatTime(log.timestamp)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
