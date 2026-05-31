import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { fetchHabits, createHabit, logHabit, updateHabit, deleteHabit, fetchHabitsHeatmap, type Habit, type HeatmapDay } from '../api';
import { Modal } from '../components/ui/Modal';

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

      return {
        active,
        height,
        titleText
      };
    });
  }, [heatmapData]);

  const consistency = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return 0;
    const activeDays = heatmapData.filter(d => d.active).length;
    return Math.round((activeDays / heatmapData.length) * 100);
  }, [heatmapData]);

  return (
    <section className="lg:col-span-2 bg-[var(--color-surface-container-low)]/50 backdrop-blur-md border border-[var(--color-outline-variant)]/15 rounded-2xl p-6 flex flex-col relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--color-primary)]/6 rounded-full blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--color-primary)] text-[20px]">grid_on</span>
          Consistency Heatmap
        </h3>
        <span className="font-label-sm text-label-sm text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1 rounded-full border border-[var(--color-primary)]/20">
          {consistency}% 30-DAY
        </span>
      </div>
      <div className="flex-1 flex items-end">
        <div className="w-full flex gap-[3px] items-end" style={{ height: 80 }}>
          {bars.map((bar, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm transition-all duration-300 hover:brightness-125 cursor-pointer ${
                bar.active
                  ? 'bg-[var(--color-primary)] shadow-[0_0_6px_color-mix(in_srgb,var(--color-primary)_40%,transparent)]'
                  : 'bg-[var(--color-surface-variant)]/40'
              }`}
              style={{ height: bar.active ? `${bar.height}%` : '20%' }}
              title={bar.titleText}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between mt-3 font-label-sm text-[10px] text-[var(--color-outline-variant)] uppercase tracking-widest opacity-60">
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
      if (h.stack_after_id === h.id) {
        roots.push(h);
      } else {
        if (!childrenMap[h.stack_after_id]) {
          childrenMap[h.stack_after_id] = [];
        }
        childrenMap[h.stack_after_id].push(h);
      }
    } else {
      roots.push(h);
    }
  });
  
  const result: Habit[] = [];
  const visited = new Set<number>();
  
  function visit(habit: Habit) {
    if (visited.has(habit.id)) return;
    visited.add(habit.id);
    result.push(habit);
    const children = childrenMap[habit.id] || [];
    children.forEach(child => {
      visit(child);
    });
  }
  
  roots.forEach(root => visit(root));
  
  // Fallback for circular dependencies or disconnected nodes
  habitsList.forEach(h => {
    if (!visited.has(h.id)) {
      visit(h);
    }
  });
  
  return result;
}

// ── Routine section ────────────────────────────────────────
function RoutineSection({
  title,
  icon,
  habits,
  allHabits,
  onLog,
  onMove,
  onDelete,
  onToggleShield,
  colorClass,
  badgeLabel,
}: {
  title: string;
  icon: string;
  habits: Habit[];
  allHabits: Habit[];
  onLog: (id: number) => void;
  onMove: (id: number, r: 'morning' | 'night' | 'none') => void;
  onDelete: (id: number) => void;
  onToggleShield: (id: number, active: boolean) => void;
  colorClass: string;
  badgeLabel?: string;
}) {
  if (habits.length === 0) return null;

  const sortedHabits = useMemo(() => sortHabitsByStack(habits), [habits]);

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className={`material-symbols-outlined p-2 rounded-xl ${colorClass}`}>{icon}</span>
        <h3 className="font-title-md text-title-md text-[var(--color-on-surface)]">{title}</h3>
        <span className="font-label-sm text-[10px] text-[var(--color-outline-variant)] ml-auto bg-[var(--color-surface-container)] px-2 py-1 rounded-full border border-[var(--color-outline-variant)]/20">
          {habits.length}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {sortedHabits.map((habit, idx) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            idx={idx}
            allHabits={allHabits}
            onLog={onLog}
            onMove={onMove}
            onDelete={onDelete}
            onToggleShield={onToggleShield}
            badgeLabel={badgeLabel}
          />
        ))}
      </div>
    </section>
  );
}

// ── Habit Card ─────────────────────────────────────────────
function HabitCard({
  habit,
  idx,
  allHabits,
  onLog,
  onMove,
  onDelete,
  onToggleShield,
  badgeLabel,
}: {
  habit: Habit;
  idx: number;
  allHabits: Habit[];
  onLog: (id: number) => void;
  onMove: (id: number, r: 'morning' | 'night' | 'none') => void;
  onDelete: (id: number) => void;
  onToggleShield: (id: number, active: boolean) => void;
  badgeLabel?: string;
}) {
  const [justDone, setJustDone] = useState(false);

  const handleLog = async () => {
    if (habit.completed_today) return;
    setJustDone(true);
    setTimeout(() => setJustDone(false), 800);
    onLog(habit.id);
  };

  const isStacked = !!habit.stack_after_id && allHabits.some(h => h.id === habit.stack_after_id);
  const parentHabit = isStacked ? allHabits.find(h => h.id === habit.stack_after_id) : null;

  const cardContent = (
    <div
      className={`group flex items-center gap-4 bg-[var(--color-surface-container-low)]/70 backdrop-blur-xl border border-[var(--color-outline-variant)]/20 rounded-2xl p-4 relative z-10 transition-all duration-300 hover:border-[var(--color-primary)]/25 hover:shadow-sm anim-fade-up ${justDone ? 'anim-glow-burst' : ''}`}
      style={{ animationDelay: `${idx * 50}ms` }}
    >
      {/* Complete button */}
      <button
        onClick={handleLog}
        disabled={habit.completed_today}
        className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 ${
          habit.completed_today
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/12 text-[var(--color-primary)]'
            : 'border-[var(--color-outline-variant)] text-[var(--color-outline-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/8 hover:scale-105 active:scale-95'
        }`}
      >
        {habit.completed_today ? (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="9" stroke="var(--color-primary)" strokeWidth="2" fill="none"
              strokeDasharray="57" strokeDashoffset="57" className="svg-stroke-draw" />
            <polyline points="6,11 9,15 16,7" stroke="var(--color-primary)" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="20" strokeDashoffset="20"
              className="svg-stroke-draw" style={{ animationDelay: '0.25s' }} />
          </svg>
        ) : (
          <span className="material-symbols-outlined text-[24px] opacity-40 group-hover:opacity-100">circle</span>
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h4 className={`font-title-md text-[16px] leading-tight transition-colors ${
            habit.completed_today ? 'text-[var(--color-outline-variant)] opacity-50' : 'text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)]'
          }`}>
            {habit.title}
          </h4>
          {/* Streak */}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg shrink-0 ${
            habit.streak > 0 ? 'text-orange-400 bg-orange-400/10' : 'text-[var(--color-outline-variant)]'
          }`}>
            <span className="material-symbols-outlined text-[16px]" style={habit.streak > 0 ? { fontVariationSettings: "'FILL' 1" } : {}}>
              local_fire_department
            </span>
            <span className="font-label-sm text-label-sm font-bold">{habit.streak}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="font-label-sm text-[10px] px-2 py-0.5 rounded-md border uppercase tracking-widest text-[var(--color-secondary)] border-[var(--color-secondary)]/20 bg-[var(--color-secondary)]/8">
            {badgeLabel || 'Routine'}
          </span>
          <span className="font-body-md text-[11px] text-[var(--color-outline)] uppercase tracking-widest">{habit.category}</span>
          
          {isStacked && parentHabit && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/8 text-[9px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
              <span className="material-symbols-outlined text-[12px] font-bold">link</span>
              <span>After: {parentHabit.title}</span>
            </span>
          )}

          {habit.streak_shield_active && (
            <span 
              className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${
                (habit.streak_shields_remaining ?? 0) > 0 
                  ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 shadow-sm animate-pulse' 
                  : 'text-[var(--color-outline)] bg-[var(--color-surface-variant)] border-[var(--color-outline-variant)]/20'
              }`}
              title={`${habit.streak_shields_remaining ?? 0} streak shields remaining`}
            >
              <span className="material-symbols-outlined text-[13px]" style={(habit.streak_shields_remaining ?? 0) > 0 ? { fontVariationSettings: "'FILL' 1" } : {}}>
                shield
              </span>
              <span>Shield: {habit.streak_shields_remaining ?? 0}</span>
            </span>
          )}
        </div>
      </div>

      {/* Context menu */}
      <div className="group/menu relative shrink-0">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-outline-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] transition-all opacity-0 group-hover:opacity-100">
          <span className="material-symbols-outlined text-[20px]">more_horiz</span>
        </button>
        <div className="absolute right-0 top-full mt-1 hidden group-hover/menu:block bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]/20 rounded-xl shadow-xl w-44 z-30 backdrop-blur-2xl overflow-hidden">
          <div className="px-3 py-2 text-[9px] font-bold text-[var(--color-outline)] uppercase tracking-widest border-b border-[var(--color-outline-variant)]/15">Move To</div>
          {(['morning', 'night', 'none'] as const).map(r => (
            <button
              key={r}
              onClick={() => onMove(habit.id, r)}
              className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--color-on-surface)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors capitalize"
            >
              {r === 'none' ? 'Anytime' : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
          <div className="border-t border-[var(--color-outline-variant)]/15">
            <button
              onClick={() => onToggleShield(habit.id, !habit.streak_shield_active)}
              className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--color-on-surface)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">{habit.streak_shield_active ? 'shield_heart' : 'shield'}</span>
              {habit.streak_shield_active ? 'Disable Shield' : 'Enable Shield'}
            </button>
            <button
              onClick={() => onDelete(habit.id)}
              className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isStacked) {
    return (
      <div className="relative pl-8">
        {/* Elegant vertical solid connection line */}
        <div className="absolute left-3.5 top-[-16px] bottom-1/2 w-0.5 bg-[var(--color-primary)]/25" />
        {/* Elegant horizontal branch line */}
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-[var(--color-primary)]/25" />
        {cardContent}
      </div>
    );
  }

  return cardContent;
}

// ── Main Page ──────────────────────────────────────────────
export function HabitsPage() {
  const [habits, setHabits]       = useState<Habit[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [isModalOpen, setModal]   = useState(false);
  const [newTitle, setNewTitle]   = useState('');
  const [newCategory, setNewCategory] = useState('Health');
  const [newRoutine, setNewRoutine]   = useState<'morning' | 'night' | 'none'>('none');
  const [newStreakShieldActive, setNewStreakShieldActive] = useState(false);
  const [newStackAfterId, setNewStackAfterId] = useState<number | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await fetchHabits();
      setHabits(data || []);
      const heatmap = await fetchHabitsHeatmap();
      setHeatmapData(heatmap || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const h = await createHabit(newTitle.trim(), newCategory, newRoutine, newStreakShieldActive, newStackAfterId);
    setHabits(p => [...p, h]);
    setNewTitle('');
    setNewStreakShieldActive(false);
    setNewStackAfterId(null);
    setModal(false);
    try {
      const heatmap = await fetchHabitsHeatmap();
      setHeatmapData(heatmap || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLog = async (id: number) => {
    try {
      const updated = await logHabit(id);
      setHabits(p => p.map(h => h.id === id ? { ...h, completed_today: true, streak: updated.streak, streak_shields_remaining: updated.streak_shields_remaining } : h));
      const heatmap = await fetchHabitsHeatmap();
      setHeatmapData(heatmap || []);
    } catch { /* already logged */ }
  };

  const handleMove = async (id: number, routine_type: 'morning' | 'night' | 'none') => {
    await updateHabit(id, { routine_type });
    setHabits(p => p.map(h => h.id === id ? { ...h, routine_type } : h));
  };

  const handleToggleShield = async (id: number, streak_shield_active: boolean) => {
    const updated = await updateHabit(id, { streak_shield_active });
    setHabits(p => p.map(h => h.id === id ? { ...h, streak_shield_active: updated.streak_shield_active, streak_shields_remaining: updated.streak_shields_remaining } : h));
  };

  const handleDelete = async (id: number) => {
    await deleteHabit(id);
    setHabits(p => p.filter(h => h.id !== id));
    try {
      const heatmap = await fetchHabitsHeatmap();
      setHeatmapData(heatmap || []);
    } catch (err) {
      console.error(err);
    }
  };

  const morning  = habits.filter(h => h.routine_type === 'morning');
  const night    = habits.filter(h => h.routine_type === 'night');
  const anytime  = habits.filter(h => h.routine_type === 'none');
  const doneToday = habits.filter(h => h.completed_today).length;

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar w-full page-enter">
      {/* Ambient */}
      <div className="fixed top-[5%] left-[5%] w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-[10%] right-[5%] w-[500px] h-[500px] bg-[var(--color-secondary)]/4 rounded-full blur-[160px] pointer-events-none -z-10" />

      <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-8 pb-24 flex flex-col gap-8">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-[var(--color-on-surface)] mb-1">
              Habit Engine
            </h2>
            <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)] opacity-70">
              {loading ? 'Loading…' : `${doneToday} of ${habits.length} habits complete today`}
            </p>
          </div>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] font-label-sm text-label-sm uppercase tracking-widest rounded-xl shadow-[0_0_20px_color-mix(in_srgb,var(--color-primary)_25%,transparent)] hover:shadow-[0_0_30px_color-mix(in_srgb,var(--color-primary)_45%,transparent)] transition-all press-scale"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Habit
          </button>
        </div>

        {/* ── Top stats grid ─────────────────────────────── */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <ConsistencyHeatmap heatmapData={heatmapData} />

            {/* Weekly summary */}
            <section className="bg-[var(--color-surface-container-low)]/50 backdrop-blur-md border border-[var(--color-outline-variant)]/15 rounded-2xl p-6">
              <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-[var(--color-secondary)] text-[20px]">view_timeline</span>
                Today's Pulse
              </h3>
              <div className="space-y-4">
                {/* Total */}
                <div>
                  <div className="flex justify-between font-label-sm text-[11px] mb-2">
                    <span className="text-[var(--color-on-surface-variant)] uppercase tracking-widest">Completion</span>
                    <span className="text-[var(--color-primary)] font-bold">
                      {habits.length > 0 ? Math.round(doneToday / habits.length * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--color-surface-container-highest)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] rounded-full transition-all duration-700"
                      style={{ width: `${habits.length > 0 ? (doneToday / habits.length * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Streak leaders */}
                <div>
                  <p className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-3">Top Streaks</p>
                  <div className="space-y-2">
                    {[...habits].sort((a, b) => b.streak - a.streak).slice(0, 3).map(h => (
                      <div key={h.id} className="flex items-center justify-between">
                        <span className="font-body-md text-[13px] text-[var(--color-on-surface)] truncate max-w-[140px]">{h.title}</span>
                        <span className="flex items-center gap-1 text-orange-400 font-label-sm text-[11px] font-bold">
                          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                          {h.streak}d
                        </span>
                      </div>
                    ))}
                    {habits.length === 0 && (
                      <p className="text-[var(--color-outline)] text-[13px]">No habits yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── Loading skeleton ───────────────────────────── */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[76px] rounded-2xl bg-[var(--color-surface-container)]/50 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Routine sections ───────────────────────────── */}
        {!loading && (
          <div className="flex flex-col gap-10">
            <RoutineSection title="Morning Sequence" icon="wb_twilight" habits={morning} allHabits={habits} onLog={handleLog} onMove={handleMove} onDelete={handleDelete} onToggleShield={handleToggleShield}
              colorClass="text-[var(--color-primary)] bg-[var(--color-primary)]/10" badgeLabel="Morning" />
            <RoutineSection title="Night Sequence" icon="bedtime" habits={night} allHabits={habits} onLog={handleLog} onMove={handleMove} onDelete={handleDelete} onToggleShield={handleToggleShield}
              colorClass="text-[var(--color-tertiary)] bg-[var(--color-tertiary)]/10" badgeLabel="Night" />
            <RoutineSection title="Anytime" icon="all_inclusive" habits={anytime} allHabits={habits} onLog={handleLog} onMove={handleMove} onDelete={handleDelete} onToggleShield={handleToggleShield}
              colorClass="text-[var(--color-secondary)] bg-[var(--color-secondary)]/10" badgeLabel="Flexible" />

            {habits.length === 0 && (
              <div className="text-center py-16 flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center border border-[var(--color-outline-variant)]/20">
                  <span className="material-symbols-outlined text-[40px] text-[var(--color-outline)]">auto_awesome</span>
                </div>
                <div>
                  <p className="font-title-md text-title-md text-[var(--color-on-surface)] mb-1">No habits yet</p>
                  <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)]">Create your first habit to start building momentum.</p>
                </div>
                <button onClick={() => setModal(true)} className="mt-2 px-6 py-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-xl font-label-sm text-label-sm uppercase tracking-widest press-scale">
                  Create First Habit
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Create habit modal ─────────────────────────────── */}
      <Modal open={isModalOpen} onClose={() => setModal(false)} title="New Habit">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="font-label-sm text-[11px] text-[var(--color-on-surface-variant)] uppercase tracking-widest block mb-2">Title</label>
            <input
              required autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Read 20 pages"
              className="w-full bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/40 rounded-xl px-4 py-3 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-outline)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-sm text-[11px] text-[var(--color-on-surface-variant)] uppercase tracking-widest block mb-2">Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/40 rounded-xl px-4 py-3 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                {['Health', 'Learning', 'Productivity', 'Wealth', 'Mindfulness'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-label-sm text-[11px] text-[var(--color-on-surface-variant)] uppercase tracking-widest block mb-2">Routine</label>
              <select
                value={newRoutine}
                onChange={e => setNewRoutine(e.target.value as any)}
                className="w-full bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/40 rounded-xl px-4 py-3 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="none">Anytime</option>
                <option value="morning">Morning</option>
                <option value="night">Night</option>
              </select>
            </div>
          </div>

          {/* Stack After dropdown */}
          <div>
            <label className="font-label-sm text-[11px] text-[var(--color-on-surface-variant)] uppercase tracking-widest block mb-2">Stack After (Habit Stacking)</label>
            <select
              value={newStackAfterId || ''}
              onChange={e => setNewStackAfterId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/40 rounded-xl px-4 py-3 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors"
            >
              <option value="">-- Independent (No Stack) --</option>
              {habits.map(h => (
                <option key={h.id} value={h.id}>
                  {h.title} ({h.routine_type !== 'none' ? h.routine_type : 'Anytime'})
                </option>
              ))}
            </select>
          </div>

          {/* Streak Shield Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-[var(--color-surface-container-high)]/40 rounded-xl border border-[var(--color-outline-variant)]/20">
            <div>
              <span className="font-label-sm text-[11px] text-[var(--color-on-surface-variant)] uppercase tracking-widest block font-bold">Streak Shield</span>
              <span className="text-[10px] text-[var(--color-outline)] block mt-0.5">Protects streak from resetting on a missed day.</span>
            </div>
            <button
              type="button"
              onClick={() => setNewStreakShieldActive(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-300 shrink-0 ${
                newStreakShieldActive ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-variant)] border border-[var(--color-outline-variant)]/30'
              }`}
            >
              <div
                className={`absolute top-[2px] w-[14px] h-[14px] rounded-full shadow-sm transition-all duration-300 ${
                  newStreakShieldActive ? 'bg-[var(--color-on-primary)] left-[24px]' : 'bg-[var(--color-outline)] left-[2px]'
                }`}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="flex-1 py-3 rounded-xl border border-[var(--color-outline-variant)]/40 text-[var(--color-on-surface-variant)] font-label-sm text-label-sm hover:border-[var(--color-outline-variant)] transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] font-label-sm text-label-sm shadow-[0_0_15px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] hover:shadow-[0_0_25px_color-mix(in_srgb,var(--color-primary)_50%,transparent)] transition-all">
              Create Habit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

