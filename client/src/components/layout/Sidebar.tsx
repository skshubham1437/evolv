import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/',           icon: 'dashboard',             label: 'Dashboard' },
  { to: '/habits',     icon: 'auto_awesome',          label: 'Habit Engine' },
  { to: '/vision',     icon: 'visibility',            label: 'Vision' },
  { to: '/goals',      icon: 'rocket_launch',         label: 'Goals' },
  { to: '/quarterly',  icon: 'view_kanban',           label: 'Quarterly' },
  { to: '/monthly',    icon: 'calendar_today',        label: 'Monthly' },
  { to: '/weekly',     icon: 'calendar_month',        label: 'Planner' },
  { to: '/journal',    icon: 'psychology',            label: 'Journal' },
  { to: '/daily',      icon: 'format_list_bulleted',  label: 'Tasks' },
  { to: '/analytics',  icon: 'analytics',             label: 'Analytics' },
];

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <nav className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-[var(--color-surface-container-low)]/80 backdrop-blur-2xl border-r border-[var(--color-outline-variant)]/10 z-40">

      {/* ── Brand header ─────────────────────────────── */}
      <div className="px-6 pt-7 pb-5 flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-display-lg text-[26px] text-[var(--color-primary)] tracking-tighter leading-none">
            Evolv
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)] animate-pulse shadow-[0_0_6px_rgba(90,218,206,0.8)]" />
            <p className="font-label-sm text-[9px] text-[var(--color-on-surface-variant)] uppercase tracking-[0.25em] opacity-50">
              System Online
            </p>
          </div>
        </div>

        {/* Theme toggle — icon only, top-right of brand */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all duration-200 press-scale mt-0.5"
        >
          <span
            className="material-symbols-outlined text-[20px] transition-transform duration-300"
            style={{ fontVariationSettings: "'FILL' 1", transform: theme === 'dark' ? 'rotate(0deg)' : 'rotate(180deg)' }}
          >
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>

      {/* ── Nav items ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-0.5 px-3 overflow-y-auto no-scrollbar">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `
              flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group press-scale relative overflow-hidden
              ${isActive
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'text-[var(--color-on-surface-variant)]/60 hover:bg-[var(--color-surface-variant)]/20 hover:text-[var(--color-on-surface)] hover:translate-x-0.5'
              }
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-[22%] bottom-[22%] w-[3px] bg-[var(--color-primary)] rounded-r-full shadow-[0_0_10px_rgba(210,187,255,0.9)]" />
                )}
                <span
                  className={`material-symbols-outlined text-[21px] transition-all duration-200 shrink-0 ${isActive ? '' : 'group-hover:text-[var(--color-primary)]'}`}
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {icon}
                </span>
                <span className={`font-label-sm text-[13px] tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* ── User profile footer ───────────────────────── */}
      <div className="px-4 py-4 border-t border-[var(--color-outline-variant)]/10">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group press-scale w-full ${
              isActive ? 'bg-[var(--color-primary)]/8 text-[var(--color-primary)]' : 'hover:bg-[var(--color-surface-variant)]/20'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 transition-all ${isActive ? 'border-[var(--color-primary)]' : 'border-[var(--color-outline-variant)]/30 group-hover:border-[var(--color-primary)]/50'}`}>
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFRESvWmL07H3BCrn86q8If8pHfMpmrmz9EGoUy8r0yujHOLn3Q3szEJ6j3QS0dPGkkkTjiUMcuFpvYiW2qSjqN-4NTH5ff20iiLoin9Uz-lQUifHxQ4747m_FBzbwXrSuKdXXiNoUcRdc-nWn8ssyxNqGyET4VAOHtqN3gK4F52B-c9CNl5eGUrAVw2tPs00tdwTJOdwQLyuHw9P0nL_83vRnU4tuBrgGuIE-yxtyfAWQE80jtZdaa-9mCo2J9svzcapWaFRAPuUa"
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-label-sm text-[13px] font-semibold truncate ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface)]'}`}>
                  {user?.name || 'Builder'}
                </p>
                <p className="font-label-sm text-[10px] text-[var(--color-outline)] truncate">Settings</p>
              </div>
              <span className={`material-symbols-outlined text-[18px] shrink-0 transition-colors ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)] group-hover:text-[var(--color-on-surface)]'}`}>
                chevron_right
              </span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
