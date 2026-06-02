import { type ReactNode, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { createTask } from '../../api';
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
  
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  
  // Quick Capture form state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [quickDate, setQuickDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    <div className="text-[var(--color-on-surface)] font-body-md h-screen overflow-hidden flex flex-col md:flex-row relative">
      <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />

      {/* Main Content Area */}
      <main className={`flex-1 w-full flex flex-col h-screen overflow-hidden transition-[margin] duration-300 ease-in-out ${sidebarExpanded ? 'md:ml-60' : 'md:ml-14'}`}>

        {/* ── Desktop Command Bar ───────────────────────── */}
        <header className="hidden md:flex items-center h-12 px-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] shrink-0 gap-3">
          {/* Search / Command Palette Trigger */}
          <button 
            onClick={() => setQuickCaptureOpen(true)}
            className="flex items-center gap-2 flex-1 max-w-md h-8 px-3 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-outline)] hover:border-[var(--color-on-surface-variant)] transition-colors cursor-text"
          >
            <span className="material-symbols-outlined text-[16px]">search</span>
            <span className="font-mono text-[11px] tracking-wide flex-1 text-left">Quick capture or search...</span>
            <span className="font-mono text-[10px] text-[var(--color-outline)] border border-[var(--color-outline-variant)] px-1.5 py-0.5 leading-none">⌘K</span>
          </button>

          <div className="flex-1" />

          {/* Right side actions */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] transition-colors"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <button className="w-8 h-8 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] transition-colors relative">
            <span className="material-symbols-outlined text-[18px]">notifications</span>
          </button>
        </header>

        {/* ── Mobile Top Bar ──────────────────────────── */}
        <header className="md:hidden bg-[var(--color-surface-container-low)] border-b border-[var(--color-outline-variant)] sticky top-0 z-50 px-4 py-3 flex justify-between items-center shrink-0">
          <span className="font-mono text-[16px] font-bold text-[var(--color-primary)] tracking-tight">
            EVOLV
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setQuickCaptureOpen(true)}
              title="Quick Capture"
              className="w-9 h-9 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>

            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="w-9 h-9 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <button className="w-9 h-9 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] transition-colors relative">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden flex flex-col pb-16 md:pb-0">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Navigation ─────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50
        bg-[var(--color-surface-container-lowest)] border-t border-[var(--color-outline-variant)]
        px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),6px)]
        flex justify-around items-center">
        {mobileNavItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `
              flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[48px] transition-colors duration-150
              ${isActive && !moreOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)]'}
            `}
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{ fontVariationSettings: isActive && !moreOpen ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {icon}
                </span>
                <span className={`font-mono text-[9px] uppercase tracking-wider leading-none ${isActive && !moreOpen ? 'font-bold text-[var(--color-primary)]' : 'text-[var(--color-outline)]'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* More Button */}
        <button
          onClick={() => setMoreOpen(prev => !prev)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[48px] transition-colors duration-150
            ${moreOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)]'}
          `}
        >
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: moreOpen ? "'FILL' 1" : "'FILL' 0" }}>
            more_horiz
          </span>
          <span className={`font-mono text-[9px] uppercase tracking-wider leading-none ${moreOpen ? 'font-bold' : ''}`}>
            More
          </span>
        </button>
      </nav>

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
        <div className="w-10 h-0.5 bg-[var(--color-outline-variant)] mx-auto mb-4" />
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-on-surface-variant)]">Navigate</h3>
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
              <span className="font-mono text-[10px] uppercase tracking-wider">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── Global Quick Capture Modal ────────────────────── */}
      <Modal open={quickCaptureOpen} onClose={() => { setQuickCaptureOpen(false); setQuickTitle(''); }} title="Quick Capture">
        <form onSubmit={handleQuickSubmit} className="space-y-4">
          <div>
            <label className="font-mono text-[10px] text-[var(--color-outline)] uppercase tracking-[0.14em] block mb-2">Task Title</label>
            <input
              required
              autoFocus={quickCaptureOpen}
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              placeholder='e.g. "Fix the login bug today"'
              className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] px-3 py-2.5 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-outline)] font-body-md text-[14px]"
            />
            <span className="font-mono text-[9px] text-[var(--color-outline)] block mt-1.5 tracking-wide">
              APPEND "TODAY" OR "TOMORROW" TO AUTO-SET DUE DATE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-[var(--color-outline)] uppercase tracking-[0.14em] block mb-2">Priority</label>
              <select
                value={quickPriority}
                onChange={e => setQuickPriority(e.target.value as any)}
                className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] px-3 py-2.5 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors font-body-md text-[14px]"
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
                className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] px-3 py-2.5 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors font-body-md text-[14px]"
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
