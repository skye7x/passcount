'use client';

import { useRef, useState } from 'react';
import { Counter } from '@/lib/types';
import { formatShortDate } from '@/lib/dates';
import { Ban, AlertTriangle, Clock } from 'lucide-react';

interface CounterCardProps {
  counter: Counter;
  onTap: () => void;
  onLongPress: () => void;
}

const LONG_PRESS_MS = 500;

export function CounterCard({ counter, onTap, onLongPress }: CounterCardProps) {
  const [pressed, setPressed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedLongPress = useRef(false);

  const progress = counter.total > 0 ? counter.remaining / counter.total : 0;
  const isLow = counter.remaining <= Math.ceil(counter.total * 0.2) && counter.remaining > 0;
  const isDepleted = counter.remaining === 0;

  const now = Date.now();
  const expiresAt = counter.expiresAt ?? null;
  const isExpired = expiresAt !== null && expiresAt < now;
  const expiresSoon =
    expiresAt !== null && !isExpired && expiresAt <= now + 14 * 24 * 60 * 60 * 1000;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = () => {
    setPressed(true);
    firedLongPress.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      firedLongPress.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    setPressed(false);
    clearTimer();
    if (!firedLongPress.current) {
      onTap();
    }
  };

  const handlePointerLeave = () => {
    setPressed(false);
    clearTimer();
  };

  return (
    <button
      type="button"
      className="counter-card"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={e => {
        e.preventDefault();
        clearTimer();
        firedLongPress.current = true;
        setPressed(false);
        onLongPress();
      }}>
      <div
        className="counter-card__icon-wrap"
        style={{ backgroundColor: isDepleted ? '#2c2c2e' : isLow ? '#3a3a3c' : counter.color }}>
        {isDepleted ? (
          <Ban size={20} className="counter-card__icon-color" style={{ color: '#8e8e93' }} />
        ) : (
          <span
            className="counter-card__icon-color"
            style={{ fontSize: 18, fontWeight: 600 }}>
            {counter.remaining}
          </span>
        )}
      </div>
      <div className="counter-card__content">
        <div className="counter-card__top-row">
          <span className="counter-card__name">{counter.name}</span>
          {isExpired ? (
            <span className="counter-card__tag counter-card__tag--expired">Expired</span>
          ) : expiresSoon ? (
            <span className="counter-card__tag counter-card__tag--expiring">
              <Clock size={12} style={{ marginRight: 2, verticalAlign: 'middle' }} />
              {expiresAt !== null ? formatShortDate(expiresAt) : ''}
            </span>
          ) : null}
          {isLow && !isDepleted && (
            <span className="counter-card__tag">
              <AlertTriangle size={12} style={{ marginRight: 2, verticalAlign: 'middle' }} />
              Low
            </span>
          )}
        </div>
        <div className="counter-card__count-row">
          <span
            className="counter-card__remaining"
            style={{ color: isDepleted ? 'var(--red)' : isLow ? 'var(--orange)' : undefined }}>
            {counter.remaining}
          </span>
          <span className="counter-card__total">/ {counter.total}</span>
        </div>
        <div className="counter-card__bar">
          <div
            className="counter-card__bar-fill"
            style={{
              width: `${Math.max(progress * 100, 2)}%`,
              backgroundColor: isDepleted ? 'var(--red)' : isLow ? 'var(--orange)' : counter.color,
            }}
          />
        </div>
        {expiresAt !== null && !isExpired && !expiresSoon && (
          <span className="counter-card__expires">
            Expires {formatShortDate(expiresAt)}
          </span>
        )}
      </div>
    </button>
  );
}
