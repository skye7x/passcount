'use client';

import { SWATCH_COLORS } from '@/lib/types';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  selected: string;
  onSelect: (color: string) => void;
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <div className="color-picker">
      {SWATCH_COLORS.map(color => {
        const isSelected = color === selected;
        return (
          <button
            type="button"
            key={color}
            aria-label={`Select color ${color}`}
            onClick={() => onSelect(color)}
            className={`color-picker__swatch${isSelected ? ' color-picker__swatch--selected' : ''}`}
            style={{ backgroundColor: color }}>
            {isSelected && <Check size={16} className="color-picker__check" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
