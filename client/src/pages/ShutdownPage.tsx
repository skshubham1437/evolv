import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchDashboard,
  createTask,
  fetchJournalByDate,
  createJournalEntry,
  updateJournalEntry,
  type Task,
  type Habit
} from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// Mood Configs
// ─────────────────────────────────────────────────────────────
const MOODS = [
  { val: 5, label: 'Focused',  icon: 'center_focus_strong', color: 'var(--color-primary)' },
  { val: 4, label: 'Good',     icon: 'mood',                color: 'var(--color-secondary)' },
  { val: 3, label: 'Calm',     icon: 'water_drop',          color: 'var(--color-secondary)' },
  { val: 2, label: 'Tired',    icon: 'bedtime',             color: 'var(--color-outline)' },
  { val: 1, label: 'Stressed', icon: 'storm',               color: 'var(--color-error)' },
];

export function ShutdownPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);

  // Today's Stats
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);

  // Reflection State (maps to JournalEntry)
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [wins, setWins] = useState<string[]>([]);
  const [gratitude, setGratitude] = useState<string[]>([]);
  const [journalText, setJournalText] = useState('');
  const [journalId, setJournalId] = useState<number | null>(null);

  // Input states for reflection
  const [newWin, setNewWin] = useState('');
  const [newGratitude, setNewGratitude] = useState('');

  // Tomorrow's State
  const [tomorrowTasks, setTomorrowTasks] = useState<Task[]>([]);
  const [newTomorrowTaskTitle, setNewTomorrowTaskTitle] = useState('');
  const [submittingTomorrowTask, setSubmittingTomorrowTask] = useState(false);

  // Time Formatter
  const localDates = useMemo(() => {
    const todayLocal = new Date();
    const offset = todayLocal.getTimezoneOffset();
    const todayStr = new Date(todayLocal.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

    const tomorrowLocal = new Date(todayLocal.getTime() + (24 * 60 * 60 * 1000));
    const tomorrowOffset = tomorrowLocal.getTimezoneOffset();
    const tomorrowStr = new Date(tomorrowLocal.getTime() - (tomorrowOffset * 60 * 1000)).toISOString().split('T')[0];

    return { todayStr, tomorrowStr };
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch dashboard to see today's blueprint stats
        const dashboard = await fetchDashboard();
        setTasks(dashboard.tasks ?? []);
        setHabits(dashboard.habits ?? []);

        // 2. Fetch existing journal entry for today
        try {
          const entry = await fetchJournalByDate(localDates.todayStr);
          if (entry) {
            setJournalId(entry.id);
            setMood(entry.mood);
            setEnergy(entry.energy);
            setJournalText(entry.content || '');
            
            try { setWins(JSON.parse(entry.wins || '[]')); } catch { setWins([]); }
            try { setGratitude(JSON.parse(entry.gratitude || '[]')); } catch { setGratitude([]); }
          }
        } catch {
          // Doesn't exist, which is fine
        }

        // 3. Fetch all tasks scheduled for tomorrow
        const tomorrowRes = await fetchDashboard(); // Fetch tasks and filter for tomorrow
        const tomTasks = (tomorrowRes.tasks ?? []).filter(t => t.due_date === localDates.tomorrowStr);
        setTomorrowTasks(tomTasks);

      } catch (err) {
        console.error('Failed to load shutdown ritual data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [localDates]);

  // Statistics calculations
  const tasksCompleted = tasks.filter(t => t.is_completed).length;
  const habitsCompleted = habits.filter(h => (h as any).completed_today).length;
  
  const completionRate = useMemo(() => {
    const total = tasks.length + habits.length;
    if (total === 0) return 100;
    const completed = tasksCompleted + habitsCompleted;
    return Math.round((completed / total) * 100);
  }, [tasks, habits, tasksCompleted, habitsCompleted]);

  // Win additions
  const addWin = () => {
    if (!newWin.trim()) return;
    setWins([...wins, newWin.trim()]);
    setNewWin('');
  };

  const removeWin = (index: number) => {
    setWins(wins.filter((_, i) => i !== index));
  };

  // Gratitude additions
  const addGratitude = () => {
    if (!newGratitude.trim()) return;
    setGratitude([...gratitude, newGratitude.trim()]);
    setNewGratitude('');
  };

  const removeGratitude = (index: number) => {
    setGratitude(gratitude.filter((_, i) => i !== index));
  };

  // Step 1 navigation (Save reflection)
  const saveReflection = async () => {
    try {
      const payload = {
        date: localDates.todayStr,
        content: journalText,
        mood,
        energy,
        wins: JSON.stringify(wins),
        gratitude: JSON.stringify(gratitude),
        lessons: '[]',
        sentiment: '',
        themes: '[]',
      };

      if (journalId) {
        await updateJournalEntry(journalId, payload);
      } else {
        const created = await createJournalEntry(payload);
        setJournalId(created.id);
      }
      setStep(2);
    } catch (err) {
      console.error('Failed to save reflection:', err);
      showToast('Could not save reflection to today\'s journal.', 'error');
    }
  };

  // Add Task for Tomorrow
  const handleAddTomorrowTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTomorrowTaskTitle.trim()) return;
    
    setSubmittingTomorrowTask(true);
    try {
      const task = await createTask(newTomorrowTaskTitle.trim(), 'medium', null, null, '', '', localDates.tomorrowStr);
      setTomorrowTasks([...tomorrowTasks, task]);
      setNewTomorrowTaskTitle('');
      showToast('Task scheduled for tomorrow!', 'success');
    } catch {
      showToast('Failed to schedule task.', 'error');
    } finally {
      setSubmittingTomorrowTask(false);
    }
  };

  // Complete Shutdown Ritual
  const handleCompleteShutdown = () => {
    setStep(3);
  };

  const handleReturnToDashboard = () => {
    showToast('Shutdown complete. Have a wonderful rest!', 'success');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--color-background)]">
        <span className="material-symbols-outlined text-[var(--color-primary)] text-5xl animate-spin mb-4">sync</span>
        <p className="font-title-md text-title-md text-[var(--color-outline)]">Initiating EOD Shutdown Sequence...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar w-full relative z-10 py-8 px-4 md:px-8 max-w-[var(--spacing-container-max)] mx-auto page-enter">
      
      {/* Ambient glass orbs */}
      <div className="fixed top-[10%] right-[10%] w-[350px] h-[350px] bg-[var(--color-primary)]/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-[15%] left-[5%] w-[400px] h-[400px] bg-[var(--color-secondary)]/4 rounded-full blur-[150px] pointer-events-none -z-10" />

      <main className="w-full max-w-xl mx-auto space-y-8 pt-4 pb-20">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 mb-1 shadow-inner">
            <span className="material-symbols-outlined text-[var(--color-primary)] text-[28px] animate-pulse">power_settings_new</span>
          </div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-[var(--color-on-surface)] leading-tight">
            EOD Shutdown Ritual
          </h1>
          <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)] opacity-70">
            Disconnect intentionally, reflect on today, and clear your mind for tomorrow.
          </p>

          {/* Progress Indicators */}
          <div className="flex justify-center items-center gap-3 pt-4">
            <div className={`w-8 h-1 rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-container-highest)]'}`} />
            <div className={`w-8 h-1 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-container-highest)]'}`} />
            <div className={`w-8 h-1 rounded-full transition-colors duration-300 ${step >= 3 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-container-highest)]'}`} />
          </div>
        </header>

        {/* STEP 1: Reflect on Today */}
        {step === 1 && (
          <section className="space-y-6 animate-fade-in">
            <div className="glass-panel rounded-2xl p-6 border border-[var(--color-outline-variant)]/15">
              <h2 className="font-title-md text-title-md text-[var(--color-on-surface)] flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[var(--color-primary)]">query_stats</span>
                Today's Accomplishment Summary
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--color-surface-container-low)]/50 p-4 rounded-xl border border-[var(--color-outline-variant)]/10 text-center">
                  <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-wider block mb-1">Tasks Done</span>
                  <span className="font-display-lg text-[28px] font-bold text-[var(--color-primary)]">
                    {tasksCompleted}<span className="text-[16px] font-normal text-[var(--color-outline)]">/{tasks.length}</span>
                  </span>
                </div>
                <div className="bg-[var(--color-surface-container-low)]/50 p-4 rounded-xl border border-[var(--color-outline-variant)]/10 text-center">
                  <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-wider block mb-1">Habits Hit</span>
                  <span className="font-display-lg text-[28px] font-bold text-[var(--color-secondary)]">
                    {habitsCompleted}<span className="text-[16px] font-normal text-[var(--color-outline)]">/{habits.length}</span>
                  </span>
                </div>
                <div className="col-span-2 bg-[var(--color-primary)]/5 p-4 rounded-xl border border-[var(--color-primary)]/15 flex items-center justify-between">
                  <span className="font-body-md text-[13px] text-[var(--color-on-surface-variant)]">Daily Execution Rate</span>
                  <span className="font-label-sm text-[14px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/12 px-3 py-1 rounded-full">{completionRate}%</span>
                </div>
              </div>
            </div>

            {/* Mood & Energy */}
            <div className="glass-panel rounded-2xl p-6 border border-[var(--color-outline-variant)]/15 space-y-6">
              <div>
                <h3 className="font-title-md text-[14px] text-[var(--color-on-surface)] font-bold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-secondary)]">sentiment_satisfied</span>
                  Rate Your Today's Mood
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {MOODS.map(m => {
                    const isSelected = mood === m.val;
                    return (
                      <button
                        key={m.val}
                        onClick={() => setMood(m.val)}
                        type="button"
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-300 press-scale
                          ${isSelected 
                            ? 'bg-[var(--color-primary)]/12 border-[var(--color-primary)] text-[var(--color-primary)] shadow-sm'
                            : 'bg-[var(--color-surface-container-high)]/40 border-[var(--color-outline-variant)]/15 text-[var(--color-on-surface-variant)] opacity-60 hover:opacity-100'
                          }
                        `}
                      >
                        <span className="material-symbols-outlined text-[20px]">{m.icon}</span>
                        <span className="font-label-sm text-[10px] uppercase font-bold tracking-wider">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-title-md text-[14px] text-[var(--color-on-surface)] font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--color-secondary)]">bolt</span>
                    Rate Today's Energy Level
                  </h3>
                  <span className="font-label-sm text-label-sm text-[var(--color-secondary)] font-bold">{energy}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={energy}
                  onChange={e => setEnergy(Number(e.target.value))}
                  className="w-full h-2 bg-[var(--color-surface-container-highest)] rounded-full outline-none appearance-none cursor-pointer accent-[var(--color-secondary)]"
                />
                <div className="flex justify-between mt-1 font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-wider">
                  <span>Exhausted</span>
                  <span>Supercharged</span>
                </div>
              </div>
            </div>

            {/* Wins & Gratitude chips */}
            <div className="glass-panel rounded-2xl p-6 border border-[var(--color-outline-variant)]/15 space-y-6">
              
              {/* Wins list */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-[18px]">workspace_premium</span>
                  <p className="font-label-sm text-[11px] uppercase tracking-widest font-bold text-[var(--color-primary)]">Today's Wins & Triumphs</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {wins.map((win, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body-md text-[13px] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8 text-[var(--color-primary)] group">
                      <span>{win}</span>
                      <button onClick={() => removeWin(i)} className="opacity-60 hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={newWin}
                    onChange={e => setNewWin(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWin(); } }}
                    placeholder="e.g. Cleared my inbox, launched stacked habits UI"
                    className="flex-1 bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/30 rounded-xl px-4 py-2.5 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]/50 transition-colors placeholder:text-[var(--color-outline)]"
                  />
                  <button onClick={addWin} className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/25 press-scale shrink-0">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </button>
                </div>
              </div>

              {/* Gratitudes list */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--color-secondary)] text-[18px]">favorite</span>
                  <p className="font-label-sm text-[11px] uppercase tracking-widest font-bold text-[var(--color-secondary)]">Things I'm Grateful For</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {gratitude.map((g, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body-md text-[13px] border border-[var(--color-secondary)]/20 bg-[var(--color-secondary)]/8 text-[var(--color-secondary)] group">
                      <span>{g}</span>
                      <button onClick={() => removeGratitude(i)} className="opacity-60 hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={newGratitude}
                    onChange={e => setNewGratitude(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGratitude(); } }}
                    placeholder="e.g. Had a peaceful cup of tea, sunny afternoon run"
                    className="flex-1 bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/30 rounded-xl px-4 py-2.5 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-secondary)]/50 transition-colors placeholder:text-[var(--color-outline)]"
                  />
                  <button onClick={addGratitude} className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border border-[var(--color-secondary)]/25 press-scale shrink-0">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Evening Reflections */}
            <div className="glass-panel rounded-2xl p-6 border border-[var(--color-outline-variant)]/15 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--color-primary)] text-[18px]">menu_book</span>
                <p className="font-label-sm text-[11px] uppercase tracking-widest font-bold text-[var(--color-primary)]">Free-form Evening Reflections</p>
              </div>
              <textarea
                value={journalText}
                onChange={e => setJournalText(e.target.value)}
                placeholder="How was today conceptually? Any interesting thoughts or patterns observed?"
                rows={3}
                className="w-full bg-[var(--color-surface-container-high)]/40 border border-[var(--color-outline-variant)]/30 rounded-xl p-4 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]/50 transition-colors placeholder:text-[var(--color-outline)] resize-none"
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-2">
              <button
                onClick={saveReflection}
                className="w-full py-4 rounded-xl bg-[var(--color-primary)] text-[#000000] font-title-md text-title-md shadow-[0_0_20px_color-mix(in_srgb,var(--color-primary)_25%,transparent)] hover:shadow-[0_0_30px_color-mix(in_srgb,var(--color-primary)_45%,transparent)] transition-all duration-300 press-scale flex items-center justify-center gap-2"
              >
                <span>Save Reflection & Plan Tomorrow</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </section>
        )}

        {/* STEP 2: Plan Tomorrow */}
        {step === 2 && (
          <section className="space-y-6 animate-fade-in">
            <div className="glass-panel rounded-2xl p-6 border border-[var(--color-outline-variant)]/15 space-y-4">
              <h2 className="font-title-md text-title-md text-[var(--color-on-surface)] flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[var(--color-secondary)]">next_week</span>
                Tomorrow's Scheduled Missions
              </h2>

              <div className="space-y-2">
                {tomorrowTasks.length === 0 ? (
                  <p className="text-[var(--color-outline)] text-[13px] italic text-center py-4 bg-[var(--color-surface-container)]/30 rounded-xl">
                    No tasks scheduled for tomorrow yet. Add some below!
                  </p>
                ) : (
                  tomorrowTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface-container-low)]/80 border border-[var(--color-outline-variant)]/10 rounded-xl">
                      <span className="material-symbols-outlined text-[var(--color-outline-variant)] text-[18px]">radio_button_unchecked</span>
                      <span className="font-body-md text-[14px] text-[var(--color-on-surface)] truncate">{t.title}</span>
                      <span className="font-label-sm text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold ml-auto border border-[var(--color-primary)]/20">
                        Tomorrow
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Add for Tomorrow */}
            <div className="glass-panel rounded-2xl p-6 border border-[var(--color-outline-variant)]/15 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--color-primary)] text-[18px]">add_task</span>
                <p className="font-label-sm text-[11px] uppercase tracking-widest font-bold text-[var(--color-primary)]">Schedule Tomorrow's MIT</p>
              </div>
              <form onSubmit={handleAddTomorrowTask} className="flex gap-2">
                <input
                  required
                  value={newTomorrowTaskTitle}
                  onChange={e => setNewTomorrowTaskTitle(e.target.value)}
                  placeholder="e.g. Finalize presentation slides tomorrow morning"
                  className="flex-1 bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/30 rounded-xl px-4 py-3 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]/50 transition-colors placeholder:text-[var(--color-outline)]"
                />
                <button
                  type="submit"
                  disabled={submittingTomorrowTask || !newTomorrowTaskTitle.trim()}
                  className="px-5 py-3 rounded-xl bg-[var(--color-primary)] text-[#000000] font-label-sm text-label-sm uppercase tracking-widest press-scale disabled:opacity-40 shrink-0 font-bold"
                >
                  Schedule
                </button>
              </form>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-xl border border-[var(--color-outline-variant)]/40 text-[var(--color-on-surface-variant)] font-title-md text-title-md hover:border-[var(--color-outline-variant)] transition-colors text-center"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCompleteShutdown}
                className="flex-1 py-4 rounded-xl bg-[var(--color-secondary)] text-[#000000] font-title-md text-title-md shadow-[0_0_20px_color-mix(in_srgb,var(--color-secondary)_25%,transparent)] hover:shadow-[0_0_30px_color-mix(in_srgb,var(--color-secondary)_45%,transparent)] transition-all duration-300 press-scale flex items-center justify-center gap-2"
              >
                <span>Initiate System Offline</span>
                <span className="material-symbols-outlined text-[20px]">power_settings_new</span>
              </button>
            </div>
          </section>
        )}

        {/* STEP 3: Complete Shutdown */}
        {step === 3 && (
          <section className="text-center space-y-8 animate-fade-in py-8">
            <div className="flex flex-col items-center justify-center space-y-6">
              
              {/* Spinning/pulsating radial offline core */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* Breathing glow rings */}
                <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/10 animate-ping duration-1000 opacity-60" />
                <div className="absolute inset-2 rounded-full bg-[var(--color-secondary)]/5 border border-[var(--color-secondary)]/25 animate-pulse" />
                <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] rounded-full blur-sm opacity-25" />
                
                {/* Center circle */}
                <div className="relative w-20 h-20 rounded-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]/35 shadow-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-4xl font-bold">power_settings_new</span>
                </div>
              </div>

              <div className="space-y-3 max-w-sm mx-auto">
                <h2 className="font-headline-sm text-[20px] text-[var(--color-on-surface)] font-bold uppercase tracking-widest">
                  System Offline
                </h2>
                <div className="h-0.5 w-12 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] mx-auto" />
                <p className="font-body-lg text-[15px] leading-relaxed text-[var(--color-on-surface-variant)] italic opacity-90">
                  "Evening brief parsed. Reflection saved. Tomorrow's blueprint loaded. Evolv core state: hibernating. Rest well, {user?.name || 'Builder'}."
                </p>
              </div>
            </div>

            <div className="pt-4 max-w-sm mx-auto">
              <button
                onClick={handleReturnToDashboard}
                className="w-full py-4 rounded-xl bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 font-title-md text-title-md transition-all duration-300 press-scale flex items-center justify-center gap-2"
              >
                <span>End Ritual & Lock Screen</span>
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </button>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
