import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// ── Web Audio Engine (Self-contained) ──────────────────────────────────
function createNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function startAudio(soundId: string): () => void {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.2);
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
    master.gain.linearRampToValueAtTime(0.24, ctx.currentTime + 1.2);
    src.start();

    // Random drip ticks
    const iv = window.setInterval(() => {
      if (ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = 650 + Math.random() * 550;
      g.gain.setValueAtTime(0.02, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    }, 200 + Math.random() * 400);

    cleanupFns.push(() => { src.stop(); window.clearInterval(iv); });

  } else if (soundId === 'binaural') {
    // 10 Hz alpha-wave beat: 200 Hz left, 210 Hz right
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 1.2);
    const merger = ctx.createChannelMerger(2);
    merger.connect(master);

    const mkOsc = (freq: number, ch: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(g); g.connect(merger, 0, ch);
      osc.start();
      return osc;
    };
    const left = mkOsc(200, 0);
    const right = mkOsc(210, 1);
    cleanupFns.push(() => { left.stop(); right.stop(); });

  } else if (soundId === 'forest') {
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx);
    src.loop = true;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 500; bpf.Q.value = 0.4;
    const forestGain = ctx.createGain(); forestGain.gain.value = 0.06;
    src.connect(bpf); bpf.connect(forestGain); forestGain.connect(master);
    src.start();

    // Bird chirps
    const iv = window.setInterval(() => {
      if (ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const f = 1200 + Math.random() * 800;
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(f * 1.3, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.03, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    }, 1200 + Math.random() * 1500);

    cleanupFns.push(() => { src.stop(); window.clearInterval(iv); });
  }

  return () => {
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
    setTimeout(() => { try { ctx.close(); } catch (_) {} }, 1000);
  };
}

// ── CountUp component ──────────────────────────────────────────────────
function CountUp({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTriggered(true);
        }
      },
      { threshold: 0.1 }
    );
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!triggered) return;
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [triggered, end, duration]);

  return <span ref={elementRef}>{count.toLocaleString()}{suffix}</span>;
}

function CountUpDecimal({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTriggered(true);
        }
      },
      { threshold: 0.1 }
    );
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!triggered) return;
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Number(start.toFixed(1)));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [triggered, end, duration]);

  return <span ref={elementRef}>{count}{suffix}</span>;
}

export function LandingPage() {

  // ── Focus demo state ────────────────────────────────────────────────
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [activeSound, setActiveSound] = useState('rain');
  const stopAudioRef = useRef<(() => void) | null>(null);

  const toggleSoundscape = () => {
    if (soundPlaying) {
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }
      setSoundPlaying(false);
    } else {
      const stopFn = startAudio(activeSound);
      stopAudioRef.current = stopFn;
      setSoundPlaying(true);
    }
  };

  const changeSound = (id: string) => {
    setActiveSound(id);
    if (soundPlaying) {
      if (stopAudioRef.current) {
        stopAudioRef.current();
      }
      const stopFn = startAudio(id);
      stopAudioRef.current = stopFn;
    }
  };

  useEffect(() => {
    return () => {
      if (stopAudioRef.current) {
        stopAudioRef.current();
      }
    };
  }, []);

  // ── Radar Chart Balance State ──────────────────────────────────────
  const [balance, setBalance] = useState({
    mind: 8,
    health: 6,
    career: 7,
    wealth: 5,
    relations: 8,
  });

  const updateBalanceValue = (key: keyof typeof balance, value: number) => {
    setBalance(prev => ({
      ...prev,
      [key]: Math.min(10, Math.max(1, value)),
    }));
  };

  // Radar math
  const axes = [
    { key: 'mind', label: 'Focus & Mind', angle: -Math.PI / 2 },
    { key: 'health', label: 'Health & Energy', angle: -Math.PI / 2 + (2 * Math.PI / 5) },
    { key: 'career', label: 'Career & Impact', angle: -Math.PI / 2 + (2 * Math.PI / 5) * 2 },
    { key: 'wealth', label: 'Wealth & Growth', angle: -Math.PI / 2 + (2 * Math.PI / 5) * 3 },
    { key: 'relations', label: 'Relations & Soul', angle: -Math.PI / 2 + (2 * Math.PI / 5) * 4 },
  ];

  const svgSize = 220;
  const center = svgSize / 2;
  const maxRadius = 75;

  const points = axes.map(axis => {
    const val = balance[axis.key as keyof typeof balance];
    const r = (val / 10) * maxRadius;
    const x = center + r * Math.cos(axis.angle);
    const y = center + r * Math.sin(axis.angle);
    return `${x},${y}`;
  }).join(' ');

  // Grid line levels
  const levels = [2, 4, 6, 8, 10];

  // ── Habit chain sequence state ──────────────────────────────────────
  const [activeHabitNode, setActiveHabitNode] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => {
      setActiveHabitNode(prev => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="h-screen w-full overflow-y-auto no-scrollbar bg-[#0a090e] text-[#e2e2e9] relative font-body-md select-none selection:bg-[var(--color-primary)]/20">
      
      {/* 🔮 Background Atmospheric Cosmic Orbs & Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Neon Cosmic radial base */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,13,24,0.95)_0%,rgba(6,5,9,1)_100%)]" />
        
        {/* Atmospheric grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(210,187,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(210,187,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px]" />
        
        {/* Floating glowing orbs with interactive drift */}
        <div className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full bg-[var(--color-primary)]/8 blur-[130px] anim-float-slow" />
        <div className="absolute top-1/3 -right-48 w-[500px] h-[500px] rounded-full bg-[#5adace]/6 blur-[120px] anim-float-slow" style={{ animationDelay: '-3s' }} />
        <div className="absolute -bottom-48 left-1/4 w-[700px] h-[700px] rounded-full bg-[var(--color-primary)]/4 blur-[150px] anim-float-slow" style={{ animationDelay: '-6s' }} />
      </div>

      {/* 🚀 Header Navbar */}
      <header className="sticky top-0 z-50 w-full py-4.5 px-6 md:px-12 backdrop-filter backdrop-blur-xl border-b border-[var(--color-outline-variant)]/10 bg-[#0a090e]/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8.5 h-8.5 rounded-lg bg-gradient-to-tr from-[var(--color-primary)] to-[#5adace] flex items-center justify-center text-black font-extrabold text-lg shadow-[0_0_20px_rgba(210,187,255,0.25)]">
              E
            </span>
            <span className="font-display-lg text-2xl font-bold tracking-tight text-[var(--color-primary)]" style={{ textShadow: '0 0 20px rgba(210,187,255,0.2)' }}>
              Evolv
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[11px] text-[#958e9d] uppercase tracking-[0.25em] font-semibold">
            <a href="#features" className="hover:text-[var(--color-primary)] transition-colors duration-300">Pillars</a>
            <a href="#playground" className="hover:text-[var(--color-primary)] transition-colors duration-300">Playground</a>
            <a href="#pricing" className="hover:text-[var(--color-primary)] transition-colors duration-300">Sanctuary Tiers</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/login" className="px-3 py-2 text-[11px] uppercase tracking-[0.2em] font-bold text-[#cbc3d3] hover:text-[var(--color-primary)] transition-colors duration-300">
              Sign In
            </Link>
            <Link to="/register" className="relative group overflow-hidden px-5.5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[#5adace] text-black text-[11px] uppercase tracking-[0.2em] font-extrabold shadow-[0_0_25px_rgba(210,187,255,0.35)] active:scale-[0.97] transition-all duration-300">
              <span className="relative z-10">Enter Sanctuary</span>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-15 transition-opacity duration-300" />
            </Link>
          </div>
        </div>
      </header>

      {/* 🌌 Main Sections Wrapper */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 py-16 flex flex-col gap-28">

        {/* 1. Hero Section */}
        <section className="flex flex-col lg:flex-row items-center gap-16 py-8">
          {/* Hero left: cosmic headlines */}
          <div className="flex-1 flex flex-col items-start gap-8 text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/15 shadow-[0_0_15px_rgba(210,187,255,0.03)]">
              <span className="material-symbols-outlined text-[var(--color-primary)] text-sm animate-pulse">sparkles</span>
              <span className="text-[9px] font-extrabold text-[var(--color-primary)] uppercase tracking-[0.2em]">A Cognitive Life Sanctuary</span>
            </div>
            
            <h1 className="font-display-lg text-display-lg leading-[1.08] text-[var(--color-on-background)] text-5xl md:text-6xl lg:text-7.5xl font-semibold">
              Evolve beyond flat <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d2bbff] to-[#5adace] text-glow-primary">task lists</span>.<br />
              Cultivate mastery.
            </h1>
            
            <p className="font-body-md text-base md:text-lg text-[#cbc3d3] leading-relaxed font-light max-w-xl">
              Evolv is an opinionated, gorgeous Life OS engineered to synthesize focus, design daily intentions, stack core habits, and transition calmly into EOD system shutdowns. Step into your cybernetic sanctuary.
            </p>

            <div className="flex flex-wrap items-center gap-5 w-full mt-4">
              <Link to="/register" className="px-8 py-4.5 rounded-xl bg-[#d2bbff] text-black font-extrabold text-xs uppercase tracking-[0.2em] shadow-[0_0_35px_rgba(210,187,255,0.35)] hover:shadow-[0_0_50px_rgba(210,187,255,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                Start Evolution
              </Link>
              <a href="#playground" className="px-8 py-4.5 rounded-xl border border-[#4a4551]/55 hover:border-[var(--color-primary)]/50 hover:bg-[#d2bbff]/5 text-[var(--color-on-surface)] font-extrabold text-xs uppercase tracking-[0.2em] transition-all duration-300">
                Try Soundscape
              </a>
            </div>
          </div>

          {/* Hero right: 3D interactive floating dashboard mockup */}
          <div className="flex-1 w-full flex items-center justify-center relative">
            <div className="absolute w-[350px] h-[350px] bg-[var(--color-primary)]/4 rounded-full blur-[80px] anim-orbit -z-10" />
            
            <div className="w-full max-w-[480px] bg-[#121118]/85 backdrop-blur-xl rounded-2xl p-6.5 shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-[#4a4551]/40 card-tilt-hover glow-card">
              {/* Mockup Header bar */}
              <div className="flex items-center justify-between pb-4 border-b border-[#4a4551]/20 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-error)]/40 animate-pulse" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#5adace]/30" />
                </div>
                <div className="px-3 py-1 rounded bg-[#1e1d26] text-[8px] uppercase font-extrabold tracking-[0.25em] text-[var(--color-primary)]">
                  EVOLV // SECURE_WORKSPACE
                </div>
              </div>

              {/* Mockup Content grids */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1c1b24]/40 border border-[#4a4551]/15 rounded-xl p-4 flex flex-col gap-2">
                  <span className="text-[8px] uppercase font-extrabold tracking-[0.25em] text-[#958e9d]">Daily Intentions</span>
                  <div className="flex items-center gap-2 text-xs py-1 text-[var(--color-on-surface)]">
                    <span className="material-symbols-outlined text-[#5adace] text-sm">check_circle</span>
                    <span className="truncate">Synchronize database</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs py-1 text-[#cbc3d3] opacity-60">
                    <span className="material-symbols-outlined text-[#958e9d] text-sm">radio_button_unchecked</span>
                    <span className="truncate">Implement focus shields</span>
                  </div>
                </div>

                <div className="bg-[#1c1b24]/40 border border-[#4a4551]/15 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
                  <span className="text-[8px] uppercase font-extrabold tracking-[0.25em] text-[#958e9d]">Focus Ratio</span>
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="absolute inset-0 rotate-[-90deg]" width="64" height="64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#4a4551" strokeWidth="2.5" opacity="0.15" />
                      <circle cx="32" cy="32" r="26" fill="none" stroke="url(#gradient-hero)" strokeWidth="2.5" strokeDasharray="163" strokeDashoffset="42" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="gradient-hero" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#d2bbff" />
                          <stop offset="100%" stopColor="#5adace" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="text-xs font-mono font-bold text-[var(--color-primary)]">74%</span>
                  </div>
                </div>

                <div className="col-span-2 bg-[#1c1b24]/40 border border-[#4a4551]/15 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] uppercase font-extrabold tracking-[0.25em] text-[#958e9d]">Active Habit Stack</span>
                    <span className="text-[8px] bg-[#5adace]/15 text-[#5adace] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-[0.15em]">Up Next</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[9px] font-bold text-[var(--color-primary)]">1</div>
                      <div className="w-[1px] h-3.5 bg-[var(--color-primary)]/30" />
                      <div className="w-5 h-5 rounded-full bg-[#5adace]/15 border border-[#5adace]/30 flex items-center justify-center text-[9px] font-bold text-[#5adace]">2</div>
                    </div>
                    <div className="flex flex-col justify-between h-13 text-xs font-semibold py-0.5">
                      <span>Morning Sunlight Walk</span>
                      <span className="text-[#cbc3d3] font-light text-[11px]">Synthesize alpha brainwave state</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Interactive Playground (Active Soundscape & Balance Radar) */}
        <section id="playground" className="py-8 flex flex-col gap-12 border-t border-[#4a4551]/20 pt-16">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-4">
            <span className="text-[9px] uppercase font-extrabold tracking-[0.25em] text-[#5adace]" style={{ textShadow: '0 0 10px rgba(90,218,206,0.3)' }}>Active Playground</span>
            <h2 className="font-display-lg text-4xl md:text-5xl font-semibold text-[var(--color-on-surface)]">
              Interact with Evolv's Engine
            </h2>
            <p className="font-body-md text-[#cbc3d3] text-base font-light">
              Synthesize auditory shielding filters and adjust your Life Balance chart directly on the page before setting up your profile.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch mt-6">
            
            {/* Try the Sound Focus Demo Widget */}
            <div className="bg-[#121118]/85 backdrop-blur-xl border border-[#4a4551]/30 rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden glow-card">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
                      <span className="material-symbols-outlined">sound_sampler</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-[#958e9d] uppercase font-extrabold tracking-[0.25em]">Focus Shielding</span>
                      <h3 className="font-title-md text-lg text-[var(--color-on-surface)] font-bold">Soundscape Synthesizer</h3>
                    </div>
                  </div>

                  {/* Pulsating live sound visualizer indicator */}
                  <div className="flex items-end gap-1 h-6 pr-2">
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-1 rounded-full bg-[var(--color-primary)] transition-all duration-300 ${soundPlaying ? 'anim-wave' : 'h-1 opacity-20'}`} 
                        style={{ 
                          height: soundPlaying ? `${12 + Math.sin(i) * 12}px` : '4px',
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: '0.8s'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <p className="font-body-md text-sm text-[#cbc3d3] leading-relaxed">
                  Synthesize binaural alpha frequencies or a soft lowpass rain filter. These are generated directly by your browser's Web Audio API context for zero latency and infinite loops.
                </p>

                {/* Tone selector buttons */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'rain', label: 'Rain Shield', icon: 'rainy' },
                    { id: 'binaural', label: 'Alpha Wave', icon: 'graphic_eq' },
                    { id: 'forest', label: 'Forest Birds', icon: 'forest' }
                  ].map(snd => (
                    <button
                      key={snd.id}
                      onClick={() => changeSound(snd.id)}
                      className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border text-center transition-all duration-300 ${
                        activeSound === snd.id 
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[0_0_15px_rgba(210,187,255,0.15)] font-bold' 
                          : 'border-[#4a4551]/30 bg-[#171620]/30 text-[#cbc3d3] hover:border-[#4a4551]/60 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{snd.icon}</span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em]">{snd.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Master Control switch */}
              <div className="mt-8 pt-6 border-t border-[#4a4551]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col text-left">
                  <span className="text-[8px] text-[#958e9d] font-bold tracking-[0.25em]">AUDIO PROCESSOR STATE</span>
                  <span className={`text-xs font-bold ${soundPlaying ? 'text-[#5adace]' : 'text-[#cbc3d3] opacity-60'}`}>
                    {soundPlaying ? '● Active Auditory Stream' : '○ Standby Synthesizer'}
                  </span>
                </div>

                <button
                  onClick={toggleSoundscape}
                  className={`w-full sm:w-auto px-6 py-3.5 rounded-xl uppercase tracking-[0.25em] text-[10px] font-extrabold flex items-center justify-center gap-3 transition-all duration-300 ${
                    soundPlaying
                      ? 'bg-[#5adace]/20 text-[#5adace] border border-[#5adace]/30 hover:bg-[#5adace]/30'
                      : 'bg-[#d2bbff] text-black shadow-[0_0_20px_rgba(210,187,255,0.3)] hover:scale-[1.02]'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{soundPlaying ? 'stop' : 'play_arrow'}</span>
                  <span>{soundPlaying ? 'Deactivate Soundscape' : 'Synthesize Preview'}</span>
                </button>
              </div>
            </div>

            {/* Interactive Radar Chart Balance Widget */}
            <div className="bg-[#121118]/85 backdrop-blur-xl border border-[#4a4551]/30 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden glow-card">
              <div className="absolute top-0 left-0 w-32 h-32 bg-[#5adace]/5 rounded-full blur-3xl pointer-events-none" />

              {/* Sliders list matching the screenshot */}
              <div className="flex-1 flex flex-col gap-4 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#5adace]/10 flex items-center justify-center text-[#5adace]">
                    <span className="material-symbols-outlined">analytics</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-[#958e9d] uppercase font-extrabold tracking-[0.25em]">Equilibrium Dial</span>
                    <h3 className="font-title-md text-lg text-[var(--color-on-surface)] font-bold">Life Balance Radar</h3>
                  </div>
                </div>

                {/* Bullets with score incrementors */}
                <div className="flex flex-col gap-2.5">
                  {axes.map(ax => {
                    const val = balance[ax.key as keyof typeof balance];
                    return (
                      <div key={ax.key} className="flex items-center justify-between py-1.5 border-b border-[#4a4551]/10 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            ax.key === 'mind' ? 'bg-[#d2bbff] shadow-[0_0_6px_rgba(210,187,255,0.5)]' :
                            ax.key === 'health' ? 'bg-[#ffd28a] shadow-[0_0_6px_rgba(255,210,138,0.5)]' :
                            ax.key === 'career' ? 'bg-[#79f7ea] shadow-[0_0_6px_rgba(121,247,234,0.5)]' :
                            ax.key === 'wealth' ? 'bg-[#ff9e79] shadow-[0_0_6px_rgba(255,158,121,0.5)]' : 
                            'bg-[#9effa7] shadow-[0_0_6px_rgba(158,255,167,0.5)]'
                          }`} />
                          <span className="text-[#cbc3d3] font-semibold">{ax.label}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => updateBalanceValue(ax.key as keyof typeof balance, val - 1)}
                            className="w-5 h-5 rounded bg-[#1c1b24] hover:bg-[#d2bbff]/20 text-[#e2e2e9] flex items-center justify-center font-bold text-xs transition-colors duration-200"
                            title="Decrease"
                          >-</button>
                          <span className="text-[#5adace] font-mono font-bold w-9 text-center text-sm">{val}/10</span>
                          <button 
                            onClick={() => updateBalanceValue(ax.key as keyof typeof balance, val + 1)}
                            className="w-5 h-5 rounded bg-[#1c1b24] hover:bg-[#d2bbff]/20 text-[#e2e2e9] flex items-center justify-center font-bold text-xs transition-colors duration-200"
                            title="Increase"
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rendered SVG chart */}
              <div className="w-[180px] h-[180px] md:w-[220px] md:h-[220px] flex items-center justify-center relative">
                <svg width="220" height="220" className="overflow-visible" style={{ filter: 'drop-shadow(0 0 10px rgba(90, 218, 206, 0.15))' }}>
                  {/* Grid circle layers */}
                  {levels.map(level => {
                    const r = (level / 10) * maxRadius;
                    const pathPts = axes.map(ax => {
                      const x = center + r * Math.cos(ax.angle);
                      const y = center + r * Math.sin(ax.angle);
                      return `${x},${y}`;
                    }).join(' ');
                    return (
                      <polygon
                        key={level}
                        points={pathPts}
                        fill="none"
                        stroke="#4a4551"
                        strokeWidth="1"
                        opacity={level === 10 ? '0.3' : '0.1'}
                      />
                    );
                  })}

                  {/* Axis lines */}
                  {axes.map(ax => {
                    const x = center + maxRadius * Math.cos(ax.angle);
                    const y = center + maxRadius * Math.sin(ax.angle);
                    return (
                      <line
                        key={ax.key}
                        x1={center}
                        y1={center}
                        x2={x}
                        y2={y}
                        stroke="#4a4551"
                        strokeWidth="1"
                        opacity="0.2"
                      />
                    );
                  })}

                  {/* Filled Value Polygon */}
                  <polygon
                    points={points}
                    fill="rgba(90, 218, 206, 0.2)"
                    stroke="#5adace"
                    strokeWidth="2.5"
                    style={{ transition: 'points 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                  />

                  {/* Vertex circles */}
                  {axes.map(ax => {
                    const val = balance[ax.key as keyof typeof balance];
                    const r = (val / 10) * maxRadius;
                    const x = center + r * Math.cos(ax.angle);
                    const y = center + r * Math.sin(ax.angle);
                    return (
                      <circle
                        key={ax.key}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#5adace"
                        stroke="#0a090e"
                        strokeWidth="1.5"
                        style={{ transition: 'cx 0.3s, cy 0.3s' }}
                      />
                    );
                  })}
                </svg>
              </div>

            </div>
          </div>
        </section>

        {/* 3. Features Bento Grid Section */}
        <section id="features" className="py-8 flex flex-col gap-12 border-t border-[#4a4551]/20 pt-16">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-4">
            <span className="text-[9px] uppercase font-extrabold tracking-[0.25em] text-[#d2bbff]" style={{ textShadow: '0 0 10px rgba(210,187,255,0.3)' }}>SYSTEM ARCHITECTURE</span>
            <h2 className="font-display-lg text-4xl md:text-5xl font-semibold text-[var(--color-on-surface)]">
              Four Core Intention Pillars
            </h2>
            <p className="font-body-md text-[#cbc3d3] text-base font-light">
              We reject shallow distractions. Evolv structures your day across deeply integrated cognitive layers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
            
            {/* Bento 1: Identity & Vision */}
            <div className="md:col-span-7 bg-[#121118]/85 backdrop-blur-xl border border-[#4a4551]/30 rounded-2xl p-8 relative flex flex-col justify-between overflow-hidden glow-card card-tilt-hover">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-primary)]/5 rounded-full blur-[60px]" />
              <div className="flex flex-col gap-4">
                <span className="text-[8px] font-extrabold text-[var(--color-primary)] tracking-[0.25em] uppercase">LAYER 01 // COGNITIVE ANCHOR</span>
                <h3 className="font-title-md text-2xl font-bold text-[var(--color-on-surface)]">Identity-Driven Vision</h3>
                <p className="font-body-md text-sm text-[#cbc3d3] max-w-md font-light leading-relaxed">
                  Establish core value systems. Anchor quarterly intentions to deep daily habits. Track consistency based on who you intend to become, not just checkboxes.
                </p>
              </div>

              {/* Mini visual element */}
              <div className="mt-8 flex flex-wrap gap-2.5">
                {[
                  { text: '🎯 Deep Work Focus', act: true },
                  { text: '☀️ Uncompromising Health', act: false },
                  { text: '📚 Perpetual Learner', act: true },
                  { text: '⚖️ Mental Equilibrium', act: false }
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] border transition-all duration-300 ${
                      item.act 
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[0_0_15px_rgba(210,187,255,0.1)]' 
                        : 'border-[#4a4551]/30 text-[#cbc3d3]'
                    }`}
                  >
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Bento 2: Habit Stacking */}
            <div className="md:col-span-5 bg-[#121118]/85 backdrop-blur-xl border border-[#4a4551]/30 rounded-2xl p-8 relative flex flex-col justify-between overflow-hidden glow-card card-tilt-hover">
              <div className="absolute top-0 left-0 w-32 h-32 bg-[#5adace]/5 rounded-full blur-[60px]" />
              <div className="flex flex-col gap-4">
                <span className="text-[8px] font-extrabold text-[#5adace] tracking-[0.25em] uppercase">LAYER 02 // BEHAVIOR PATHWAY</span>
                <h3 className="font-title-md text-2xl font-bold text-[var(--color-on-surface)]">Habit Chain Stacking</h3>
                <p className="font-body-md text-sm text-[#cbc3d3] font-light leading-relaxed">
                  Chain actions sequentially. Establish triggers (e.g. *After morning meditation, read 15 pages*) with zero cognitive load.
                </p>
              </div>

              {/* Animated node chain */}
              <div className="mt-8 flex items-center justify-between gap-2 border border-[#4a4551]/15 p-4.5 rounded-xl bg-[#0c0e13]/50">
                {[
                  { label: 'WAKE UP', step: 0 },
                  { label: 'MEDITATE', step: 1 },
                  { label: 'SUNLIGHT', step: 2 },
                  { label: 'CODE', step: 3 }
                ].map((node, i) => (
                  <div key={i} className="flex flex-1 items-center gap-1">
                    <div className="flex flex-col items-center flex-1 gap-1">
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                        activeHabitNode === i 
                          ? 'border-[#5adace] bg-[#5adace]/25 text-[#5adace] scale-110 shadow-[0_0_10px_rgba(90,218,206,0.35)]' 
                          : 'border-[#4a4551]/40 text-[#958e9d]'
                      }`}>
                        {i + 1}
                      </div>
                      <span className="text-[8px] font-extrabold text-[#958e9d] tracking-tighter uppercase">{node.label}</span>
                    </div>
                    {i < 3 && (
                      <div className={`h-[1px] flex-1 border-t border-dashed transition-colors duration-500 ${
                        activeHabitNode >= i ? 'border-[#5adace]' : 'border-[#4a4551]/30'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bento 3: Focus Timer */}
            <div className="md:col-span-5 bg-[#121118]/85 backdrop-blur-xl border border-[#4a4551]/30 rounded-2xl p-8 relative flex flex-col justify-between overflow-hidden glow-card card-tilt-hover">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 rounded-full blur-[60px]" />
              <div className="flex flex-col gap-4">
                <span className="text-[8px] font-extrabold text-[var(--color-primary)] tracking-[0.25em] uppercase">LAYER 03 // EXECUTION ENGINE</span>
                <h3 className="font-title-md text-2xl font-bold text-[var(--color-on-surface)]">The Pomodoro Moat</h3>
                <p className="font-body-md text-sm text-[#cbc3d3] font-light leading-relaxed">
                  Activate deep sessions. Protect attention spans with local frequency generators and automated task blockers.
                </p>
              </div>

              {/* Pulsating breathing rings */}
              <div className="mt-8 h-24 flex items-center justify-center relative">
                <div className="absolute w-16 h-16 rounded-full border border-[var(--color-primary)]/15 animate-ping" />
                <div className="absolute w-12 h-12 rounded-full border border-[var(--color-primary)]/30 anim-breathe" />
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-[#5adace] flex items-center justify-center shadow-[0_0_25px_rgba(210,187,255,0.35)]">
                  <span className="material-symbols-outlined text-black text-sm">hourglass_empty</span>
                </div>
              </div>
            </div>

            {/* Bento 4: EOD Shutdown */}
            <div className="md:col-span-7 bg-[#121118]/85 backdrop-blur-xl border border-[#4a4551]/30 rounded-2xl p-8 relative flex flex-col justify-between overflow-hidden glow-card card-tilt-hover">
              <div className="absolute top-0 left-0 w-48 h-48 bg-[#5adace]/5 rounded-full blur-[60px]" />
              <div className="flex flex-col gap-4">
                <span className="text-[8px] font-extrabold text-[#5adace] tracking-[0.25em] uppercase">LAYER 04 // RECOVERY ROUTINE</span>
                <h3 className="font-title-md text-2xl font-bold text-[var(--color-on-surface)]">Evening Shutdown Ritual</h3>
                <p className="font-body-md text-sm text-[#cbc3d3] max-w-md font-light leading-relaxed">
                  Commit workspace offline. File active journal entries (mood, wins, gratitudes) into backend vaults. Auto-schedule tomorrow's MITs and clear working memory for healthy sleep cycles.
                </p>
              </div>

              {/* Shutdown wizards mock preview */}
              <div className="mt-8 flex items-center justify-between border border-[#4a4551]/15 rounded-xl p-4.5 bg-[#0c0e13]/60 text-xs text-[#cbc3d3]">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="material-symbols-outlined text-[#5adace] text-sm animate-pulse">nights_stay</span>
                  <span className="tracking-[0.1em] uppercase">SYSTEM SHUTDOWN ACTIVATED</span>
                </div>
                <div className="text-[9px] uppercase font-extrabold text-[#5adace] tracking-[0.2em] animate-pulse">
                  Fading Memory Vaults...
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 4. Numeric Dynamic Counter Statistics */}
        <section className="py-12 border-t border-[#4a4551]/20 pt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--color-primary)]/4 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="bg-[#121118]/85 border border-[#4a4551]/30 rounded-xl p-6.5 flex flex-col items-center gap-2 glow-card">
            <span className="text-[var(--color-primary)] text-4.5xl md:text-5xl font-semibold tracking-tighter font-display-lg" style={{ textShadow: '0 0 25px rgba(210,187,255,0.2)' }}>
              <CountUpDecimal end={9.8} suffix="%" />
            </span>
            <span className="text-[8px] uppercase font-extrabold tracking-[0.25em] text-[#958e9d]">Habit Consistency Rate</span>
          </div>

          <div className="bg-[#121118]/85 border border-[#4a4551]/30 rounded-xl p-6.5 flex flex-col items-center gap-2 glow-card">
            <span className="text-[#5adace] text-4.5xl md:text-5xl font-semibold tracking-tighter font-display-lg" style={{ textShadow: '0 0 25px rgba(90,218,206,0.2)' }}>
              <CountUp end={129888} suffix="" />
            </span>
            <span className="text-[8px] uppercase font-extrabold tracking-[0.25em] text-[#958e9d]">Focus Minutes Synthesized</span>
          </div>

          <div className="bg-[#121118]/85 border border-[#4a4551]/30 rounded-xl p-6.5 flex flex-col items-center gap-2 glow-card">
            <span className="text-[#cec2dc] text-4.5xl md:text-5xl font-semibold tracking-tighter font-display-lg" style={{ textShadow: '0 0 25px rgba(206,194,220,0.2)' }}>
              <CountUpDecimal end={10.4} suffix="%" />
            </span>
            <span className="text-[8px] uppercase font-extrabold tracking-[0.25em] text-[#958e9d]">EOD Shutdown Execution</span>
          </div>
        </section>

        {/* 5. Pricing & Sanctuary Tiers */}
        <section id="pricing" className="py-8 flex flex-col gap-12 border-t border-[#4a4551]/20 pt-16">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-4">
            <span className="text-[9px] uppercase font-extrabold tracking-[0.25em] text-[#5adace]" style={{ textShadow: '0 0 10px rgba(90,218,206,0.3)' }}>SANCTUARY TIERS</span>
            <h2 className="font-display-lg text-4xl md:text-5xl font-semibold text-[var(--color-on-surface)]">
              Begin Your Evolution Today
            </h2>
            <p className="font-body-md text-[#cbc3d3] text-base font-light">
              Evolv operates with transparent, secure local systems. Elevate your cognitive abilities without limits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-6 w-full items-stretch">
            
            {/* Standard Tier */}
            <div className="bg-[#121118]/85 backdrop-blur-xl border border-[#4a4551]/30 rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden glow-card card-tilt-hover">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-title-md text-xl font-extrabold text-[var(--color-on-surface)]">Evolv Standard</h3>
                  <span className="px-3.5 py-1 rounded-full text-[9px] uppercase font-extrabold tracking-[0.2em] bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/15">
                    Local Core
                  </span>
                </div>
                
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-display-lg font-semibold">$0</span>
                  <span className="text-xs text-[#958e9d] font-bold tracking-wider">/ FOREVER</span>
                </div>

                <p className="font-body-md text-sm text-[#cbc3d3] leading-relaxed font-light">
                  Full access to our opinionated productivity core. Stack unlimited habits, track custom metrics, construct daily rituals, and synthesize shielding focus sounds.
                </p>

                <ul className="space-y-3 pt-4 border-t border-[#4a4551]/20 text-xs text-[#cbc3d3] font-semibold">
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#5adace] text-sm">done</span>
                    <span>Identity-driven vision board</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#5adace] text-sm">done</span>
                    <span>Dynamic, non-cyclic Habit Chains</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#5adace] text-sm">done</span>
                    <span>Interactive life-balance analytics</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#5adace] text-sm">done</span>
                    <span>Offline session shutdown transitions</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Link to="/register" className="w-full py-4.5 rounded-xl border border-[#d2bbff]/45 hover:bg-[#d2bbff] hover:text-black flex items-center justify-center font-extrabold uppercase tracking-[0.2em] text-[10px] transition-all duration-300">
                  Begin Evolution (Free)
                </Link>
              </div>
            </div>

            {/* Specialist Tier */}
            <div className="bg-gradient-to-b from-[#191823] to-[#0c0b11] border border-[#d2bbff]/60 rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_0_35px_rgba(210,187,255,0.08)] glow-card card-tilt-hover">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#5adace]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4.5 py-1 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[#5adace] text-black text-[9px] font-extrabold uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(210,187,255,0.4)]">
                Most Powerful
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-title-md text-xl font-extrabold text-[var(--color-primary)]">Evolv Specialist</h3>
                  <span className="px-3.5 py-1 rounded-full text-[9px] uppercase font-extrabold tracking-[0.2em] bg-[#5adace]/10 text-[#5adace] border border-[#5adace]/15 animate-pulse">
                    AI Enabled
                  </span>
                </div>
                
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-display-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#d2bbff] to-[#5adace]">$9</span>
                  <span className="text-xs text-[#958e9d] font-bold tracking-wider">/ MONTH</span>
                </div>

                <p className="font-body-md text-sm text-[#cbc3d3] leading-relaxed font-light">
                  Enhance your workspace with AI integration. Receive personalized system health reports, proactive habit stack proposals, and dynamic shutdown guidance logs.
                </p>

                <ul className="space-y-3 pt-4 border-t border-[#4a4551]/20 text-xs text-[#cbc3d3] font-semibold">
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[var(--color-primary)] text-sm">done</span>
                    <span>All Standard core tools</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[var(--color-primary)] text-sm">done</span>
                    <span>Integrated AI Chat sidebar controller</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[var(--color-primary)] text-sm">done</span>
                    <span>Autonomous context summarizers</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[var(--color-primary)] text-sm">done</span>
                    <span>Proactive task auto-grouping recommendations</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Link to="/register" className="w-full py-4.5 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[#5adace] text-black flex items-center justify-center font-extrabold uppercase tracking-[0.2em] text-[10px] shadow-[0_0_25px_rgba(210,187,255,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                  Begin Specialist List
                </Link>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* 🚀 Footer */}
      <footer className="relative z-10 border-t border-[#4a4551]/20 bg-[#0e0c14]/80 py-16 px-6 md:px-12 mt-16 text-center">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-8">
          <div className="flex items-center gap-2.5">
            <span className="w-6.5 h-6.5 rounded-md bg-gradient-to-tr from-[var(--color-primary)] to-[#5adace] flex items-center justify-center text-black font-extrabold text-sm shadow-[0_0_10px_rgba(210,187,255,0.2)]">
              E
            </span>
            <span className="font-display-lg text-lg font-bold text-[#e2e2e9] tracking-wide">
              Evolv Life OS
            </span>
          </div>

          <p className="font-body-md text-xs text-[#958e9d] max-w-md leading-relaxed font-light">
            Evolv is local-first, highly encrypted, and designed to protect your attention moat from cognitive pollution. Built on React, TypeScript, and Go.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-[9px] uppercase font-extrabold tracking-[0.2em] text-[#958e9d]">
            <span>V2.0 Cyber-Lavender Edition</span>
            <span className="hidden sm:inline">·</span>
            <span>Local Vaults Encrypted</span>
            <span className="hidden sm:inline">·</span>
            <span>No Trackers</span>
          </div>

          <p className="text-[8px] text-[#958e9d]/40 uppercase tracking-[0.25em] mt-2">
            &copy; {new Date().getFullYear()} EVOLV SYSTEM INC. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>

    </div>
  );
}
