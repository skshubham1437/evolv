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
  // Scales with completion rate, with a base score for focused time
  const completionRate = targetSecs > 0 ? (elapsedSeconds / targetSecs) : 1;
  const deepWorkScore = Math.max(10, Math.min(100, Math.round(30 + completionRate * 70)));

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center p-4">
      {/* Main Container */}
      <main className="w-full max-w-md mx-auto space-y-6">
        
        {/* Header Celebration */}
        <header className="text-center space-y-4 pt-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full glass-panel border border-[var(--color-primary)]/30 mb-2 shadow-xl bg-[var(--color-surface-container)]">
            <span className="material-symbols-outlined text-[var(--color-primary)] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-[var(--color-on-surface)]">Session Complete</h1>
          <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)]">Outstanding focus. Your deep work streak continues.</p>
        </header>

        {/* Stats Grid (Bento Style) */}
        <section className="grid grid-cols-2 gap-4">
          {/* Focus Time */}
          <div className="col-span-2 glass-panel rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--color-primary)] to-transparent"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-label-sm text-label-sm text-[var(--color-on-surface-variant)] uppercase tracking-widest">Focus Time</span>
              <span className="material-symbols-outlined text-[var(--color-primary)] text-xl">timer</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display-lg text-display-lg text-[var(--color-primary)]">{minutesFocused}</span>
              <span className="font-body-md text-body-md text-[var(--color-on-surface-variant)]">min</span>
            </div>
          </div>
          
          {/* Deep Work Score */}
          <div className="glass-panel rounded-xl p-5 flex flex-col justify-between">
            <span className="font-label-sm text-label-sm text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2 block">Deep Work Score</span>
            <div className="flex items-end gap-2 mt-auto">
              <span className="font-headline-lg text-headline-lg text-[var(--color-secondary)]">{deepWorkScore}</span>
              <span className="font-body-md text-body-md text-[var(--color-on-surface-variant)] pb-1">/100</span>
            </div>
          </div>
          
          {/* Habits Progress */}
          <div className="glass-panel rounded-xl p-5 flex flex-col justify-between min-h-[120px]">
            <span className="font-label-sm text-label-sm text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2 block">Habits Done Today</span>
            <div className="mt-auto space-y-2 overflow-y-auto max-h-[80px] no-scrollbar">
              {loadingHabits ? (
                <span className="font-body-md text-[13px] text-[var(--color-outline)] animate-pulse">Loading...</span>
              ) : completedHabits.length > 0 ? (
                completedHabits.slice(0, 3).map(h => (
                  <div key={h.id} className="flex justify-between items-center gap-1">
                    <span className="font-body-md text-[13px] text-[var(--color-secondary)] truncate max-w-[100px]" title={h.title}>{h.title}</span>
                    <span className="material-symbols-outlined text-[var(--color-secondary)] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                ))
              ) : (
                <span className="font-body-md text-[12px] text-[var(--color-outline)] italic">None logged yet</span>
              )}
            </div>
          </div>
        </section>

        {/* Daily Momentum Chart */}
        <section className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <span className="font-label-sm text-label-sm text-[var(--color-on-surface-variant)] uppercase tracking-widest">Daily Momentum</span>
            <span className="material-symbols-outlined text-[var(--color-outline)] text-xl">trending_up</span>
          </div>
          {/* Simplified abstract representation of a chart */}
          <div className="h-32 flex items-end gap-2 justify-between px-2">
            <div className="w-1/6 bg-[var(--color-surface-variant)] rounded-t-sm h-[20%]"></div>
            <div className="w-1/6 bg-[var(--color-surface-variant)] rounded-t-sm h-[40%]"></div>
            <div className="w-1/6 bg-[var(--color-surface-variant)] rounded-t-sm h-[30%]"></div>
            <div className="w-1/6 bg-[var(--color-surface-variant)] rounded-t-sm h-[60%]"></div>
            <div className="w-1/6 bg-[var(--color-primary)] rounded-t-sm h-[85%] shadow-[0_0_15px_rgba(210,187,255,0.4)] relative">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 font-label-sm text-label-sm text-[var(--color-primary)]">NOW</div>
            </div>
          </div>
          <div className="flex justify-between mt-3 text-[var(--color-outline)] text-[10px] font-label-sm">
            <span>8 AM</span>
            <span>12 PM</span>
            <span>4 PM</span>
            <span>8 PM</span>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4">
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-[var(--color-primary)] text-[#000000] font-title-md text-title-md py-4 rounded-lg hover:shadow-[0_0_15px_rgba(210,187,255,0.4)] transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span>Return to Dashboard</span>
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
          <button 
            onClick={() => navigate('/focus')}
            className="w-full border border-[var(--color-secondary)] text-[var(--color-secondary)] font-title-md text-title-md py-4 rounded-lg hover:bg-[var(--color-secondary)]/10 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            <span>Start New Session</span>
          </button>
        </div>
      </main>
    </div>
  );
}
