'use client';

import { Plus } from 'lucide-react';

interface FabProps {
  onPress: () => void;
}

export function FloatingActionButton({ onPress }: FabProps) {
  return (
    <button
      type="button"
      aria-label="Add counter"
      className="fab"
      onClick={onPress}>
      <Plus size={24} strokeWidth={2.5} />
    </button>
  );
}
