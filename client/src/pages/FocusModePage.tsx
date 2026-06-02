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
  const size = 300, strokeW = 4;
  const r = (size - 60 - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]" style={{ width: size, height: size }}>
      {running && (
        <div className="absolute inset-0 border border-[var(--color-primary)]/50 pointer-events-none animate-pulse" />
      )}
      
      <svg width={size-60} height={size-60} className="absolute rotate-[-90deg]">
        <circle cx={(size-60)/2} cy={(size-60)/2} r={r} fill="none" stroke="var(--color-surface-variant)" strokeWidth={strokeW} opacity="0.5" />
        <circle cx={(size-60)/2} cy={(size-60)/2} r={r} fill="none" stroke="var(--color-primary)" strokeWidth={strokeW}
          strokeDasharray={`${circ * pct} ${circ}`}
          style={{ transition: running ? 'stroke-dasharray 1s linear' : 'stroke-dasharray 0.4s ease' }} />
      </svg>
      
      <div className="relative z-10 flex flex-col items-center justify-center">
        <span className={`font-mono text-[var(--color-on-surface)] tracking-tight select-none`}
          style={{ fontSize: 56, lineHeight: 1, fontWeight: 300 }}>
          {timeStr}
        </span>
        <span className="font-label-sm text-[10px] text-[var(--color-primary)] font-bold uppercase tracking-widest mt-4">
          {running ? 'Execution Active' : 'System Paused'}
        </span>
      </div>
    </div>
  );
}

// ── Animated Waveform ──────────────────────────────────────
function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[4px] h-8" aria-hidden="true">
      {WAVE_HEIGHTS.map((h, i) => (
        <div key={i}
          className={`w-[4px] bg-[var(--color-primary)] transition-opacity duration-300 ${active ? 'anim-wave' : 'opacity-20'}`}
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
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] items-center overflow-hidden">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[var(--color-outline-variant)] relative">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between px-8 py-6 border-b border-[var(--color-outline-variant)] shrink-0 bg-[var(--color-surface-container-lowest)] gap-4">
          <div>
            <h2 className="font-title-md text-[32px] font-medium tracking-tight text-[var(--color-primary-fixed)]">
              Deep Focus
            </h2>
            <p className="font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest mt-1 font-bold">
              UNINTERRUPTED EXECUTION MODE
            </p>
          </div>
          
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Status</span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 ${finished ? 'bg-[var(--color-secondary)]' : running ? 'bg-[var(--color-primary)] animate-pulse' : 'bg-[var(--color-outline)]'}`} />
                <span className="font-label-sm text-[12px] text-[var(--color-on-surface)] uppercase tracking-widest font-bold">
                  {finished ? 'COMPLETE' : running ? 'ACTIVE' : 'IDLE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 w-full flex flex-col items-center justify-center p-8 gap-10 bg-[var(--color-surface-container-low)] relative overflow-y-auto no-scrollbar pb-32">

          {/* Presets */}
          <div className="flex gap-4 w-full justify-center flex-wrap">
            {PRESETS.map((p, i) => (
              <button key={p.label} onClick={() => handlePreset(i, p.seconds)} disabled={running}
                className={`px-6 py-3 font-label-sm text-[11px] uppercase tracking-widest font-bold border transition-colors disabled:opacity-40 ${
                  selectedPreset === i
                    ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]'
                    : 'bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom duration input */}
          {showCustom && (
            <div className="flex items-center gap-3 w-full max-w-sm bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-2">
              <input autoFocus type="number" min={1} max={180} value={customMins}
                onChange={e => setCustomMins(e.target.value)} placeholder="Minutes (1–180)"
                className="flex-1 bg-transparent px-3 outline-none text-[var(--color-on-surface)] font-body-md placeholder:text-[var(--color-outline)]" />
              <button onClick={handleCustom}
                className="px-6 py-2 bg-[var(--color-primary)] text-black font-label-sm text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-primary-fixed)] transition-colors">
                Set
              </button>
            </div>
          )}

          {/* Timer ring / completion */}
          <div className="flex flex-col items-center gap-8 w-full">
            {finished ? (
              <div className="flex flex-col items-center gap-6 p-12 border border-[var(--color-primary)] bg-[var(--color-surface-container)] w-full max-w-md">
                <div className="w-16 h-16 bg-[var(--color-primary)] text-black flex items-center justify-center">
                  <span className="material-symbols-outlined text-[32px] font-bold">done_all</span>
                </div>
                <div className="text-center">
                  <p className="font-label-sm text-[14px] text-[var(--color-on-surface)] font-bold uppercase tracking-widest mb-2">Session Complete</p>
                  <p className="font-body-md text-[13px] text-[var(--color-outline)]">
                    {formatTime(totalSecs)} of focused execution. Outstanding.
                  </p>
                </div>
              </div>
            ) : (
              <FocusRing pct={pct} timeStr={timeStr} running={running} />
            )}

            {/* Controls */}
            <div className="flex items-center gap-6 mt-4">
              <button onClick={handleReset} title="Reset"
                className="w-14 h-14 border border-[var(--color-outline-variant)] flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface)] hover:border-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors">
                <span className="material-symbols-outlined text-[24px]">restart_alt</span>
              </button>

              {!finished && (
                <button onClick={handleToggle} title={running ? 'Pause' : 'Start'}
                  className={`w-24 h-16 border flex items-center justify-center transition-colors ${
                    running 
                      ? 'bg-[var(--color-surface-container)] text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10' 
                      : 'bg-[var(--color-primary)] text-black border-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)]'
                  }`}>
                  <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {running ? 'pause' : 'play_arrow'}
                  </span>
                </button>
              )}

              <button onClick={handleEndSession} title="End Session"
                className="w-14 h-14 border border-[var(--color-outline-variant)] flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-error)] hover:border-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors">
                <span className="material-symbols-outlined text-[24px]">stop_circle</span>
              </button>
            </div>
          </div>

          {/* Sound selector */}
          <div className="w-full flex flex-col items-center gap-6 mt-8">
            <Waveform active={running} />
            <div className="flex items-center border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
              {SOUNDS.map(s => (
                <button key={s.id} aria-label={s.label} onClick={() => setSound(s.id)} title={s.label}
                  className={`w-14 h-14 border-r border-[var(--color-outline-variant)] last:border-r-0 transition-colors flex items-center justify-center ${
                    sound === s.id
                      ? 'bg-[var(--color-primary)] text-black'
                      : 'text-[var(--color-outline)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)]'
                  }`}>
                  <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-none bg-[var(--color-secondary)]" />
              <p className="font-label-sm text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-widest">
                {SOUNDS.find(s => s.id === sound)?.label} · Ambient Engine
              </p>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
