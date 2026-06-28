/**
 * PreferencesContext
 * Parses the user's stored `preferences` JSON and exposes typed flags
 * app-wide. Settings changes call `applyPreferences` to update CSS vars
 * and persist them to the database via PATCH /api/me.
 *
 * Design contract:
 *  - All flags default to `true` (feature ON) so first-time users see the
 *    full experience without needing to open Settings first.
 *  - Only UI-controllable flags live here; backend-only fields (push_enabled,
 *    weekly_digest_enabled) remain on the AuthContext user object.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserPreferences {
  // Interface visual preferences
  ambientOrbs: boolean;
  pageTransitions: boolean;
  habitGlows: boolean;
  timerTick: boolean;
  waveforms: boolean;

  // Accent color (one of the 4 palette swatches)
  accentColor: string;

  // Local / regional
  timezone: string;
  weekStartsOn: 'monday' | 'sunday';
}

export const DEFAULT_PREFS: UserPreferences = {
  ambientOrbs: true,
  pageTransitions: true,
  habitGlows: true,
  timerTick: true,
  waveforms: true,
  accentColor: '#d2bbff',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  weekStartsOn: 'monday',
};

interface PreferencesContextType {
  prefs: UserPreferences;
  setPrefs: (next: Partial<UserPreferences>) => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const PreferencesContext = createContext<PreferencesContextType | null>(null);

// ── CSS side-effects ─────────────────────────────────────────────────────────

const ACCENT_MAP: Record<string, { primary: string; glow: string }> = {
  '#d2bbff': { primary: '#d2bbff', glow: 'rgba(210,187,255,0.2)' },
  '#5adace': { primary: '#5adace', glow: 'rgba(90,218,206,0.18)' },
  '#f4a261': { primary: '#f4a261', glow: 'rgba(244,162,97,0.2)' },
  '#e76f51': { primary: '#e76f51', glow: 'rgba(231,111,81,0.2)' },
};

function applyToDom(p: UserPreferences) {
  const root = document.documentElement;

  // Ambient background orbs
  if (p.ambientOrbs) {
    root.classList.remove('no-ambient-orbs');
  } else {
    root.classList.add('no-ambient-orbs');
  }

  // Page transitions
  if (p.pageTransitions) {
    root.classList.remove('no-page-transitions');
  } else {
    root.classList.add('no-page-transitions');
  }

  // Habit glow animations
  if (p.habitGlows) {
    root.classList.remove('no-habit-glows');
  } else {
    root.classList.add('no-habit-glows');
  }

  // Timer breathing animation
  if (p.timerTick) {
    root.classList.remove('no-timer-tick');
  } else {
    root.classList.add('no-timer-tick');
  }

  // Soundwave visualiser
  if (p.waveforms) {
    root.classList.remove('no-waveforms');
  } else {
    root.classList.add('no-waveforms');
  }

  // Accent color
  const accent = ACCENT_MAP[p.accentColor] ?? ACCENT_MAP['#d2bbff'];
  root.style.setProperty('--color-primary', accent.primary);
  root.style.setProperty('--color-primary-fixed-dim', accent.primary);
  root.style.setProperty('--color-surface-tint', accent.primary);
  root.style.setProperty('--glow-primary', `0 8px 32px ${accent.glow}`);
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [prefs, setPrefsState] = useState<UserPreferences>(DEFAULT_PREFS);

  // Hydrate from user.preferences on login / user change
  useEffect(() => {
    if (!user?.preferences) return;
    try {
      const parsed = JSON.parse(user.preferences);
      const merged: UserPreferences = { ...DEFAULT_PREFS, ...parsed };
      setPrefsState(merged);
      applyToDom(merged);
    } catch {
      // malformed JSON — keep defaults
    }
  }, [user?.preferences]);

  // Apply defaults on first mount (before user loads)
  useEffect(() => {
    applyToDom(prefs);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setPrefs = useCallback((next: Partial<UserPreferences>) => {
    setPrefsState(prev => {
      const merged = { ...prev, ...next };
      applyToDom(merged);
      return merged;
    });
  }, []);

  return (
    <PreferencesContext.Provider value={{ prefs, setPrefs }}>
      {children}
    </PreferencesContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
