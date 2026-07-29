import { Plus } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
}

export function EmptyState({
  title = 'No counters yet',
  subtitle = 'Tap the + button to create your first pass counter',
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Plus size={28} strokeWidth={1.5} />
      </div>
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__subtitle">{subtitle}</p>
    </div>
  );
}
