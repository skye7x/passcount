'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCounters } from '@/lib/CounterContext';
import { CounterCard } from '@/components/CounterCard';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { EmptyState } from '@/components/EmptyState';
import { BottomNav } from '@/components/BottomNav';
import { ActionSheet, ActionSheetOption } from '@/components/ActionSheet';
import { triggerHaptic } from '@/lib/haptics';

export default function HomePage() {
  const { counters, settings, decrementCounter, deleteCounter, resetCounter, loading } =
    useCounters();
  const router = useRouter();

  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<string | null>(null);

  const sortedCounters = useMemo(() => {
    const list = [...counters];
    switch (settings.sortOrder) {
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'remaining':
        list.sort((a, b) => a.remaining - b.remaining);
        break;
      case 'oldest':
        list.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'newest':
      default:
        list.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }
    return list;
  }, [counters, settings.sortOrder]);

  const totalRemaining = useMemo(
    () => counters.reduce((sum, c) => sum + c.remaining, 0),
    [counters],
  );

  const handleTap = useCallback(
    (id: string) => {
      decrementCounter(id);
      if (settings.hapticFeedback) triggerHaptic('light');
    },
    [decrementCounter, settings.hapticFeedback],
  );

  const handleLongPress = useCallback(
    (id: string) => {
      if (settings.hapticFeedback) triggerHaptic('medium');
      setSheetFor(id);
    },
    [settings.hapticFeedback],
  );

  const activeCounter = counters.find(c => c.id === sheetFor);
  const pendingDeleteCounter = counters.find(c => c.id === confirmDeleteFor);

  const sheetOptions: ActionSheetOption[] = activeCounter
    ? [
        { label: 'Edit', onPress: () => router.push(`/edit/?id=${activeCounter.id}`) },
        { label: 'Reset', onPress: () => resetCounter(activeCounter.id) },
        {
          label: 'Delete',
          destructive: true,
          onPress: () => {
            if (settings.confirmDelete) {
              setConfirmDeleteFor(activeCounter.id);
              setSheetFor(null);
            } else {
              deleteCounter(activeCounter.id);
              setSheetFor(null);
            }
          },
        },
      ]
    : [];

  if (loading) {
    return <div className="page page--home" />;
  }

  return (
    <div className="page page--home">
      <div className="scroll-root">
        {counters.length > 0 && (
          <header className="home-header">
            <h1 className="home-header__title">PassCount</h1>
            <p className="home-header__summary">
              {totalRemaining} remaining across {counters.length} counter
              {counters.length !== 1 ? 's' : ''}
            </p>
          </header>
        )}

        {counters.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="counter-list">
            {sortedCounters.map(item => (
              <li key={item.id}>
                <CounterCard
                  counter={item}
                  onTap={() => handleTap(item.id)}
                  onLongPress={() => handleLongPress(item.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <FloatingActionButton onPress={() => router.push('/add/')} />
      <BottomNav />

      {activeCounter && (
        <ActionSheet
          options={sheetOptions.map(opt => ({
            ...opt,
            onPress: () => {
              opt.onPress();
              if (opt.label !== 'Delete' || !settings.confirmDelete) {
                setSheetFor(null);
              }
            },
          }))}
          onCancel={() => setSheetFor(null)}
        />
      )}

      {pendingDeleteCounter && (
        <ActionSheet
          title="Delete Counter"
          message={`Delete "${pendingDeleteCounter.name}"? This can't be undone.`}
          options={[
            {
              label: 'Delete',
              destructive: true,
              onPress: () => {
                deleteCounter(pendingDeleteCounter.id);
                setConfirmDeleteFor(null);
              },
            },
          ]}
          onCancel={() => setConfirmDeleteFor(null)}
        />
      )}
    </div>
  );
}
