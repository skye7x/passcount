'use client';

import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCounters } from '@/lib/CounterContext';
import { ColorPicker } from '@/components/ColorPicker';
import { ActionSheet } from '@/components/ActionSheet';
import { ArrowLeft, Check, Plus, Trash2, X, Pencil } from 'lucide-react';

interface DraftItem {
  id: string;
  name: string;
}

const LONG_PRESS_MS = 500;

function draftId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function DraftItemRow({
  item,
  editing,
  onEdit,
  onRemove,
}: {
  item: DraftItem;
  editing: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedLongPress = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = () => {
    firedLongPress.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      firedLongPress.current = true;
      onEdit();
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    clearTimer();
    if (!firedLongPress.current) {
      onEdit();
    }
  };

  const handlePointerLeave = () => {
    clearTimer();
  };

  return (
    <div
      className={`draft-item${editing ? ' draft-item--editing' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={e => {
        e.preventDefault();
        clearTimer();
        firedLongPress.current = true;
        onEdit();
      }}>
      <span className="draft-item__name">{item.name}</span>
      {editing && (
        <span className="draft-item__edit-label">
          <Pencil size={12} />
        </span>
      )}
      <button
        type="button"
        className="draft-item__remove"
        aria-label={`Remove ${item.name}`}
        onClick={onRemove}
        onPointerDown={e => e.stopPropagation()}
        onPointerUp={e => e.stopPropagation()}
        onPointerLeave={e => e.stopPropagation()}>
        <X size={18} />
      </button>
    </div>
  );
}

function AddEquipmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const { equipment, addEquipmentList, updateEquipmentList, deleteEquipmentList } = useCounters();

  const existing = editId ? equipment.find(list => list.id === editId) : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState(existing?.color ?? '#007AFF');
  const [items, setItems] = useState<DraftItem[]>(
    existing?.items.map(item => ({ id: item.id, name: item.name })) ?? [],
  );
  const [itemInput, setItemInput] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const addItem = () => {
    const trimmed = itemInput.trim();
    if (!trimmed) return;
    if (editingItemId) {
      setItems(prev =>
        prev.map(item =>
          item.id === editingItemId ? { ...item, name: trimmed } : item,
        ),
      );
      setEditingItemId(null);
    } else {
      setItems(prev => [...prev, { id: draftId(), name: trimmed }]);
    }
    setItemInput('');
  };

  const handleEditItem = (id: string) => {
    const item = items.find(it => it.id === id);
    if (!item) return;
    setEditingItemId(id);
    setItemInput(item.name);
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setItemInput('');
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a list name');
      return;
    }
    const finalItems = items
      .map(item => ({ ...item, name: item.name.trim() }))
      .filter(item => item.name.length > 0);
    if (finalItems.length === 0) {
      setError('Add at least one item');
      return;
    }

    if (existing) {
      updateEquipmentList(existing.id, {
        name: trimmed,
        color,
        items: finalItems.map(item => {
          const previous = existing.items.find(prev => prev.id === item.id);
          return { ...item, packed: previous?.packed ?? false };
        }),
      });
    } else {
      addEquipmentList(
        trimmed,
        color,
        finalItems.map(item => ({ ...item, packed: false })),
      );
    }
    router.back();
  };

  return (
    <div className="page page--modal">
      <div className="toolbar">
        <button
          type="button"
          className="toolbar__btn"
          aria-label="Back"
          onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </button>
        <span className="toolbar__title">{existing ? 'Edit List' : 'New List'}</span>
        <button
          type="button"
          className="toolbar__btn toolbar__btn--accent"
          aria-label="Save"
          onClick={handleSave}>
          <Check size={20} />
        </button>
      </div>

      <div className="scroll-root">
        <form
          className="form"
          onSubmit={e => {
            e.preventDefault();
            handleSave();
          }}>
          <div className="form__group">
            <label className="form__label" htmlFor="name">
              List Name
            </label>
            <input
              id="name"
              className="form__input"
              placeholder="e.g. Gym Bag"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              autoFocus
            />
          </div>

          <div className="form__group">
            <span className="form__label">Color</span>
            <ColorPicker selected={color} onSelect={setColor} />
          </div>

          <div className="form__group">
            <span className="form__label">Items</span>
            {items.length > 0 && (
              <div className="draft-items">
                {items.map(item => (
                  <DraftItemRow
                    key={item.id}
                    item={item}
                    editing={editingItemId === item.id}
                    onEdit={() => handleEditItem(item.id)}
                    onRemove={() =>
                      setItems(prev => prev.filter(it => it.id !== item.id))
                    }
                  />
                ))}
              </div>
            )}

            <div className="add-item-row">
              <input
                className="form__input add-item-row__input"
                placeholder="Add an item"
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
              {editingItemId ? (
                <>
                  <button
                    type="button"
                    className="add-item-row__cancel"
                    aria-label="Cancel editing"
                    onClick={cancelEditing}>
                    <X size={18} />
                  </button>
                  <button
                    type="button"
                    className="add-item-row__add"
                    aria-label="Save item"
                    onClick={addItem}>
                    <Check size={20} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="add-item-row__add"
                  aria-label="Add item"
                  onClick={addItem}>
                  <Plus size={20} />
                </button>
              )}
            </div>
            <p className="add-item-row__hint">Tap an item to edit, long press also works</p>
          </div>

          {error && <p className="form__error">{error}</p>}

          {existing && (
            <div className="form__actions" style={{ marginTop: 'auto', paddingTop: 24 }}>
              <button
                type="button"
                className="form__delete-btn"
                onClick={() => setConfirmingDelete(true)}>
                <Trash2 size={18} />
                Delete List
              </button>
            </div>
          )}
        </form>
      </div>

      {confirmingDelete && existing && (
        <ActionSheet
          title="Delete List"
          message={`Delete "${existing.name}"?`}
          options={[
            {
              label: 'Delete',
              destructive: true,
              onPress: () => {
                deleteEquipmentList(existing.id);
                router.back();
              },
            },
          ]}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

export default function AddEquipmentPage() {
  return (
    <Suspense fallback={<div className="page page--modal" />}>
      <AddEquipmentForm />
    </Suspense>
  );
}
