'use client';

import { Plus } from 'lucide-react';

interface FabProps {
  onPress: () => void;
  ariaLabel?: string;
}

export function FloatingActionButton({ onPress, ariaLabel = 'Add' }: FabProps) {
  return (
    <button type="button" aria-label={ariaLabel} className="fab" onClick={onPress}>
      <Plus size={24} strokeWidth={2.5} />
    </button>
  );
}
