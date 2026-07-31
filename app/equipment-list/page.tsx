'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCounters } from '@/lib/CounterContext';
import { ActionSheet } from '@/components/ActionSheet';
import { triggerHaptic } from '@/lib/haptics';
import { ArrowLeft, Pencil, Check, Plus, Package, Trash2 } from 'lucide-react';

function EquipmentListDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listId = searchParams.get('id') ?? '';
  const {
    equipment,
    toggleEquipmentItem,
    addEquipmentItem,
    removeEquipmentItem,
    setEquipmentPacked,
    settings,
  } = useCounters();

  const [itemInput, setItemInput] = useState('');
  const [removeFor, setRemoveFor] = useState<string | null>(null);

  const list = useMemo(
    () => equipment.find(l => l.id === listId),
    [equipment, listId],
  );

  if (!list) {
    return (
      <div className="page page--modal">
        <p className="form__error" style={{ marginTop: 48, textAlign: 'center' }}>
          List not found
        </p>
      </div>
    );
  }

  const packedCount = list.items.filter(item => item.packed).length;
  const total = list.items.length;

  const addItem = () => {
    const trimmed = itemInput.trim();
    if (!trimmed) return;
    addEquipmentItem(list.id, trimmed);
    setItemInput('');
  };

  const handleToggle = (itemId: string) => {
    if (settings.hapticFeedback) triggerHaptic('light');
    toggleEquipmentItem(list.id, itemId);
  };

  const handleLongPressItem = (itemId: string) => {
    if (settings.hapticFeedback) triggerHaptic('medium');
    setRemoveFor(itemId);
  };

  const pendingRemoveItem = list.items.find(item => item.id === removeFor);

  return (
    <div className="page page--modal page--pack">
      <div className="toolbar">
        <button
          type="button"
          className="toolbar__btn"
          aria-label="Back"
          onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </button>
        <span className="toolbar__title">Packing List</span>
        <button
          type="button"
          className="toolbar__btn"
          aria-label="Edit list"
          onClick={() => router.push(`/add-equipment/?id=${list.id}`)}>
          <Pencil size={20} />
        </button>
      </div>

      <div className="scroll-root">
        <div className="pack-header">
          <div className="pack-header__icon" style={{ backgroundColor: list.color }}>
            {list.packed ? (
              <Check size={22} strokeWidth={2.5} />
            ) : (
              <Package size={22} strokeWidth={1.5} />
            )}
          </div>
          <div className="pack-header__body">
            <div className="pack-header__top-row">
              <h1 className="pack-header__title">{list.name}</h1>
              {list.packed && <span className="equipment-card__tag">Packed</span>}
            </div>
            <p className="pack-header__meta">
              {packedCount}/{total} packed
            </p>
          </div>
        </div>

        {list.items.length === 0 ? (
          <p className="pack-empty">No items yet. Add something below.</p>
        ) : (
          <ul className="checklist">
            {list.items.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`checklist-item${item.packed ? ' checklist-item--packed' : ''}`}
                  onClick={() => handleToggle(item.id)}
                  onContextMenu={e => {
                    e.preventDefault();
                    handleLongPressItem(item.id);
                  }}>
                  <span
                    className={`checklist-item__check${item.packed ? ' checklist-item__check--done' : ''}`}
                    style={item.packed ? { backgroundColor: 'var(--green)', borderColor: 'var(--green)' } : undefined}>
                    {item.packed && <Check size={14} strokeWidth={3} style={{ color: '#fff' }} />}
                  </span>
                  <span className="checklist-item__name">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="pack-add">
          <input
            className="form__input pack-add__input"
            placeholder="Forgot something? Add it"
            value={itemInput}
            onChange={e => setItemInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
            }}
            maxLength={60}
          />
          <button type="button" className="add-item-row__add" aria-label="Add item" onClick={addItem}>
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="pack-footer">
        <button
          type="button"
          className={`pack-submit${list.packed ? ' pack-submit--packed' : ''}`}
          onClick={() => {
            if (settings.hapticFeedback) triggerHaptic('medium');
            setEquipmentPacked(list.id, !list.packed);
          }}>
          {list.packed ? (
            <>
              <Check size={20} strokeWidth={2.5} />
              Unpack
            </>
          ) : (
            <>
              <Check size={20} strokeWidth={2.5} />
              Mark as packed
            </>
          )}
        </button>
      </div>

      {pendingRemoveItem && (
        <ActionSheet
          title="Remove Item"
          message={`Remove "${pendingRemoveItem.name}" from this list?`}
          options={[
            {
              label: 'Remove',
              destructive: true,
              onPress: () => {
                removeEquipmentItem(list.id, pendingRemoveItem.id);
                setRemoveFor(null);
              },
            },
          ]}
          onCancel={() => setRemoveFor(null)}
        />
      )}
    </div>
  );
}

export default function EquipmentListPage() {
  return (
    <Suspense fallback={<div className="page page--modal" />}>
      <EquipmentListDetail />
    </Suspense>
  );
}
