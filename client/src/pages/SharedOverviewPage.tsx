import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    request<SharedData>(`http://localhost:8081/api/shared/overview/${token}`)
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] font-mono text-[12px]">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined animate-spin text-[24px] text-[var(--color-primary)]">sync</span>
          <span>ESTABLISHING CONNECTION TO SECURE NODE...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] p-6">
        <div className="max-w-md w-full border border-[var(--color-error)] bg-[var(--color-surface-container-low)] p-8 text-center space-y-4">
          <span className="material-symbols-outlined text-[48px] text-[var(--color-error)]">warning</span>
          <h1 className="font-mono text-[14px] uppercase tracking-wider text-[var(--color-error)] font-bold">Node Connection Failed</h1>
          <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)]">
            {error || 'This link may have been revoked or is no longer active.'}
          </p>
          <a
            href="/"
            className="inline-block py-2.5 px-6 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] font-mono text-[11px] uppercase tracking-widest text-[var(--color-on-surface)] transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] font-body-md py-12 px-6 flex flex-col items-center">
      <div className="max-w-5xl w-full border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] relative flex flex-col">
        
        {/* Header */}
        <header className="p-8 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 px-2 py-0.5 uppercase tracking-widest leading-none">
                Accountability Portal
              </span>
              <h1 className="font-title-md text-[36px] font-medium tracking-tight text-[var(--color-primary-fixed)] mt-2">
                {data.user_name}'s Node Overview
              </h1>
              <p className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mt-1 font-bold">
                READ-ONLY PROGRESS REPORT
              </p>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--color-secondary)] uppercase">
              <span className="w-2 h-2 bg-[var(--color-secondary)] rounded-full animate-pulse" />
              <span>Link Verified & Active</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Focus Areas & Habits */}
          <div className="lg:col-span-1 space-y-8">
            {/* Focus Scores */}
            <section className="border border-[var(--color-outline-variant)] p-6 bg-[var(--color-surface-container)]">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--color-outline)] border-b border-[var(--color-outline-variant)] pb-2.5 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">radar</span>
                Focus Matrices
              </h2>
              <div className="space-y-4">
                {data.focus_areas.length === 0 ? (
                  <p className="font-mono text-[10px] text-[var(--color-outline)]">No focus areas defined.</p>
                ) : (
                  data.focus_areas.map(area => (
                    <div key={area.id} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="font-bold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px]">{area.icon || 'adjust'}</span>
                          {area.name}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--color-outline)]">
                          {area.current_score}/10 (Target: {area.target_score})
                        </span>
                      </div>
                      <div className="h-2 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] overflow-hidden">
                        <div 
                          className="h-full bg-[var(--color-primary)] transition-all duration-300"
                          style={{ width: `${area.current_score * 10}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Habits Check-in List */}
            <section className="border border-[var(--color-outline-variant)] p-6 bg-[var(--color-surface-container)]">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--color-outline)] border-b border-[var(--color-outline-variant)] pb-2.5 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[var(--color-secondary)]">bolt</span>
                Active Habits
              </h2>
              <div className="space-y-3">
                {data.habits.length === 0 ? (
                  <p className="font-mono text-[10px] text-[var(--color-outline)]">No active habits.</p>
                ) : (
                  data.habits.map(habit => (
                    <div key={habit.id} className="p-3 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] flex items-center justify-between">
                      <div>
                        <span className="text-[13px] font-bold block">{habit.title}</span>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-outline)]">{habit.category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {habit.streak > 0 && (
                          <span className="font-mono text-[9px] bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border border-[var(--color-secondary)]/30 px-1.5 py-0.5 uppercase tracking-wide">
                            🔥 {habit.streak}d streak
                          </span>
                        )}
                        <div className={`w-6 h-6 border flex items-center justify-center ${habit.completed_today ? 'bg-[var(--color-secondary)]/20 border-[var(--color-secondary)] text-[var(--color-secondary)]' : 'border-[var(--color-outline-variant)] text-[var(--color-outline)]'}`}>
                          <span className="material-symbols-outlined text-[16px]">
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
          <div className="lg:col-span-2 space-y-8">
            <section className="border border-[var(--color-outline-variant)] p-6 bg-[var(--color-surface-container)] h-full">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--color-outline)] border-b border-[var(--color-outline-variant)] pb-2.5 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">flag</span>
                Goal Milestones & OKRs
              </h2>
              
              <div className="space-y-6">
                {data.goals.length === 0 ? (
                  <p className="font-mono text-[10px] text-[var(--color-outline)]">No active goals registered.</p>
                ) : (
                  data.goals.map(goal => (
                    <div key={goal.id} className="p-5 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className={`font-mono text-[9px] uppercase tracking-wide border px-1.5 py-0.5 ${
                            goal.priority === 'high' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-[var(--color-outline)]/10 border-[var(--color-outline-variant)]'
                          }`}>
                            {goal.priority} priority
                          </span>
                          <h3 className="text-[16px] font-bold mt-1.5">{goal.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[12px] font-bold">{goal.progress}%</span>
                          <div className="w-16 h-2.5 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] overflow-hidden">
                            <div 
                              className="h-full bg-[var(--color-primary)] transition-all duration-300" 
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {goal.description && (
                        <p className="text-[12px] text-[var(--color-on-surface-variant)] leading-relaxed">{goal.description}</p>
                      )}

                      {/* Key Results */}
                      {goal.KeyResults && goal.KeyResults.length > 0 && (
                        <div className="border-t border-[var(--color-outline-variant)] pt-3.5 mt-2 space-y-2">
                          <h4 className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-outline)]">Key Deliverables</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {goal.KeyResults.map(kr => (
                              <div key={kr.id} className="flex items-center gap-2 text-[12px]">
                                <span className={`material-symbols-outlined text-[16px] ${kr.is_done ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)]'}`}>
                                  {kr.is_done ? 'check_box' : 'check_box_outline_blank'}
                                </span>
                                <span className={kr.is_done ? 'line-through text-[var(--color-outline)]' : ''}>
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
        <footer className="p-6 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] text-center">
          <p className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest">
            EVOLV — LIFE PLAN OS — SECURE NODE OVERVIEW
          </p>
        </footer>

      </div>
    </div>
  );
}
