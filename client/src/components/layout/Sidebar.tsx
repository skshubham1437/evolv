import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const navGroups = [
  {
    label: 'PLAN',
    items: [
      { to: '/',          icon: 'dashboard',             label: 'Dashboard' },
      { to: '/vision',    icon: 'visibility',            label: 'Vision Board' },
      { to: '/goals',     icon: 'flag',                  label: 'Goals' },
      { to: '/quarterly', icon: 'grid_view',             label: 'Quarterly' },
      { to: '/monthly',   icon: 'calendar_today',        label: 'Monthly' },
    ]
  },
  {
    label: 'EXECUTE',
    items: [
      { to: '/daily',     icon: 'format_list_bulleted',  label: 'Task Queue' },
      { to: '/habits',    icon: 'bolt',                  label: 'Habits' },
      { to: '/weekly',    icon: 'date_range',            label: 'Weekly' },
    ]
  },
  {
    label: 'REFLECT',
    items: [
      { to: '/journal',   icon: 'edit_note',             label: 'Journal' },
      { to: '/analytics', icon: 'bar_chart',             label: 'Analytics' },
      { to: '/shutdown',  icon: 'power_settings_new',    label: 'Shutdown' },
    ]
  }
];

interface SidebarProps {
  expanded?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ expanded = false, onToggle }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <nav
      aria-label="Main navigation"
      className={`hidden md:flex flex-col h-screen fixed left-0 top-0 bg-[var(--color-surface)]/10 backdrop-blur-3xl border-r border-[var(--glass-border)] z-40 transition-[width] duration-300 ease-in-out shadow-[4px_0_30px_rgba(0,0,0,0.1)] ${expanded ? 'w-60' : 'w-14'}`}
    >

      {/* ── Brand mark ─────────────────────────────── */}
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        className={`group flex items-center h-14 border-b border-[var(--color-outline-variant)] hover:bg-white/[0.02] transition-colors relative cursor-pointer overflow-hidden shrink-0 active:scale-[0.98] ${expanded ? 'px-4 justify-between' : 'justify-center'}`}
      >
        {expanded ? (
          <>
            <span className="font-title-md text-xl font-bold text-[var(--color-primary)] tracking-tight select-none">
              Evolv
            </span>
            <span className="material-symbols-outlined text-[20px] text-[var(--color-outline)] opacity-0 group-hover:opacity-100 transition-all duration-300 transform rotate-180" aria-hidden="true">
              menu_open
            </span>
          </>
        ) : (
          <>
            <span className="font-title-md text-xl font-bold text-[var(--color-primary)] tracking-tight group-hover:opacity-0 transition-opacity absolute select-none" aria-hidden="true">
              E
            </span>
            <span className="material-symbols-outlined text-[20px] text-[var(--color-outline)] opacity-0 group-hover:opacity-100 transition-all duration-300 transform rotate-0 absolute" aria-hidden="true">
              menu
            </span>
          </>
        )}
      </button>

      {/* ── Nav items ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col py-2 overflow-y-auto no-scrollbar overflow-x-hidden">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && (
              <div className="mx-3 my-1 border-t border-[var(--color-outline-variant)]" />
            )}
            {/* Group label — only visible when sidebar expanded */}
            {expanded && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-outline)] px-5 py-2 block">
                {group.label}
              </span>
            )}
            <div className="flex flex-col gap-0.5 px-2">
              {group.items.map(({ to, icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  aria-label={label}
                  className={({ isActive }) => `
                    flex items-center transition-all duration-300 relative group/nav active:scale-[0.97]
                    ${expanded ? 'px-3 py-2.5 rounded-xl mx-2 mb-1' : 'justify-center w-11 h-11 mx-auto rounded-xl mb-1 tooltip-wrapper'}
                    ${isActive
                      ? 'text-[var(--color-primary)] bg-gradient-to-r from-[var(--color-primary)]/10 to-transparent bg-[length:200%_100%] animate-[bg-shift_3s_ease-in-out_infinite]'
                      : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]/50'
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-[var(--color-primary)] rounded-r-full glow-shadow-primary" aria-hidden="true" />
                      )}
                      <span
                        className="material-symbols-outlined text-[20px] shrink-0 transition-transform duration-300 group-hover/nav:scale-110 group-active/nav:scale-95"
                        style={{ 
                          fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                          textShadow: isActive ? '0 0 12px rgba(210,187,255,0.5)' : 'none'
                        }}
                        aria-hidden="true"
                      >
                        {icon}
                      </span>
                      {expanded && (
                         <span className="text-sm font-medium ml-3 whitespace-nowrap opacity-100 transition-opacity duration-300">
                           {label}
                         </span>
                      )}
                      {!expanded && <span className="tooltip-text" aria-hidden="true">{label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom actions ───────────────────────── */}
      <div className={`flex border-t border-[var(--color-outline-variant)] py-2 ${expanded ? 'items-center px-4 justify-between flex-row' : 'flex-col items-center gap-0.5 px-2'}`}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`flex items-center justify-center transition-colors text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]/50 ${expanded ? 'w-full py-2.5 rounded-xl mr-1' : 'w-11 h-11 rounded-xl tooltip-wrapper'}`}
        >
          <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
          {expanded && <span className="text-sm font-medium ml-2 whitespace-nowrap">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          {!expanded && <span className="tooltip-text" aria-hidden="true">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Settings / User */}
        <NavLink
          to="/settings"
          aria-label="Settings"
          className={({ isActive }) =>
            `flex items-center justify-center transition-colors ${expanded ? 'w-full py-2.5 rounded-xl ml-1' : 'w-11 h-11 rounded-xl tooltip-wrapper'} ${
              isActive 
                ? 'text-[var(--color-primary)] bg-gradient-to-r from-[var(--color-primary)]/10 to-transparent shadow-[inset_2px_0_0_var(--color-primary)]' 
                : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]/50'
            }`
          }
        >
          <div className="w-7 h-7 flex items-center justify-center text-xs font-semibold rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] shrink-0 shadow-sm" aria-hidden="true">
            {getInitials(user?.name)}
          </div>
          {expanded && <span className="text-sm font-medium ml-2 whitespace-nowrap text-inherit">Settings</span>}
          {!expanded && <span className="tooltip-text" aria-hidden="true">Settings</span>}
        </NavLink>
      </div>
    </nav>
  );
}
