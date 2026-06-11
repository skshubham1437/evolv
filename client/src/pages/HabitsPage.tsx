import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { fetchHabits, createHabit, logHabit, updateHabit, deleteHabit, fetchHabitsHeatmap, type Habit, type HeatmapDay } from '../api';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { Skeleton, SkeletonRow, SkeletonHeatmap } from '../components/ui/Skeleton';

// ── Heatmap ────────────────────────────────────────────────
function ConsistencyHeatmap({ heatmapData }: { heatmapData: HeatmapDay[] }) {
  const DAYS = 30;

  const bars = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) {
      return Array.from({ length: DAYS }, () => ({
        active: false,
        height: 20,
        titleText: 'No habits logged'
      }));
    }

    return heatmapData.map(day => {
      const active = day.active;
      const height = active ? Math.max(30, Math.min(100, 30 + Math.round(day.percent * 0.7))) : 20;
      
      const dateObj = new Date(day.date);
      const formattedDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const titleText = active 
        ? `${day.completed}/${day.total} habits completed on ${formattedDate} (${day.percent}%)`
        : `0/${day.total} habits completed on ${formattedDate}`;

      return { active, height, titleText };
    });
  }, [heatmapData]);

  const consistency = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return 0;
    const activeDays = heatmapData.filter(d => d.active).length;
    return Math.round((activeDays / heatmapData.length) * 100);
  }, [heatmapData]);

  return (
    <section className="lg:col-span-2 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6 flex flex-col relative overflow-hidden group">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-label-sm text-[11px] uppercase tracking-widest text-[var(--color-primary)] font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">grid_on</span>
          Consistency Heatmap
        </h3>
        <span className="font-label-sm text-[10px] text-black font-bold bg-[var(--color-primary)] px-2 py-0.5 border border-[var(--color-primary)]">
          {consistency}% 30-DAY
        </span>
      </div>
      <div className="flex-1 flex items-end">
        <div className="w-full flex gap-[2px] items-end" style={{ height: 80 }}>
          {bars.map((bar, i) => (
            <div
              key={i}
              className={`flex-1 transition-all duration-150 cursor-pointer ${
                bar.active
                  ? 'bg-[var(--color-primary)] hover:brightness-125'
                  : 'bg-[var(--color-surface-variant)]/40 hover:bg-[var(--color-surface-variant)]'
              }`}
              style={{ height: bar.active ? `${bar.height}%` : '20%' }}
              title={bar.titleText}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between mt-3 font-label-sm text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-widest">
        <span>30 Days Ago</span>
        <span>Today</span>
      </div>
    </section>
  );
}

// ── Stack Sorting Helper ────────────────────────────────────
function sortHabitsByStack(habitsList: Habit[]): Habit[] {
  const childrenMap: Record<number, Habit[]> = {};
  const roots: Habit[] = [];
  const habitsMap = new Map(habitsList.map(h => [h.id, h]));
  
  habitsList.forEach(h => {
    if (h.stack_after_id && habitsMap.has(h.stack_after_id)) {
      if (h.stack_after_id === h.id) roots.push(h);
      else {
        if (!childrenMap[h.stack_after_id]) childrenMap[h.stack_after_id] = [];
        childrenMap[h.stack_after_id].push(h);
      }
    } else roots.push(h);
  });
  
  const result: Habit[] = [];
  const visited = new Set<number>();
  
  function visit(habit: Habit) {
    if (visited.has(habit.id)) return;
    visited.add(habit.id);
    result.push(habit);
    const children = childrenMap[habit.id] || [];
    children.forEach(child => visit(child));
  }
  
  roots.forEach(root => visit(root));
  habitsList.forEach(h => { if (!visited.has(h.id)) visit(h); });
  
  return result;
}

// ── Routine section ────────────────────────────────────────
function RoutineSection({
  title, icon, habits, allHabits, onLog, onMove, onDelete, onToggleShield, colorClass, badgeLabel,
}: {
  title: string; icon: string; habits: Habit[]; allHabits: Habit[]; onLog: (id: number) => void;
  onMove: (id: number, r: 'morning' | 'night' | 'none') => void; onDelete: (id: number) => void;
  onToggleShield: (id: number, active: boolean) => void; colorClass: string; badgeLabel?: string;
}) {
  if (habits.length === 0) return null;
  const sortedHabits = useMemo(() => sortHabitsByStack(habits), [habits]);

  return (
    <section className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
      <div className="flex items-center justify-between p-4 px-6 border-b border-[var(--color-surface-variant)] bg-[var(--color-surface-container-lowest)]">
        <h3 className={`font-label-sm text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 ${colorClass.split(' ')[0]}`}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
          {title}
        </h3>
        <span className="font-label-sm text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-widest px-2 py-0.5 border border-[var(--color-outline-variant)]">
          {habits.length} {habits.length === 1 ? 'Habit' : 'Habits'}
        </span>
      </div>
      <div className="flex flex-col">
        {sortedHabits.map((habit, idx) => (
          <HabitCard
            key={habit.id} habit={habit} idx={idx} allHabits={allHabits} onLog={onLog} onMove={onMove} onDelete={onDelete} onToggleShield={onToggleShield} badgeLabel={badgeLabel}
          />
        ))}
      </div>
    </section>
  );
}

// ── Habit Card ─────────────────────────────────────────────
function HabitCard({
  habit, idx, allHabits, onLog, onMove, onDelete, onToggleShield, badgeLabel,
}: {
  habit: Habit; idx: number; allHabits: Habit[]; onLog: (id: number) => void;
  onMove: (id: number, r: 'morning' | 'night' | 'none') => void; onDelete: (id: number) => void;
  onToggleShield: (id: number, active: boolean) => void; badgeLabel?: string;
}) {
  const handleLog = async () => {
    if (habit.completed_today) return;
    onLog(habit.id);
  };

  const isStacked = !!habit.stack_after_id && allHabits.some(h => h.id === habit.stack_after_id);
  const parentHabit = isStacked ? allHabits.find(h => h.id === habit.stack_after_id) : null;

  const cardContent = (
    <div
      className={`group flex items-center gap-4 border-b border-[var(--color-surface-variant)] p-4 px-6 relative z-10 transition-colors duration-150 hover:bg-[var(--color-surface-container-high)] anim-fade-up`}
      style={{ animationDelay: `${idx * 50}ms` }}
    >
      <button
        onClick={handleLog}
        disabled={habit.completed_today}
        className={`w-10 h-10 border flex items-center justify-center transition-colors shrink-0 ${
          habit.completed_today
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            : 'border-[var(--color-outline-variant)] text-transparent hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] bg-[var(--color-surface-container-lowest)]'
        }`}
      >
        {habit.completed_today && <span className="material-symbols-outlined text-[16px]">check</span>}
        {!habit.completed_today && <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100">check</span>}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h4 className={`text-[15px] font-semibold leading-snug transition-colors ${
            habit.completed_today ? 'text-[var(--color-outline)] line-through' : 'text-[var(--color-on-surface)]/80 group-hover:text-[var(--color-primary)]'
          }`}>
            {habit.title}
          </h4>
          <div className={`flex items-center gap-1 px-2 py-0.5 border font-label-sm text-[10px] font-bold shrink-0 ${
            habit.streak > 0 ? 'border-[var(--color-primary)]/30 text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-surface-variant)] text-[var(--color-outline)]'
          }`}>
            <span className="material-symbols-outlined text-[12px]" style={habit.streak > 0 ? { fontVariationSettings: "'FILL' 1" } : {}}>local_fire_department</span>
            {habit.streak}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="font-label-sm text-[9px] px-2 py-0.5 border uppercase tracking-widest text-[var(--color-secondary)] border-[var(--color-secondary)]/30 bg-[var(--color-secondary)]/10 font-bold">
            {badgeLabel || 'Routine'}
          </span>
          <span className="font-label-sm text-[9px] border border-[var(--color-outline-variant)] px-2 py-0.5 text-[var(--color-outline)] uppercase tracking-widest font-bold">
            {habit.category}
          </span>
          
          {isStacked && parentHabit && (
            <span className="flex items-center gap-1 px-2 py-0.5 border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[9px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
              <span className="material-symbols-outlined text-[12px] font-bold">link</span>
              <span>After: {parentHabit.title}</span>
            </span>
          )}

          {habit.streak_shield_active && (
            <span 
              className={`flex items-center gap-0.5 px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider ${
                (habit.streak_shields_remaining ?? 0) > 0 
                  ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30' 
                  : 'text-[var(--color-outline)] bg-[var(--color-surface-variant)] border-[var(--color-outline-variant)]'
              }`}
            >
              <span className="material-symbols-outlined text-[12px]" style={(habit.streak_shields_remaining ?? 0) > 0 ? { fontVariationSettings: "'FILL' 1" } : {}}>shield</span>
              <span>Shield: {habit.streak_shields_remaining ?? 0}</span>
            </span>
          )}
        </div>
      </div>

      <div className="group/menu relative shrink-0">
        <button className="w-8 h-8 border border-transparent flex items-center justify-center text-[var(--color-outline-variant)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/10 transition-all opacity-0 group-hover:opacity-100">
          <span className="material-symbols-outlined text-[18px]">more_horiz</span>
        </button>
        <div className="absolute right-0 top-full mt-1 hidden group-hover/menu:block bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] w-44 z-30 shadow-lg">
          <div className="px-3 py-2 text-[9px] font-bold text-[var(--color-outline)] uppercase tracking-widest border-b border-[var(--color-surface-variant)] bg-[var(--color-surface-container-lowest)]">Move To</div>
          {(['morning', 'night', 'none'] as const).map(r => (
            <button
              key={r} onClick={() => onMove(habit.id, r)}
              className="w-full text-left px-4 py-2 text-[12px] font-semibold text-[var(--color-on-surface)]/80 hover:bg-[var(--color-primary)] hover:text-black transition-colors capitalize"
            >
              {r === 'none' ? 'Anytime' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
          <div className="border-t border-[var(--color-surface-variant)]">
            <button
              onClick={() => onToggleShield(habit.id, !habit.streak_shield_active)}
              className="w-full text-left px-4 py-2 text-[12px] font-semibold text-[var(--color-on-surface)]/80 hover:bg-[var(--color-primary)] hover:text-black transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">{habit.streak_shield_active ? 'shield_heart' : 'shield'}</span>
              {habit.streak_shield_active ? 'Disable Shield' : 'Enable Shield'}
            </button>
            <button
              onClick={() => onDelete(habit.id)}
              className="w-full text-left px-4 py-2 text-[12px] font-semibold text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-black transition-colors border-t border-[var(--color-surface-variant)]"
            >
              Delete Habit
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isStacked) {
    return (
      <div className="relative pl-8">
        <div className="absolute left-6 top-0 bottom-1/2 w-px bg-[var(--color-primary)]/30" />
        <div className="absolute left-6 top-1/2 w-4 h-px bg-[var(--color-primary)]/30" />
        {cardContent}
      </div>
    );
  }

  return cardContent;
}

// ── Main Page ──────────────────────────────────────────────
export function HabitsPage() {
  const { showToast } = useToast();
  const [habits, setHabits]       = useState<Habit[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [isModalOpen, setModal]   = useState(false);
  const [newTitle, setNewTitle]   = useState('');
  const [newCategory, setNewCategory] = useState('Health');
  const [newRoutine, setNewRoutine]   = useState<'morning' | 'night' | 'none'>('none');
  const [newStreakShieldActive, setNewStreakShieldActive] = useState(false);
  const [newStackAfterId, setNewStackAfterId] = useState<number | null>(null);
  const [loading, setLoading]     = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await fetchHabits();
      setHabits(data || []);
      const heatmap = await fetchHabitsHeatmap();
      setHeatmapData(heatmap || []);
    } finally { setLoading(false); }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const h = await createHabit(newTitle.trim(), newCategory, newRoutine, newStreakShieldActive, newStackAfterId);
    setHabits(p => [...p, h]);
    setNewTitle(''); setNewStreakShieldActive(false); setNewStackAfterId(null); setModal(false);
    try {
      const heatmap = await fetchHabitsHeatmap();
      setHeatmapData(heatmap || []);
    } catch (err) {}
  };

  const handleLog = async (id: number) => {
    try {
      const updated = await logHabit(id);
      setHabits(p => p.map(h => h.id === id ? { ...h, completed_today: true, streak: updated.streak, streak_shields_remaining: updated.streak_shields_remaining } : h));
      const heatmap = await fetchHabitsHeatmap();
      setHeatmapData(heatmap || []);
    } catch {}
  };

  const handleMove = async (id: number, routine_type: 'morning' | 'night' | 'none') => {
    await updateHabit(id, { routine_type });
    setHabits(p => p.map(h => h.id === id ? { ...h, routine_type } : h));
  };

  const handleToggleShield = async (id: number, streak_shield_active: boolean) => {
    const updated = await updateHabit(id, { streak_shield_active });
    setHabits(p => p.map(h => h.id === id ? { ...h, streak_shield_active: updated.streak_shield_active, streak_shields_remaining: updated.streak_shields_remaining } : h));
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async (id: number) => {
    try {
      await deleteHabit(id);
      setHabits(p => p.filter(h => h.id !== id));
      showToast('Habit deleted', 'success');
      const heatmap = await fetchHabitsHeatmap();
      setHeatmapData(heatmap || []);
    } catch (err) {
      showToast('Failed to delete habit', 'error');
    }
  };

  const morning  = habits.filter(h => h.routine_type === 'morning');
  const night    = habits.filter(h => h.routine_type === 'night');
  const anytime  = habits.filter(h => h.routine_type === 'none');
  const doneToday = habits.filter(h => h.completed_today).length;
  const pct = habits.length > 0 ? Math.round((doneToday / habits.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] items-center overflow-hidden">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[var(--color-outline-variant)] relative">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between px-8 py-6 border-b border-[var(--color-outline-variant)] shrink-0 bg-[var(--color-surface-container-lowest)] gap-4">
          <div>
            <h2 className="font-title-md text-[32px] font-medium tracking-tight text-[var(--color-primary-fixed)]">
              Habit Engine
            </h2>
            <p className="font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest mt-1 font-bold">
              SYSTEMATIC ROUTINE TRACKING
            </p>
          </div>
          
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Today</span>
              <span className="font-label-sm text-[28px] text-[var(--color-on-surface)] font-normal tracking-tight leading-none">{doneToday}/{habits.length}</span>
            </div>
            <div className="w-px h-10 bg-[var(--color-outline-variant)] self-center" />
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Completion</span>
              <span className="font-label-sm text-[28px] text-[var(--color-primary)] font-normal tracking-tight leading-none">{pct}%</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-[var(--color-surface-container-low)] pb-32">
          
          <div className="p-8 pb-4">
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setModal(true)}
                className="font-label-sm text-[11px] font-bold uppercase tracking-widest bg-[var(--color-primary)] text-black px-6 py-2 border border-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)] transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                New Habit
              </button>
            </div>

            {/* ── Top stats grid & Routine sections ─────────────────────────────── */}
            {loading ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <SkeletonHeatmap />
                  </div>
                  <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6 space-y-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-4 px-6">
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <ConsistencyHeatmap heatmapData={heatmapData} />

                  <section className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6">
                    <h3 className="font-label-sm text-[11px] uppercase tracking-widest text-[var(--color-secondary)] font-bold flex items-center gap-2 mb-6">
                      <span className="material-symbols-outlined text-[16px]">view_timeline</span>
                      Today's Pulse
                    </h3>
                    
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between font-label-sm text-[11px] font-bold uppercase tracking-widest mb-2">
                          <span className="text-[var(--color-outline)]">Completion</span>
                          <span className="text-[var(--color-primary)]">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-[var(--color-surface-variant)] rounded-none overflow-hidden">
                          <div
                            className="h-full bg-[var(--color-primary)] transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <p className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-3 font-bold">Top Streaks</p>
                        <div className="space-y-3">
                          {[...habits].sort((a, b) => b.streak - a.streak).slice(0, 3).map(h => (
                            <div key={h.id} className="flex items-center justify-between border-b border-[var(--color-surface-variant)] pb-2">
                              <span className="font-body-md text-[13px] text-[var(--color-on-surface)]/80 font-semibold truncate max-w-[140px]">{h.title}</span>
                              <span className="flex items-center gap-1 text-[var(--color-primary)] font-label-sm text-[11px] font-bold">
                                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                                {h.streak}d
                              </span>
                            </div>
                          ))}
                          {habits.length === 0 && <p className="text-[var(--color-outline)] text-[12px] font-bold uppercase tracking-widest">NO HABITS YET.</p>}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="flex flex-col gap-6">
                  <RoutineSection title="Morning Sequence" icon="wb_twilight" habits={morning} allHabits={habits} onLog={handleLog} onMove={handleMove} onDelete={handleDelete} onToggleShield={handleToggleShield}
                    colorClass="text-[var(--color-primary)]" badgeLabel="Morning" />
                  <RoutineSection title="Night Sequence" icon="bedtime" habits={night} allHabits={habits} onLog={handleLog} onMove={handleMove} onDelete={handleDelete} onToggleShield={handleToggleShield}
                    colorClass="text-[var(--color-tertiary)]" badgeLabel="Night" />
                  <RoutineSection title="Anytime" icon="all_inclusive" habits={anytime} allHabits={habits} onLog={handleLog} onMove={handleMove} onDelete={handleDelete} onToggleShield={handleToggleShield}
                    colorClass="text-[var(--color-secondary)]" badgeLabel="Flexible" />

                  {habits.length === 0 && (
                    <div className="text-center py-16 border border-dashed border-[var(--color-surface-variant)]">
                      <p className="font-label-sm text-[11px] font-bold text-[var(--color-outline)] uppercase tracking-widest mb-4">SYSTEM IDLE. NO HABITS ESTABLISHED.</p>
                      <button onClick={() => setModal(true)} className="px-6 py-2 bg-[var(--color-primary)] text-black font-label-sm text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-primary-fixed)]">
                        Initialize First Habit
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal open={isModalOpen} onClose={() => setModal(false)} title="Define Habit">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="font-label-sm text-[10px] font-bold text-[var(--color-outline)] uppercase tracking-widest block mb-2">Title *</label>
            <input
              required autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
              className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-sm text-[10px] font-bold text-[var(--color-outline)] uppercase tracking-widest block mb-2">Category</label>
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]">
                {['Health', 'Learning', 'Productivity', 'Wealth', 'Mindfulness'].map(c => <option key={c} className="bg-[var(--color-surface-container-high)]">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="font-label-sm text-[10px] font-bold text-[var(--color-outline)] uppercase tracking-widest block mb-2">Routine</label>
              <select value={newRoutine} onChange={e => setNewRoutine(e.target.value as any)}
                className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]">
                <option value="none" className="bg-[var(--color-surface-container-high)]">Anytime</option>
                <option value="morning" className="bg-[var(--color-surface-container-high)]">Morning</option>
                <option value="night" className="bg-[var(--color-surface-container-high)]">Night</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-label-sm text-[10px] font-bold text-[var(--color-outline)] uppercase tracking-widest block mb-2">Stack After (Habit Stacking)</label>
            <select value={newStackAfterId || ''} onChange={e => setNewStackAfterId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]">
              <option value="" className="bg-[var(--color-surface-container-high)]">-- Independent --</option>
              {habits.map(h => <option key={h.id} value={h.id} className="bg-[var(--color-surface-container-high)]">{h.title} ({h.routine_type})</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-surface-variant)]">
            <div>
              <span className="font-label-sm text-[10px] text-[var(--color-on-surface)] uppercase tracking-widest block font-bold">Streak Shield</span>
              <span className="text-[10px] text-[var(--color-outline)] block mt-0.5">Protects streak from resetting on a missed day.</span>
            </div>
            <button type="button" onClick={() => setNewStreakShieldActive(v => !v)}
              className={`w-10 h-5 border transition-colors duration-300 shrink-0 relative ${newStreakShieldActive ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'bg-transparent border-[var(--color-outline-variant)]'}`}>
              <div className={`absolute top-[1px] w-4 h-4 bg-black transition-all duration-300 ${newStreakShieldActive ? 'left-[21px]' : 'left-[1px] bg-[var(--color-outline)]'}`} />
            </button>
          </div>

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={() => setModal(false)} className="flex-1 py-2 border border-[var(--color-surface-variant)] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] font-label-sm text-[11px] uppercase tracking-widest font-bold">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2 bg-[var(--color-primary)] text-black font-label-sm text-[11px] uppercase tracking-widest font-bold hover:bg-[var(--color-primary-fixed)]">
              Create
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId !== null && confirmDelete(deleteConfirmId)}
        title="Delete Habit"
        description="Are you sure you want to delete this habit? All progress and streaks will be permanently lost."
        confirmText="Purge"
        cancelText="Keep"
        destructive={true}
      />
    </div>
  );
}
