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
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx);
    src.loop = true;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 500; bpf.Q.value = 0.4;
    const forestGain = ctx.createGain(); forestGain.gain.value = 0.06;
    src.connect(bpf); bpf.connect(forestGain); forestGain.connect(master);
    src.start();

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

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  // ── Focus demo state ────────────────────────────────────────────────
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [activeSound, setActiveSound] = useState('rain');
  const stopAudioRef = useRef<(() => void) | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] font-body-md scroll-smooth selection:bg-[var(--color-primary)] selection:text-black">
      
      {/* Boxy Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] grid-rows-[repeat(auto-fill,minmax(80px,1fr))] opacity-[0.04]">
          {Array.from({ length: 300 }).map((_, i) => (
            <div key={i} className="border-r border-b border-[var(--color-on-surface)]" />
          ))}
        </div>
      </div>

      {/* Brutalist Header */}
      <header className="sticky top-0 z-50 w-full bg-[var(--color-surface-container-lowest)] border-b-2 border-[var(--color-outline-variant)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/10 flex items-center justify-center shadow-[2px_2px_0px_var(--color-primary)]">
              <span className="font-mono text-[var(--color-primary)] font-bold text-xl leading-none">E</span>
            </div>
            <span className="font-mono text-2xl font-bold tracking-tighter uppercase">Evolv</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 font-mono text-sm font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            <a href="#features" className="hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 px-3 py-1 border-2 border-transparent hover:border-[var(--color-primary)] transition-all">Features</a>
            <a href="#playground" className="hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 px-3 py-1 border-2 border-transparent hover:border-[var(--color-primary)] transition-all">Engine</a>
            <a href="#pricing" className="hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 px-3 py-1 border-2 border-transparent hover:border-[var(--color-primary)] transition-all">Pricing</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 border-2 border-[var(--color-outline-variant)] flex items-center justify-center hover:bg-[var(--color-on-surface)] hover:text-[var(--color-surface-container-lowest)] transition-colors active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_var(--color-outline-variant)]"
              aria-label="Toggle Theme"
            >
              <span className="material-symbols-outlined text-[20px]">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <Link 
              to="/login" 
              className="hidden sm:block px-4 py-2 border-2 border-[var(--color-outline)] font-mono text-sm font-bold uppercase hover:bg-[var(--color-on-surface)] hover:text-[var(--color-surface-container-lowest)] transition-colors shadow-[2px_2px_0px_var(--color-outline)] active:translate-y-0.5 active:shadow-none"
            >
              Access Node
            </Link>
            <Link 
              to="/register" 
              className="hidden sm:block px-6 py-2 border-2 border-[var(--color-primary)] bg-[var(--color-primary)] text-black font-mono text-sm font-bold uppercase shadow-[4px_4px_0px_var(--color-on-surface)] hover:bg-[var(--color-primary-fixed)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            >
              Initialize
            </Link>
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden w-10 h-10 border-2 border-[var(--color-outline-variant)] flex items-center justify-center hover:bg-[var(--color-on-surface)] hover:text-[var(--color-surface-container-lowest)] transition-colors active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_var(--color-outline-variant)]"
              aria-label="Toggle Menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="material-symbols-outlined text-[20px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/60 transition-opacity duration-200"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div 
        className={`md:hidden fixed top-0 right-0 h-full w-64 bg-[var(--color-surface-container-lowest)] border-l-4 border-[var(--color-on-surface)] z-50 p-6 flex flex-col transition-transform duration-200 transform ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-[var(--color-outline-variant)]">
          <span className="font-mono text-lg font-bold uppercase tracking-tight">Navigation</span>
          <button 
            onClick={() => setMobileMenuOpen(false)} 
            className="w-8 h-8 border-2 border-[var(--color-outline)] flex items-center justify-center hover:bg-[var(--color-on-surface)] hover:text-[var(--color-surface-container-lowest)]"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <nav className="flex flex-col gap-6 font-mono text-md font-bold uppercase tracking-wider mb-8">
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--color-primary)] py-2 border-b border-[var(--color-outline-variant)]">Features</a>
          <a href="#playground" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--color-primary)] py-2 border-b border-[var(--color-outline-variant)]">Engine</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--color-primary)] py-2 border-b border-[var(--color-outline-variant)]">Pricing</a>
        </nav>
        <div className="flex flex-col gap-4 mt-auto">
          <Link 
            to="/login" 
            onClick={() => setMobileMenuOpen(false)}
            className="w-full text-center py-3 border-2 border-[var(--color-outline)] font-mono text-sm font-bold uppercase hover:bg-[var(--color-on-surface)] hover:text-[var(--color-surface-container-lowest)] transition-colors shadow-[2px_2px_0px_var(--color-outline)] active:translate-y-0.5 active:shadow-none"
          >
            Access Node
          </Link>
          <Link 
            to="/register" 
            onClick={() => setMobileMenuOpen(false)}
            className="w-full text-center py-3 border-2 border-[var(--color-primary)] bg-[var(--color-primary)] text-black font-mono text-sm font-bold uppercase shadow-[4px_4px_0px_var(--color-on-surface)] hover:bg-[var(--color-primary-fixed)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            Initialize
          </Link>
        </div>
      </div>

      <main className="relative z-10 flex flex-col items-center">

        {/* 1. Hero Section */}
        <section className="w-full pt-20 pb-24 px-6 flex flex-col items-center text-center">
          <div className="border-2 border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 px-4 py-2 mb-10 shadow-[4px_4px_0px_var(--color-secondary)]">
            <span className="font-mono text-[12px] font-bold text-[var(--color-secondary)] uppercase tracking-widest">System v2.0 Operational</span>
          </div>
          
          <h1 className="max-w-5xl font-mono text-5xl md:text-7xl font-bold leading-none tracking-tighter mb-8 uppercase border-y-4 border-[var(--color-on-surface)] py-8">
            Design Your Life.<br />
            <span className="text-[var(--color-primary)]">Master Your Focus.</span>
          </h1>
          
          <p className="max-w-2xl text-lg font-mono text-[var(--color-on-surface-variant)] leading-relaxed mb-12">
            A brutally efficient, highly-opinionated Life OS. Evolv synthesizes deep focus, stacks core habits, and enforces disciplined execution.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Link 
              to="/register" 
              className="px-8 py-4 border-2 border-[var(--color-primary)] bg-[var(--color-primary)] text-black font-mono font-bold text-lg uppercase shadow-[6px_6px_0px_var(--color-on-surface)] hover:bg-[var(--color-primary-fixed)] active:translate-x-1.5 active:translate-y-1.5 active:shadow-[0px_0px_0px_var(--color-on-surface)] transition-all flex items-center gap-3"
            >
              Start Evolution
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <a 
              href="#features" 
              className="px-8 py-4 border-2 border-[var(--color-outline)] bg-[var(--color-surface-container)] font-mono font-bold text-lg uppercase shadow-[6px_6px_0px_var(--color-outline)] hover:bg-[var(--color-surface-container-high)] active:translate-x-1.5 active:translate-y-1.5 active:shadow-[0px_0px_0px_var(--color-outline)] transition-all"
            >
              Read Manual
            </a>
          </div>

          {/* Boxy Dashboard Preview */}
          <div className="w-full max-w-5xl mt-24">
            <div className="border-4 border-[var(--color-on-surface)] bg-[var(--color-surface-container)] shadow-[16px_16px_0px_var(--color-on-surface)]">
              {/* Window Controls */}
              <div className="flex items-center justify-between border-b-4 border-[var(--color-on-surface)] bg-[var(--color-on-surface)] text-[var(--color-surface-container)] px-4 py-2 font-mono font-bold text-sm uppercase tracking-widest">
                <span>evolv.app/dashboard</span>
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-red-400" />
                  <div className="w-3 h-3 bg-yellow-400" />
                  <div className="w-3 h-3 bg-green-400" />
                </div>
              </div>

              {/* Mock Dashboard UI */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                <div className="col-span-2 border-2 border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-6 shadow-[4px_4px_0px_var(--color-outline-variant)]">
                  <h3 className="font-mono font-bold text-lg uppercase mb-6 border-b-2 border-[var(--color-outline-variant)] pb-2 flex justify-between">
                    Morning Sequence
                    <span className="text-[var(--color-secondary)]">IN PROGRESS</span>
                  </h3>
                  <div className="space-y-4 font-mono font-medium">
                    <div className="flex items-center gap-4 bg-[var(--color-surface-container)] p-4 border-2 border-[var(--color-outline-variant)]">
                      <div className="w-6 h-6 border-2 border-[var(--color-outline)] bg-[var(--color-on-surface)] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-surface-container)]">check</span>
                      </div>
                      <span className="line-through text-[var(--color-on-surface-variant)]">Hydrate & Supplements</span>
                    </div>
                    <div className="flex items-center gap-4 bg-[var(--color-primary)]/10 p-4 border-2 border-[var(--color-primary)]">
                      <div className="w-6 h-6 border-2 border-[var(--color-primary)] bg-[var(--color-surface-container)]" />
                      <span className="text-[var(--color-primary)]">Deep Work Block (90m)</span>
                    </div>
                  </div>
                </div>
                <div className="border-2 border-[var(--color-primary)] bg-[var(--color-primary)] text-black p-6 shadow-[4px_4px_0px_var(--color-on-surface)] flex flex-col items-center justify-center">
                   <span className="material-symbols-outlined text-5xl mb-4">hourglass_top</span>
                   <span className="font-mono font-bold text-5xl tracking-tighter">45:00</span>
                   <span className="font-mono font-bold text-sm mt-2 uppercase tracking-widest border-t-2 border-black pt-2 w-full text-center">Focus Mode Active</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Brutalist Features */}
        <section id="features" className="w-full py-24 px-6 border-y-4 border-[var(--color-on-surface)] bg-[var(--color-surface-container-highest)]">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16 border-l-8 border-[var(--color-primary)] pl-6">
              <h2 className="font-mono text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-4">Core Architecture</h2>
              <p className="text-[var(--color-on-surface-variant)] font-mono text-lg max-w-xl">A robust framework designed to eliminate friction and enforce execution.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                { title: 'Habit Matrix', icon: 'layers', desc: 'Chain behaviors sequentially. Execute routines without cognitive load.' },
                { title: 'Focus Engine', icon: 'center_focus_strong', desc: 'Strict time-boxing. Native audio shielding to block external input.' },
                { title: 'System Shutdown', icon: 'power_settings_new', desc: 'Mandatory daily review. Detach intentionally for psychological recovery.' }
              ].map((ft, i) => (
                <div key={i} className="border-4 border-[var(--color-on-surface)] bg-[var(--color-surface-container)] p-6 shadow-[8px_8px_0px_var(--color-on-surface)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[0px_0px_0px_var(--color-on-surface)] transition-all">
                  <div className="w-16 h-16 border-2 border-[var(--color-on-surface)] bg-[var(--color-on-surface)] flex items-center justify-center text-[var(--color-surface-container)] mb-6">
                    <span className="material-symbols-outlined text-[32px]">{ft.icon}</span>
                  </div>
                  <h3 className="font-mono font-bold text-xl uppercase mb-4 border-b-2 border-[var(--color-outline-variant)] pb-2">{ft.title}</h3>
                  <p className="text-[var(--color-on-surface-variant)] font-mono text-sm leading-relaxed">{ft.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Interactive Engine (Playground) */}
        <section id="playground" className="w-full py-24 px-6 bg-[var(--color-surface-container-lowest)]">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-stretch gap-12">
            
            <div className="flex-1 border-4 border-[var(--color-on-surface)] bg-[var(--color-surface-container)] p-8 shadow-[12px_12px_0px_var(--color-on-surface)] flex flex-col justify-between">
              <div>
                <div className="inline-block border-2 border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 px-3 py-1 mb-6">
                  <span className="font-mono font-bold text-xs text-[var(--color-secondary)] uppercase tracking-widest">Module: Focus Audio</span>
                </div>
                <h2 className="font-mono text-3xl font-bold uppercase tracking-tighter mb-4">Native Synthesizer</h2>
                <p className="text-[var(--color-on-surface-variant)] font-mono text-sm leading-relaxed mb-8">
                  Evolv generates procedural ambient noise directly in the browser. Zero reliance on external streaming services. Absolute privacy.
                </p>
              </div>
              
              <div className="border-2 border-[var(--color-outline-variant)] p-6 bg-[var(--color-surface-container-low)]">
                <div className="flex items-center justify-between mb-6 border-b-2 border-[var(--color-outline-variant)] pb-4">
                  <span className="font-mono font-bold text-sm uppercase tracking-wider">Select Frequency</span>
                  {soundPlaying && (
                    <div className="flex gap-1 items-end h-4">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-2 bg-[var(--color-primary)] border border-black animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { id: 'rain', label: 'Rain', icon: 'rainy' },
                    { id: 'binaural', label: 'Alpha', icon: 'waves' },
                    { id: 'forest', label: 'Forest', icon: 'forest' }
                  ].map(snd => (
                    <button
                      key={snd.id}
                      onClick={() => changeSound(snd.id)}
                      className={`flex flex-col items-center gap-2 p-4 border-2 font-mono transition-all ${
                        activeSound === snd.id 
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-black shadow-[4px_4px_0px_var(--color-on-surface)]' 
                          : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-outline-variant)] hover:text-black'
                      }`}
                    >
                      <span className="material-symbols-outlined text-3xl">{snd.icon}</span>
                      <span className="text-xs font-bold uppercase">{snd.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={toggleSoundscape}
                  className={`w-full py-4 border-2 border-[var(--color-on-surface)] font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                    soundPlaying
                      ? 'bg-[var(--color-on-surface)] text-[var(--color-surface-container)] shadow-[inset_4px_4px_0px_rgba(0,0,0,0.5)]'
                      : 'bg-[var(--color-secondary)] text-black shadow-[4px_4px_0px_var(--color-on-surface)] hover:bg-[var(--color-secondary-fixed)] active:translate-x-1 active:translate-y-1 active:shadow-none'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">{soundPlaying ? 'stop_circle' : 'play_circle'}</span>
                  <span>{soundPlaying ? 'Terminate Audio' : 'Initialize Audio'}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 border-4 border-[var(--color-on-surface)] bg-[var(--color-surface-container)] p-8 shadow-[12px_12px_0px_var(--color-on-surface)] flex flex-col justify-center items-center min-h-[400px]">
               {/* Boxy Visualizer graphic */}
               <div className="w-full h-full border-2 border-[var(--color-outline-variant)] bg-[var(--color-surface-container-highest)] p-4 relative overflow-hidden flex flex-col justify-end">
                  <div className="absolute top-4 left-4 font-mono text-[10px] uppercase font-bold text-[var(--color-outline)]">Output Level</div>
                  <div className="flex items-end justify-between gap-2 h-4/5 w-full">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`flex-1 border-2 border-black ${soundPlaying ? 'bg-[var(--color-primary)] animate-pulse' : 'bg-[var(--color-outline-variant)]'}`}
                        style={{ height: soundPlaying ? `${20 + Math.random() * 80}%` : '10%', animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
               </div>
            </div>

          </div>
        </section>

        {/* 4. CTA */}
        <section id="pricing" className="w-full py-32 px-6 border-t-4 border-[var(--color-on-surface)] bg-[var(--color-primary)] text-black flex flex-col items-center text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-mono text-5xl md:text-6xl font-bold tracking-tighter mb-8 uppercase">
              Ready To Execute?
            </h2>
            <p className="text-xl font-mono font-medium mb-12 max-w-2xl mx-auto">
              The system is online. Secure your node today. Free forever for individuals.
            </p>
            <Link 
              to="/register" 
              className="inline-block px-12 py-5 border-4 border-black bg-[var(--color-surface-container-lowest)] text-black font-mono font-bold text-2xl uppercase shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:bg-[var(--color-surface-container)] active:translate-x-2 active:translate-y-2 active:shadow-none transition-all"
            >
              Access System
            </Link>
          </div>
        </section>

      </main>

      {/* Brutalist Footer */}
      <footer className="w-full border-t-4 border-[var(--color-on-surface)] bg-[var(--color-surface-container-highest)] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 font-mono font-bold text-sm uppercase tracking-wider">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-[var(--color-on-surface)] bg-[var(--color-primary)] flex items-center justify-center text-black">
              E
            </div>
            <span>Evolv OS</span>
          </div>
          <div className="flex gap-8 text-[var(--color-on-surface-variant)]">
            <a href="#" className="hover:text-[var(--color-primary)] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[var(--color-primary)] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[var(--color-primary)] transition-colors">Status</a>
          </div>
          <div className="text-[var(--color-outline)]">
            V 2.0.0
          </div>
        </div>
      </footer>

    </div>
  );
}
