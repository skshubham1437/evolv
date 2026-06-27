import { type ReactNode, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { createTask, request, syncManager } from '../../api';
import { Modal } from '../ui/Modal';

interface LayoutProps {
  children: ReactNode;
}

const mobileNavItems = [
  { to: '/',        icon: 'dashboard',            label: 'Home' },
  { to: '/habits',  icon: 'bolt',                 label: 'Habits' },
  { to: '/focus',   icon: 'self_improvement',     label: 'Focus' },
  { to: '/daily',   icon: 'format_list_bulleted', label: 'Tasks' },
];

export function Layout({ children }: LayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('evolv_sidebar_expanded');
      return saved !== null ? saved === 'true' : true; // Default: expanded
    } catch { return true; }
  });
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  
  // Quick Capture form state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [quickDate, setQuickDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Offline and synchronization state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  // Keydown listener for global quick capture (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setQuickCaptureOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Monitor online/offline states and trigger synchronization
  useEffect(() => {
    const syncOfflineChanges = async () => {
      const pending = await syncManager.hasPending();
      if (!pending) return;

      showToast('Connection restored. Syncing offline changes...', 'info');
      setSyncing(true);
      try {
        const result = await syncManager.processQueue(async (req) => {
          return request(req.url, {
            method: req.method,
            body: req.body ? JSON.stringify(req.body) : undefined,
            headers: req.headers,
          });
        });
        
        if (result.success > 0) {
          showToast(`Synchronized ${result.success} offline operations successfully!`, 'success');
          // Notify the active page to reload data (e.g. dashboard, tasks, habits)
          window.dispatchEvent(new CustomEvent('offline-sync-complete'));
          window.dispatchEvent(new CustomEvent('task-added-globally'));
        }
        if (result.failed > 0) {
          showToast(`Failed to sync ${result.failed} actions. Will retry later.`, 'error');
        }
      } catch (err) {
        console.error('Offline synchronization failed:', err);
        showToast('Offline sync failed.', 'error');
      } finally {
        setSyncing(false);
      }
    };

    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineChanges();
    };

    const handleOffline = () => {
      setIsOffline(true);
      showToast('Network disconnected. Entering offline execution mode.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Run initial sync on mount if online
    if (navigator.onLine) {
      syncOfflineChanges();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Persist sidebar state
  const handleSidebarToggle = () => {
    setSidebarExpanded(prev => {
      const next = !prev;
      try { localStorage.setItem('evolv_sidebar_expanded', String(next)); } catch {}
      return next;
    });
  };

  // Cursor tracking for ambient background
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    setSubmitting(true);
    try {
      let parsedTitle = quickTitle.trim();
      let parsedDueDate = quickDate || undefined;

      const today = new Date();
      const format = (d: Date) => d.toISOString().split('T')[0];

      if (parsedTitle.toLowerCase().endsWith(' today')) {
        parsedTitle = parsedTitle.substring(0, parsedTitle.length - 6).trim();
        parsedDueDate = format(today);
      } else if (parsedTitle.toLowerCase().endsWith(' tomorrow')) {
        parsedTitle = parsedTitle.substring(0, parsedTitle.length - 9).trim();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        parsedDueDate = format(tomorrow);
      }

      await createTask(parsedTitle, quickPriority, null, null, '', '', parsedDueDate);
      
      showToast('Task added to your queue!', 'success');
      setQuickTitle('');
      setQuickDate('');
      setQuickCaptureOpen(false);

      // Notify the active page to reload if it's dashboard or tasks
      if (window.location.pathname === '/' || window.location.pathname === '/daily') {
        window.dispatchEvent(new CustomEvent('task-added-globally'));
      }
    } catch (err) {
      console.error('Quick capture failed:', err);
      showToast('Failed to add task.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-[var(--color-on-surface)] font-body-md h-screen overflow-hidden flex flex-col md:flex-row relative bg-[var(--color-background)] transition-colors duration-300">
      
      {/* ── Dynamic Ambient Background ─────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Cursor-following orb */}
        <div 
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[120px] transition-transform duration-1000 ease-out opacity-25 mix-blend-screen"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 30%, transparent) 0%, color-mix(in srgb, var(--color-secondary) 8%, transparent) 60%, transparent 80%)',
            left: `${mousePos.x}%`,
            top: `${mousePos.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
        {/* Noise overlay */}
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
      </div>

      <Sidebar expanded={sidebarExpanded} onToggle={handleSidebarToggle} />

      {/* Main Content Area */}
      <main className={`flex-1 w-full flex flex-col h-screen overflow-hidden transition-[margin] duration-300 ease-in-out relative z-10 ${sidebarExpanded ? 'md:ml-60' : 'md:ml-14'}`}>
        
        {/* Offline Status & Sync Banners */}
        {isOffline && (
          <div className="bg-[oklch(0.68_0.19_48.1)]/15 border-b border-[oklch(0.68_0.19_48.1)] text-[oklch(0.68_0.19_48.1)] font-mono text-[10px] py-1.5 px-4 uppercase tracking-[0.14em] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[oklch(0.68_0.19_48.1)] rounded-full animate-pulse" />
              <span>Offline Mode — Actions are queued locally</span>
            </div>
            <span>[Cached Engine]</span>
          </div>
        )}
        {syncing && (
          <div className="bg-[var(--color-primary)]/15 border-b border-[var(--color-primary)] text-[var(--color-primary)] font-mono text-[10px] py-1.5 px-4 uppercase tracking-[0.14em] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-ping" />
              <span>Synchronizing local changes with core...</span>
            </div>
          </div>
        )}

        {/* ── Desktop Command Bar ───────────────────────── */}
        <header className="hidden md:flex items-center h-14 px-6 border-b border-[var(--glass-border)] bg-[var(--color-surface)]/20 backdrop-blur-3xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] shrink-0 gap-4">

          {/* Search / Command Palette Trigger */}
          <button 
            onClick={() => setQuickCaptureOpen(true)}
            className="group flex items-center gap-3 flex-1 max-w-md h-9 px-4 rounded-full glass-card hover:border-[var(--color-primary)]/40 hover:shadow-[0_0_15px_rgba(210,187,255,0.1)] transition-all cursor-text"
          >
            <span className="material-symbols-outlined text-[16px] text-[var(--color-outline)] group-hover:text-[var(--color-primary)] transition-colors">search</span>
            <span className="text-xs font-medium tracking-wide flex-1 text-left text-[var(--color-outline)] group-hover:text-[var(--color-on-surface-variant)] transition-colors">Quick capture or search...</span>
            <span className="text-[10px] font-mono font-medium text-[var(--color-outline)] border border-[var(--glass-border)] bg-[var(--color-surface)]/30 px-2 py-0.5 rounded-full">⌘K</span>
          </button>

          <div className="flex-1" />

          {/* Right side actions */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <button
            aria-label="Notifications"
            className="w-8 h-8 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] transition-colors relative"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">notifications</span>
          </button>
        </header>

        {/* ── Mobile Top Bar ──────────────────────────── */}
        <header className="md:hidden bg-[var(--color-surface)]/20 backdrop-blur-3xl border-b border-[var(--glass-border)] sticky top-0 z-50 px-4 py-3 flex justify-between items-center shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
          <span className="font-mono text-xs font-bold text-[var(--color-primary)] tracking-widest uppercase">
            Evolv
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setQuickCaptureOpen(true)}
              aria-label="Quick capture a task"
              title="Quick Capture"
              className="w-11 h-11 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>
            </button>

            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="w-11 h-11 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <button
              aria-label="Notifications"
              className="w-11 h-11 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] transition-colors relative"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">notifications</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden flex flex-col pb-16 md:pb-0">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Navigation ─────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 w-full z-50
          bg-[var(--color-surface)]/40 backdrop-blur-3xl border-t border-[var(--glass-border)]
          px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),6px)]
          flex justify-around items-center shadow-[0_-4px_30px_rgba(0,0,0,0.1)]"
        aria-label="Mobile navigation"
      >
        {mobileNavItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `
              flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[48px] transition-colors duration-150 relative
              ${isActive && !moreOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)]'}
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && !moreOpen && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[var(--color-primary)] rounded-full glow-shadow-primary" />
                )}
                <span
                  className="material-symbols-outlined text-[22px] transition-all duration-300"
                  style={{
                    fontVariationSettings: isActive && !moreOpen ? "'FILL' 1" : "'FILL' 0",
                    transform: isActive && !moreOpen ? 'scale(1.15) translateY(-2px)' : 'scale(1)',
                    textShadow: isActive && !moreOpen ? '0 0 12px rgba(210,187,255,0.4)' : 'none'
                  }}
                >
                  {icon}
                </span>
                <span className={`font-mono text-[9px] uppercase tracking-wider leading-none mt-1 transition-all duration-300 ${isActive && !moreOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)]'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* More Button */}
        <button
          onClick={() => setMoreOpen(prev => !prev)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[48px] transition-colors duration-150 relative
            ${moreOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)]'}
          `}
          aria-label="More navigation options"
          aria-expanded={moreOpen}
        >
          {moreOpen && (
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[var(--color-primary)] rounded-full" style={{ boxShadow: '0 0 8px rgba(210,187,255,0.6)' }} />
          )}
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: moreOpen ? "'FILL' 1" : "'FILL' 0" }}>
            more_horiz
          </span>
          <span className={`text-[10px] font-medium tracking-wide leading-none ${moreOpen ? 'text-[var(--color-primary)]' : ''}`}>
            More
          </span>
        </button>
      </nav>

      {/* ── Mobile FAB (Quick Capture) ─────────────────── */}
      <div className="md:hidden fixed z-[49]" style={{ bottom: 'calc(max(env(safe-area-inset-bottom), 6px) + 56px + 12px)', left: '50%', transform: 'translateX(-50%)' }}>
        <button
          onClick={() => setQuickCaptureOpen(true)}
          aria-label="Quick capture a task"
          className="fab"
        >
          <span className="material-symbols-outlined text-[22px]">add</span>
        </button>
      </div>

      {/* ── Mobile 'More' Drawer Overlay ── */}
      {moreOpen && (
        <div 
          onClick={() => setMoreOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-40"
        />
      )}

      {/* ── Mobile 'More' Drawer Bottom Sheet ── */}
      <div 
        className={`md:hidden fixed bottom-0 left-0 w-full bg-[var(--color-surface-container-low)] border-t border-[var(--color-outline-variant)] z-50 px-5 pt-4 pb-[max(env(safe-area-inset-bottom),16px)] transition-transform duration-200 transform ${
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="w-10 h-1.5 rounded-full bg-[var(--color-outline-variant)] mx-auto mb-4" />
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Navigate</h3>
          <button onClick={() => setMoreOpen(false)} className="w-7 h-7 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)]">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {[
            { to: '/journal',   icon: 'edit_note',            label: 'Journal' },
            { to: '/shutdown',  icon: 'power_settings_new',   label: 'Shutdown' },
            { to: '/weekly',    icon: 'date_range',           label: 'Weekly' },
            { to: '/monthly',   icon: 'calendar_today',       label: 'Monthly' },
            { to: '/quarterly', icon: 'grid_view',            label: 'Quarterly' },
            { to: '/goals',     icon: 'flag',                 label: 'Goals' },
            { to: '/vision',    icon: 'visibility',           label: 'Vision' },
            { to: '/analytics', icon: 'bar_chart',            label: 'Analytics' },
            { to: '/settings',  icon: 'settings',             label: 'Settings' },
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-2.5 px-3 py-2.5 border transition-colors duration-150
                ${isActive 
                  ? 'bg-[var(--color-primary)]/8 border-[var(--color-primary)]/30 text-[var(--color-primary)]' 
                  : 'bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'
                }
              `}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── Global Quick Capture Modal ────────────────────── */}
      <Modal open={quickCaptureOpen} onClose={() => { setQuickCaptureOpen(false); setQuickTitle(''); }} title="Quick Capture">
        <form onSubmit={handleQuickSubmit} className="space-y-6">
          <div>
            <label className="font-mono text-[10px] text-[var(--color-outline)] uppercase tracking-[0.14em] block mb-2">Task Title</label>
            <input
              required
              autoFocus={quickCaptureOpen}
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              placeholder='e.g. "Fix the login bug today"'
              className="w-full glass-card bg-[var(--color-surface)]/40 px-4 py-3 rounded-xl text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_15px_rgba(210,187,255,0.15)] transition-all placeholder:text-[var(--color-outline)] font-body-md text-[14px]"
            />
            <span className="font-mono text-[9px] text-[var(--color-outline)] block mt-2 tracking-widest text-center opacity-60">
              APPEND "TODAY" OR "TOMORROW" TO AUTO-SET DUE DATE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-[10px] text-[var(--color-outline)] uppercase tracking-[0.14em] block mb-2">Priority</label>
              <select
                value={quickPriority}
                onChange={e => setQuickPriority(e.target.value as any)}
                className="w-full glass-card bg-[var(--color-surface)]/40 px-3 py-3 rounded-xl text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_15px_rgba(210,187,255,0.15)] transition-all font-body-md text-[14px]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="font-mono text-[10px] text-[var(--color-outline)] uppercase tracking-[0.14em] block mb-2">Due Date</label>
              <input
                type="date"
                value={quickDate}
                onChange={e => setQuickDate(e.target.value)}
                className="w-full glass-card bg-[var(--color-surface)]/40 px-3 py-3 rounded-xl text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_15px_rgba(210,187,255,0.15)] transition-all font-body-md text-[14px]"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => { setQuickCaptureOpen(false); setQuickTitle(''); }} 
              className="flex-1 py-2.5 border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] font-mono text-[11px] uppercase tracking-wider hover:bg-[var(--color-surface-container-high)] transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="flex-1 py-2.5 bg-[var(--color-primary)] text-[var(--color-on-primary)] font-mono text-[11px] uppercase tracking-wider disabled:opacity-40 hover:opacity-90 transition-all"
            >
              {submitting ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
