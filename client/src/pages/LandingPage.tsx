import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

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
  }

  return () => {
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    cleanupFns.forEach(fn => { try { fn(); } catch (_) {} });
    setTimeout(() => { try { ctx.close(); } catch (_) {} }, 1000);
  };
}

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  // ── Focus demo state ────────────────────────────────────────────────
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [activeSound, setActiveSound] = useState('rain');
  const stopAudioRef = useRef<(() => void) | null>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

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
      if (stopAudioRef.current) stopAudioRef.current();
      const stopFn = startAudio(id);
      stopAudioRef.current = stopFn;
    }
  };

  useEffect(() => {
    return () => {
      if (stopAudioRef.current) stopAudioRef.current();
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-[var(--color-background)] text-[var(--color-on-surface)] font-body-md scroll-smooth selection:bg-[var(--color-primary)]/30" id="landing-container">
      
      {/* ── Dynamic Ambient Background ─────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-ambient-mesh">
        {/* Cursor-following orb */}
        <div 
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[120px] transition-transform duration-1000 ease-out"
          style={{
            background: 'radial-gradient(circle, rgba(108,74,176,0.4) 0%, rgba(90,218,206,0.1) 60%, transparent 80%)',
            left: `${mousePos.x}%`,
            top: `${mousePos.y}%`,
            transform: 'translate(-50%, -50%)',
            mixBlendMode: theme === 'dark' ? 'screen' : 'multiply',
            opacity: theme === 'dark' ? 0.35 : 0.15
          }}
        />
        {/* Dot-grid overlay */}
        <div className="absolute inset-0 bg-dot-grid pointer-events-none" />
      </div>

      {/* ── Minimalist Floating Header ─────────────────────────────────────── */}
      <header className="fixed top-6 inset-x-0 z-50 w-full flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto rounded-full glass-panel px-6 py-3 flex items-center justify-between gap-8 md:gap-16 shadow-lg">
          <div 
            className="flex items-center gap-3 group cursor-pointer"
            onClick={() => document.getElementById('landing-container')?.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-6 h-6 rounded-full bg-[var(--color-on-surface)] text-[var(--color-background)] flex items-center justify-center font-bold text-[10px] group-hover:scale-90 transition-transform">
              E
            </div>
            <span className="font-mono text-xs font-bold tracking-widest uppercase">Evolv</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[11px] font-mono uppercase tracking-widest text-[var(--color-outline)]">
            <a href="#method" className="hover:text-[var(--color-on-surface)] transition-colors">Method</a>
            <a href="#engine" className="hover:text-[var(--color-on-surface)] transition-colors">Engine</a>
            <Link to="/features" className="hover:text-[var(--color-on-surface)] transition-colors">Features</Link>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface)] hover:bg-white/5 transition-colors active:scale-90 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <Link 
              to="/login" 
              className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors hidden sm:block"
            >
              Log in
            </Link>
            <Link 
              to="/register" 
              className="h-8 flex items-center px-4 rounded-full bg-[var(--color-on-surface)] text-[var(--color-background)] text-[11px] font-mono uppercase tracking-widest hover:scale-95 transition-transform"
            >
              Start
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center min-h-screen">

        {/* ═══════════════════════════════════════════════════════
            1. TYPOGRAPHIC HERO
            ═══════════════════════════════════════════════════════ */}
        <section className="w-full min-h-[90vh] flex flex-col items-center justify-center text-center px-6 pt-20">
          <div className="anim-fade-up-1 flex flex-col items-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-secondary)] mb-6 px-4 py-1.5 rounded-full border border-[var(--color-secondary)]/30 bg-[var(--color-secondary)]/10 glow-shadow-secondary">
              Evolv OS // Build 2.0
            </span>
          </div>
          
          <h1 className="text-[12vw] leading-[0.85] font-black tracking-tighter text-gradient-hero anim-fade-up-2 mb-10 select-none">
            EXECUTION<br />OVER<br />ORGANIZATION
          </h1>
          
          <p className="max-w-2xl text-[18px] md:text-[22px] text-[var(--color-outline)] leading-relaxed font-medium anim-fade-up-3 mb-14">
            Most productivity tools help managers organize other people's work. 
            <span className="text-[var(--color-on-surface)]"> Evolv is built for the individual executor.</span> A strict operating system for deep work.
          </p>

          <div className="anim-fade-up-4 flex items-center gap-6">
            <Link 
              to="/register" 
              className="group relative h-14 px-8 rounded-full bg-[var(--color-on-surface)] text-[var(--color-background)] font-bold text-[13px] uppercase tracking-wider flex items-center justify-center overflow-hidden active:scale-95 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 group-hover:text-white transition-colors duration-300">Enter the System</span>
            </Link>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            2. METHODOLOGY (Editorial Layout)
            ═══════════════════════════════════════════════════════ */}
        <section id="method" className="w-full max-w-6xl mx-auto py-32 px-6">
          <div className="flex items-center gap-6 mb-24 anim-fade-up">
            <div className="w-16 h-px bg-[var(--color-outline-variant)]" />
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-outline)]">The Methodology</h2>
          </div>

          <div className="flex flex-col gap-32">
            {/* Block 01 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end group">
              <div className="col-span-1 md:col-span-3">
                <span className="text-[120px] leading-none font-black text-[var(--color-outline-variant)]/40 group-hover:text-[var(--color-primary)] transition-colors duration-500">01</span>
              </div>
              <div className="col-span-1 md:col-span-9 border-b border-[var(--color-outline-variant)]/50 pb-8">
                <h3 className="text-4xl md:text-6xl font-bold tracking-tight text-[var(--color-on-surface)] mb-6">Monolithic Sequences.</h3>
                <p className="text-xl text-[var(--color-outline)] max-w-2xl leading-relaxed">
                  Stop checking off 10 small tasks. Group micro-habits into monolithic sequences (Morning, Deep Work, Evening). Execute one unified routine with zero cognitive load.
                </p>
              </div>
            </div>

            {/* Block 02 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end group">
              <div className="col-span-1 md:col-span-3">
                <span className="text-[120px] leading-none font-black text-[var(--color-outline-variant)]/40 group-hover:text-[var(--color-secondary)] transition-colors duration-500">02</span>
              </div>
              <div className="col-span-1 md:col-span-9 border-b border-[var(--color-outline-variant)]/50 pb-8">
                <h3 className="text-4xl md:text-6xl font-bold tracking-tight text-[var(--color-on-surface)] mb-6">Energy Mapping.</h3>
                <p className="text-xl text-[var(--color-outline)] max-w-2xl leading-relaxed">
                  Time management is a myth. Energy management is reality. Log circadian rhythms dynamically to find your peak focus windows and deploy deep work when it matters.
                </p>
              </div>
            </div>

            {/* Block 03 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end group">
              <div className="col-span-1 md:col-span-3">
                <span className="text-[120px] leading-none font-black text-[var(--color-outline-variant)]/40 group-hover:text-[#FF5F56] transition-colors duration-500">03</span>
              </div>
              <div className="col-span-1 md:col-span-9 border-b border-[var(--color-outline-variant)]/50 pb-8">
                <h3 className="text-4xl md:text-6xl font-bold tracking-tight text-[var(--color-on-surface)] mb-6">Hard Shutdowns.</h3>
                <p className="text-xl text-[var(--color-outline)] max-w-2xl leading-relaxed">
                  Burnout is the enemy of execution. Evolv enforces mandatory evening rituals to force psychological detachment, guided by automated burnout risk analysis.
                </p>
              </div>
            </div>

            {/* Block 04 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end group">
              <div className="col-span-1 md:col-span-3">
                <span className="text-[120px] leading-none font-black text-[var(--color-outline-variant)]/40 group-hover:text-[var(--color-primary-container)] transition-colors duration-500">04</span>
              </div>
              <div className="col-span-1 md:col-span-9 border-b border-[var(--color-outline-variant)]/50 pb-8">
                <h3 className="text-4xl md:text-6xl font-bold tracking-tight text-[var(--color-on-surface)] mb-6">Total Sovereignty.</h3>
                <p className="text-xl text-[var(--color-outline)] max-w-2xl leading-relaxed">
                  Your life OS shouldn't be mining your data. Evolv is built with a local-first architecture. Fast, completely offline-capable, and entirely private by default.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            3. IMMERSIVE AUDIO ENGINE
            ═══════════════════════════════════════════════════════ */}
        <section id="engine" className={`w-full py-32 transition-colors duration-1000 ${soundPlaying ? 'bg-[var(--color-surface-container)]' : 'bg-transparent'}`}>
          <div className="max-w-6xl mx-auto px-6">
            
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
              <div className="max-w-2xl">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-[var(--color-on-surface)] mb-6">Native Focus Engine.</h2>
                <p className="text-xl text-[var(--color-outline)]">Drop into flow state instantly. High-fidelity procedural ambient noise generated directly in your browser. Zero latency.</p>
              </div>
              
              {/* Massive Play Button */}
              <button
                onClick={toggleSoundscape}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 active:scale-90 relative ${
                  soundPlaying 
                    ? 'bg-transparent border border-[var(--color-primary)] text-[var(--color-primary)]' 
                    : 'bg-[var(--color-on-surface)] text-[var(--color-background)] hover:scale-105'
                }`}
              >
                {soundPlaying && (
                  <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/20 animate-ping" />
                )}
                <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {soundPlaying ? 'stop' : 'play_arrow'}
                </span>
              </button>
            </div>

            {/* Immersive visualizer */}
            <div className="w-full h-64 md:h-96 rounded-3xl border border-[var(--color-outline-variant)]/30 overflow-hidden relative flex flex-col items-center justify-end pb-8">
              {/* Background glow based on active sound */}
              <div className={`absolute inset-0 transition-opacity duration-1000 ${soundPlaying ? 'opacity-100' : 'opacity-0'}`}
                   style={{
                     background: activeSound === 'rain' ? 'radial-gradient(circle at bottom, rgba(108,74,176,0.3) 0%, transparent 70%)' :
                                 activeSound === 'forest' ? 'radial-gradient(circle at bottom, rgba(90,218,206,0.2) 0%, transparent 70%)' :
                                 'radial-gradient(circle at bottom, rgba(255,180,171,0.2) 0%, transparent 70%)'
                   }} 
              />
              
              {/* Equalizer Bars */}
              <div className="flex items-end justify-center gap-1 md:gap-2 w-full px-8 h-48 relative z-10">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div 
                    key={i}
                    className="flex-1 rounded-t-sm transition-all duration-[50ms] ease-linear bg-[var(--color-primary)]"
                    style={{ 
                      height: soundPlaying ? `${10 + Math.random() * 90}%` : '4px',
                      opacity: soundPlaying ? 0.4 + Math.random() * 0.6 : 0.15
                    }}
                  />
                ))}
              </div>

              {/* Controls */}
              <div className="absolute top-8 left-8 right-8 flex justify-between items-center z-20">
                 <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-outline)]">Select Frequency</span>
                 <div className="flex gap-2 glass-panel p-1.5 rounded-full">
                   {[
                     { id: 'rain', label: 'Rain LPF' },
                     { id: 'binaural', label: 'Alpha 200Hz' },
                     { id: 'forest', label: 'Forest BPF' }
                   ].map(snd => (
                     <button
                       key={snd.id}
                       onClick={() => changeSound(snd.id)}
                       className={`px-4 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wider transition-colors ${
                         activeSound === snd.id 
                           ? 'bg-white text-black font-bold' 
                           : 'text-[var(--color-outline)] hover:text-white'
                       }`}
                     >
                       {snd.label}
                     </button>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            4. FINAL CTA (Stark & Monolithic)
            ═══════════════════════════════════════════════════════ */}
        <section className="w-full py-40 px-6 flex flex-col items-center justify-center text-center">
          <h2 className="text-[8vw] leading-[0.9] font-black tracking-tighter text-[var(--color-on-surface)] mb-12">
            DO THE WORK.
          </h2>
          <Link 
            to="/register" 
            className="group relative h-16 px-10 rounded-full bg-[var(--color-on-surface)] text-[var(--color-background)] font-bold text-[14px] uppercase tracking-widest flex items-center justify-center overflow-hidden active:scale-95 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]"
          >
            <span className="relative z-10 transition-colors duration-300">Initialize System</span>
          </Link>
        </section>

      </main>

      {/* ── Footer (Ultra Minimal) ──────────────────────────────────────────────── */}
      <footer className="w-full py-8 px-6 border-t border-[var(--color-outline-variant)]/30 relative z-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 font-mono text-[10px] uppercase tracking-widest text-[var(--color-outline)]">
          <div>
            &copy; {new Date().getFullYear()} EVOLV SYSTEMS / ALL RIGHTS RESERVED.
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-[var(--color-on-surface)] transition-colors">Twitter</a>
            <a href="#" className="hover:text-[var(--color-on-surface)] transition-colors">GitHub</a>
            <a href="#" className="hover:text-[var(--color-on-surface)] transition-colors">Privacy</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

