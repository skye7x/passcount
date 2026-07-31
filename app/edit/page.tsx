'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCounters } from '@/lib/CounterContext';
import { ColorPicker } from '@/components/ColorPicker';
import { ActionSheet } from '@/components/ActionSheet';
import { toDateInput, dateInputToTimestamp } from '@/lib/dates';
import { ArrowLeft, Check, RotateCcw, Trash2, X } from 'lucide-react';

function EditCounterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const counterId = searchParams.get('id') ?? '';
  const { counters, updateCounter, resetCounter, deleteCounter } = useCounters();

  const counter = useMemo(
    () => counters.find(c => c.id === counterId),
    [counters, counterId],
  );

  const [name, setName] = useState(counter?.name ?? '');
  const [total, setTotal] = useState(String(counter?.total ?? ''));
  const [color, setColor] = useState(counter?.color ?? '#007AFF');
  const [expiresDate, setExpiresDate] = useState(
    counter?.expiresAt ? toDateInput(counter.expiresAt) : '',
  );
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!counter) {
    return (
      <div className="page page--modal">
        <p className="form__error" style={{ marginTop: 48, textAlign: 'center' }}>
          Counter not found
        </p>
      </div>
    );
  }

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name');
      return;
    }
    const count = parseInt(total, 10);
    if (!total || isNaN(count) || count < 1) {
      setError('Enter a valid number of passes');
      return;
    }
    updateCounter(counter.id, trimmed, count, color, dateInputToTimestamp(expiresDate));
    router.back();
  };

  const handleReset = () => {
    resetCounter(counter.id);
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
        <span className="toolbar__title">Edit Counter</span>
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
          <div className="form__info-row">
            <span className="form__remaining-value">{counter.remaining}</span>
            <span className="form__remaining-label">passes remaining</span>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              className="form__input"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
            />
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="total">
              Total Passes
            </label>
            <input
              id="total"
              className="form__input"
              value={total}
              onChange={e => setTotal(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              maxLength={5}
            />
          </div>

          <div className="form__group">
            <span className="form__label">Expires At (optional)</span>
            <div className="date-row">
              <input
                id="expires"
                className="form__input date-row__input"
                type="date"
                value={expiresDate}
                onChange={e => setExpiresDate(e.target.value)}
              />
              {expiresDate && (
                <button
                  type="button"
                  className="add-item-row__cancel"
                  aria-label="Clear expiry date"
                  onClick={() => setExpiresDate('')}>
                  <X size={18} />
                </button>
              )}
            </div>
            <p className="add-item-row__hint">Get a reminder when your pass is about to expire</p>
          </div>

          <div className="form__group">
            <span className="form__label">Color</span>
            <ColorPicker selected={color} onSelect={setColor} />
          </div>

          {error && <p className="form__error">{error}</p>}

          <div className="form__actions">
            <button type="button" className="form__action-btn" onClick={handleReset}>
              <RotateCcw size={18} />
              Reset to {counter.total}
            </button>
            <button
              type="button"
              className="form__delete-btn"
              onClick={() => setConfirmingDelete(true)}>
              <Trash2 size={18} />
              Delete Counter
            </button>
          </div>
        </form>
      </div>

      {confirmingDelete && (
        <ActionSheet
          title="Delete Counter"
          message={`Delete "${counter.name}"?`}
          options={[
            {
              label: 'Delete',
              destructive: true,
              onPress: () => {
                deleteCounter(counter.id);
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

export default function EditCounterPage() {
  return (
    <Suspense fallback={<div className="page page--modal" />}>
      <EditCounterForm />
    </Suspense>
  );
}
