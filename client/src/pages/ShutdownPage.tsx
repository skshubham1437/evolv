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
        const dashboard = await fetchDashboard();
        setTasks(dashboard.tasks ?? []);
        setHabits(dashboard.habits ?? []);

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

  const tasksCompleted = tasks.filter(t => t.is_completed).length;
  const habitsCompleted = habits.filter(h => (h as any).completed_today).length;
  
  const completionRate = useMemo(() => {
    const total = tasks.length + habits.length;
    if (total === 0) return 100;
    const completed = tasksCompleted + habitsCompleted;
    return Math.round((completed / total) * 100);
  }, [tasks, habits, tasksCompleted, habitsCompleted]);

  const addWin = () => {
    if (!newWin.trim()) return;
    setWins([...wins, newWin.trim()]);
    setNewWin('');
  };

  const removeWin = (index: number) => {
    setWins(wins.filter((_, i) => i !== index));
  };

  const addGratitude = () => {
    if (!newGratitude.trim()) return;
    setGratitude([...gratitude, newGratitude.trim()]);
    setNewGratitude('');
  };

  const removeGratitude = (index: number) => {
    setGratitude(gratitude.filter((_, i) => i !== index));
  };

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

  const handleCompleteShutdown = () => {
    setStep(3);
  };

  const handleReturnToDashboard = () => {
    showToast('Shutdown complete. Have a wonderful rest!', 'success');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--color-surface-container-lowest)] text-[var(--color-outline)] font-label-sm uppercase tracking-widest font-bold">
        Initializing Shutdown Sequence...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] items-center overflow-hidden">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[var(--color-outline-variant)] relative">

        {/* ── Header ─────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-end justify-between px-8 py-6 border-b border-[var(--color-outline-variant)] shrink-0 bg-[var(--color-surface-container-lowest)] gap-4">
          <div>
            <h2 className="font-title-md text-[32px] font-medium tracking-tight text-[var(--color-primary-fixed)]">
              EOD Shutdown
            </h2>
            <p className="font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest mt-1 font-bold">
              SYSTEM HIBERNATION PROTOCOL
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s}
                className={`h-2 transition-colors ${
                  step >= s ? 'bg-[var(--color-primary)] w-8' : 'bg-[var(--color-surface-variant)] w-4'
                }`}
              />
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-[var(--color-surface-container-low)] pb-32">
          <main className="w-full max-w-3xl mx-auto p-8 flex flex-col gap-8">
            
            {/* STEP 1: Reflect on Today */}
            {step === 1 && (
              <div className="flex flex-col gap-8 animate-fade-in">
                
                {/* Stats */}
                <section className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6">
                  <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface)] flex items-center gap-2 mb-6 border-b border-[var(--color-surface-variant)] pb-2">
                    <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">query_stats</span>
                    Today's Accomplishment Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] p-4 flex flex-col items-center">
                      <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-bold mb-1">Tasks Executed</span>
                      <span className="font-title-md text-[28px] text-[var(--color-primary)] leading-none">{tasksCompleted}<span className="text-[16px] text-[var(--color-outline)] opacity-50">/{tasks.length}</span></span>
                    </div>
                    <div className="bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] p-4 flex flex-col items-center">
                      <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-bold mb-1">Habits Hit</span>
                      <span className="font-title-md text-[28px] text-[var(--color-secondary)] leading-none">{habitsCompleted}<span className="text-[16px] text-[var(--color-outline)] opacity-50">/{habits.length}</span></span>
                    </div>
                    <div className="col-span-2 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 p-4 flex items-center justify-between">
                      <span className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-primary)]">Execution Rate</span>
                      <span className="font-title-md text-[24px] text-[var(--color-primary)]">{completionRate}%</span>
                    </div>
                  </div>
                </section>

                {/* Mood & Energy */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6 flex flex-col gap-6">
                    <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface)] flex items-center gap-2 border-b border-[var(--color-surface-variant)] pb-2">
                      <span className="material-symbols-outlined text-[16px] text-[var(--color-secondary)]">sentiment_satisfied</span>
                      State of Mind
                    </h3>
                    <div className="grid grid-cols-5 gap-2">
                      {MOODS.map(m => {
                        const isSelected = mood === m.val;
                        return (
                          <button
                            key={m.val}
                            onClick={() => setMood(m.val)}
                            className={`flex flex-col items-center gap-2 p-3 border transition-colors ${
                              isSelected 
                                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-black'
                                : 'bg-[var(--color-surface-container-low)] border-[var(--color-outline-variant)] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}>{m.icon}</span>
                            <span className="font-label-sm text-[9px] uppercase font-bold tracking-widest">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6 flex flex-col justify-center gap-6">
                    <div className="flex justify-between items-center border-b border-[var(--color-surface-variant)] pb-2">
                      <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface)] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[var(--color-secondary)]">bolt</span>
                        Energy Level
                      </h3>
                      <span className="font-label-sm text-[13px] text-[var(--color-secondary)] font-bold">{energy}/5</span>
                    </div>
                    <div className="relative h-6 flex items-center group cursor-pointer border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-1">
                      <div className="w-full h-full relative flex">
                        {[1, 2, 3, 4, 5].map(v => (
                          <div key={v} className="flex-1 border-r border-[var(--color-surface-container)] last:border-r-0 h-full relative">
                            {energy >= v && <div className="absolute inset-0 bg-[var(--color-secondary)] opacity-80" />}
                          </div>
                        ))}
                        <input
                          type="range" min="1" max="5" value={energy}
                          onChange={e => setEnergy(Number(e.target.value))}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between font-label-sm text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-widest">
                      <span>Exhausted</span>
                      <span>Supercharged</span>
                    </div>
                  </div>
                </section>

                {/* Wins & Gratitude */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6 flex flex-col gap-4">
                    <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-primary)] flex items-center gap-2 border-b border-[var(--color-surface-variant)] pb-2">
                      <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                      Today's Wins
                    </h3>
                    <div className="flex flex-col gap-2">
                      {wins.map((win, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 p-2 border border-[var(--color-primary)]/30 bg-[var(--color-surface-container-low)] transition-colors group">
                          <span className="font-body-md text-[13px] text-[var(--color-on-surface)] leading-snug">{win}</span>
                          <button onClick={() => removeWin(i)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-primary)] shrink-0">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
                      <input
                        value={newWin}
                        onChange={e => setNewWin(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWin(); } }}
                        placeholder="Log a triumph..."
                        className="flex-1 bg-transparent px-3 py-2 text-[13px] text-[var(--color-on-surface)] outline-none placeholder:text-[var(--color-outline)]"
                      />
                      <button onClick={addWin} className="w-8 h-8 flex items-center justify-center bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-l border-[var(--color-outline-variant)] transition-colors hover:bg-[var(--color-primary)] hover:text-black">
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6 flex flex-col gap-4">
                    <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-secondary)] flex items-center gap-2 border-b border-[var(--color-surface-variant)] pb-2">
                      <span className="material-symbols-outlined text-[16px]">favorite</span>
                      Gratitude
                    </h3>
                    <div className="flex flex-col gap-2">
                      {gratitude.map((g, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 p-2 border border-[var(--color-secondary)]/30 bg-[var(--color-surface-container-low)] transition-colors group">
                          <span className="font-body-md text-[13px] text-[var(--color-on-surface)] leading-snug">{g}</span>
                          <button onClick={() => removeGratitude(i)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-secondary)] shrink-0">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
                      <input
                        value={newGratitude}
                        onChange={e => setNewGratitude(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGratitude(); } }}
                        placeholder="Log gratitude..."
                        className="flex-1 bg-transparent px-3 py-2 text-[13px] text-[var(--color-on-surface)] outline-none placeholder:text-[var(--color-outline)]"
                      />
                      <button onClick={addGratitude} className="w-8 h-8 flex items-center justify-center bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border-l border-[var(--color-outline-variant)] transition-colors hover:bg-[var(--color-secondary)] hover:text-black">
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* Freeform Journaling */}
                <section className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6 flex flex-col gap-4 focus-within:border-[var(--color-primary)] transition-colors">
                  <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-primary)] flex items-center gap-2 border-b border-[var(--color-surface-variant)] pb-2">
                    <span className="material-symbols-outlined text-[16px]">menu_book</span>
                    Evening Log
                  </h3>
                  <textarea
                    value={journalText}
                    onChange={e => setJournalText(e.target.value)}
                    placeholder="Log final thoughts before hibernation..."
                    rows={4}
                    className="w-full bg-transparent text-[13px] text-[var(--color-on-surface)] outline-none placeholder:text-[var(--color-outline)] resize-none font-mono"
                  />
                </section>

                <button
                  onClick={saveReflection}
                  className="w-full py-4 bg-[var(--color-primary)] text-black font-label-sm text-[12px] font-bold uppercase tracking-widest hover:bg-[var(--color-primary-fixed)] transition-colors flex items-center justify-center gap-2"
                >
                  Commit Log & Proceed
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            )}

            {/* STEP 2: Plan Tomorrow */}
            {step === 2 && (
              <div className="flex flex-col gap-8 animate-fade-in">
                <section className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6 flex flex-col gap-6">
                  <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface)] flex items-center gap-2 border-b border-[var(--color-surface-variant)] pb-2">
                    <span className="material-symbols-outlined text-[16px] text-[var(--color-secondary)]">next_week</span>
                    Tomorrow's Itinerary
                  </h3>

                  <div className="flex flex-col gap-2">
                    {tomorrowTasks.length === 0 ? (
                      <p className="text-[var(--color-outline)] font-label-sm text-[10px] font-bold uppercase tracking-widest text-center py-6 border border-dashed border-[var(--color-outline-variant)]">
                        No operations scheduled for tomorrow.
                      </p>
                    ) : (
                      tomorrowTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]">
                          <span className="material-symbols-outlined text-[var(--color-outline)] text-[18px]">radio_button_unchecked</span>
                          <span className="font-body-md text-[14px] text-[var(--color-on-surface)] truncate">{t.title}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6 flex flex-col gap-4">
                  <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-primary)] flex items-center gap-2 border-b border-[var(--color-surface-variant)] pb-2">
                    <span className="material-symbols-outlined text-[16px]">add_task</span>
                    Schedule New Operation
                  </h3>
                  <form onSubmit={handleAddTomorrowTask} className="flex gap-2">
                    <input
                      required
                      value={newTomorrowTaskTitle}
                      onChange={e => setNewTomorrowTaskTitle(e.target.value)}
                      placeholder="e.g. Finalize architecture review"
                      className="flex-1 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] px-4 py-3 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-outline)]"
                    />
                    <button
                      type="submit"
                      disabled={submittingTomorrowTask || !newTomorrowTaskTitle.trim()}
                      className="px-6 py-3 bg-[var(--color-primary)] text-black font-label-sm text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-primary-fixed)] transition-colors disabled:opacity-50 shrink-0"
                    >
                      Add
                    </button>
                  </form>
                </section>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] transition-colors font-label-sm text-[11px] font-bold uppercase tracking-widest text-center"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteShutdown}
                    className="flex-[2] py-4 bg-[var(--color-secondary)] text-black font-label-sm text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-secondary-fixed)] transition-colors flex items-center justify-center gap-2"
                  >
                    Initiate Hibernation
                    <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Complete Shutdown */}
            {step === 3 && (
              <div className="flex flex-col items-center justify-center gap-12 animate-fade-in py-16">
                
                {/* Offline visual */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 bg-[var(--color-surface-container-high)] border-2 border-[var(--color-primary)]/50 rotate-45" />
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-[48px] relative z-10 animate-pulse">power_settings_new</span>
                </div>

                <div className="flex flex-col items-center text-center gap-4 max-w-sm">
                  <h2 className="font-title-md text-[24px] text-[var(--color-on-surface)] tracking-tight">
                    System Offline
                  </h2>
                  <div className="h-px w-16 bg-[var(--color-primary)]" />
                  <p className="font-mono text-[12px] text-[var(--color-outline)] uppercase leading-relaxed mt-2">
                    EVENING LOG PARSED. TOMORROW'S ARCHITECTURE COMPILED. CORE HIBERNATION ACTIVE.
                  </p>
                  <p className="font-label-sm text-[11px] text-[var(--color-primary)] font-bold uppercase tracking-widest mt-2">
                    Rest well, {user?.name || 'Operator'}.
                  </p>
                </div>

                <button
                  onClick={handleReturnToDashboard}
                  className="mt-8 px-8 py-4 bg-[var(--color-surface-container)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black transition-colors font-label-sm text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  Confirm & Disconnect
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
