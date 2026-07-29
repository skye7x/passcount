'use client';

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  onCancel: () => void;
}

export function ActionSheet({ title, message, options, onCancel }: ActionSheetProps) {
  return (
    <div className="sheet-overlay">
      <div className="sheet-backdrop" onClick={onCancel} />
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet__handle" />
        {(title || message) && (
          <div className="sheet__header">
            {title && <p className="sheet__title">{title}</p>}
            {message && <p className="sheet__message">{message}</p>}
          </div>
        )}
        <div className="sheet__options">
          {options.map(opt => (
            <button
              key={opt.label}
              type="button"
              className={`sheet__option${opt.destructive ? ' sheet__option--destructive' : ''}`}
              onClick={() => opt.onPress()}>
              {opt.label}
            </button>
          ))}
        </div>
        <button type="button" className="sheet__cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
