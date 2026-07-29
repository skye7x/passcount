'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCounters } from '@/lib/CounterContext';
import { ColorPicker } from '@/components/ColorPicker';
import { X, Check } from 'lucide-react';

export default function AddCounterPage() {
  const router = useRouter();
  const { addCounter } = useCounters();
  const [name, setName] = useState('');
  const [total, setTotal] = useState('');
  const [color, setColor] = useState('#007AFF');
  const [error, setError] = useState('');

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
    addCounter(trimmed, count, color);
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
        <span className="toolbar__title">New Counter</span>
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
              placeholder="e.g. Gym Pass"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              autoFocus
            />
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="total">
              Total Passes
            </label>
            <input
              id="total"
              className="form__input"
              placeholder="e.g. 20"
              value={total}
              onChange={e => setTotal(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              maxLength={5}
            />
          </div>

          <div className="form__group">
            <span className="form__label">Color</span>
            <ColorPicker selected={color} onSelect={setColor} />
          </div>

          {error && <p className="form__error">{error}</p>}
        </form>
      </div>
    </div>
  );
}
