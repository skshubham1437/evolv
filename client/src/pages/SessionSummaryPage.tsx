import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchHabits, type Habit } from '../api';

export function SessionSummaryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { elapsedSeconds?: number; totalSecs?: number } | null;

  const [completedHabits, setCompletedHabits] = useState<Habit[]>([]);
  const [loadingHabits, setLoadingHabits] = useState(true);

  useEffect(() => {
    async function loadHabits() {
      try {
        const habits = await fetchHabits();
        setCompletedHabits((habits || []).filter(h => h.completed_today));
      } catch (err) {
        console.error('Failed to load habits for focus summary:', err);
      } finally {
        setLoadingHabits(false);
      }
    }
    loadHabits();
  }, []);

  const elapsedSeconds = state?.elapsedSeconds ?? 45 * 60; // fallback to 45 mins
  const minutesFocused = Math.round(elapsedSeconds / 60) || 1; // minimum 1 min if elapsed > 0
  const targetSecs = state?.totalSecs ?? 45 * 60;
  
  // Calculate real deep work score
  const completionRate = targetSecs > 0 ? (elapsedSeconds / targetSecs) : 1;
  const deepWorkScore = Math.max(10, Math.min(100, Math.round(30 + completionRate * 70)));

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] items-center overflow-hidden">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[var(--color-outline-variant)] relative">

        <div className="flex-1 overflow-y-auto no-scrollbar bg-[var(--color-surface-container-low)] pb-32 flex flex-col items-center justify-center p-8">
          
          <main className="w-full max-w-lg space-y-8">
            
            {/* Header Celebration */}
            <header className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-24 h-24 border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/10">
                <span className="material-symbols-outlined text-[var(--color-primary)] text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>
              <div>
                <h1 className="font-title-md text-[36px] font-bold text-[var(--color-on-surface)] tracking-tight uppercase">Session Complete</h1>
                <p className="font-label-sm text-[11px] text-[var(--color-outline)] font-bold uppercase tracking-widest mt-2">Outstanding focus. Operation successful.</p>
              </div>
            </header>

            {/* Stats Grid */}
            <section className="grid grid-cols-2 gap-6">
              {/* Focus Time */}
              <div className="col-span-2 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-8 relative flex flex-col items-center justify-center gap-4">
                <div className="flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-2xl">timer</span>
                  <span className="font-label-sm text-[12px] text-[var(--color-on-surface-variant)] uppercase font-bold tracking-widest">Focus Time Logged</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-title-md text-[64px] font-bold text-[var(--color-primary)] leading-none tracking-tighter">{minutesFocused}</span>
                  <span className="font-label-sm text-[14px] text-[var(--color-outline)] uppercase tracking-widest font-bold">min</span>
                </div>
              </div>
              
              {/* Deep Work Score */}
              <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6 flex flex-col justify-between min-h-[140px]">
                <span className="font-label-sm text-[10px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-widest mb-4">Deep Work Score</span>
                <div className="flex items-end gap-2 mt-auto">
                  <span className="font-title-md text-[40px] font-bold text-[var(--color-secondary)] leading-none">{deepWorkScore}</span>
                  <span className="font-label-sm text-[12px] text-[var(--color-outline)] font-bold pb-1">/100</span>
                </div>
              </div>
              
              {/* Habits Progress */}
              <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6 flex flex-col min-h-[140px]">
                <span className="font-label-sm text-[10px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-widest mb-4">Habits Hit</span>
                <div className="mt-auto space-y-3 overflow-y-auto max-h-[80px] no-scrollbar">
                  {loadingHabits ? (
                    <span className="font-label-sm text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-widest animate-pulse">Loading...</span>
                  ) : completedHabits.length > 0 ? (
                    completedHabits.slice(0, 3).map(h => (
                      <div key={h.id} className="flex justify-between items-center gap-2 border-b border-[var(--color-surface-variant)] pb-1 last:border-0 last:pb-0">
                        <span className="font-body-md text-[13px] text-[var(--color-on-surface)] truncate" title={h.title}>{h.title}</span>
                        <span className="material-symbols-outlined text-[var(--color-secondary)] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      </div>
                    ))
                  ) : (
                    <span className="font-label-sm text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-widest">None</span>
                  )}
                </div>
              </div>
            </section>

            {/* Daily Momentum Chart */}
            <section className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6">
              <div className="flex items-center justify-between mb-8 border-b border-[var(--color-surface-variant)] pb-3">
                <span className="font-label-sm text-[11px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-widest">Daily Momentum</span>
                <span className="material-symbols-outlined text-[var(--color-outline)] text-[20px]">trending_up</span>
              </div>
              <div className="h-32 flex items-end gap-3 justify-between px-2">
                <div className="w-1/6 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] h-[20%]"></div>
                <div className="w-1/6 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] h-[40%]"></div>
                <div className="w-1/6 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] h-[30%]"></div>
                <div className="w-1/6 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] h-[60%]"></div>
                <div className="w-1/6 bg-[var(--color-primary)] border border-[var(--color-primary)] h-[85%] relative">
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 font-label-sm text-[10px] font-bold text-[var(--color-primary)] uppercase">NOW</div>
                </div>
              </div>
              <div className="flex justify-between mt-4 text-[var(--color-outline)] text-[10px] font-bold uppercase tracking-widest">
                <span>8 AM</span>
                <span>12 PM</span>
                <span>4 PM</span>
                <span>8 PM</span>
              </div>
            </section>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => navigate('/focus')}
                className="flex-[1] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] font-label-sm text-[11px] font-bold uppercase tracking-widest py-4 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                New Session
              </button>
              <button 
                onClick={() => navigate('/')}
                className="flex-[2] bg-[var(--color-primary)] text-black font-label-sm text-[11px] font-bold uppercase tracking-widest py-4 hover:bg-[var(--color-primary-fixed)] transition-colors flex items-center justify-center gap-2"
              >
                End Protocol
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
