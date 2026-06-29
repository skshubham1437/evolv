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
  { id: 'none',     icon: 'volume_off', label: 'Mute' },
  { id: 'rain',     icon: 'rainy',      label: 'Rain' },
  { id: 'binaural', icon: 'graphic_eq', label: 'Binaural' },
  { id: 'white',    icon: 'waves',      label: 'White Noise' },
  { id: 'forest',   icon: 'forest',     label: 'Forest' },
  { id: 'lofi',     icon: 'music_note', label: 'Lofi Beats' },
  { id: 'cafe',     icon: 'coffee',     label: 'Cafe Hum' },
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

function startAudio(soundId: string): (() => void) | null {
  if (soundId === 'none') return null;
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
    // 1. Deep wind layer
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = createNoiseBuffer(ctx, 4);
    windSrc.loop = true;
    const windLPF = ctx.createBiquadFilter();
    windLPF.type = 'lowpass';
    windLPF.frequency.value = 150;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.15;
    windSrc.connect(windLPF);
    windLPF.connect(windGain);
    windGain.connect(master);
    windSrc.start();

    // 2. Leaf rustle layer
    const leavesSrc = ctx.createBufferSource();
    leavesSrc.buffer = createNoiseBuffer(ctx, 4);
    leavesSrc.loop = true;
    const leavesBPF = ctx.createBiquadFilter();
    leavesBPF.type = 'bandpass';
    leavesBPF.frequency.value = 900;
    leavesBPF.Q.value = 0.25;
    const leavesGain = ctx.createGain();
    leavesGain.gain.value = 0.05;
    leavesSrc.connect(leavesBPF);
    leavesBPF.connect(leavesGain);
    leavesGain.connect(master);
    leavesSrc.start();

    // 3. Cluster bird chirps connected to master
    let forestTimer: number | null = null;
    const scheduleBirdCluster = () => {
      if (ctx.state === 'closed') return;
      
      const now = ctx.currentTime;
      const numChirps = 2 + Math.floor(Math.random() * 3); // 2-4 chirps in a group
      const baseFreq = 1500 + Math.random() * 800;
      
      for (let i = 0; i < numChirps; i++) {
        const delay = i * 0.15; // Space chirps apart
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq + (Math.random() * 200 - 100), now + delay);
        // Sweep UPWARD in frequency
        osc.frequency.exponentialRampToValueAtTime((baseFreq * 1.3), now + delay + 0.08);
        
        g.gain.setValueAtTime(0, now + delay);
        g.gain.linearRampToValueAtTime(0.04, now + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.12);
        
        osc.connect(g);
        g.connect(master);
        osc.start(now + delay);
        osc.stop(now + delay + 0.13);
      }
      
      forestTimer = window.setTimeout(scheduleBirdCluster, 3000 + Math.random() * 5000);
    };
    
    forestTimer = window.setTimeout(scheduleBirdCluster, 1000);

    cleanupFns.push(() => {
      windSrc.stop();
      leavesSrc.stop();
      if (forestTimer !== null) window.clearTimeout(forestTimer);
    });

  } else if (soundId === 'lofi') {
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 1.5);
    
    const chords = [
      [220, 261.63, 329.63, 392.00], // Am7
      [293.66, 349.23, 440.00, 523.25], // Dm7
      [196.00, 246.94, 293.66, 392.00], // G7
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
    ];
    let chordIdx = 0;
    let lofiTimer: number | null = null;
    
    const playChord = () => {
      if (ctx.state === 'closed') return;
      const now = ctx.currentTime;
      const notes = chords[chordIdx];
      chordIdx = (chordIdx + 1) % chords.length;
      
      notes.forEach(freq => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.06, now + 0.6);
        g.gain.setValueAtTime(0.06, now + 3.0);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);
        
        osc.connect(g);
        g.connect(master);
        osc.start(now);
        osc.stop(now + 5);
      });
      
      // Soft kick-like thud on beat 2
      const tickOsc = ctx.createOscillator();
      const tickGain = ctx.createGain();
      tickOsc.type = 'sine';
      tickOsc.frequency.setValueAtTime(90, now + 2.0);
      tickOsc.frequency.exponentialRampToValueAtTime(50, now + 2.15);
      tickGain.gain.setValueAtTime(0.12, now + 2.0);
      tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);
      tickOsc.connect(tickGain);
      tickGain.connect(master);
      tickOsc.start(now + 2.0);
      tickOsc.stop(now + 2.4);

      lofiTimer = window.setTimeout(playChord, 4800);
    };
    
    playChord();
    cleanupFns.push(() => { if (lofiTimer !== null) window.clearTimeout(lofiTimer); });

  } else if (soundId === 'cafe') {
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 1.5);

    // 1. Murmur noise layer 1 (low-mid frequency chatter)
    const chatterSrc = ctx.createBufferSource();
    chatterSrc.buffer = createNoiseBuffer(ctx, 6);
    chatterSrc.loop = true;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 350;
    bpf.Q.value = 0.5;
    const chatterGain = ctx.createGain();
    chatterGain.gain.value = 0.10;
    chatterSrc.connect(bpf);
    bpf.connect(chatterGain);
    chatterGain.connect(master);
    chatterSrc.start();

    // 2. Murmur noise layer 2 (higher-mid frequency chatter)
    const chatterSrc2 = ctx.createBufferSource();
    chatterSrc2.buffer = createNoiseBuffer(ctx, 5);
    chatterSrc2.loop = true;
    const bpf2 = ctx.createBiquadFilter();
    bpf2.type = 'bandpass';
    bpf2.frequency.value = 850;
    bpf2.Q.value = 0.3;
    const chatterGain2 = ctx.createGain();
    chatterGain2.gain.value = 0.05;
    chatterSrc2.connect(bpf2);
    bpf2.connect(chatterGain2);
    chatterGain2.connect(master);
    chatterSrc2.start();

    // 3. Modulated LFO to simulate crowd swells
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(chatterGain.gain);
    lfo.start();

    // 4. Multi-frequency metallic clinks (simulating ceramic cups/spoons)
    let cafeTimer: number | null = null;
    const scheduleClink = () => {
      if (ctx.state === 'closed') return;
      
      const now = ctx.currentTime;
      const baseFreq = 2200 + Math.random() * 1200;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, now);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 1.62, now); // non-harmonic metallic ring
      
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.015, now + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06); // fast decay
      
      osc1.connect(g);
      osc2.connect(g);
      g.connect(master);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.08);
      osc2.stop(now + 0.08);
      
      cafeTimer = window.setTimeout(scheduleClink, 1500 + Math.random() * 4500);
    };
    
    cafeTimer = window.setTimeout(scheduleClink, 800);

    cleanupFns.push(() => {
      chatterSrc.stop();
      chatterSrc2.stop();
      lfo.stop();
      if (cafeTimer !== null) window.clearTimeout(cafeTimer);
    });
  }

  return () => {
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
    cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
    setTimeout(() => { try { ctx.close(); } catch (_) {} }, 1100);
  };
}

// ── SVG Progress Ring ──────────────────────────────────────
function FocusRing({ pct, timeStr, running, totalSecs, remaining }: { pct: number; timeStr: string; running: boolean; totalSecs: number; remaining: number }) {
  const size = 340, strokeW = 5;
  const cx = size / 2, cy = size / 2;
  const rOuter = 148;          // main progress ring
  const rInner = 134;          // thin inner accent ring
  const rTicks = 158;          // where the minute ticks sit
  const circOuter = 2 * Math.PI * rOuter;
  const circInner = 2 * Math.PI * rInner;
  const elapsed = totalSecs - remaining;
  const elapsedMins = Math.floor(elapsed / 60);
  const elapsedSecs = elapsed % 60;

  // Head dot position (follows progress arc tip)
  const headAngle = pct * 360 - 90; // -90 because SVG starts at top
  const headRad = (headAngle * Math.PI) / 180;
  const headX = cx + rOuter * Math.cos(headRad);
  const headY = cy + rOuter * Math.sin(headRad);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      
      {/* Ambient glow behind the ring when running */}
      {running && (
        <div className="absolute inset-0 rounded-full pointer-events-none" 
          style={{ 
            background: 'radial-gradient(circle, rgba(210,187,255,0.04) 0%, transparent 70%)',
            animation: 'pulse 3s ease-in-out infinite' 
          }} 
        />
      )}

      <svg width={size} height={size} className="absolute overflow-visible pointer-events-none">
        <defs>
          <linearGradient id="progress-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="sweep-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
          <filter id="head-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="ring-glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── 60 Minute Tick Marks ────────────────────── */}
        {Array.from({ length: 60 }).map((_, i) => {
          const deg = i * 6; // 360/60
          const isMajor = i % 5 === 0;
          const len = isMajor ? 10 : 5;
          return (
            <line
              key={`tick-${i}`}
              x1={cx}
              y1={cy - rTicks}
              x2={cx}
              y2={cy - rTicks + len}
              stroke={isMajor ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)'}
              strokeWidth={isMajor ? '1.5' : '0.75'}
              transform={`rotate(${deg} ${cx} ${cy})`}
            />
          );
        })}

        {/* ── Quarter Labels (12, 3, 6, 9 o'clock positions) ── */}
        {[
          { angle: -90, label: '0' },
          { angle: 0, label: '15' },
          { angle: 90, label: '30' },
          { angle: 180, label: '45' },
        ].map(({ angle, label }) => {
          const labelR = rTicks + 14;
          const rad = (angle * Math.PI) / 180;
          return (
            <text
              key={label}
              x={cx + labelR * Math.cos(rad)}
              y={cy + labelR * Math.sin(rad)}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.18)"
              fontSize="8"
              fontFamily="var(--font-mono)"
              fontWeight="600"
            >
              {label}
            </text>
          );
        })}

        {/* ── Outer faint reference circle ────────────── */}
        <circle cx={cx} cy={cy} r={rTicks + 2} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />

        {/* ── Base Track (dark) ────────────────────────── */}
        <circle
          cx={cx} cy={cy} r={rOuter}
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeW}
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* ── Inner Accent Ring (thin, shows pct in secondary color) */}
        <circle
          cx={cx} cy={cy} r={rInner}
          fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1.5"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <circle
          cx={cx} cy={cy} r={rInner}
          fill="none" stroke="var(--color-secondary)" strokeWidth="1.5"
          strokeDasharray={`${circInner * pct} ${circInner}`}
          strokeLinecap="round"
          opacity="0.4"
          style={{ transition: running ? 'stroke-dasharray 1s linear' : 'stroke-dasharray 0.4s ease' }}
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* ── Main Progress Arc ───────────────────────── */}
        <circle
          cx={cx} cy={cy} r={rOuter}
          fill="none" stroke="url(#progress-grad)" strokeWidth={strokeW}
          strokeDasharray={`${circOuter * pct} ${circOuter}`}
          strokeLinecap="round"
          filter="url(#ring-glow)"
          style={{ transition: running ? 'stroke-dasharray 1s linear' : 'stroke-dasharray 0.4s ease' }}
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* ── Glowing Head Dot (follows the arc tip) ──── */}
        {pct > 0.005 && (
          <circle
            cx={headX}
            cy={headY}
            r="4"
            fill="var(--color-primary)"
            filter="url(#head-glow)"
            style={{ transition: running ? 'cx 1s linear, cy 1s linear' : 'cx 0.4s ease, cy 0.4s ease' }}
          />
        )}

        {/* ── Rotating Radar Sweep (only when running) ── */}
        {running && (
          <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="url(#sweep-grad)" strokeWidth={strokeW + 2}
            strokeDasharray={`${circOuter * 0.1} ${circOuter}`}
            style={{ 
              transformOrigin: 'center',
              animation: 'spin 6s linear infinite',
            }}
          />
        )}
      </svg>
      
      {/* ── Center Content ────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Main Time Display */}
        <span className="font-mono text-[var(--color-on-surface)] tracking-[-0.04em] select-none font-extralight tabular-nums"
          style={{ fontSize: 68, lineHeight: 1 }}>
          {timeStr}
        </span>

        {/* Status Label */}
        <div className="flex items-center gap-2 mt-4">
          <span className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
            running 
              ? 'bg-[var(--color-primary)] shadow-[0_0_8px_rgba(210,187,255,0.6)] animate-pulse' 
              : 'bg-white/20'
          }`} />
          <span className="font-mono text-[9px] text-[var(--color-primary)] font-bold uppercase tracking-[0.2em]">
            {running ? 'Execution Active' : 'System Paused'}
          </span>
        </div>
        
        {/* Elapsed / Percentage Subtext */}
        {pct > 0 && (
          <div className="flex items-center gap-3 mt-3 opacity-40">
            <span className="font-mono text-[9px] text-[var(--color-on-surface)] uppercase tracking-widest">
              {pad(elapsedMins)}:{pad(elapsedSecs)} elapsed
            </span>
            <span className="text-[var(--color-outline)] text-[8px]">·</span>
            <span className="font-mono text-[9px] text-[var(--color-on-surface)] uppercase tracking-widest">
              {Math.round(pct * 100)}%
            </span>
          </div>
        )}
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
    stopAudioRef.current?.();
    stopAudioRef.current = null;
    if (running && sound !== 'none') {
      stopAudioRef.current = startAudio(sound);
    }
    return () => { stopAudioRef.current?.(); stopAudioRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, sound]);

  useEffect(() => {
    if (running) {
      document.documentElement.classList.add('focus-mode-running');
    } else {
      document.documentElement.classList.remove('focus-mode-running');
    }
    return () => {
      document.documentElement.classList.remove('focus-mode-running');
    };
  }, [running]);

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
    <div className="flex flex-col h-full w-full bg-transparent text-[var(--color-on-surface)] items-center overflow-hidden">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[rgba(255,255,255,0.06)] relative">
        
        {/* Header */}
        <div className={`flex flex-col md:flex-row md:items-end justify-between px-8 py-6 border-b border-[rgba(255,255,255,0.06)] shrink-0 bg-transparent gap-4 transition-all duration-700 ${running ? 'opacity-10 hover:opacity-100' : 'opacity-100'}`}>
          <div>
            <h2 className="text-[36px] font-black tracking-tighter text-[var(--color-on-surface)] leading-none select-none">
              Deep Focus
            </h2>
            <p className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-[0.25em] mt-2.5">
              UNINTERRUPTED EXECUTION MODE
            </p>
          </div>
          
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Status</span>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${finished ? 'bg-[var(--color-secondary)] shadow-[0_0_8px_rgba(90,218,206,0.4)]' : running ? 'bg-[var(--color-primary)] animate-pulse shadow-[0_0_8px_rgba(210,187,255,0.4)]' : 'bg-white/30'}`} />
                <span className="font-mono text-[10px] text-[var(--color-on-surface)] uppercase tracking-widest font-bold">
                  {finished ? 'COMPLETE' : running ? 'ACTIVE' : 'IDLE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 w-full flex flex-col items-center justify-start p-8 pt-12 md:pt-16 gap-10 bg-transparent relative overflow-y-auto no-scrollbar pb-32">

          <div className={`flex gap-3 w-full justify-center flex-wrap transition-all duration-700 ${running ? 'opacity-[0.02] pointer-events-none hover:opacity-100 hover:pointer-events-auto' : 'opacity-100'}`}>
            {PRESETS.map((p, i) => (
              <button key={p.label} onClick={() => handlePreset(i, p.seconds)} disabled={running}
                className={`px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest font-bold border rounded-full transition-all duration-300 disabled:opacity-30 active:scale-95 ${
                  selectedPreset === i
                    ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)] shadow-[0_0_12px_rgba(210,187,255,0.25)]'
                    : 'glass-card text-[var(--color-on-surface-variant)] border-[rgba(255,255,255,0.06)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] bg-white/[0.01]'
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {showCustom && (
            <div className="flex items-center gap-3 w-full max-w-sm glass-card rounded-xl p-2 border-[rgba(255,255,255,0.06)] bg-[var(--color-surface)]/20 shadow-md">
              <input autoFocus type="number" min={1} max={180} value={customMins}
                onChange={e => setCustomMins(e.target.value)} placeholder="Minutes (1–180)"
                className="flex-1 bg-transparent px-3 outline-none text-[var(--color-on-surface)] font-body-md placeholder:text-[var(--color-outline)]" />
              <button onClick={handleCustom}
                className="px-5 py-2 bg-[var(--color-primary)] text-black font-mono text-[10px] font-bold uppercase tracking-widest hover:brightness-110 rounded-lg active:scale-95 transition-all shadow-[0_0_8px_rgba(210,187,255,0.2)]">
                Set
              </button>
            </div>
          )}

          {/* Timer ring / completion */}
          <div className="flex flex-col items-center gap-8 w-full">
            {finished ? (
              <div className="flex flex-col items-center gap-6 p-10 border border-[rgba(255,255,255,0.06)] glass-card rounded-2xl w-full max-w-md shadow-2xl relative bg-[var(--color-surface)]/20">
                <div className="absolute inset-0 border border-[var(--color-primary)]/10 rounded-2xl pointer-events-none animate-pulse" />
                <div className="w-12 h-12 bg-[var(--color-primary)] text-black flex items-center justify-center rounded-xl shadow-[0_0_15px_rgba(210,187,255,0.3)]">
                  <span className="material-symbols-outlined text-[24px] font-bold">done_all</span>
                </div>
                <div className="text-center">
                  <p className="font-mono text-[11px] text-[var(--color-on-surface)] font-bold uppercase tracking-[0.2em] mb-2">Session Complete</p>
                  <p className="font-body-md text-[13px] text-[var(--color-outline)]">
                    {formatTime(totalSecs)} of focused execution. Outstanding.
                  </p>
                </div>
              </div>
            ) : (
              <FocusRing pct={pct} timeStr={timeStr} running={running} totalSecs={totalSecs} remaining={remaining} />
            )}

            {/* Controls */}
            <div className={`flex items-center gap-6 mt-4 transition-all duration-700 ${running ? 'opacity-20 hover:opacity-100' : 'opacity-100'}`}>
              <button onClick={handleReset} title="Reset"
                className="w-12 h-12 border border-[rgba(255,255,255,0.08)] rounded-xl flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface)] hover:border-[rgba(255,255,255,0.2)] glass-card hover:bg-white/[0.03] active:scale-90 transition-all shadow-md">
                <span className="material-symbols-outlined text-[22px]">restart_alt</span>
              </button>

              {!finished && (
                <button onClick={handleToggle} title={running ? 'Pause' : 'Start'}
                  className={`w-20 h-14 border rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg ${
                    running 
                      ? 'glass-card text-[var(--color-primary)] border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/10 shadow-[0_0_15px_rgba(210,187,255,0.15)]' 
                      : 'bg-[var(--color-primary)] text-black border-[var(--color-primary)] hover:brightness-110 shadow-[0_0_20px_rgba(210,187,255,0.3)]'
                  }`}>
                  <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {running ? 'pause' : 'play_arrow'}
                  </span>
                </button>
              )}

              <button onClick={handleEndSession} title="End Session"
                className="w-12 h-12 border border-[rgba(255,255,255,0.08)] rounded-xl flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 glass-card hover:bg-[var(--color-error)]/10 active:scale-90 transition-all shadow-md">
                <span className="material-symbols-outlined text-[22px]">stop_circle</span>
              </button>
            </div>
          </div>

          {/* Sound selector */}
          <div className={`w-full flex flex-col items-center gap-6 mt-8 transition-all duration-700 ${running ? 'opacity-10 hover:opacity-100' : 'opacity-100'}`}>
            <Waveform active={running && sound !== 'none'} />
            <div className="flex gap-3 justify-center items-center">
              {SOUNDS.map(s => (
                <div key={s.id} className="flex flex-col items-center gap-1.5 group">
                  <button
                    aria-label={s.label}
                    onClick={() => setSound(s.id)}
                    title={s.label}
                    className={`w-12 h-14 bg-white/[0.015] border rounded-lg flex flex-col items-center justify-center relative transition-all duration-150 active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] shadow-md hover:bg-white/[0.035] ${
                      sound === s.id
                        ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 shadow-[0_0_12px_rgba(210,187,255,0.1)]'
                        : 'border-[rgba(255,255,255,0.05)]'
                    }`}
                  >
                    {/* Status LED */}
                    <span className={`w-1.5 h-1.5 rounded-full absolute top-2.5 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${sound === s.id ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-white/10'}`} />
                    
                    <span className={`material-symbols-outlined text-[18px] mt-2 transition-colors duration-250 ${sound === s.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)] group-hover:text-[var(--color-on-surface)]'}`}>
                      {s.icon}
                    </span>
                  </button>
                  <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--color-outline)] opacity-40 font-bold select-none">{s.id.substring(0, 4)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)] shadow-[0_0_8px_rgba(90,218,206,0.4)]" />
              <p className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest opacity-60">
                {SOUNDS.find(s => s.id === sound)?.label} · Ambient Engine
              </p>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
