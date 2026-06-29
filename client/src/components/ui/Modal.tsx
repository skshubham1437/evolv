import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`w-full ${width} bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-t-2xl sm:rounded-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden`}
        style={{ animation: 'modalSlideUp 200ms ease' }}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-outline-variant)] shrink-0 bg-white/[0.01]">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-on-surface-variant)]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors w-7 h-7 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">{children}</div>
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
