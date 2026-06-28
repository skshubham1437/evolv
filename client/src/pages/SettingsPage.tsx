import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { usePreferences, type UserPreferences } from '../context/PreferencesContext';
import { request, fetchGoals, fetchTasks, fetchHabits, fetchJournalEntries } from '../api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { API_BASE } from '../api/core';

// ─── Sub-components ──────────────────────────────────────────

function ToggleNode({
  icon,
  title,
  desc,
  active,
  onToggle,
  disabled = false,
}: {
  icon: string;
  title: string;
  desc: string;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center justify-between p-4 glass-card rounded-xl border border-[rgba(255,255,255,0.06)] transition-all duration-200 group w-full text-left bg-white/[0.005] active:scale-[0.99] ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-[var(--color-primary)]/30 cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/[0.02] flex items-center justify-center rounded-xl border border-[rgba(255,255,255,0.06)] group-hover:border-[var(--color-primary)]/20 transition-colors">
          <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-on-surface)] transition-colors">
            {icon}
          </span>
        </div>
        <div>
          <h3 className="font-body-md text-[14px] text-[var(--color-on-surface)] font-bold">{title}</h3>
          <p className="font-body-md text-[12px] text-[var(--color-outline)]">{desc}</p>
        </div>
      </div>
      <div
        className={`relative w-11 h-6 rounded-full border transition-all duration-300 shrink-0 ${
          active
            ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
            : 'bg-transparent border-[rgba(255,255,255,0.2)]'
        }`}
      >
        <div
          className={`absolute top-[2px] w-[18px] h-[18px] rounded-full transition-all duration-300 ${
            active ? 'bg-black left-[23px]' : 'bg-white/40 left-[2px]'
          }`}
        />
      </div>
    </button>
  );
}

function SettingsSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card rounded-2xl p-8 border-[rgba(255,255,255,0.06)] shadow-lg bg-white/[0.005] transition-all duration-300">
      <h2 className="font-label-sm text-[12px] font-bold uppercase tracking-widest text-[var(--color-on-surface)] mb-6 flex items-center gap-2 border-b border-[rgba(255,255,255,0.06)] pb-3.5 font-mono">
        <span className="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">{icon}</span>
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

// ─── Accent colour palette ───────────────────────────────────

const ACCENT_COLOURS = [
  { hex: '#d2bbff', label: 'Lavender' },
  { hex: '#5adace', label: 'Teal' },
  { hex: '#f4a261', label: 'Amber' },
  { hex: '#e76f51', label: 'Coral' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC — Coordinated Universal Time' },
  { value: 'America/New_York', label: 'EST — Eastern Standard Time' },
  { value: 'America/Chicago', label: 'CST — Central Standard Time' },
  { value: 'America/Denver', label: 'MST — Mountain Standard Time' },
  { value: 'America/Los_Angeles', label: 'PST — Pacific Standard Time' },
  { value: 'Europe/London', label: 'GMT — Greenwich Mean Time' },
  { value: 'Europe/Berlin', label: 'CET — Central European Time' },
  { value: 'Europe/Moscow', label: 'MSK — Moscow Standard Time' },
  { value: 'Asia/Kolkata', label: 'IST — India Standard Time' },
  { value: 'Asia/Shanghai', label: 'CST — China Standard Time' },
  { value: 'Asia/Tokyo', label: 'JST — Japan Standard Time' },
  { value: 'Asia/Dubai', label: 'GST — Gulf Standard Time' },
  { value: 'Australia/Sydney', label: 'AEST — Australian Eastern Time' },
];

// ─── Main Page ────────────────────────────────────────────────

export function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { prefs, setPrefs } = usePreferences();
  const navigate = useNavigate();

  // ── Profile ──────────────────────────────────────────────
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [emailChanged, setEmailChanged] = useState(false);
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareToken, setShareToken] = useState('');

  // ── Change-password ──────────────────────────────────────
  const [cpCurrent, setCpCurrent] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [cpSaving, setCpSaving] = useState(false);
  const [cpError, setCpError] = useState('');

  // ── Notification prefs (from user object, not preferences JSON) ──
  const [pushEnabled, setPushEnabled] = useState(user?.push_enabled ?? true);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(
    user?.weekly_digest_enabled ?? true,
  );

  // ── Local prefs (a copy of prefs for editing before save) ───
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>({ ...prefs });

  // Sync when prefs context updates (e.g., on login hydration)
  useEffect(() => {
    setLocalPrefs({ ...prefs });
  }, [prefs]);

  // Sync profile fields when user loads
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      if (user.push_enabled !== undefined) setPushEnabled(user.push_enabled);
      if (user.weekly_digest_enabled !== undefined) setWeeklyDigestEnabled(user.weekly_digest_enabled);
    }
  }, [user]);

  // Fetch share token
  useEffect(() => {
    request<{ token: string }>(`${API_BASE}/shares/status`)
      .then(res => {
        if (res?.token) setShareToken(res.token);
      })
      .catch(() => {});
  }, []);

  // ── Local pref helper ────────────────────────────────────
  function patchLocalPref(key: keyof UserPreferences, value: any) {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    // Apply live preview immediately
    setPrefs({ [key]: value } as Partial<UserPreferences>);
  }

  // ── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    const prefsPayload: Omit<UserPreferences, 'weekStartsOn'> & { weekStartsOn: string } = {
      ...localPrefs,
    };

    const body: Record<string, any> = {
      name,
      preferences: JSON.stringify(prefsPayload),
      push_enabled: pushEnabled,
      weekly_digest_enabled: weeklyDigestEnabled,
    };

    if (emailChanged) {
      if (!currentPasswordForEmail) {
        showToast('Current password is required to change email.', 'error');
        return;
      }
      body.email = email;
      body.current_password = currentPasswordForEmail;
    }

    try {
      const updatedUser = await request<any>(`${API_BASE}/me`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      updateUser(updatedUser);
      // Commit local prefs to context
      setPrefs(localPrefs);
      setSaved(true);
      setEmailChanged(false);
      setCurrentPasswordForEmail('');
      showToast('Settings saved.', 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings.', 'error');
    }
  };

  // ── Change password ──────────────────────────────────────
  const handleChangePassword = async () => {
    setCpError('');
    if (!cpCurrent || !cpNew || !cpConfirm) { setCpError('All fields are required.'); return; }
    if (cpNew !== cpConfirm) { setCpError('New passwords do not match.'); return; }
    if (cpNew.length < 8) { setCpError('Password must be at least 8 characters.'); return; }
    setCpSaving(true);
    try {
      await request(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({ current_password: cpCurrent, new_password: cpNew }),
      });
      setCpCurrent(''); setCpNew(''); setCpConfirm('');
      showToast('Password updated successfully!', 'success');
    } catch (err: any) {
      setCpError(err.message || 'Failed to update password.');
    } finally {
      setCpSaving(false);
    }
  };

  // ── Push notifications ───────────────────────────────────
  const requestNotificationPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      showToast('Push notifications not supported on this browser.', 'info');
      setPushEnabled(false);
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('Permission denied for push notifications.', 'info');
        setPushEnabled(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const health = await request<any>(`${API_BASE.replace('/api', '')}/health`);
      const vapidKey = health?.vapid_public_key;
      if (!vapidKey) {
        showToast('Push server not configured. Preference saved.', 'info');
        return;
      }
      const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4);
      const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const raw = window.atob(base64);
      const key = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!)));
      const auth = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!)));
      await request(`${API_BASE}/notifications/subscribe`, {
        method: 'POST',
        body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh, auth } }),
      });
      showToast('Push notifications enabled!', 'success');
    } catch (err: any) {
      showToast('Push registration failed.', 'error');
      setPushEnabled(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await request(`${API_BASE}/notifications/unsubscribe`, {
          method: 'POST',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
        showToast('Push notifications disabled.', 'info');
      }
    } catch { /* best-effort */ }
  };

  // ── Export ───────────────────────────────────────────────
  const handleExportData = async () => {
    try {
      showToast('Preparing export…', 'info');
      const [goals, tasks, habits, journal] = await Promise.all([
        fetchGoals().catch(() => [] as any[]),
        fetchTasks().catch(() => [] as any[]),
        fetchHabits().catch(() => [] as any[]),
        fetchJournalEntries().catch(() => [] as any[]),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        user: { name: user?.name, email: user?.email },
        data: { goals, tasks, habits, journal },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evolv_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed.', 'error');
    }
  };

  const handleExportTasksCSV = async () => {
    try {
      showToast('Preparing CSV…', 'info');
      const tasks = await fetchTasks().catch(() => [] as any[]);
      if (!tasks.length) { showToast('No tasks to export.', 'info'); return; }
      const headers = ['ID', 'Title', 'Priority', 'Completed', 'Due Date', 'Urgent', 'Important', 'Notes'];
      const rows = tasks.map((t: any) => [
        t.id,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.priority,
        t.is_completed ? 'TRUE' : 'FALSE',
        t.due_date || '',
        t.is_urgent ? 'TRUE' : 'FALSE',
        t.is_important ? 'TRUE' : 'FALSE',
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evolv_tasks_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('CSV downloaded.', 'success');
    } catch (err: any) {
      showToast(err.message || 'CSV export failed.', 'error');
    }
  };

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-[var(--color-on-surface)] items-center overflow-hidden">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[rgba(255,255,255,0.06)] relative">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32">

          {/* Header */}
          <header className="px-8 py-6 border-b border-[rgba(255,255,255,0.06)] shrink-0 bg-transparent">
            <h2 className="text-[36px] font-black tracking-tighter text-[var(--color-on-surface)] leading-none select-none">
              Settings
            </h2>
            <p className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-[0.25em] mt-2.5">
              Personalize your workspace and account
            </p>
          </header>

          <div className="p-8 flex flex-col gap-8 max-w-4xl mx-auto w-full">

            {/* ── Profile ───────────────────────────────────── */}
            <SettingsSection title="Profile" icon="fingerprint">
              <div className="flex flex-col sm:flex-row gap-8 items-start">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-xl bg-[var(--color-primary)]/10 border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                    <span className="text-[36px] font-black text-[var(--color-primary)] select-none leading-none">
                      {(name || user?.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => showToast('Avatar upload coming soon.', 'info')}
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#e6e6e6] transition-colors shadow-lg cursor-pointer active:scale-90 border-none"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                </div>

                {/* Fields */}
                <div className="flex-1 w-full space-y-6">
                  <div>
                    <label className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-2">
                      Display Name
                    </label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="input-field w-full px-4 py-3"
                      type="text"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-2">
                      Email Address
                    </label>
                    <input
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        setEmailChanged(e.target.value !== user?.email);
                      }}
                      className="input-field w-full px-4 py-3"
                      type="email"
                      placeholder="you@example.com"
                    />
                  </div>
                  {emailChanged && (
                    <div>
                      <label className="font-mono text-[9px] text-[var(--color-error)] font-bold uppercase tracking-widest block mb-2">
                        Current Password (required to change email)
                      </label>
                      <input
                        value={currentPasswordForEmail}
                        onChange={e => setCurrentPasswordForEmail(e.target.value)}
                        className="input-field w-full px-4 py-3 border-[var(--color-error)]/35 focus:border-[var(--color-error)]"
                        type="password"
                        placeholder="Confirm current password…"
                        autoComplete="current-password"
                      />
                    </div>
                  )}
                </div>
              </div>
            </SettingsSection>

            {/* ── Theme & Accent ─────────────────────────────── */}
            <SettingsSection title="Theme & Style" icon="palette">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Theme toggle */}
                  <button
                    onClick={toggleTheme}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 group text-left cursor-pointer active:scale-[0.98] ${
                      theme === 'light'
                        ? 'bg-[var(--color-on-surface)] text-[var(--color-surface)] border-[var(--color-on-surface)] shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
                        : 'bg-white/[0.01] border-[rgba(255,255,255,0.08)] text-[var(--color-on-surface)] hover:border-white/20 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className={`w-12 h-12 flex items-center justify-center rounded-xl border ${theme === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                      </span>
                    </div>
                    <div>
                      <p className="font-body-md text-[14px] font-bold">
                        {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                      </p>
                      <p className={`font-mono text-[9px] uppercase tracking-widest font-bold mt-1 ${theme === 'light' ? 'text-[var(--color-surface)]/70' : 'text-[var(--color-outline)]'}`}>
                        Active: {theme} mode
                      </p>
                    </div>
                  </button>

                  {/* Accent colour picker */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-white/[0.01]">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-[rgba(255,255,255,0.08)] shrink-0" style={{ background: `${localPrefs.accentColor}22` }}>
                      <span className="material-symbols-outlined" style={{ color: localPrefs.accentColor }}>colors</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-body-md text-[14px] text-[var(--color-on-surface)] font-bold mb-2.5">
                        Accent Colour
                      </p>
                      <div className="flex gap-2.5">
                        {ACCENT_COLOURS.map(({ hex, label }) => (
                          <button
                            key={hex}
                            title={label}
                            onClick={() => patchLocalPref('accentColor', hex)}
                            className="relative w-6 h-6 rounded-full transition-transform hover:scale-110 active:scale-95 border-2 cursor-pointer"
                            style={{
                              backgroundColor: hex,
                              borderColor: localPrefs.accentColor === hex ? '#fff' : 'transparent',
                              boxShadow: localPrefs.accentColor === hex ? `0 0 0 1px ${hex}` : 'none',
                            }}
                          >
                            {localPrefs.accentColor === hex && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[12px] text-black" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SettingsSection>

            {/* ── Interface Preferences ──────────────────────── */}
            <SettingsSection title="Interface" icon="tune">
              <div className="space-y-3">
                <ToggleNode
                  icon="blur_on"
                  title="Ambient Background Glow"
                  desc="Show the gradient colour mesh in the background."
                  active={localPrefs.ambientOrbs}
                  onToggle={() => patchLocalPref('ambientOrbs', !localPrefs.ambientOrbs)}
                />
                <ToggleNode
                  icon="transition_slide"
                  title="Page Animations"
                  desc="Smooth transitions when navigating between screens."
                  active={localPrefs.pageTransitions}
                  onToggle={() => patchLocalPref('pageTransitions', !localPrefs.pageTransitions)}
                />
                <ToggleNode
                  icon="auto_awesome"
                  title="Habit Completion Glow"
                  desc="Pulse animation when a habit is marked complete."
                  active={localPrefs.habitGlows}
                  onToggle={() => patchLocalPref('habitGlows', !localPrefs.habitGlows)}
                />
                <ToggleNode
                  icon="timer"
                  title="Focus Timer Breathing"
                  desc="Subtle breathing animation on the Focus Mode timer dial."
                  active={localPrefs.timerTick}
                  onToggle={() => patchLocalPref('timerTick', !localPrefs.timerTick)}
                />
                <ToggleNode
                  icon="graphic_eq"
                  title="Soundwave Visualiser"
                  desc="Animated audio bars in Focus Mode."
                  active={localPrefs.waveforms}
                  onToggle={() => patchLocalPref('waveforms', !localPrefs.waveforms)}
                />
              </div>
            </SettingsSection>

            {/* ── Local Settings ─────────────────────────────── */}
            <SettingsSection title="Regional" icon="public">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Timezone */}
                <div className="bg-white/[0.01] p-5 rounded-xl border border-[rgba(255,255,255,0.08)]">
                  <label className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-3">
                    Timezone
                  </label>
                  <div className="relative">
                    <select
                      value={localPrefs.timezone}
                      onChange={e => patchLocalPref('timezone', e.target.value)}
                      className="w-full appearance-none bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl focus:border-[var(--color-primary)]/45 text-[var(--color-on-surface)] font-body-md text-[13px] px-4 py-3 pr-10 transition-colors outline-none cursor-pointer"
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value} className="bg-[var(--color-surface)]">
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] pointer-events-none text-[20px]">expand_more</span>
                  </div>
                </div>

                {/* Week starts on */}
                <div className="bg-white/[0.01] p-5 rounded-xl border border-[rgba(255,255,255,0.08)]">
                  <label className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-3">
                    Week Starts On
                  </label>
                  <div className="relative">
                    <select
                      value={localPrefs.weekStartsOn}
                      onChange={e => patchLocalPref('weekStartsOn', e.target.value as 'monday' | 'sunday')}
                      className="w-full appearance-none bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl focus:border-[var(--color-primary)]/45 text-[var(--color-on-surface)] font-body-md text-[13px] px-4 py-3 pr-10 transition-colors outline-none cursor-pointer"
                    >
                      <option value="monday" className="bg-[var(--color-surface)]">Monday</option>
                      <option value="sunday" className="bg-[var(--color-surface)]">Sunday</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] pointer-events-none text-[20px]">expand_more</span>
                  </div>
                </div>
              </div>
            </SettingsSection>

            {/* ── Notifications ──────────────────────────────── */}
            <SettingsSection title="Notifications" icon="notifications">
              <div className="space-y-3">
                <ToggleNode
                  icon="notifications_active"
                  title="Push Notifications"
                  desc="Browser alerts when streaks are at risk or tasks are due."
                  active={pushEnabled}
                  onToggle={async () => {
                    const next = !pushEnabled;
                    setPushEnabled(next);
                    if (next) {
                      await requestNotificationPermission();
                    } else {
                      await unsubscribeFromPush();
                    }
                  }}
                />
                <ToggleNode
                  icon="mail"
                  title="Weekly Digest Email"
                  desc="A weekly report of your momentum, streaks, and focus metrics."
                  active={weeklyDigestEnabled}
                  onToggle={() => setWeeklyDigestEnabled(v => !v)}
                />
              </div>
            </SettingsSection>

            {/* ── Data Portability ───────────────────────────── */}
            <SettingsSection title="Data Portability" icon="download">
              <p className="font-body-md text-[12px] text-[var(--color-outline)] mb-4 leading-relaxed">
                Export a full backup of your goals, tasks, habits, and journal as a JSON file, or download your tasks as a spreadsheet.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleExportData}
                  className="flex-1 py-3.5 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[var(--color-on-surface)] rounded-xl hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black font-mono text-[9px] font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span> Export JSON Backup
                </button>
                <button
                  onClick={handleExportTasksCSV}
                  className="flex-1 py-3.5 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] text-[var(--color-on-surface)] rounded-xl hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black font-mono text-[9px] font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px]">table_view</span> Export Tasks CSV
                </button>
              </div>
            </SettingsSection>

            {/* ── Public Sharing ─────────────────────────────── */}
            <SettingsSection title="Public Sharing" icon="share">
              <p className="font-body-md text-[12px] text-[var(--color-outline)] mb-4 leading-relaxed">
                Generate a read-only link to share your goal progress and habit streaks with a mentor or accountability partner. Journal entries remain private.
              </p>
              {shareToken ? (
                <div className="space-y-4">
                  <div className="p-4 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl flex items-center justify-between gap-4">
                    <div className="font-mono text-[11px] truncate select-all text-[var(--color-on-surface)]/80">
                      {`${window.location.origin}/shared/${shareToken}`}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/shared/${shareToken}`);
                        showToast('Link copied to clipboard!', 'success');
                      }}
                      className="px-4 py-2 bg-[var(--color-primary)] text-black rounded-lg font-mono text-[9px] uppercase tracking-wider hover:opacity-90 transition-colors cursor-pointer active:scale-95 border-none shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await request(`${API_BASE}/shares`, { method: 'DELETE' });
                        setShareToken('');
                        showToast('Share link revoked.', 'info');
                      } catch {
                        showToast('Failed to revoke link.', 'error');
                      }
                    }}
                    className="w-full py-3.5 bg-transparent border border-[var(--color-error)]/35 text-[var(--color-error)] font-mono text-[9px] font-bold uppercase tracking-widest hover:bg-[var(--color-error)]/10 transition-all duration-200 rounded-xl cursor-pointer active:scale-[0.98]"
                  >
                    Revoke Share Link
                  </button>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      const res = await request<any>(`${API_BASE}/shares`, { method: 'POST' });
                      setShareToken(res.token);
                      showToast('Share link created!', 'success');
                    } catch {
                      showToast('Failed to create link.', 'error');
                    }
                  }}
                  className="w-full py-3.5 bg-[var(--color-primary)] text-black font-mono text-[9px] font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 rounded-xl cursor-pointer active:scale-[0.98] shadow-md border-none"
                >
                  <span className="material-symbols-outlined text-[16px]">link</span> Create Share Link
                </button>
              )}
            </SettingsSection>

            {/* ── Security ────────────────────────────────────── */}
            <SettingsSection title="Security" icon="lock">
              <div className="space-y-4">
                <div>
                  <label className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-2">Current Password</label>
                  <input
                    value={cpCurrent}
                    onChange={e => { setCpCurrent(e.target.value); setCpError(''); }}
                    className="input-field w-full px-4 py-3 font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-2">New Password</label>
                  <input
                    value={cpNew}
                    onChange={e => { setCpNew(e.target.value); setCpError(''); }}
                    className="input-field w-full px-4 py-3 font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div>
                  <label className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-2">Confirm New Password</label>
                  <input
                    value={cpConfirm}
                    onChange={e => { setCpConfirm(e.target.value); setCpError(''); }}
                    className="input-field w-full px-4 py-3 font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                  />
                </div>
                {cpError && (
                  <p className="text-[var(--color-error)] text-[12px] font-bold font-mono uppercase tracking-wider">{cpError}</p>
                )}
                <button
                  onClick={handleChangePassword}
                  disabled={cpSaving}
                  className="w-full py-3.5 bg-white/[0.02] border border-[rgba(255,255,255,0.08)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black font-mono text-[9px] font-bold uppercase tracking-widest transition-all duration-200 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.98] text-[var(--color-on-surface)]"
                >
                  {cpSaving ? (
                    <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Updating…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[16px]">key</span> Update Password</>
                  )}
                </button>
              </div>
            </SettingsSection>

            {/* ── Integrations (coming soon) ─────────────────── */}
            <SettingsSection title="Integrations" icon="device_hub">
              <p className="font-body-md text-[12px] text-[var(--color-outline)] mb-5 leading-relaxed">
                Native integrations are on the roadmap. Connect Evolv to your favourite tools once they ship.
              </p>
              <div className="space-y-3">
                {[
                  { icon: 'calendar_month', title: 'Calendar Sync', desc: 'Google Calendar, Outlook — two-way task and event sync.' },
                  { icon: 'monitor_heart', title: 'Health App Sync', desc: 'Apple Health, Fitbit — biometric data alongside habits.' },
                  { icon: 'directions_run', title: 'Location Check-ins', desc: 'GPS-verified habit check-ins.' },
                  { icon: 'headphones', title: 'Focus Audio', desc: 'Spotify, Endel — adaptive focus soundscapes.' },
                ].map(item => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-white/[0.005] opacity-60"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/[0.02] flex items-center justify-center rounded-xl border border-[rgba(255,255,255,0.06)]">
                        <span className="material-symbols-outlined text-[var(--color-on-surface-variant)]">{item.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-body-md text-[14px] text-[var(--color-on-surface)] font-bold">{item.title}</h3>
                        <p className="font-body-md text-[12px] text-[var(--color-outline)]">{item.desc}</p>
                      </div>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-mono text-[9px] uppercase tracking-widest font-bold border border-[var(--color-primary)]/20">
                      Soon
                    </span>
                  </div>
                ))}
              </div>
            </SettingsSection>

            {/* ── Actions ─────────────────────────────────────── */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="flex-[1] py-4 bg-transparent border border-[var(--color-error)]/35 text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-black rounded-xl font-mono text-[9px] font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Sign Out
              </button>

              <button
                onClick={handleSave}
                className={`flex-[2] py-4 rounded-xl font-mono text-[9px] font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                  saved
                    ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : 'bg-[var(--color-primary)] text-black hover:opacity-90 shadow-[0_4px_20px_rgba(210,187,255,0.15)]'
                }`}
              >
                {saved ? (
                  <><span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Saved</>
                ) : (
                  <><span className="material-symbols-outlined text-[16px]">save</span> Save Settings</>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={async () => {
          await logout();
          navigate('/login');
        }}
        title="Sign Out"
        description="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        destructive={true}
      />
    </div>
  );
}
