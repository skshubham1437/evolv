import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = true,
}: ConfirmDialogProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] shadow-2xl"
        style={{ animation: 'modalSlideUp 150ms ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-outline-variant)]">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-on-surface-variant)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors w-7 h-7 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-[13px] text-[var(--color-on-surface-variant)] leading-relaxed mb-6 font-mono uppercase tracking-wide">
            {description}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] font-mono text-[10px] uppercase tracking-widest font-bold transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 py-2.5 font-mono text-[10px] uppercase tracking-widest font-bold transition-colors text-black ${
                destructive ? 'bg-[var(--color-error)] hover:brightness-110' : 'bg-[var(--color-primary)] hover:brightness-110'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
