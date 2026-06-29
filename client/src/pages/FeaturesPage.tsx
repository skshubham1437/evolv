import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const features = [
  {
    id: 'dashboard',
    icon: 'dashboard',
    color: 'var(--color-primary)',
    tag: 'Command Center',
    title: 'Live Dashboard',
    description:
      'Your entire operating system at a glance. See active goals, today\'s habits, recent journal entries, focus area scores, and a real-time burnout risk gauge — all updated live.',
    bullets: ['Today\'s task pulse', 'Streak & habit ring charts', 'Burnout risk meter', 'Goal progress at a glance'],
  },
  {
    id: 'tasks',
    icon: 'format_list_bulleted',
    color: 'var(--color-secondary)',
    tag: 'Execution Layer',
    title: 'Task Queue & Eisenhower Matrix',
    description:
      'Tasks aren\'t just to-dos — they live in a priority system. Drag between Urgent/Important quadrants or across project columns. The system auto-sorts by urgency so your queue always shows what actually matters next.',
    bullets: ['Eisenhower matrix view', 'Project grouping with drag-and-drop', 'Subtask nesting', 'Priority momentum scores'],
  },
  {
    id: 'goals',
    icon: 'flag',
    color: '#FF5F56',
    tag: 'Direction',
    title: 'Goal Cascades & OKRs',
    description:
      'Set long-horizon goals broken into measurable key results. Each goal tracks progress percentage, due date, and links to the habits and tasks that drive it. Nothing slips through.',
    bullets: ['OKR-style key results', 'Progress percentage tracking', 'Priority levels (high / medium / low)', 'Shareable accountability links'],
  },
  {
    id: 'habits',
    icon: 'bolt',
    color: 'var(--color-secondary)',
    tag: 'Identity Layer',
    title: 'Habit Tracking & Streaks',
    description:
      'Build atomic habits across every focus area. Track daily completions, watch streaks build, and see your habit consistency over rolling 7-day windows. The system categorises habits by life domain.',
    bullets: ['Daily & weekly habit frequencies', 'Streak counters with glow effect', '7-day completion grid', 'Focus area categorisation'],
  },
  {
    id: 'vision',
    icon: 'visibility',
    color: 'var(--color-primary)',
    tag: 'North Star',
    title: 'Vision Board',
    description:
      'Pin the life you\'re building. Upload images, write affirmations, and organise your aspirations into a visual canvas. Your vision board is the context everything else executes against.',
    bullets: ['Image uploads & affirmations', 'Life area organisation', 'Full-screen immersive view', 'Shareable vision URLs'],
  },
  {
    id: 'journal',
    icon: 'edit_note',
    color: '#A78BFA',
    tag: 'Reflection',
    title: 'Structured Daily Journal',
    description:
      'Not a blank page — a structured reflection engine. Log mood, energy, wins of the day, and tomorrow\'s intentions. The AI surfaces patterns in your entries over time.',
    bullets: ['Mood & energy sliders', 'Win logging & gratitude', 'AI-powered reflection prompts', 'Searchable journal history'],
  },
  {
    id: 'focus',
    icon: 'timer',
    color: '#F59E0B',
    tag: 'Deep Work',
    title: 'Focus Mode & Pomodoro',
    description:
      'Lock in. Focus Mode strips away the UI, runs a Pomodoro timer, plays procedural ambient audio, and blocks distractions. Every session is logged as a completed work block.',
    bullets: ['Configurable Pomodoro cycles', 'Procedural ambient soundscapes', 'Session logging & history', 'Distraction-free UI'],
  },
  {
    id: 'analytics',
    icon: 'bar_chart',
    color: 'var(--color-primary)',
    tag: 'Insight',
    title: 'Analytics & Progress Reports',
    description:
      'Data you actually care about. Completion rates over time, habit consistency heatmaps, focus area balance charts, and AI-generated weekly insights that tell you what\'s working and what\'s not.',
    bullets: ['Task & habit completion rates', 'Focus area radar charts', 'Weekly AI insights', 'Streak calendar heatmaps'],
  },
  {
    id: 'weekly',
    icon: 'date_range',
    color: 'var(--color-secondary)',
    tag: 'Weekly Cadence',
    title: 'Weekly & Monthly Reviews',
    description:
      'Built-in weekly review flow that walks you through wins, open loops, upcoming priorities, and next week\'s intentions. Monthly views roll up into quarterly OKR check-ins.',
    bullets: ['Guided weekly review flow', 'Monthly goal check-ins', 'Quarterly OKR roll-ups', 'Rolling metrics dashboard'],
  },
  {
    id: 'shutdown',
    icon: 'power_settings_new',
    color: '#EF4444',
    tag: 'Recovery',
    title: 'Hard Shutdown Protocol',
    description:
      'Evolv enforces an end-of-day ritual to force psychological detachment. Review open tasks, log tomorrow\'s top 3, capture loose thoughts, and officially close the workday.',
    bullets: ['Open task triaging', 'Tomorrow\'s top 3', 'Thought brain-dump', 'AI burnout risk scoring'],
  },
  {
    id: 'ai',
    icon: 'auto_awesome',
    color: 'var(--color-primary)',
    tag: 'AI Co-Pilot',
    title: 'AI Assistant',
    description:
      'An always-available AI coach trained on your data. Ask it to create tasks, summarise your week, generate journal prompts, prioritise your backlog, or just vent about your day.',
    bullets: ['Natural language task creation', 'Weekly summary generation', 'Burnout risk analysis', 'Context-aware coaching'],
  },
  {
    id: 'sharing',
    icon: 'shield',
    color: '#10B981',
    tag: 'Accountability',
    title: 'Accountability Sharing',
    description:
      'Generate a private, read-only link to your progress dashboard and share it with a mentor, coach, or accountability partner. They see goals, habits, and focus scores — no login required.',
    bullets: ['One-click shareable links', 'Read-only portal', 'Goals, habits & focus areas', 'Revoke access any time'],
  },
];

const steps = [
  { step: '01', icon: 'person_add', title: 'Create your account', description: 'Sign up in under 30 seconds. No credit card, no friction.' },
  { step: '02', icon: 'tune', title: 'Complete onboarding', description: 'Tell us your name, pick up to 3 focus areas (Health, Career, Wealth…), and write your first primary goal.' },
  { step: '03', icon: 'flag', title: 'Set your first goal', description: 'Create a goal with key results. Give it a due date and priority level. Watch the progress bar light up.' },
  { step: '04', icon: 'bolt', title: 'Add daily habits', description: 'Build 2–3 atomic habits tied to your focus areas. The system tracks your streak from day one.' },
  { step: '05', icon: 'format_list_bulleted', title: 'Load the task queue', description: 'Add your open actions to the task queue. Drag them into the Eisenhower matrix. Let the system surface what to do next.' },
  { step: '06', icon: 'timer', title: 'Execute in Focus Mode', description: 'Hit Focus Mode, start the Pomodoro, put on some ambient audio, and do the work.' },
];

export function FeaturesPage() {
  const { theme, toggleTheme } = useTheme();
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-[var(--color-background)] text-[var(--color-on-surface)] font-body-md scroll-smooth selection:bg-[var(--color-primary)]/30" id="features-container">

      {/* ── Dynamic Ambient Background ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#050505]">
        <div
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[120px] transition-transform duration-1000 ease-out opacity-30 mix-blend-screen"
          style={{
            background: 'radial-gradient(circle, rgba(108,74,176,0.4) 0%, rgba(90,218,206,0.1) 60%, transparent 80%)',
            left: `${mousePos.x}%`, top: `${mousePos.y}%`, transform: 'translate(-50%, -50%)'
          }}
        />
        <div className="absolute inset-0 bg-dot-grid pointer-events-none" />
      </div>

      {/* ── Floating Header ─── */}
      <header className="fixed top-6 inset-x-0 z-50 w-full flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto rounded-full glass-card border-[rgba(255,255,255,0.05)] bg-black/40 backdrop-blur-3xl px-6 py-3 flex items-center justify-between gap-8 md:gap-16 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          <Link to="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="w-6 h-6 rounded-full bg-[var(--color-on-surface)] text-[var(--color-background)] flex items-center justify-center font-bold text-[10px] group-hover:scale-90 transition-transform">E</div>
            <span className="font-mono text-xs font-bold tracking-widest uppercase">Evolv</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[11px] font-mono uppercase tracking-widest text-[var(--color-outline)]">
            <Link to="/" className="hover:text-[var(--color-on-surface)] transition-colors">Home</Link>
            <span className="text-[var(--color-on-surface)]">Features</span>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-on-surface)] hover:bg-white/5 transition-colors active:scale-90 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <Link to="/login" className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors hidden sm:block">
              Log in
            </Link>
            <Link to="/register" className="h-8 flex items-center px-4 rounded-full bg-[var(--color-on-surface)] text-[var(--color-background)] text-[11px] font-mono uppercase tracking-widest hover:scale-95 transition-transform">
              Start
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center">

        {/* ═══ HERO ═══ */}
        <section className="w-full min-h-[70vh] flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">
          <div className="anim-fade-up-1 flex flex-col items-center gap-6 max-w-4xl">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-secondary)] px-4 py-1.5 rounded-full border border-[var(--color-secondary)]/30 bg-[var(--color-secondary)]/10">
              Everything Evolv does
            </span>
            <h1 className="text-[8vw] md:text-[5vw] leading-[0.9] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/30 select-none">
              YOUR PERSONAL<br />OPERATING SYSTEM
            </h1>
            <p className="text-[18px] md:text-[20px] text-[var(--color-outline)] leading-relaxed font-medium max-w-2xl">
              12 deeply integrated modules. One coherent system for executing your life with precision.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <Link to="/register" className="group relative h-12 px-8 rounded-full bg-[var(--color-on-surface)] text-[var(--color-background)] font-bold text-[12px] uppercase tracking-wider flex items-center justify-center overflow-hidden active:scale-95 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 group-hover:text-white transition-colors duration-300">Get Started Free</span>
              </Link>
              <a href="#features" className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors flex items-center gap-2">
                Explore features
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
              </a>
            </div>
          </div>
        </section>

        {/* ═══ GETTING STARTED (HOW IT WORKS) ═══ */}
        <section className="w-full max-w-6xl mx-auto py-24 px-6" id="how-it-works">
          <div className="flex items-center gap-6 mb-16">
            <div className="w-16 h-px bg-[var(--color-outline-variant)]" />
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-outline)]">How it works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.step} className="glass-card rounded-2xl p-6 border border-[var(--glass-border)] bg-[var(--color-surface)]/5 backdrop-blur-xl flex flex-col gap-4 group hover:border-[var(--color-primary)]/30 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px] text-[var(--color-primary)]">{s.icon}</span>
                  </div>
                  <span className="font-mono text-[32px] font-black text-[var(--color-outline-variant)]/30 group-hover:text-[var(--color-primary)]/20 transition-colors leading-none select-none">{s.step}</span>
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-[var(--color-on-surface)] mb-2">{s.title}</h3>
                  <p className="text-[13px] text-[var(--color-outline)] leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ FEATURES GRID ═══ */}
        <section id="features" className="w-full max-w-6xl mx-auto py-24 px-6">
          <div className="flex items-center gap-6 mb-16">
            <div className="w-16 h-px bg-[var(--color-outline-variant)]" />
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-outline)]">All Features</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f) => {
              const isActive = activeFeature === f.id;
              return (
                <div
                  key={f.id}
                  onMouseEnter={() => setActiveFeature(f.id)}
                  onMouseLeave={() => setActiveFeature(null)}
                  className={`glass-card rounded-2xl p-8 border backdrop-blur-xl flex flex-col gap-5 cursor-default transition-all duration-300 ${
                    isActive
                      ? 'border-[var(--color-primary)]/40 bg-[var(--color-surface)]/15 shadow-[0_0_30px_rgba(108,74,176,0.1)]'
                      : 'border-[var(--glass-border)] bg-[var(--color-surface)]/5'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                        style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}
                      >
                        <span className="material-symbols-outlined text-[22px]" style={{ color: f.color }}>{f.icon}</span>
                      </div>
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-widest font-bold" style={{ color: f.color }}>
                          {f.tag}
                        </span>
                        <h3 className="font-bold text-[18px] text-[var(--color-on-surface)] leading-tight mt-0.5">{f.title}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[13px] text-[var(--color-outline)] leading-relaxed">
                    {f.description}
                  </p>

                  {/* Bullets */}
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {f.bullets.map((b) => (
                      <span
                        key={b}
                        className="font-mono text-[9px] uppercase tracking-wide px-2.5 py-1 rounded-md border font-bold"
                        style={{
                          color: f.color,
                          borderColor: `${f.color}25`,
                          background: `${f.color}0D`
                        }}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="w-full py-40 px-6 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-outline)] mb-6">Ready to execute?</span>
          <h2 className="text-[6vw] leading-[0.9] font-black tracking-tighter text-[var(--color-on-surface)] mb-12">
            BUILD YOUR SYSTEM.<br />DO THE WORK.
          </h2>
          <Link
            to="/register"
            className="group relative h-16 px-12 rounded-full bg-[var(--color-on-surface)] text-[var(--color-background)] font-bold text-[14px] uppercase tracking-widest flex items-center justify-center overflow-hidden active:scale-95 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 group-hover:text-white transition-colors duration-300">Start for free</span>
          </Link>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-[var(--color-outline)]">
            No credit card. No fluff. Just execution.
          </p>
        </section>

      </main>

      {/* ── Footer ─── */}
      <footer className="w-full py-8 px-6 border-t border-[var(--color-outline-variant)]/30 relative z-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 font-mono text-[10px] uppercase tracking-widest text-[var(--color-outline)]">
          <div>&copy; {new Date().getFullYear()} EVOLV SYSTEMS / ALL RIGHTS RESERVED.</div>
          <div className="flex gap-8">
            <Link to="/" className="hover:text-[var(--color-on-surface)] transition-colors">Home</Link>
            <Link to="/login" className="hover:text-[var(--color-on-surface)] transition-colors">Log In</Link>
            <Link to="/register" className="hover:text-[var(--color-on-surface)] transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
