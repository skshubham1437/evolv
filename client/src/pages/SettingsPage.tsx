import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { request } from '../api';

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
      className="flex items-center justify-between p-4 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]/50 transition-colors group w-full text-left"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[var(--color-surface-container-high)] flex items-center justify-center border border-transparent group-hover:border-[var(--color-primary)]/30 transition-colors">
          <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] transition-colors">
            {icon}
          </span>
        </div>
        <div>
          <h3 className="font-body-md text-[14px] text-[var(--color-on-surface)] font-bold">{title}</h3>
          <p className="font-body-md text-[12px] text-[var(--color-on-surface-variant)]">{desc}</p>
        </div>
      </div>

      {/* Toggle rigid box */}
      <div
        className={`relative w-12 h-6 border transition-colors duration-200 shrink-0 ${
          active ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'bg-[var(--color-surface-container-lowest)] border-[var(--color-outline-variant)]'
        }`}
      >
        <div
          className={`absolute top-0.5 w-[18px] h-[18px] transition-all duration-200 ${
            active ? 'bg-black left-[27px]' : 'bg-[var(--color-outline)] left-0.5'
          }`}
        />
      </div>
    </button>
  );
}

// ─── Settings Section wrapper ───────────────────────────────
function SettingsSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] p-8">
      <h2 className="font-label-sm text-[12px] font-bold uppercase tracking-widest text-[var(--color-on-surface)] mb-6 flex items-center gap-2 border-b border-[var(--color-surface-variant)] pb-3">
        <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">{icon}</span>
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
  const [email, setEmail] = useState(user?.email || 'builder@evolv.net');
  const [saved, setSaved] = useState(false);
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [emailChanged, setEmailChanged] = useState(false);

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

  useEffect(() => {
    if (user?.preferences) {
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
  }, [user]);

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

    const body: Record<string, string> = {
      name,
      preferences: JSON.stringify(prefsObj),
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


  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] items-center overflow-hidden">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[var(--color-outline-variant)] relative">

        <div className="flex-1 overflow-y-auto no-scrollbar bg-[var(--color-surface-container-low)] pb-32">
          
          {/* Header */}
          <header className="px-8 py-6 border-b border-[var(--color-outline-variant)] shrink-0 bg-[var(--color-surface-container-lowest)]">
            <h1 className="font-title-md text-[32px] font-medium tracking-tight text-[var(--color-primary-fixed)]">System Config</h1>
            <p className="font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest mt-1 font-bold">
              CALIBRATE ENVIRONMENTAL PARAMETERS
            </p>
          </header>

          <div className="p-8 flex flex-col gap-8 max-w-4xl mx-auto w-full">

            {/* ── Identity ──────────────────────────────────── */}
            <SettingsSection title="Identity Parameters" icon="fingerprint">
              <div className="flex flex-col sm:flex-row gap-8 items-start">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-24 h-24 border border-[var(--color-primary)] p-1 bg-[var(--color-surface-container)]">
                    <img
                      alt="Avatar"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFRESvWmL07H3BCrn86q8If8pHfMpmrmz9EGoUy8r0yujHOLn3Q3szEJ6j3QS0dPGkkkTjiUMcuFpvYiW2qSjqN-4NTH5ff20iiLoin9Uz-lQUifHxQ4747m_FBzbwXrSuKdXXiNoUcRdc-nWn8ssyxNqGyET4VAOHtqN3gK4F52B-c9CNl5eGUrAVw2tPs00tdwTJOdwQLyuHw9P0nL_83vRnU4tuBrgGuIE-yxtyfAWQE80jtZdaa-9mCo2J9svzcapWaFRAPuUa"
                      className="w-full h-full object-cover grayscale opacity-80"
                    />
                  </div>
                  <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-[var(--color-primary)] text-black border border-[var(--color-primary)] flex items-center justify-center hover:bg-[var(--color-primary-fixed)] transition-colors">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                </div>

                {/* Fields */}
                <div className="flex-1 w-full space-y-6">
                  <div>
                    <label className="font-label-sm text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-2">Designation</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] text-[var(--color-on-surface)] font-body-md text-[14px] px-4 py-3 transition-colors outline-none"
                      type="text"
                    />
                  </div>
                  <div>
                    <label className="font-label-sm text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-2">Com-Link (Email)</label>
                    <input
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailChanged(e.target.value !== user?.email); }}
                      className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] text-[var(--color-on-surface)] font-body-md text-[14px] px-4 py-3 transition-colors outline-none"
                      type="email"
                    />
                  </div>
                  {emailChanged && (
                    <div>
                      <label className="font-label-sm text-[10px] text-[var(--color-error)] font-bold uppercase tracking-widest block mb-2">Current Password (required to change email)</label>
                      <input
                        value={currentPasswordForEmail}
                        onChange={e => setCurrentPasswordForEmail(e.target.value)}
                        className="w-full bg-[var(--color-surface-container)] border border-[var(--color-error)] focus:border-[var(--color-error)] text-[var(--color-on-surface)] font-body-md text-[14px] px-4 py-3 transition-colors outline-none"
                        type="password"
                        placeholder="Confirm identity..."
                        autoComplete="current-password"
                      />
                    </div>
                  )}
                </div>
              </div>
            </SettingsSection>

            {/* ── Appearance ────────────────────────────────── */}
            <SettingsSection title="Appearance" icon="palette">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Theme toggle card */}
                <button
                  onClick={toggleTheme}
                  className={`flex items-center gap-4 p-4 border transition-colors group text-left ${
                    theme === 'light'
                      ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]'
                      : 'bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <div className={`w-12 h-12 flex items-center justify-center border ${theme === 'light' ? 'bg-black/10 border-black/20' : 'bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)]'}`}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                    </span>
                  </div>
                  <div>
                    <p className={`font-body-md text-[14px] font-bold ${theme === 'light' ? 'text-black' : 'text-[var(--color-on-surface)]'}`}>
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </p>
                    <p className={`font-label-sm text-[10px] uppercase tracking-widest font-bold mt-1 ${theme === 'light' ? 'text-black/60' : 'text-[var(--color-outline)]'}`}>
                      Active: {theme}
                    </p>
                  </div>
                </button>

                {/* Color palette teaser */}
                <div className="flex items-center gap-4 p-4 border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
                  <div className="w-12 h-12 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[var(--color-secondary)]">colors</span>
                  </div>
                  <div>
                    <p className="font-body-md text-[14px] text-[var(--color-on-surface)] font-bold">Accent Color</p>
                    <div className="flex gap-2 mt-2">
                      {['#d2bbff', '#5adace', '#f4a261', '#e76f51'].map(c => (
                        <div key={c} className="w-5 h-5 border border-[var(--color-outline-variant)] cursor-pointer hover:border-[var(--color-on-surface)] transition-colors" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </SettingsSection>

            {/* ── Sensory Controls ──────────────────────────── */}
            <SettingsSection title="Sensory Controls" icon="tune">
              <div className="space-y-3">
                <ToggleNode
                  icon="blur_on"
                  title="Ambient Orbs"
                  desc="Floating background gradient spheres."
                  active={ambientOrbs}
                  onToggle={() => setAmbientOrbs(v => !v)}
                />
                <ToggleNode
                  icon="transition_slide"
                  title="Page Transitions"
                  desc="Fade-up animation when navigating between screens."
                  active={pageTransitions}
                  onToggle={() => setPageTransitions(v => !v)}
                />
                <ToggleNode
                  icon="auto_awesome"
                  title="Habit Glow Effects"
                  desc="Glow pulse on active and completed habit items."
                  active={habitGlows}
                  onToggle={() => setHabitGlows(v => !v)}
                />
                <ToggleNode
                  icon="timer"
                  title="Timer Pulse"
                  desc="Subtle breathing animation on the focus countdown."
                  active={timerTick}
                  onToggle={() => setTimerTick(v => !v)}
                />
                <ToggleNode
                  icon="graphic_eq"
                  title="Waveform Visualizer"
                  desc="Animated soundwave bars in Focus Mode."
                  active={waveforms}
                  onToggle={() => setWaveforms(v => !v)}
                />
              </div>
            </SettingsSection>

            {/* ── Environment ───────────────────────────────── */}
            <SettingsSection title="Environment Matrix" icon="public">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--color-surface-container)] p-5 border border-[var(--color-outline-variant)]">
                  <label className="font-label-sm text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-3">Timezone</label>
                  <div className="relative">
                    <select className="w-full appearance-none bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] text-[var(--color-on-surface)] font-body-md text-[13px] px-4 py-3 pr-10 transition-colors outline-none cursor-pointer">
                      <option>UTC (Coordinated Universal Time)</option>
                      <option>EST (Eastern Standard Time)</option>
                      <option>PST (Pacific Standard Time)</option>
                      <option>IST (India Standard Time)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] pointer-events-none text-[20px]">expand_more</span>
                  </div>
                </div>
                <div className="bg-[var(--color-surface-container)] p-5 border border-[var(--color-outline-variant)]">
                  <label className="font-label-sm text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-3">Week Starts On</label>
                  <div className="relative">
                    <select className="w-full appearance-none bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] text-[var(--color-on-surface)] font-body-md text-[13px] px-4 py-3 pr-10 transition-colors outline-none cursor-pointer">
                      <option>Monday</option>
                      <option>Sunday</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)] pointer-events-none text-[20px]">expand_more</span>
                  </div>
                </div>
              </div>
            </SettingsSection>

            {/* ── Ecosystem Nodes ───────────────────────────── */}
            <SettingsSection title="Ecosystem Nodes" icon="device_hub">
              <div className="space-y-3">
                <ToggleNode icon="schedule"       title="Chronos Sync"  desc="Calendar and temporal planning alignment."   active={chronosSync}   onToggle={() => setChronos(v => !v)} />
                <ToggleNode icon="monitor_heart"  title="Bio-Metrics"   desc="Health tracking and physical state nodes."    active={bioMetrics}    onToggle={() => setBioMetrics(v => !v)} />
                <ToggleNode icon="directions_run" title="Kinetic Track" desc="Location and movement mapping protocol."      active={kineticTrack}  onToggle={() => setKinetic(v => !v)} />
                <ToggleNode icon="graphic_eq"     title="Audio State"   desc="Brainwave entrainment and focus sounds."      active={audioState}    onToggle={() => setAudio(v => !v)} />
              </div>
            </SettingsSection>

            {/* ── Security ──────────────────────────────────── */}
            <SettingsSection title="Security Protocol" icon="lock">
              <div className="space-y-4">
                <div>
                  <label className="font-label-sm text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-2">Current Password</label>
                  <input
                    value={cpCurrent}
                    onChange={e => { setCpCurrent(e.target.value); setCpError(''); }}
                    className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] text-[var(--color-on-surface)] font-body-md text-[14px] px-4 py-3 transition-colors outline-none"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-2">New Password</label>
                  <input
                    value={cpNew}
                    onChange={e => { setCpNew(e.target.value); setCpError(''); }}
                    className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] text-[var(--color-on-surface)] font-body-md text-[14px] px-4 py-3 transition-colors outline-none"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-widest block mb-2">Confirm New Password</label>
                  <input
                    value={cpConfirm}
                    onChange={e => { setCpConfirm(e.target.value); setCpError(''); }}
                    className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] text-[var(--color-on-surface)] font-body-md text-[14px] px-4 py-3 transition-colors outline-none"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                  />
                </div>
                {cpError && (
                  <p className="text-[var(--color-error)] text-[12px] font-bold font-label-sm">{cpError}</p>
                )}
                <button
                  onClick={handleChangePassword}
                  disabled={cpSaving}
                  className="w-full py-3 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] text-[var(--color-on-surface)] font-label-sm text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
            <div className="flex gap-4 mt-4">
              <button
                onClick={async () => { await logout(); navigate('/login'); }}
                className="flex-[1] py-4 bg-transparent border border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-black font-label-sm text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Sign Out
              </button>
              
              <button
                onClick={handleSave}
                className={`flex-[2] py-4 font-label-sm text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${
                  saved
                    ? 'bg-[var(--color-secondary)] text-black'
                    : 'bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-fixed)]'
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
                    Commit Config
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
