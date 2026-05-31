import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';

// ── Constants ──────────────────────────────────────────────
const PRESETS = [
  { label: '25 min', seconds: 25 * 60, icon: 'timer' },
  { label: '45 min', seconds: 45 * 60, icon: 'hourglass_bottom' },
  { label: '90 min', seconds: 90 * 60, icon: 'hourglass_full' },
  { label: 'Custom', seconds: 0, icon: 'edit' },
];

const SOUNDS = [
  { id: 'rain',     icon: 'rainy',      label: 'Rain' },
  { id: 'binaural', icon: 'graphic_eq', label: 'Binaural' },
  { id: 'white',    icon: 'waves',      label: 'White Noise' },
  { id: 'forest',   icon: 'forest',     label: 'Forest' },
];

const WAVE_HEIGHTS = [30, 60, 45, 80, 55, 90, 40, 70, 50, 85, 35, 65];

// ── Helpers ────────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0'); }
function formatTime(s: number) {
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

// ── Web Audio Engine ───────────────────────────────────────
function createNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Starts ambient audio for the given sound ID.
 *  Returns a cleanup function that fades out and closes the AudioContext. */
function startAudio(soundId: string): () => void {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 1.2);
  master.connect(ctx.destination);

  let cleanupFns: Array<() => void> = [];

  if (soundId === 'white') {
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx);
    src.loop = true;
    src.connect(master);
    src.start();
    cleanupFns.push(() => src.stop());

  } else if (soundId === 'rain') {
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx);
    src.loop = true;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 1100;
    src.connect(lpf); lpf.connect(master);
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 1.2);
    src.start();

    // Random drip ticks
    const iv = window.setInterval(() => {
      if (ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.frequency.value = 700 + Math.random() * 600;
      g.gain.setValueAtTime(0.025, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    }, 150 + Math.random() * 350);

    cleanupFns.push(() => { src.stop(); window.clearInterval(iv); });

  } else if (soundId === 'binaural') {
    // 10 Hz alpha-wave beat: 200 Hz left, 210 Hz right
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.2);
    const merger = ctx.createChannelMerger(2);
    merger.connect(master);

    const mkOsc = (freq: number, ch: number) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(g); g.connect(merger, 0, ch);
      osc.start();
      return osc;
    };
    const left  = mkOsc(200, 0);
    const right = mkOsc(210, 1);
    cleanupFns.push(() => { left.stop(); right.stop(); });

  } else if (soundId === 'forest') {
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx);
    src.loop = true;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 500; bpf.Q.value = 0.4;
    const forestGain = ctx.createGain(); forestGain.gain.value = 0.08;
    src.connect(bpf); bpf.connect(forestGain); forestGain.connect(master);
    src.start();

    // Bird chirps
    const iv = window.setInterval(() => {
      if (ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      const f   = 1100 + Math.random() * 900;
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(f * 1.35, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.04, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    }, 900 + Math.random() * 1800);

    cleanupFns.push(() => { src.stop(); window.clearInterval(iv); });
  }

  return () => {
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
    cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
    setTimeout(() => { try { ctx.close(); } catch (_) {} }, 1100);
  };
}

// ── SVG Progress Ring ──────────────────────────────────────
function FocusRing({ pct, timeStr, running }: { pct: number; timeStr: string; running: boolean }) {
  const size = 280, strokeW = 5;
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className={`absolute inset-[-16px] rounded-full bg-[var(--color-primary)]/8 blur-[40px] ${running ? 'anim-breathe' : ''}`} />
      <svg width={size} height={size} className="absolute rotate-[-90deg]"
        style={{ filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--color-primary) 30%, transparent))' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-surface-container-highest)" strokeWidth={strokeW} opacity="0.4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#fg)" strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`}
          style={{ transition: running ? 'stroke-dasharray 1s linear' : 'stroke-dasharray 0.4s ease' }} />
        <defs>
          <linearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-secondary)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center w-[220px] h-[220px] rounded-full glass-panel border-none">
        <span className={`font-display-lg text-[var(--color-on-surface)] tracking-tighter select-none ${running ? 'anim-tick' : ''}`}
          style={{ fontSize: 56, lineHeight: 1, fontWeight: 200 }}>
          {timeStr}
        </span>
        <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-[0.4em] mt-3">
          {running ? 'Remaining' : 'Paused'}
        </span>
      </div>
    </div>
  );
}

// ── Animated Waveform ──────────────────────────────────────
function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-8" aria-hidden="true">
      {WAVE_HEIGHTS.map((h, i) => (
        <div key={i}
          className={`w-[3px] rounded-full bg-gradient-to-t from-[var(--color-primary)] to-[var(--color-secondary)] transition-opacity duration-300 ${active ? 'anim-wave' : 'opacity-25'}`}
          style={{ height: h * 0.4 + 'px', animationDelay: `${i * 0.08}s`, animationDuration: `${0.9 + (i % 3) * 0.3}s`, transformOrigin: 'bottom' }}
        />
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export function FocusModePage() {
  const navigate = useNavigate();

  const [totalSecs, setTotalSecs]   = useState(25 * 60);
  const [remaining, setRemaining]   = useState(25 * 60);
  const [running, setRunning]       = useState(false);
  const [finished, setFinished]     = useState(false);
  const [sound, setSound]           = useState('binaural');
  const [selectedPreset, setPreset] = useState(0);
  const [customMins, setCustomMins] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopAudioRef = useRef<(() => void) | null>(null);

  const pct     = totalSecs > 0 ? (totalSecs - remaining) / totalSecs : 0;
  const timeStr = formatTime(remaining);

  // ── Audio lifecycle ──────────────────────────────────────
  useEffect(() => {
    if (running) {
      stopAudioRef.current?.();
      stopAudioRef.current = startAudio(sound);
    } else {
      stopAudioRef.current?.();
      stopAudioRef.current = null;
    }
    return () => { stopAudioRef.current?.(); stopAudioRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, sound]);

  // ── Timer lifecycle ──────────────────────────────────────
  const tick = useCallback(() => {
    setRemaining(prev => {
      if (prev <= 1) { setRunning(false); setFinished(true); return 0; }
      return prev - 1;
    });
  }, []);

  useEffect(() => {
    if (running) intervalRef.current = setInterval(tick, 1000);
    else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  // ── Handlers ─────────────────────────────────────────────
  const handlePreset = (idx: number, secs: number) => {
    if (secs === 0) { setShowCustom(true); setPreset(idx); return; }
    setShowCustom(false); setPreset(idx);
    setTotalSecs(secs); setRemaining(secs);
    setRunning(false); setFinished(false);
  };

  const handleCustom = () => {
    const m = parseInt(customMins, 10);
    if (!m || m < 1 || m > 180) return;
    const secs = m * 60;
    setTotalSecs(secs); setRemaining(secs);
    setRunning(false); setFinished(false); setShowCustom(false);
  };

  const handleToggle = () => { if (!finished) setRunning(r => !r); };
  const handleReset  = () => { setRunning(false); setFinished(false); setRemaining(totalSecs); };
  const handleEndSession = () => {
    const elapsedSeconds = totalSecs - remaining;
    navigate('/summary', { state: { elapsedSeconds, totalSecs } });
  };

  return (
    <div className="flex-1 w-full flex flex-col relative z-10 min-h-screen overflow-hidden page-enter">
      <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-[var(--color-primary)]/8 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[var(--color-secondary)]/6 blur-[120px] pointer-events-none" />

      <main className="flex-1 w-full max-w-md mx-auto flex flex-col items-center px-[var(--spacing-margin-mobile)] py-10 gap-8 relative z-10">

        {/* Status pill */}
        <div className="flex items-center gap-2 bg-[var(--color-primary)]/6 border border-[var(--color-primary)]/20 rounded-full px-5 py-2 backdrop-blur-xl">
          <span className={`w-2 h-2 rounded-full bg-[var(--color-secondary)] ${running ? 'animate-ping absolute' : ''}`} />
          <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)] relative"
            style={{ boxShadow: running ? '0 0 8px rgba(90,218,206,1)' : 'none' }} />
          <span className="font-label-sm text-[10px] text-[var(--color-primary)] tracking-[0.3em] uppercase font-bold">
            {finished ? 'Session Complete' : running ? 'Deep Focus Active' : 'Focus Ready'}
          </span>
        </div>

        {/* Presets */}
        <div className="flex gap-2 w-full justify-center flex-wrap">
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={() => handlePreset(i, p.seconds)} disabled={running}
              className={`px-4 py-2 rounded-full font-label-sm text-[11px] uppercase tracking-widest border transition-all duration-200 press-scale disabled:opacity-40 ${
                selectedPreset === i
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)] shadow-[0_0_15px_rgba(210,187,255,0.3)]'
                  : 'border-[var(--color-outline-variant)]/40 text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom duration input */}
        {showCustom && (
          <div className="flex items-center gap-3 w-full bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30 rounded-xl px-4 py-3 anim-fade-up">
            <span className="material-symbols-outlined text-[var(--color-primary)] text-[20px]">timer</span>
            <input autoFocus type="number" min={1} max={180} value={customMins}
              onChange={e => setCustomMins(e.target.value)} placeholder="Minutes (1–180)"
              className="flex-1 bg-transparent outline-none text-[var(--color-on-surface)] font-body-md placeholder:text-[var(--color-outline)]" />
            <button onClick={handleCustom}
              className="px-3 py-1 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full font-label-sm text-[11px]">
              Set
            </button>
          </div>
        )}

        {/* Timer ring / completion */}
        <div className="flex flex-col items-center gap-6 flex-1 justify-center w-full">
          {finished ? (
            <div className="flex flex-col items-center gap-4 anim-celeb">
              <div className="w-28 h-28 rounded-full bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center anim-glow-burst">
                <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                  <circle cx="30" cy="30" r="26" stroke="var(--color-primary)" strokeWidth="3" fill="none"
                    strokeDasharray="163.4" strokeDashoffset="163.4" strokeLinecap="round" className="svg-stroke-draw" />
                  <polyline points="18,30 26,40 42,20" stroke="var(--color-primary)" strokeWidth="3.5" fill="none"
                    strokeLinecap="round" strokeLinejoin="round" strokeDasharray="50" strokeDashoffset="50"
                    className="svg-stroke-draw" style={{ animationDelay: '0.35s' }} />
                </svg>
              </div>
              <p className="font-title-md text-title-md text-[var(--color-on-surface)]">Session Complete!</p>
              <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] text-center max-w-[240px]">
                {formatTime(totalSecs)} of focused execution. Outstanding.
              </p>
            </div>
          ) : (
            <FocusRing pct={pct} timeStr={timeStr} running={running} />
          )}

          {/* Controls */}
          <div className="flex items-center gap-4 mt-2">
            <button onClick={handleReset} title="Reset"
              className="w-12 h-12 rounded-full border border-[var(--color-outline-variant)]/40 flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:border-[var(--color-outline-variant)] transition-all press-scale">
              <span className="material-symbols-outlined text-[22px]">restart_alt</span>
            </button>

            {!finished && (
              <button onClick={handleToggle} title={running ? 'Pause' : 'Start'}
                className="w-20 h-20 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center shadow-[0_0_30px_color-mix(in_srgb,var(--color-primary)_40%,transparent)] hover:shadow-[0_0_40px_color-mix(in_srgb,var(--color-primary)_60%,transparent)] transition-all duration-300 press-scale">
                <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {running ? 'pause' : 'play_arrow'}
                </span>
              </button>
            )}

            <button onClick={handleEndSession} title="End Session"
              className="w-12 h-12 rounded-full border border-[var(--color-outline-variant)]/40 flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-error)] hover:border-[var(--color-error)]/40 transition-all press-scale">
              <span className="material-symbols-outlined text-[22px]">stop_circle</span>
            </button>
          </div>
        </div>

        {/* Sound selector */}
        <div className="w-full flex flex-col items-center gap-3">
          <Waveform active={running} />
          <div className="flex items-center gap-2 bg-[var(--color-surface-container)]/60 backdrop-blur-xl border border-[var(--color-outline-variant)]/20 rounded-full p-1.5">
            {SOUNDS.map(s => (
              <button key={s.id} aria-label={s.label} onClick={() => setSound(s.id)} title={s.label}
                className={`p-3 rounded-full transition-all duration-200 flex items-center justify-center press-scale ${
                  sound === s.id
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/25 shadow-[0_0_12px_color-mix(in_srgb,var(--color-primary)_20%,transparent)]'
                    : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)]/50 hover:text-[var(--color-primary)]'
                }`}>
                <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
              </button>
            ))}
          </div>
          <p className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest">
            {SOUNDS.find(s => s.id === sound)?.label} · Zen Ambient{running ? ' · Live' : ''}
          </p>
        </div>

      </main>
    </div>
  );
}
