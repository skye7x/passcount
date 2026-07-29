'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCounters } from '@/lib/CounterContext';
import { X, Check, Trash2 } from 'lucide-react';
import { ActionSheet } from '@/components/ActionSheet';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function AddTrainingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const { trainings, addTraining, updateTraining, deleteTraining } = useCounters();

  const existing = editId ? trainings.find(t => t.id === editId) : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [hour, setHour] = useState(String(existing?.hour ?? '07'));
  const [minute, setMinute] = useState(String(existing?.minute ?? '00'));
  const [days, setDays] = useState<number[]>(existing?.days ?? [0, 1, 2, 3, 4]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const toggleDay = (d: number) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return;
    if (days.length === 0) return;

    const data = {
      name: trimmed,
      hour: h,
      minute: m,
      days,
      enabled: existing?.enabled ?? true,
      color: existing?.color ?? '#007AFF',
    };

    if (existing) {
      updateTraining(existing.id, data);
    } else {
      addTraining(data);
    }
    router.back();
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
        <span className="toolbar__title">{existing ? 'Edit Training' : 'New Training'}</span>
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
              Name
            </label>
            <input
              id="name"
              className="form__input"
              placeholder="e.g. Morning Gym"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              autoFocus
            />
          </div>

          <div className="form__group">
            <label className="form__label">Time</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                className="form__input"
                placeholder="07"
                value={hour}
                onChange={e => setHour(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                inputMode="numeric"
                maxLength={2}
                style={{ width: 80, textAlign: 'center' }}
              />
              <span style={{ fontSize: 20, color: 'var(--label-tertiary)' }}>:</span>
              <input
                className="form__input"
                placeholder="00"
                value={minute}
                onChange={e => setMinute(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                inputMode="numeric"
                maxLength={2}
                style={{ width: 80, textAlign: 'center' }}
              />
            </div>
          </div>

          <div className="form__group">
            <label className="form__label">Days</label>
            <div className="day-picker">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  className={`day-picker__btn${days.includes(i) ? ' day-picker__btn--selected' : ''}`}
                  onClick={() => toggleDay(i)}>
                  {label[0]}
                </button>
              ))}
            </div>
          </div>

          {existing && (
            <div className="form__actions" style={{ marginTop: 'auto', paddingTop: 24 }}>
              <button
                type="button"
                className="form__delete-btn"
                onClick={() => setConfirmingDelete(true)}>
                <Trash2 size={18} />
                Delete Training
              </button>
            </div>
          )}
        </form>
      </div>

      {confirmingDelete && existing && (
        <ActionSheet
          title="Delete Training"
          message={`Delete "${existing.name}"?`}
          options={[
            {
              label: 'Delete',
              destructive: true,
              onPress: () => {
                deleteTraining(existing.id);
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

export default function AddTrainingPage() {
  return (
    <Suspense fallback={<div className="page page--modal" />}>
      <AddTrainingForm />
    </Suspense>
  );
}
