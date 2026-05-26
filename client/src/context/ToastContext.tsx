import { createContext, useContext, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const getBorderColor = (type: ToastType) => {
    if (type === 'success') return 'border-l-4 border-l-[var(--color-secondary)]';
    if (type === 'error') return 'border-l-4 border-l-[var(--color-error)]';
    return 'border-l-4 border-l-[var(--color-primary)]';
  };

  const getIcon = (type: ToastType) => {
    if (type === 'success') return 'check_circle';
    if (type === 'error') return 'error';
    return 'info';
  };

  const getIconColor = (type: ToastType) => {
    if (type === 'success') return 'text-[var(--color-secondary)]';
    if (type === 'error') return 'text-[var(--color-error)]';
    return 'text-[var(--color-primary)]';
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-80 max-w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              flex items-center gap-3 p-4 rounded-xl shadow-lg backdrop-blur-xl pointer-events-auto
              bg-[var(--color-surface-container-low)]/90 border border-[var(--color-outline-variant)]/10
              ${getBorderColor(t.type)}
              animate-[toastSlideIn_250ms_cubic-bezier(0.34,1.56,0.64,1)_forwards]
            `}
            style={{ animation: 'toastSlideIn 250ms cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            <span className={`material-symbols-outlined text-[20px] ${getIconColor(t.type)}`}>
              {getIcon(t.type)}
            </span>
            <p className="font-body-md text-sm text-[var(--color-on-surface)] flex-1">{t.message}</p>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(20px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
