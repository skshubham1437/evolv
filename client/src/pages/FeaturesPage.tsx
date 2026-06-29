import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

interface Feature {
  id: string;
  icon: string;
  color: string;
  category: 'planning' | 'execution' | 'insight';
  tag: string;
  title: string;
  description: string;
  bullets: string[];
}

const features: Feature[] = [
  {
    id: 'dashboard',
    icon: 'dashboard',
    color: 'var(--color-primary)',
    category: 'insight',
    tag: 'Command Center',
    title: 'Live Dashboard & Control Panel',
    description:
      "Your entire life operating system in one central hub. Instantly check active goals, today's habit completions, journal highlights, focus area scores, and your real-time AI burnout risk gauge.",
    bullets: ["Today's task pulse", 'Streak & habit ring charts', 'Burnout risk meter', 'Goal progress at a glance'],
  },
  {
    id: 'vision',
    icon: 'visibility',
    color: 'var(--color-primary)',
    category: 'planning',
    tag: 'North Star',
    title: 'Vision Board & Identity',
    description:
      'Pin the future you are actively building. Upload inspirational images, write core affirmations, and organize your long-term aspirations across key Focus Areas (Health, Career, Wealth).',
    bullets: ['Image canvas & uploads', 'Identity-based goals', 'Focus Area balance', 'Shareable vision boards'],
  },
  {
    id: 'goals',
    icon: 'flag',
    color: '#FF5F56',
    category: 'planning',
    tag: 'Yearly Horizon',
    title: 'Goal Cascades & OKRs',
    description:
      'Set long-term yearly goals linked to your core values and break them down into measurable Key Results. Track confidence levels, milestone timelines, and category balance.',
    bullets: ['OKR-style key results', 'Progress percentage tracking', 'Priority levels', 'Milestone checkpoints'],
  },
  {
    id: 'quarterly',
    icon: 'view_cozy',
    color: '#5adace',
    category: 'planning',
    tag: 'Mid-Term Alignment',
    title: 'Quarterly Objectives & Scorecards',
    description:
      'Translate yearly objectives into 90-day focus sprints. Set outcomes, track performance indicators, and link objectives directly to parent goals to ensure consistent strategic progress.',
    bullets: ['90-day focus scorecards', 'Outcome tracking', 'Link to yearly goals', 'Status metrics (On Track / At Risk)'],
  },
  {
    id: 'monthly',
    icon: 'calendar_month',
    color: 'var(--color-secondary)',
    category: 'planning',
    tag: 'Monthly Horizon',
    title: 'Monthly Plans & AI Reviews',
    description:
      'Define your monthly theme, select target goals to advance, and log a baseline snapshot of your Focus Area scores. Generate AI retrospectives that synthesize your daily journals.',
    bullets: ['Focus theme mapping', 'Goal prioritization', 'Life score radar charts', 'Monthly AI retrospectives'],
  },
  {
    id: 'weekly',
    icon: 'date_range',
    color: 'var(--color-secondary)',
    category: 'planning',
    tag: 'Weekly Cadence',
    title: 'Weekly Planners & Time Blocks',
    description:
      'Bridge the gap between strategy and execution. Set Weekly Priorities (MITs), schedule time blocks directly in your calendar view, and run guided weekly review flows.',
    bullets: ['Time-block scheduler', 'Most Important Tasks (MITs)', 'Weekly scorecard review', 'AI plan generation'],
  },
  {
    id: 'tasks',
    icon: 'format_list_bulleted',
    color: 'var(--color-secondary)',
    category: 'execution',
    tag: 'Execution Layer',
    title: 'Priority Matrix & Kanban',
    description:
      "Tasks aren't just to-dos — they live in a priority system. Drag between Urgent/Important quadrants or across project columns. The system auto-sorts by urgency so your queue shows what actually matters next.",
    bullets: ['Eisenhower matrix view', 'Project grouping with drag-and-drop', 'Subtask nesting', 'Priority momentum scores'],
  },
  {
    id: 'habits',
    icon: 'bolt',
    color: 'var(--color-secondary)',
    category: 'execution',
    tag: 'Identity Layer',
    title: 'Habits & Streak Shields',
    description:
      'Build consistency through identity-based habits. Track daily completions, visualize consistency heatmaps, and protect your hard-earned progress with earned Streak Shields.',
    bullets: ['Heatmap consistency grid', 'Custom streaks counters', 'Focus area tagging', 'Streak Shield protection'],
  },
  {
    id: 'focus',
    icon: 'timer',
    color: '#F59E0B',
    category: 'execution',
    tag: 'Deep Work',
    title: 'Focus Mode & Audio Synth',
    description:
      'Eliminate distractions. Start a custom Pomodoro session, turn on ambient noise synthesized in real time (Rain, Binaural Beats, Forest), and watch your flow state scores update.',
    bullets: ['Custom Pomodoro timer', 'Procedural soundscapes', 'Waveform visualizer', 'Flow score analytics'],
  },
  {
    id: 'journal',
    icon: 'edit_note',
    color: '#A78BFA',
    category: 'execution',
    tag: 'Reflection',
    title: 'Structured Daily Journal',
    description:
      'Not a blank page — a structured reflection engine. Log mood, energy, wins of the day, and tomorrow\'s intentions. The AI surfaces patterns in your entries over time.',
    bullets: ['Mood & energy sliders', 'Win logging & gratitude', 'AI-powered reflection prompts', 'Searchable journal history'],
  },
  {
    id: 'shutdown',
    icon: 'power_settings_new',
    color: '#EF4444',
    category: 'execution',
    tag: 'Recovery',
    title: 'Hard Shutdown Protocol',
    description:
      'Ensure a healthy boundary between work and life. Triaging open items, plan tomorrow\'s top 3, perform a brain dump, and officially shut down for the day with an AI burnout analysis.',
    bullets: ['EOD task triaging', "Tomorrow's top 3 planner", 'Brain-dump container', 'Burnout warning analysis'],
  },
  {
    id: 'analytics',
    icon: 'bar_chart',
    color: 'var(--color-primary)',
    category: 'insight',
    tag: 'Insights',
    title: 'Personal Analytics',
    description:
      'Beautiful, executive-level data dashboards. Monitor your completion rates, habit consistency heatmaps, focus area radar charts, and sleep/mood vs. productivity correlations.',
    bullets: ['Life area balance wheel', 'Sleep & energy correlation', 'Momentum score gauge', 'Weekly reports summary'],
  },
  {
    id: 'ai',
    icon: 'auto_awesome',
    color: 'var(--color-primary)',
    category: 'insight',
    tag: 'Intelligence',
    title: 'AI Coach & Co-Pilot',
    description:
      'An always-available AI coach trained on your data. Ask it to create tasks, summarize your week, generate journal prompts, prioritize your backlog, or offer customized habits recommendations.',
    bullets: ['Natural language planning', 'Automated weekly reviews', 'Burnout probability index', 'Context-aware feedback'],
  },
  {
    id: 'sharing',
    icon: 'shield',
    color: '#10B981',
    category: 'insight',
    tag: 'Social Trust',
    title: 'Secure Portal Sharing',
    description:
      'Generate secure, read-only access links to your Evolv dashboard. Share your progress on goals, habits, and focus balance with a mentor or accountability partner without exposing private data.',
    bullets: ['Secure read-only tokens', 'Custom access duration', 'Revokable sharing keys', 'Live progress sync'],
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

const categories = [
  { id: 'all', label: 'All Modules' },
  { id: 'planning', label: 'Planning Horizon' },
  { id: 'execution', label: 'Execution & Habits' },
  { id: 'insight', label: 'AI & Analytics' },
];

export function FeaturesPage() {
  const { theme, toggleTheme } = useTheme();
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'planning' | 'execution' | 'insight'>('all');

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const filteredFeatures = features.filter(
    (f) => selectedCategory === 'all' || f.category === selectedCategory
  );

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-[var(--color-background)] text-[var(--color-on-surface)] font-body-md scroll-smooth selection:bg-[var(--color-primary)]/30" id="features-container">

      {/* ── Dynamic Ambient Background ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-ambient-mesh">
        <div
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[120px] transition-transform duration-1000 ease-out"
          style={{
            background: 'radial-gradient(circle, rgba(108,74,176,0.4) 0%, rgba(90,218,206,0.1) 60%, transparent 80%)',
            left: `${mousePos.x}%`, 
            top: `${mousePos.y}%`, 
            transform: 'translate(-50%, -50%)',
            mixBlendMode: theme === 'dark' ? 'screen' : 'multiply',
            opacity: theme === 'dark' ? 0.3 : 0.12
          }}
        />
        <div className="absolute inset-0 bg-dot-grid pointer-events-none" />
      </div>

      {/* ── Floating Header ─── */}
      <header className="fixed top-6 inset-x-0 z-50 w-full flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto rounded-full glass-panel px-6 py-3 flex items-center justify-between gap-8 md:gap-16 shadow-lg">
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
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-secondary)] px-4 py-1.5 rounded-full border border-[var(--color-secondary)]/30 bg-[var(--color-secondary)]/10 glow-shadow-secondary">
              Everything Evolv does
            </span>
            <h1 className="text-[8vw] md:text-[5vw] leading-[0.9] font-black tracking-tighter text-gradient-hero select-none">
              YOUR PERSONAL<br />OPERATING SYSTEM
            </h1>
            <p className="text-[18px] md:text-[20px] text-[var(--color-outline)] leading-relaxed font-medium max-w-2xl">
              14 deeply integrated modules. One coherent system for executing your life with precision.
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

          <div className="relative flex flex-col gap-12 max-w-4xl mx-auto pl-12 md:pl-0">
            {/* The vertical connector line */}
            <div className="absolute left-6 md:left-1/2 top-4 bottom-4 w-0.5 bg-gradient-to-b from-[var(--color-primary)]/40 via-[var(--color-secondary)]/30 to-[var(--color-primary)]/10 -translate-x-1/2 pointer-events-none" />

            {steps.map((s, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <div 
                  key={s.step} 
                  className={`relative flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-0 w-full ${
                    isEven ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  {/* Step node (glowing circle on the line) */}
                  <div className="absolute left-6 md:left-1/2 w-10 h-10 rounded-full bg-[var(--color-background)] border-2 border-[var(--color-primary)] flex items-center justify-center -translate-x-1/2 z-10 shadow-[0_0_15px_rgba(210,187,255,0.4)] transition-transform duration-500 hover:scale-110">
                    <span className="font-mono text-[11px] font-bold text-[var(--color-primary)]">{s.step}</span>
                  </div>

                  {/* Spacer for desktop alignment */}
                  <div className="hidden md:block w-1/2" />

                  {/* Content card wrapper */}
                  <div className={`w-full md:w-1/2 ${isEven ? 'md:pr-12' : 'md:pl-12'}`}>
                    <div className="glass-card rounded-3xl p-6 border border-[var(--glass-border)] bg-[var(--color-surface)]/5 backdrop-blur-xl flex items-start gap-5 hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-surface)]/10 transition-all duration-500 group">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <span className="material-symbols-outlined text-[24px] text-[var(--color-primary)]">{s.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-[16px] text-white tracking-tight mb-1">{s.title}</h3>
                        <p className="text-[13px] text-[var(--color-outline)] leading-relaxed">{s.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ FEATURES GRID ═══ */}
        <section id="features" className="w-full max-w-6xl mx-auto py-24 px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-16">
            <div className="flex items-center gap-6">
              <div className="w-16 h-px bg-[var(--color-outline-variant)]" />
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-outline)]">All Features</h2>
            </div>
            
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-2 glass-panel p-1.5 rounded-full border border-[var(--glass-border)]">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-4 py-2 rounded-full font-mono text-[9px] uppercase tracking-widest transition-all duration-300 font-bold ${
                    selectedCategory === cat.id
                      ? 'bg-[var(--color-primary)] text-black shadow-[0_0_12px_rgba(210,187,255,0.3)]'
                      : 'text-[var(--color-outline)] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 anim-fade-up">
            {filteredFeatures.map((f) => {
              return (
                <div
                  key={f.id}
                  className="glass-card glow-card card-tilt-hover rounded-3xl p-8 border border-[var(--glass-border)] bg-[var(--color-surface)]/5 backdrop-blur-xl flex flex-col gap-6 cursor-default transition-all duration-500 group hover:bg-[var(--color-surface)]/10"
                  style={{
                    '--card-accent-color': f.color,
                  } as React.CSSProperties}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                        style={{
                          background: `${f.color}15`,
                          border: `1px solid ${f.color}35`,
                          boxShadow: `0 0 15px ${f.color}15`
                        }}
                      >
                        <span className="material-symbols-outlined text-[24px]" style={{ color: f.color }}>{f.icon}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono text-[9px] uppercase tracking-widest font-bold mb-1 opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: f.color }}>
                          {f.tag}
                        </span>
                        <h3 className="font-bold text-[18px] text-[var(--color-on-surface)] leading-tight tracking-tight group-hover:text-white transition-colors">{f.title}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[13.5px] text-[var(--color-outline)] leading-relaxed font-normal opacity-90 group-hover:opacity-100 transition-opacity">
                    {f.description}
                  </p>

                  {/* Bullets */}
                  <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-[var(--color-outline-variant)]/10">
                    {f.bullets.map((b) => (
                      <span
                        key={b}
                        className="font-mono text-[9px] uppercase tracking-wide px-3 py-1.5 rounded-lg border font-bold transition-all duration-300"
                        style={{
                          color: f.color,
                          borderColor: `${f.color}18`,
                          background: `${f.color}05`
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
