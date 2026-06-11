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
      className={`hidden md:flex flex-col h-screen fixed left-0 top-0 bg-[var(--color-surface-container-low)] border-r border-[var(--color-outline-variant)] z-40 transition-[width] duration-300 ease-in-out ${expanded ? 'w-60' : 'w-14'}`}
    >

      {/* ── Brand mark ─────────────────────────────── */}
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        className={`group flex items-center h-14 border-b border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-high)] transition-colors relative cursor-pointer overflow-hidden shrink-0 ${expanded ? 'px-4 justify-between' : 'justify-center'}`}
      >
        {expanded ? (
           <>
             <span className="font-mono text-[16px] font-bold text-[var(--color-primary)] tracking-tight">
               EVOLV
             </span>
             <span className="material-symbols-outlined text-[20px] text-[var(--color-outline)] opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
               menu_open
             </span>
           </>
        ) : (
           <>
             <span className="font-mono text-[16px] font-bold text-[var(--color-primary)] tracking-tight group-hover:opacity-0 transition-opacity absolute" aria-hidden="true">
               E
             </span>
             <span className="material-symbols-outlined text-[20px] text-[var(--color-outline)] opacity-0 group-hover:opacity-100 transition-opacity absolute" aria-hidden="true">
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
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-outline)] px-5 py-1.5 block opacity-70">
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
                    flex items-center transition-all duration-150 relative
                    ${expanded ? 'px-3 py-2.5 rounded-sm mx-1' : 'justify-center w-10 h-10 mx-auto tooltip-wrapper'}
                    ${isActive
                      ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/8'
                      : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      {!expanded && isActive && (
                        <div className="absolute left-0 top-[20%] bottom-[20%] w-[2px] bg-[var(--color-primary)]" aria-hidden="true" />
                      )}
                      <span
                        className="material-symbols-outlined text-[20px] shrink-0"
                        style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                        aria-hidden="true"
                      >
                        {icon}
                      </span>
                      {expanded && (
                         <span className="font-mono text-[11px] uppercase tracking-wider ml-3 whitespace-nowrap opacity-100 transition-opacity duration-300">
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
          className={`flex items-center justify-center transition-colors text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] ${expanded ? 'w-full py-2 rounded-sm mr-1' : 'w-10 h-10 tooltip-wrapper'}`}
        >
          <span className="material-symbols-outlined text-[20px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
          {expanded && <span className="font-mono text-[11px] uppercase tracking-wider ml-2 whitespace-nowrap">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          {!expanded && <span className="tooltip-text" aria-hidden="true">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Settings / User */}
        <NavLink
          to="/settings"
          aria-label="Settings"
          className={({ isActive }) =>
            `flex items-center justify-center transition-colors ${expanded ? 'w-full py-2 rounded-sm ml-1' : 'w-10 h-10 tooltip-wrapper'} ${
              isActive ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/8' : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'
            }`
          }
        >
          <div className="w-7 h-7 flex items-center justify-center font-mono text-[10px] font-bold border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] shrink-0" aria-hidden="true">
            {getInitials(user?.name)}
          </div>
          {expanded && <span className="font-mono text-[11px] uppercase tracking-wider ml-2 whitespace-nowrap text-inherit">Settings</span>}
          {!expanded && <span className="tooltip-text" aria-hidden="true">Settings</span>}
        </NavLink>
      </div>
    </nav>
  );
}
