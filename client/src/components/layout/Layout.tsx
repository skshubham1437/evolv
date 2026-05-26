import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useTheme } from '../../context/ThemeContext';

interface LayoutProps {
  children: ReactNode;
}

const mobileNavItems = [
  { to: '/',        icon: 'dashboard',            label: 'Home' },
  { to: '/habits',  icon: 'auto_awesome',         label: 'Habits' },
  { to: '/focus',   icon: 'self_improvement',     label: 'Focus' },
  { to: '/daily',   icon: 'format_list_bulleted', label: 'Tasks' },
  { to: '/journal', icon: 'psychology',           label: 'Journal' },
];

export function Layout({ children }: LayoutProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="text-[var(--color-on-surface)] font-body-md min-h-screen flex flex-col md:flex-row">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 w-full flex flex-col min-h-screen">

        {/* ── Mobile Top Bar ──────────────────────────── */}
        <header className="md:hidden bg-[var(--color-surface)]/85 backdrop-blur-xl sticky top-0 z-50 border-b border-[var(--color-outline-variant)]/10 px-5 py-3.5 flex justify-between items-center">
          <span
            className="font-display-lg text-[22px] font-bold text-[var(--color-primary)] tracking-tighter"
            style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic' }}
          >
            Evolv
          </span>

          <div className="flex items-center gap-2">
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
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-secondary)] rounded-full shadow-[0_0_6px_rgba(90,218,206,0.8)]" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 pb-20 md:pb-0">
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
              ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]/50 hover:text-[var(--color-on-surface-variant)]'}
            `}
          >
            {({ isActive }) => (
              <>
                <div className={`w-10 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-[var(--color-primary)]/12' : ''}`}>
                  <span
                    className="material-symbols-outlined text-[22px] transition-all"
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {icon}
                  </span>
                </div>
                <span className={`font-label-sm text-[10px] leading-none tracking-wide ${isActive ? 'font-bold' : 'font-medium opacity-70'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
