import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { request } from '../api';

interface KeyResult {
  id: number;
  text: string;
  is_done: boolean;
}

interface Goal {
  id: number;
  title: string;
  description: string;
  priority: string;
  progress: number;
  due_date: string;
  status: string;
  KeyResults?: KeyResult[];
}

interface FocusArea {
  id: number;
  name: string;
  icon: string;
  current_score: number;
  target_score: number;
}

interface Habit {
  id: number;
  title: string;
  streak: number;
  category: string;
  frequency: string;
  completed_today: boolean;
}

interface SharedData {
  user_name: string;
  goals: Goal[];
  focus_areas: FocusArea[];
  habits: Habit[];
}

export function SharedOverviewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    // Use window.location.origin or relative path for request to handle different deployments
    request<SharedData>(`/shared/overview/${token}`)
      .then(res => {
        setData(res);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load shared overview:', err);
        setError(err.message || 'Invalid or expired accountability link.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ambient-mesh text-[var(--color-on-surface)] selection:bg-[var(--color-primary)]/30 font-body-md overflow-hidden relative">
        <div className="absolute inset-0 bg-dot-grid opacity-25 pointer-events-none z-0" />
        <div className="flex flex-col items-center gap-4 relative z-10 anim-fade-up">
          <span className="material-symbols-outlined animate-spin text-[32px] text-[var(--color-primary)]">sync</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--color-outline)] font-bold">
            ESTABLISHING CONNECTION TO SECURE NODE...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ambient-mesh text-[var(--color-on-surface)] selection:bg-[var(--color-primary)]/30 p-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-dot-grid opacity-25 pointer-events-none z-0" />
        
        <div className="max-w-[440px] w-full glass-card rounded-2xl p-8 md:p-10 text-center relative z-10 border border-[var(--glass-border)] bg-[var(--color-surface)]/20 backdrop-blur-xl anim-fade-up flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-[var(--color-error)]/10 rounded-full flex items-center justify-center border border-[var(--color-error)]/20">
            <span className="material-symbols-outlined text-[36px] text-[var(--color-error)] select-none">warning</span>
          </div>
          <div>
            <h1 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-error)] font-bold mb-2">
              Node Connection Failed
            </h1>
            <p className="font-body-md text-[13px] text-[var(--color-outline)] leading-relaxed">
              {error || 'This link may have been revoked or is no longer active.'}
            </p>
          </div>
          <Link
            to="/"
            className="w-full py-3.5 bg-white/[0.02] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black rounded-xl font-mono text-[9px] font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative bg-ambient-mesh text-[var(--color-on-surface)] selection:bg-[var(--color-primary)]/30 overflow-x-hidden font-body-md py-12 px-6 flex flex-col items-center">
      
      {/* Immersive Background Aesthetics */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Glowing Cursor-Following Orb */}
        <div 
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[120px] transition-transform duration-1000 ease-out opacity-25 mix-blend-screen"
          style={{
            background: 'radial-gradient(circle, rgba(210,187,255,0.3) 0%, rgba(90,218,206,0.08) 50%, transparent 75%)',
            left: `${mousePos.x}%`,
            top: `${mousePos.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      </div>
      
      {/* Dot-grid overlay */}
      <div className="absolute inset-0 bg-dot-grid opacity-25 pointer-events-none z-0" />

      <div className="max-w-5xl w-full relative z-10 flex flex-col gap-8 anim-fade-up">
        
        {/* Header */}
        <header className="glass-card rounded-2xl p-8 border border-[var(--glass-border)] bg-[var(--color-surface)]/20 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                <span className="font-mono text-[9px] uppercase tracking-widest font-bold leading-none">
                  Accountability Portal
                </span>
              </div>
              <h1 className="font-title-md text-[36px] font-black tracking-tight text-[var(--color-on-surface)] mt-4 leading-none">
                {data.user_name}
              </h1>
              <p className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-[0.2em] mt-3.5">
                READ-ONLY PROGRESS REPORT // SECURE PORTAL
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[9px] uppercase tracking-widest font-bold shrink-0 shadow-sm shadow-emerald-950/20">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span>Link Verified & Active</span>
            </div>
          </div>
        </header>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: Focus Areas & Habits */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            
            {/* Focus Scores */}
            <section className="glass-card rounded-2xl p-6 border border-[var(--glass-border)] bg-[var(--color-surface)]/20 backdrop-blur-xl flex flex-col">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-3.5 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">radar</span>
                Focus Areas
              </h2>
              <div className="flex flex-col gap-5">
                {data.focus_areas.length === 0 ? (
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-outline)] opacity-50 py-4">No focus areas defined.</p>
                ) : (
                  data.focus_areas.map(area => (
                    <div key={area.id} className="space-y-2">
                      <div className="flex justify-between items-center text-[13px]">
                        <span className="font-bold flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-[var(--color-outline)]">{area.icon || 'adjust'}</span>
                          {area.name}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--color-outline)] font-semibold">
                          {area.current_score}/10 <span className="opacity-40">(Target: {area.target_score})</span>
                        </span>
                      </div>
                      <div className="h-2 bg-white/[0.02] border border-[var(--glass-border)] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[var(--color-primary)] transition-all duration-500 rounded-full shadow-[0_0_12px_var(--color-primary)]"
                          style={{ width: `${area.current_score * 10}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Habits Check-in List */}
            <section className="glass-card rounded-2xl p-6 border border-[var(--glass-border)] bg-[var(--color-surface)]/20 backdrop-blur-xl flex flex-col">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-3.5 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[var(--color-secondary)]">bolt</span>
                Active Habits
              </h2>
              <div className="flex flex-col gap-3">
                {data.habits.length === 0 ? (
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-outline)] opacity-50 py-4">No active habits.</p>
                ) : (
                  data.habits.map(habit => (
                    <div key={habit.id} className="p-4 rounded-xl bg-white/[0.005] border border-[var(--glass-border)] flex items-center justify-between transition-colors hover:border-[var(--color-secondary)]/20">
                      <div>
                        <span className="text-[14px] font-bold block leading-snug">{habit.title}</span>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-outline)] font-bold mt-1.5 block">{habit.category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {habit.streak > 0 && (
                          <span className="font-mono text-[9px] bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border border-[var(--color-secondary)]/25 px-2 py-0.5 rounded-md uppercase tracking-wide font-bold">
                            🔥 {habit.streak}d
                          </span>
                        )}
                        <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${habit.completed_today ? 'bg-[var(--color-secondary)] border-[var(--color-secondary)] text-black' : 'border-white/10 bg-transparent text-[var(--color-outline)]/40'}`}>
                          <span className="material-symbols-outlined text-[14px] font-bold">
                            {habit.completed_today ? 'check' : 'close'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Goal Cascades & Deliveries */}
          <div className="lg:col-span-2">
            <section className="glass-card rounded-2xl p-8 border border-[var(--glass-border)] bg-[var(--color-surface)]/20 backdrop-blur-xl flex flex-col h-full">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface)] border-b border-[var(--color-outline-variant)] pb-3.5 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">flag</span>
                Goal Milestones & OKRs
              </h2>
              
              <div className="flex flex-col gap-6">
                {data.goals.length === 0 ? (
                  <div className="text-center py-20 font-mono text-[9px] uppercase tracking-widest text-[var(--color-outline)] opacity-50">
                    No active goals registered.
                  </div>
                ) : (
                  data.goals.map(goal => (
                    <div key={goal.id} className="p-6 rounded-xl bg-white/[0.005] border border-[var(--glass-border)] flex flex-col gap-4 transition-colors hover:border-[var(--color-primary)]/20">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className={`font-mono text-[9px] uppercase tracking-widest border px-2 py-0.5 rounded-full font-bold ${
                            goal.priority === 'high' ? 'bg-[var(--color-error)]/10 border-[var(--color-error)]/25 text-[var(--color-error)]' : 'bg-white/5 border-white/10 text-[var(--color-outline)]'
                          }`}>
                            {goal.priority} priority
                          </span>
                          <h3 className="text-[18px] font-extrabold tracking-tight mt-2.5 leading-snug">{goal.title}</h3>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-[13px] font-black text-[var(--color-primary)]">{goal.progress}%</span>
                          <div className="w-20 h-2 bg-white/[0.02] border border-[var(--glass-border)] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[var(--color-primary)] transition-all duration-500 rounded-full shadow-[0_0_10px_var(--color-primary)]" 
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {goal.description && (
                        <p className="text-[13px] text-[var(--color-outline)] leading-relaxed">{goal.description}</p>
                      )}

                      {/* Key Results */}
                      {goal.KeyResults && goal.KeyResults.length > 0 && (
                        <div className="border-t border-[var(--color-outline-variant)]/60 pt-4 mt-2 space-y-3">
                          <h4 className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-outline)] font-bold">Key Deliverables</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {goal.KeyResults.map(kr => (
                              <div key={kr.id} className="flex items-start gap-2.5 text-[13px]">
                                <span className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 select-none ${kr.is_done ? 'text-[var(--color-primary)]' : 'text-white/10'}`}>
                                  {kr.is_done ? 'check_box' : 'check_box_outline_blank'}
                                </span>
                                <span className={`leading-relaxed ${kr.is_done ? 'line-through text-[var(--color-outline)]' : 'text-[var(--color-on-surface)]'}`}>
                                  {kr.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

        </div>

        {/* Footer info */}
        <footer className="glass-card rounded-2xl p-6 border border-[var(--glass-border)] bg-[var(--color-surface)]/20 backdrop-blur-xl text-center">
          <p className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-[0.25em] font-bold">
            EVOLV — LIFE PLAN OS — SECURE NODE OVERVIEW
          </p>
        </footer>

      </div>
    </div>
  );
}
