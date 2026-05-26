import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

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
      className="flex items-center justify-between p-4 bg-[var(--color-surface-container-low)] rounded-xl border border-[var(--color-outline-variant)]/20 hover:border-[var(--color-primary)]/30 transition-all duration-200 group w-full text-left press-scale"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-variant)] flex items-center justify-center group-hover:bg-[var(--color-primary)]/15 transition-colors">
          <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-primary)] transition-colors">
            {icon}
          </span>
        </div>
        <div>
          <h3 className="font-title-md text-[15px] text-[var(--color-on-surface)] font-semibold">{title}</h3>
          <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)]">{desc}</p>
        </div>
      </div>

      {/* Toggle pill */}
      <div
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 shrink-0 ${
          active ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-variant)] border border-[var(--color-outline-variant)]'
        }`}
        style={{ boxShadow: active ? '0 0 10px color-mix(in srgb, var(--color-primary) 30%, transparent)' : 'none' }}
      >
        <div
          className={`absolute top-[3px] w-[18px] h-[18px] rounded-full shadow-sm transition-all duration-300 ${
            active ? 'bg-[var(--color-on-primary)] left-[26px]' : 'bg-[var(--color-outline)] left-[3px]'
          }`}
        />
      </div>
    </button>
  );
}

// ─── Settings Section wrapper ───────────────────────────────
function SettingsSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="bg-[var(--color-surface-container-low)] rounded-2xl border border-[var(--color-outline-variant)]/20 p-6 md:p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/3 to-transparent pointer-events-none" />
      <h2 className="font-title-md text-title-md text-[var(--color-on-surface)] mb-6 flex items-center gap-2.5 relative z-10">
        <span className="material-symbols-outlined text-[var(--color-secondary)]">{icon}</span>
        {title}
      </h2>
      <div className="relative z-10">{children}</div>
    </section>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [name, setName]   = useState(user?.name || 'Builder');
  const [email, setEmail] = useState(user?.email || 'builder@evolv.net');
  const [saved, setSaved] = useState(false);

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

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar w-full page-enter">
      <div className="max-w-[800px] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-8 pb-16 flex flex-col gap-6">

        {/* Header */}
        <header className="mb-2">
          <h1 className="font-headline-lg text-headline-lg text-[var(--color-primary)] text-4xl mb-1.5">Configuration</h1>
          <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)]">
            Calibrate your preferences and environmental parameters.
          </p>
        </header>

        {/* ── Identity ──────────────────────────────────── */}
        <SettingsSection title="Identity Parameters" icon="fingerprint">
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            {/* Avatar */}
            <div className="relative shrink-0">
              <img
                alt="Avatar"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFRESvWmL07H3BCrn86q8If8pHfMpmrmz9EGoUy8r0yujHOLn3Q3szEJ6j3QS0dPGkkkTjiUMcuFpvYiW2qSjqN-4NTH5ff20iiLoin9Uz-lQUifHxQ4747m_FBzbwXrSuKdXXiNoUcRdc-nWn8ssyxNqGyET4VAOHtqN3gK4F52B-c9CNl5eGUrAVw2tPs00tdwTJOdwQLyuHw9P0nL_83vRnU4tuBrgGuIE-yxtyfAWQE80jtZdaa-9mCo2J9svzcapWaFRAPuUa"
                className="w-24 h-24 rounded-full border-2 border-[var(--color-primary)]/40 ring-4 ring-[var(--color-primary)]/10 object-cover"
              />
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-[var(--color-surface-container)] rounded-full border border-[var(--color-outline-variant)] flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] hover:border-[var(--color-primary)] transition-all shadow-lg z-10">
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>
            </div>

            {/* Fields */}
            <div className="flex-1 w-full space-y-5">
              <div>
                <label className="font-label-sm text-label-sm text-[var(--color-on-surface-variant)] uppercase block mb-2">Designation</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] text-[var(--color-on-surface)] font-body-lg text-lg px-0 py-2 transition-colors outline-none"
                  type="text"
                />
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-[var(--color-on-surface-variant)] uppercase block mb-2">Com-Link (Email)</label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] text-[var(--color-on-surface)] font-body-lg text-lg px-0 py-2 transition-colors outline-none"
                  type="email"
                />
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* ── Appearance ────────────────────────────────── */}
        <SettingsSection title="Appearance" icon="palette">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Theme toggle card */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 press-scale group text-left ${
                theme === 'light'
                  ? 'bg-[var(--color-primary)]/8 border-[var(--color-primary)]/30'
                  : 'border-[var(--color-outline-variant)]/20 hover:border-[var(--color-primary)]/30'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-container-high)] flex items-center justify-center">
                <span className="material-symbols-outlined text-[var(--color-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
              </div>
              <div>
                <p className="font-title-md text-[15px] text-[var(--color-on-surface)] font-semibold">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </p>
                <p className="font-body-md text-[12px] text-[var(--color-on-surface-variant)]">
                  Currently: <span className="text-[var(--color-primary)] font-semibold capitalize">{theme}</span>
                </p>
              </div>
            </button>

            {/* Color palette teaser */}
            <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-outline-variant)]/20">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-container-high)] flex items-center justify-center">
                <span className="material-symbols-outlined text-[var(--color-secondary)]">colors</span>
              </div>
              <div>
                <p className="font-title-md text-[15px] text-[var(--color-on-surface)] font-semibold">Accent Color</p>
                <div className="flex gap-2 mt-1.5">
                  {['#d2bbff', '#5adace', '#f4a261', '#e76f51'].map(c => (
                    <div key={c} className="w-5 h-5 rounded-full border-2 border-[var(--color-outline-variant)]/30 cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* ── Sensory Controls ──────────────────────────── */}
        <SettingsSection title="Sensory Controls" icon="tune">
          <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] mb-5 -mt-2">
            Fine-tune animations and visual effects for your environment.
          </p>
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
            <div className="bg-[var(--color-surface-container)] rounded-xl p-4 border border-[var(--color-outline-variant)]/10">
              <label className="font-label-sm text-label-sm text-[var(--color-on-surface-variant)] uppercase block mb-3">Timezone</label>
              <div className="relative">
                <select className="w-full appearance-none bg-transparent border-b-2 border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] text-[var(--color-on-surface)] font-body-md py-2.5 pr-8 transition-colors outline-none">
                  <option>UTC (Coordinated Universal Time)</option>
                  <option>EST (Eastern Standard Time)</option>
                  <option>PST (Pacific Standard Time)</option>
                  <option>IST (India Standard Time)</option>
                </select>
                <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-[var(--color-outline)] pointer-events-none text-[20px]">expand_more</span>
              </div>
            </div>
            <div className="bg-[var(--color-surface-container)] rounded-xl p-4 border border-[var(--color-outline-variant)]/10">
              <label className="font-label-sm text-label-sm text-[var(--color-on-surface-variant)] uppercase block mb-3">Week Starts On</label>
              <div className="relative">
                <select className="w-full appearance-none bg-transparent border-b-2 border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] text-[var(--color-on-surface)] font-body-md py-2.5 pr-8 transition-colors outline-none">
                  <option>Monday</option>
                  <option>Sunday</option>
                </select>
                <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-[var(--color-outline)] pointer-events-none text-[20px]">expand_more</span>
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

        {/* ── Actions ───────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSave}
            className={`w-full py-4 font-label-sm text-label-sm uppercase tracking-widest text-lg rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-bold transform hover:-translate-y-1 press-scale ${
              saved
                ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                : 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[0_0_15px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] hover:shadow-[0_0_25px_color-mix(in_srgb,var(--color-primary)_50%,transparent)]'
            }`}
          >
            {saved ? (
              <>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Saved!
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Commit Changes
              </>
            )}
          </button>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full py-4 bg-transparent border border-[var(--color-error)]/40 text-[var(--color-error)] font-label-sm text-label-sm uppercase tracking-widest text-base rounded-xl hover:bg-[var(--color-error)]/8 transition-all duration-300 flex items-center justify-center gap-2 press-scale"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}
