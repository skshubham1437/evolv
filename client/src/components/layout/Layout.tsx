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
  { to: '/habits',  icon: 'auto_awesome',         label: 'Habits' },
  { to: '/focus',   icon: 'self_improvement',     label: 'Focus' },
  { to: '/daily',   icon: 'format_list_bulleted', label: 'Tasks' },
];

export function Layout({ children }: LayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  
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
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 w-full flex flex-col h-screen overflow-hidden">

        {/* ── Mobile Top Bar ──────────────────────────── */}
        <header className="md:hidden bg-[var(--color-surface)]/85 backdrop-blur-xl sticky top-0 z-50 border-b border-[var(--color-outline-variant)]/10 px-5 py-3.5 flex justify-between items-center">
          <span
            className="font-display-lg text-[22px] font-bold text-[var(--color-primary)] tracking-tighter"
            style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic' }}
          >
            Evolv
          </span>

          <div className="flex items-center gap-2">
            {/* Quick Capture trigger button for mobile */}
            <button
              onClick={() => setQuickCaptureOpen(true)}
              title="Quick Capture Task"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all press-scale"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all press-scale"
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            {/* Notification */}
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all relative press-scale">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden flex flex-col pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Navigation ─────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50
        bg-[var(--color-surface-container-lowest)]/95 backdrop-blur-2xl
        border-t border-[var(--color-outline-variant)]/15
        px-2 pt-2 pb-[max(env(safe-area-inset-bottom),8px)]
        flex justify-around items-center">
        {mobileNavItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `
              flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[52px]
              ${isActive && !moreOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]/50 hover:text-[var(--color-on-surface-variant)]'}
            `}
          >
            {({ isActive }) => (
              <>
                <div className={`w-10 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${isActive && !moreOpen ? 'bg-[var(--color-primary)]/12' : ''}`}>
                  <span
                    className="material-symbols-outlined text-[22px] transition-all"
                    style={{ fontVariationSettings: isActive && !moreOpen ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {icon}
                  </span>
                </div>
                <span className={`font-label-sm text-[10px] leading-none tracking-wide ${isActive && !moreOpen ? 'font-bold' : 'font-medium opacity-70'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* More Button */}
        <button
          onClick={() => setMoreOpen(prev => !prev)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[52px]
            ${moreOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]/50 hover:text-[var(--color-on-surface-variant)]'}
          `}
        >
          <div className={`w-10 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${moreOpen ? 'bg-[var(--color-primary)]/12' : ''}`}>
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: moreOpen ? "'FILL' 1" : "'FILL' 0" }}>
              more_horiz
            </span>
          </div>
          <span className={`font-label-sm text-[10px] leading-none tracking-wide ${moreOpen ? 'font-bold' : 'font-medium opacity-70'}`}>
            More
          </span>
        </button>
      </nav>

      {/* ── Mobile 'More' Drawer Overlay ── */}
      {moreOpen && (
        <div 
          onClick={() => setMoreOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        />
      )}

      {/* ── Mobile 'More' Drawer Bottom Sheet ── */}
      <div 
        className={`md:hidden fixed bottom-0 left-0 w-full bg-[var(--color-surface-container-low)] border-t border-[var(--color-outline-variant)]/20 rounded-t-3xl z-50 px-6 pt-5 pb-[max(env(safe-area-inset-bottom),20px)] transition-transform duration-300 transform ${
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ boxShadow: '0 -10px 30px rgba(0,0,0,0.3)' }}
      >
        <div className="w-12 h-1 bg-[var(--color-outline-variant)]/40 rounded-full mx-auto mb-5" />
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-title-md text-title-md text-[var(--color-on-surface)]">Explore Evolv</h3>
          <button onClick={() => setMoreOpen(false)} className="w-8 h-8 rounded-full bg-[var(--color-surface-variant)]/50 flex items-center justify-center text-[var(--color-on-surface-variant)]">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { to: '/journal',   icon: 'psychology',           label: 'Journal' },
            { to: '/shutdown',  icon: 'power_settings_new',   label: 'EOD Shutdown' },
            { to: '/weekly',    icon: 'calendar_month',        label: 'Weekly Plan' },
            { to: '/monthly',   icon: 'calendar_today',        label: 'Monthly Plan' },
            { to: '/quarterly', icon: 'view_kanban',           label: 'Quarterly' },
            { to: '/goals',     icon: 'rocket_launch',         label: 'Goals (OKR)' },
            { to: '/vision',    icon: 'visibility',            label: 'Vision Board' },
            { to: '/analytics', icon: 'analytics',             label: 'Analytics' },
            { to: '/settings',  icon: 'settings',              label: 'Settings' },
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200
                ${isActive 
                  ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)] font-bold' 
                  : 'bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]/10 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)]/20'
                }
              `}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-label-sm text-[12px] tracking-wide">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── Global Quick Capture Modal ────────────────────── */}
      <Modal open={quickCaptureOpen} onClose={() => { setQuickCaptureOpen(false); setQuickTitle(''); }} title="Global Quick Capture (Cmd+K)">
        <form onSubmit={handleQuickSubmit} className="space-y-4">
          <div>
            <label className="font-label-sm text-[11px] text-[var(--color-on-surface-variant)] uppercase tracking-widest block mb-2">Task Title</label>
            <input
              required
              autoFocus={quickCaptureOpen}
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              placeholder="e.g. Call client tomorrow, or finish proposal today"
              className="w-full bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/40 rounded-xl px-4 py-3 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-outline)]"
            />
            <span className="text-[10px] text-[var(--color-outline)] block mt-1.5 italic">
              Pro-tip: append "today" or "tomorrow" to auto-parse the due date!
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-sm text-[11px] text-[var(--color-on-surface-variant)] uppercase tracking-widest block mb-2">Priority</label>
              <select
                value={quickPriority}
                onChange={e => setQuickPriority(e.target.value as any)}
                className="w-full bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/40 rounded-xl px-4 py-3 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="font-label-sm text-[11px] text-[var(--color-on-surface-variant)] uppercase tracking-widest block mb-2">Due Date</label>
              <input
                type="date"
                value={quickDate}
                onChange={e => setQuickDate(e.target.value)}
                className="w-full bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/40 rounded-xl px-4 py-3 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => { setQuickCaptureOpen(false); setQuickTitle(''); }} 
              className="flex-1 py-3 rounded-xl border border-[var(--color-outline-variant)]/40 text-[var(--color-on-surface-variant)] font-label-sm text-label-sm hover:border-[var(--color-outline-variant)] transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] font-label-sm text-label-sm shadow-[0_0_15px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] hover:shadow-[0_0_25px_color-mix(in_srgb,var(--color-primary)_50%,transparent)] transition-all flex items-center justify-center gap-1.5"
            >
              {submitting ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
