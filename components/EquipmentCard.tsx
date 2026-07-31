'use client';

import { useRef, useState } from 'react';
import { EquipmentList } from '@/lib/types';
import { Package, Check } from 'lucide-react';

interface EquipmentCardProps {
  list: EquipmentList;
  onTap: () => void;
  onLongPress: () => void;
}

const LONG_PRESS_MS = 500;

export function EquipmentCard({ list, onTap, onLongPress }: EquipmentCardProps) {
  const [pressed, setPressed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedLongPress = useRef(false);

  const packedCount = list.items.filter(item => item.packed).length;
  const total = list.items.length;
  const progress = total > 0 ? packedCount / total : 0;

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
      className="equipment-card"
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
        className="equipment-card__icon"
        style={{ backgroundColor: list.packed ? '#2c2c2e' : list.color }}>
        {list.packed ? (
          <Check size={20} strokeWidth={2.5} style={{ color: '#8e8e93' }} />
        ) : (
          <Package size={20} strokeWidth={1.5} style={{ color: '#fff' }} />
        )}
      </div>
      <div className="equipment-card__body">
        <div className="equipment-card__top-row">
          <span className="equipment-card__name">{list.name}</span>
          {list.packed && <span className="equipment-card__tag">Packed</span>}
        </div>
        <p className="equipment-card__meta">
          {packedCount}/{total} packed
        </p>
        <div className="equipment-card__bar">
          <div
            className="equipment-card__bar-fill"
            style={{
              width: `${Math.max(progress * 100, 2)}%`,
              backgroundColor: list.packed ? 'var(--green)' : list.color,
            }}
          />
        </div>
      </div>
    </button>
  );
}
