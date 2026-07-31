'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCounters } from '@/lib/CounterContext';
import { BottomNav } from '@/components/BottomNav';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { EmptyState } from '@/components/EmptyState';
import { EquipmentCard } from '@/components/EquipmentCard';
import { ActionSheet, ActionSheetOption } from '@/components/ActionSheet';
import { triggerHaptic } from '@/lib/haptics';

export default function EquipmentPage() {
  const { equipment, deleteEquipmentList, settings, loading } = useCounters();
  const router = useRouter();
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<string | null>(null);

  const sortedLists = useMemo(() => {
    return [...equipment].sort((a, b) => b.createdAt - a.createdAt);
  }, [equipment]);

  const packedCount = equipment.filter(list => list.packed).length;

  const handleLongPress = useCallback(
    (id: string) => {
      if (settings.hapticFeedback) triggerHaptic('medium');
      setSheetFor(id);
    },
    [settings.hapticFeedback],
  );

  const activeList = equipment.find(list => list.id === sheetFor);
  const pendingDeleteList = equipment.find(list => list.id === confirmDeleteFor);

  const sheetOptions: ActionSheetOption[] = activeList
    ? [
        { label: 'Edit', onPress: () => router.push(`/add-equipment/?id=${activeList.id}`) },
        {
          label: 'Delete',
          destructive: true,
          onPress: () => {
            if (settings.confirmDelete) {
              setConfirmDeleteFor(activeList.id);
              setSheetFor(null);
            } else {
              deleteEquipmentList(activeList.id);
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
        <div style={{ padding: 'calc(16px + var(--safe-top)) 24px 0' }}>
          <h1 className="home-header__title">Equipment</h1>
          <p className="home-header__summary">
            {equipment.length > 0
              ? `${packedCount}/${equipment.length} list${equipment.length === 1 ? '' : 's'} packed`
              : 'Packing lists for your training'}
          </p>
        </div>

        {equipment.length === 0 ? (
          <EmptyState
            title="No lists yet"
            subtitle="Create a packing list so you never forget your gear"
          />
        ) : (
          <ul className="equipment-list">
            {sortedLists.map(list => (
              <li key={list.id}>
                <EquipmentCard
                  list={list}
                  onTap={() => router.push(`/equipment-list/?id=${list.id}`)}
                  onLongPress={() => handleLongPress(list.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <FloatingActionButton onPress={() => router.push('/add-equipment/')} ariaLabel="Add equipment list" />
      <BottomNav />

      {activeList && (
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

      {pendingDeleteList && (
        <ActionSheet
          title="Delete List"
          message={`Delete "${pendingDeleteList.name}"? This can't be undone.`}
          options={[
            {
              label: 'Delete',
              destructive: true,
              onPress: () => {
                deleteEquipmentList(pendingDeleteList.id);
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
