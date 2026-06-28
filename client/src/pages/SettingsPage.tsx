import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { request, fetchGoals, fetchTasks, fetchHabits, fetchJournalEntries } from '../api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

// ─── Toggle Node ────────────────────────────────────────────
function ToggleNode({
  icon,
  title,
  desc,
  active,
  onToggle,
}: {
  icon: string;
  title: string;
  desc: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between p-4 glass-card rounded-xl border border-[rgba(255,255,255,0.06)] hover:border-[var(--color-primary)]/30 transition-all duration-200 group w-full text-left bg-white/[0.005] active:scale-[0.99] cursor-pointer"
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

      {/* Modern pill-shaped switch */}
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

// ─── Settings Section wrapper ───────────────────────────────
function SettingsSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
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

// ─── Main Page ──────────────────────────────────────────────
export function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName]   = useState(user?.name || 'Builder');
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [email, setEmail] = useState(user?.email || 'builder@evolv.net');
  const [saved, setSaved] = useState(false);
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [emailChanged, setEmailChanged] = useState(false);
  const [shareToken, setShareToken] = useState('');

  const handleExportData = async () => {
    try {
      showToast('Export initializing. Fetching user node data...', 'info');
      
      const [goals, tasks, habits, journal] = await Promise.all([
        fetchGoals().catch(() => [] as any[]),
        fetchTasks().catch(() => [] as any[]),
        fetchHabits().catch(() => [] as any[]),
        fetchJournalEntries().catch(() => [] as any[]),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        user: {
          designation: user?.name,
          email: user?.email,
        },
        node_data: {
          goals,
          tasks,
          habits,
          journal,
        }
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(payload, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `evolv_node_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Node backup successfully downloaded.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Data export failed.', 'error');
    }
  };

  const handleExportTasksCSV = async () => {
    try {
      showToast('Compiling tasks for CSV export...', 'info');
      const tasks = await fetchTasks().catch(() => [] as any[]);
      if (tasks.length === 0) {
        showToast('No tasks found to export.', 'info');
        return;
      }

      const headers = ['ID', 'Title', 'Priority', 'Completed', 'Due Date', 'Urgent', 'Important', 'Notes'];
      const rows = tasks.map(t => [
        t.id,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.priority,
        t.is_completed ? 'TRUE' : 'FALSE',
        t.due_date || '',
        t.is_urgent ? 'TRUE' : 'FALSE',
        t.is_important ? 'TRUE' : 'FALSE',
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(csvBlob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', `evolv_tasks_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);

      showToast('Tasks CSV successfully downloaded.', 'success');
    } catch (err: any) {
      showToast(err.message || 'CSV export failed.', 'error');
    }
  };

  // Change-password form
  const [cpCurrent, setCpCurrent]   = useState('');
  const [cpNew, setCpNew]           = useState('');
  const [cpConfirm, setCpConfirm]   = useState('');
  const [cpSaving, setCpSaving]     = useState(false);
  const [cpError, setCpError]       = useState('');

  // Sensory preferences
  const [ambientOrbs, setAmbientOrbs]         = useState(true);
  const [pageTransitions, setPageTransitions] = useState(true);
  const [habitGlows, setHabitGlows]           = useState(true);
  const [timerTick, setTimerTick]             = useState(true);
  const [waveforms, setWaveforms]             = useState(true);

  // Integrations
  const [chronosSync, setChronos]   = useState(true);
  const [bioMetrics, setBioMetrics] = useState(true);
  const [kineticTrack, setKinetic]  = useState(false);
  const [audioState, setAudio]      = useState(true);

  // Notification Preferences
  const [pushEnabled, setPushEnabled]                 = useState(user?.push_enabled ?? true);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(user?.weekly_digest_enabled ?? true);

  useEffect(() => {
    if (user) {
      if (user.push_enabled !== undefined) setPushEnabled(user.push_enabled);
      if (user.weekly_digest_enabled !== undefined) setWeeklyDigestEnabled(user.weekly_digest_enabled);
      if (user.preferences) {
        try {
          const prefs = JSON.parse(user.preferences);
          if (prefs.ambientOrbs !== undefined) setAmbientOrbs(prefs.ambientOrbs);
          if (prefs.pageTransitions !== undefined) setPageTransitions(prefs.pageTransitions);
          if (prefs.habitGlows !== undefined) setHabitGlows(prefs.habitGlows);
          if (prefs.timerTick !== undefined) setTimerTick(prefs.timerTick);
          if (prefs.waveforms !== undefined) setWaveforms(prefs.waveforms);
          if (prefs.chronosSync !== undefined) setChronos(prefs.chronosSync);
          if (prefs.bioMetrics !== undefined) setBioMetrics(prefs.bioMetrics);
          if (prefs.kineticTrack !== undefined) setKinetic(prefs.kineticTrack);
          if (prefs.audioState !== undefined) setAudio(prefs.audioState);
        } catch (err) {
          console.error('Failed to parse preferences:', err);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    request<{ token: string }>('http://localhost:8081/api/shares/status')
      .then(res => {
        if (res && res.token) {
          setShareToken(res.token);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    const prefsObj = {
      ambientOrbs,
      pageTransitions,
      habitGlows,
      timerTick,
      waveforms,
      chronosSync,
      bioMetrics,
      kineticTrack,
      audioState,
    };

    const body: Record<string, any> = {
      name,
      preferences: JSON.stringify(prefsObj),
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
      const updatedUser = await request<any>('http://localhost:8081/api/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      updateUser(updatedUser);
      setSaved(true);
      setEmailChanged(false);
      setCurrentPasswordForEmail('');
      showToast('Settings saved successfully!', 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to save settings.', 'error');
    }
  };

  const handleChangePassword = async () => {
    setCpError('');
    if (!cpCurrent || !cpNew || !cpConfirm) {
      setCpError('All fields are required.');
      return;
    }
    if (cpNew !== cpConfirm) {
      setCpError('New passwords do not match.');
      return;
    }
    if (cpNew.length < 8) {
      setCpError('New password must be at least 8 characters.');
      return;
    }
    setCpSaving(true);
    try {
      await request('http://localhost:8081/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: cpCurrent, new_password: cpNew }),
      });
      setCpCurrent('');
      setCpNew('');
      setCpConfirm('');
      showToast('Password updated successfully!', 'success');
    } catch (err: any) {
      setCpError(err.message || 'Failed to update password.');
    } finally {
      setCpSaving(false);
    }
  };

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
      const health = await request<any>('http://localhost:8081/health');
      const vapidKey = health.vapid_public_key;

      if (!vapidKey) {
        showToast('VAPID key not configured on server. Settings updated locally.', 'info');
        return;
      }

      // Convert VAPID base64 to Uint8Array
      const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4);
      const base64 = (vapidKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray
      });

      const p256dh = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey('p256dh')!))));
      const auth = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey('auth')!))));

      await request('http://localhost:8081/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh, auth }
        })
      });

      showToast('Web Push registered successfully!', 'success');
    } catch (err: any) {
      console.error('Push registration error:', err);
      showToast('Web Push registration failed.', 'error');
      setPushEnabled(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await request('http://localhost:8081/api/notifications/unsubscribe', {
          method: 'POST',
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
        await sub.unsubscribe();
        showToast('Unsubscribed from push notifications.', 'info');
      }
    } catch (err) {
      console.error('Failed to unsubscribe from push:', err);
    }
  };


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

            {/* ── Profile Settings ─────────────────────────── */}
            <SettingsSection title="Profile Settings" icon="fingerprint">
              <div className="flex flex-col sm:flex-row gap-8 items-start">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-24 h-24 border border-[rgba(255,255,255,0.08)] p-1 bg-white/[0.02] rounded-xl">
                    <img
                      alt="Avatar"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFRESvWmL07H3BCrn86q8If8pHfMpmrmz9EGoUy8r0yujHOLn3Q3szEJ6j3QS0dPGkkkTjiUMcuFpvYiW2qSjqN-4NTH5ff20iiLoin9Uz-lQUifHxQ4747m_FBzbwXrSuKdXXiNoUcRdc-nWn8ssyxNqGyET4VAOHtqN3gK4F52B-c9CNl5eGUrAVw2tPs00tdwTJOdwQLyuHw9P0nL_83vRnU4tuBrgGuIE-yxtyfAWQE80jtZdaa-9mCo2J9svzcapWaFRAPuUa"
                      className="w-full h-full object-cover grayscale opacity-80 rounded-lg"
                    />
                  </div>
                  <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#e6e6e6] transition-colors shadow-lg cursor-pointer active:scale-90 border-none">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                </div>

                {/* Fields */}
                <div className="flex-1 w-full space-y-6">
                  <div>
                    <label className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-2">Display Name</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="input-field w-full px-4 py-3"
                      type="text"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-2">Email Address</label>
                    <input
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailChanged(e.target.value !== user?.email); }}
                      className="input-field w-full px-4 py-3"
                      type="email"
                    />
                  </div>
                  {emailChanged && (
                    <div>
                      <label className="font-mono text-[9px] text-[var(--color-error)] font-bold uppercase tracking-widest block mb-2">Current Password (required to change email)</label>
                      <input
                        value={currentPasswordForEmail}
                        onChange={e => setCurrentPasswordForEmail(e.target.value)}
                        className="input-field w-full px-4 py-3 border-[var(--color-error)]/35 focus:border-[var(--color-error)]"
                        type="password"
                        placeholder="Confirm password..."
                        autoComplete="current-password"
                      />
                    </div>
                  )}
                </div>
              </div>
            </SettingsSection>

            {/* ── Theme & Style ────────────────────────────── */}
            <SettingsSection title="Theme & Style" icon="palette">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Theme toggle card */}
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
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </p>
                    <p className={`font-mono text-[9px] uppercase tracking-widest font-bold mt-1 ${theme === 'light' ? 'text-[var(--color-surface)]/70' : 'text-[var(--color-outline)]'}`}>
                      Active: {theme}
                    </p>
                  </div>
                </button>

                {/* Color palette teaser */}
                <div className="flex items-center gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-white/[0.01]">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[var(--color-secondary)]">colors</span>
                  </div>
                  <div>
                    <p className="font-body-md text-[14px] text-[var(--color-on-surface)] font-bold">Accent Color</p>
                    <div className="flex gap-2.5 mt-2.5">
                      {['#d2bbff', '#5adace', '#f4a261', '#e76f51'].map(c => (
                        <div key={c} className="w-5 h-5 rounded-full border border-[rgba(255,255,255,0.08)] cursor-pointer hover:scale-110 active:scale-95 transition-transform" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </SettingsSection>

            {/* ── Interface Preferences ────────────────────── */}
            <SettingsSection title="Interface Preferences" icon="tune">
              <div className="space-y-3">
                <ToggleNode
                  icon="blur_on"
                  title="Ambient Background Glow"
                  desc="Show floating background gradient spheres."
                  active={ambientOrbs}
                  onToggle={() => setAmbientOrbs(v => !v)}
                />
                <ToggleNode
                  icon="transition_slide"
                  title="Page Animations"
                  desc="Enable smooth transitions when navigating between screens."
                  active={pageTransitions}
                  onToggle={() => setPageTransitions(v => !v)}
                />
                <ToggleNode
                  icon="auto_awesome"
                  title="Habit Completed Glows"
                  desc="Enable glow pulse animation on completed habits."
                  active={habitGlows}
                  onToggle={() => setHabitGlows(v => !v)}
                />
                <ToggleNode
                  icon="timer"
                  title="Timer Breathing Animation"
                  desc="Enable subtle breathing pulse on the focus timer dial."
                  active={timerTick}
                  onToggle={() => setTimerTick(v => !v)}
                />
                <ToggleNode
                  icon="graphic_eq"
                  title="Soundwave Visualizer"
                  desc="Display animated audio wave bars in Focus Mode."
                  active={waveforms}
                  onToggle={() => setWaveforms(v => !v)}
                />
              </div>
            </SettingsSection>

            {/* ── Local Settings ───────────────────────────── */}
            <SettingsSection title="Local Settings" icon="public">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/[0.01] p-5 rounded-xl border border-[rgba(255,255,255,0.08)]">
                  <label className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-3">Timezone</label>
                  <div className="relative">
                    <select className="w-full appearance-none bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl focus:border-[var(--color-primary)]/45 text-[var(--color-on-surface)] font-body-md text-[13px] px-4 py-3 pr-10 transition-colors outline-none cursor-pointer">
                      <option className="bg-[var(--color-surface)]">UTC (Coordinated Universal Time)</option>
                      <option className="bg-[var(--color-surface)]">EST (Eastern Standard Time)</option>
                      <option className="bg-[var(--color-surface)]">PST (Pacific Standard Time)</option>
                      <option className="bg-[var(--color-surface)]">IST (India Standard Time)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] pointer-events-none text-[20px]">expand_more</span>
                  </div>
                </div>
                <div className="bg-white/[0.01] p-5 rounded-xl border border-[rgba(255,255,255,0.08)]">
                  <label className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-3">Week Starts On</label>
                  <div className="relative">
                    <select className="w-full appearance-none bg-white/[0.02] border border-[rgba(255,255,255,0.08)] rounded-xl focus:border-[var(--color-primary)]/45 text-[var(--color-on-surface)] font-body-md text-[13px] px-4 py-3 pr-10 transition-colors outline-none cursor-pointer">
                      <option className="bg-[var(--color-surface)]">Monday</option>
                      <option className="bg-[var(--color-surface)]">Sunday</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] pointer-events-none text-[20px]">expand_more</span>
                  </div>
                </div>
              </div>
            </SettingsSection>

            {/* ── Data Portability ─────────────────────────── */}
            <SettingsSection title="Data Portability" icon="download">
              <p className="font-body-md text-[12px] text-[var(--color-outline)] mb-4 leading-relaxed">
                Export all your life-planning data (goals, tasks, habits, and journal entries) as a backup file.
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
                  <span className="material-symbols-outlined text-[16px]">table_view</span> Export Tasks (CSV)
                </button>
              </div>
            </SettingsSection>

            {/* ── Integrations ─────────────────────────────── */}
            <SettingsSection title="Integrations" icon="device_hub">
              <div className="space-y-3">
                <ToggleNode icon="schedule"       title="Calendar Sync"  desc="Align and sync with external calendar platforms."   active={chronosSync}   onToggle={() => setChronos(v => !v)} />
                <ToggleNode icon="monitor_heart"  title="Health App Sync"   desc="Connect health data and biometric trackers."    active={bioMetrics}    onToggle={() => setBioMetrics(v => !v)} />
                <ToggleNode icon="directions_run" title="Location Tracking" desc="Enable location mapping for habit check-ins."      active={kineticTrack}  onToggle={() => setKinetic(v => !v)} />
                <ToggleNode icon="graphic_eq"     title="Audio Focus Sounds"   desc="Play brainwave entrainment and focus soundscapes."      active={audioState}    onToggle={() => setAudio(v => !v)} />
              </div>
            </SettingsSection>

            {/* ── Notifications ────────────────────────────── */}
            <SettingsSection title="Notifications" icon="notifications">
              <div className="space-y-3">
                <ToggleNode
                  icon="notifications_active"
                  title="Push Notifications"
                  desc="Receive browser alerts when streaks are at risk or tasks are due."
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
                  desc="Receive a weekly report of your execution momentum, streaks, and focus metrics."
                  active={weeklyDigestEnabled}
                  onToggle={() => setWeeklyDigestEnabled(v => !v)}
                />
              </div>
            </SettingsSection>

            {/* ── Public Sharing ───────────────────────────── */}
            <SettingsSection title="Public Sharing" icon="share">
              <p className="font-body-md text-[12px] text-[var(--color-outline)] mb-4 leading-relaxed">
                Generate a secure, read-only link to share your focus chart, goal progress, and habit streaks with a mentor or accountability partner. Private journal entries will remain strictly hidden.
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
                      className="px-4 py-2 bg-[var(--color-primary)] text-black rounded-lg font-mono text-[9px] uppercase tracking-wider hover:opacity-90 transition-colors cursor-pointer active:scale-95 border-none"
                    >
                      Copy
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await request('http://localhost:8081/api/shares', { method: 'DELETE' });
                        setShareToken('');
                        showToast('Sharing link revoked successfully.', 'info');
                      } catch (err) {
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
                      const res = await request<any>('http://localhost:8081/api/shares', { method: 'POST' });
                      setShareToken(res.token);
                      showToast('Sharing link generated!', 'success');
                    } catch (err) {
                      showToast('Failed to generate link.', 'error');
                    }
                  }}
                  className="w-full py-3.5 bg-[var(--color-primary)] text-black font-mono text-[9px] font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 rounded-xl cursor-pointer active:scale-[0.98] shadow-md border-none"
                >
                  <span className="material-symbols-outlined text-[16px]">link</span> Create Accountability Link
                </button>
              )}
            </SettingsSection>

            {/* ── Security ──────────────────────────────────── */}
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
                    <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Updating...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[16px]">key</span> Update Password</>
                  )}
                </button>
              </div>
            </SettingsSection>

            {/* ── Actions ───────────────────────────────────── */}
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
                  <>
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Saved
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Save Settings
                  </>
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
        description="Are you sure you want to sign out? You will need to re-authenticate to access your node."
        confirmText="Sign Out"
        cancelText="Cancel"
        destructive={true}
      />
    </div>
  );
}
