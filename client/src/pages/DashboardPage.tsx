import { useEffect, useState, type FormEvent, useMemo } from 'react';
import { fetchDashboard, createTask, completeTask, logHabit, fetchMorningBrief, fetchAIInsights, fetchBurnoutRisk, type Task, type Habit, type AIInsight } from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
// Unified blueprint item type
// ─────────────────────────────────────────────────────────────
type BlueprintItemType = 'task' | 'habit';

interface BlueprintItem {
  id: string;
  refId: number;
  type: BlueprintItemType;
  title: string;
  done: boolean;
  priority?: string;
  streak?: number;
  routineType?: string;
  category?: string;
  stackAfterId?: number | null;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getRoutineIcon(type?: string) {
  if (type === 'morning') return 'wb_twilight';
  if (type === 'night') return 'bedtime';
  return 'bolt';
}

function getPriorityColor(priority?: string) {
  if (priority === 'high') return 'var(--color-error)';
  if (priority === 'medium') return 'var(--color-secondary)';
  return 'var(--color-outline)';
}

function sortBlueprintHabitsByStack(items: BlueprintItem[]): BlueprintItem[] {
  const childrenMap: Record<number, BlueprintItem[]> = {};
  const roots: BlueprintItem[] = [];
  
  const itemsMap = new Map(items.map(i => [i.refId, i]));
  
  items.forEach(i => {
    if (i.stackAfterId && itemsMap.has(i.stackAfterId)) {
      if (i.stackAfterId === i.refId) {
        roots.push(i);
      } else {
        if (!childrenMap[i.stackAfterId]) {
          childrenMap[i.stackAfterId] = [];
        }
        childrenMap[i.stackAfterId].push(i);
      }
    } else {
      roots.push(i);
    }
  });
  
  const result: BlueprintItem[] = [];
  const visited = new Set<number>();
  
  function visit(item: BlueprintItem) {
    if (visited.has(item.refId)) return;
    visited.add(item.refId);
    result.push(item);
    const children = childrenMap[item.refId] || [];
    children.forEach(child => {
      visit(child);
    });
  }
  
  roots.forEach(root => visit(root));
  
  // Fallback for circular dependencies or disconnected nodes
  items.forEach(i => {
    if (!visited.has(i.refId)) {
      visit(i);
    }
  });
  
  return result;
}

// ─────────────────────────────────────────────────────────────
// Progress ring SVG
// ─────────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 88 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--color-surface-container-highest)" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--color-primary)" strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Blueprint row component
// ─────────────────────────────────────────────────────────────
function BlueprintRow({
  item,
  onComplete,
  isNew = false,
  allHabits = [],
}: {
  item: BlueprintItem;
  onComplete: (item: BlueprintItem) => void;
  isNew?: boolean;
  allHabits?: Habit[];
}) {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    if (item.done) return;
    setAnimating(true);
    setTimeout(() => {
      onComplete(item);
      setAnimating(false);
    }, 350);
  };

  const iconName = item.type === 'habit' ? getRoutineIcon(item.routineType) : 'task_alt';
  const accentColor = item.type === 'habit' ? 'var(--color-secondary)' : getPriorityColor(item.priority);

  const isStacked = item.type === 'habit' && !!item.stackAfterId && allHabits.some(h => h.id === item.stackAfterId);
  const parentHabit = isStacked ? allHabits.find(h => h.id === item.stackAfterId) : null;

  const rowContent = (
    <div
      className={`group flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all duration-300 press-scale
        ${item.done
          ? 'bg-[var(--color-surface-container-lowest)]/50 border-[var(--color-outline-variant)]/10 opacity-55'
          : isNew
            ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20 shadow-md'
            : 'bg-[var(--color-surface-container-low)]/70 border-[var(--color-outline-variant)]/20 hover:border-[var(--color-outline-variant)]/50 hover:shadow-sm backdrop-blur-md'
        }
        ${animating ? 'scale-[0.97] opacity-70' : ''}
      `}
    >
      {/* Left accent line */}
      <div
        className="w-0.5 h-full self-stretch rounded-full min-h-[20px] shrink-0"
        style={{ backgroundColor: item.done ? 'var(--color-outline-variant)' : accentColor, opacity: item.done ? 0.3 : 0.7 }}
      />

      {/* Type icon */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300"
        style={{
          backgroundColor: item.done ? 'transparent' : `color-mix(in srgb, ${accentColor} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accentColor} 25%, transparent)`
        }}
      >
        <span
          className="material-symbols-outlined text-[18px] transition-all"
          style={{
            color: item.done ? 'var(--color-outline-variant)' : accentColor,
            fontVariationSettings: item.done ? "'FILL' 1" : "'FILL' 0"
          }}
        >
          {item.done ? 'check_circle' : iconName}
        </span>
      </div>

      {/* Title & meta */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-body-lg text-[15px] leading-snug truncate transition-all duration-300 ${
            item.done ? 'line-through text-[var(--color-outline)] decoration-[var(--color-outline)]/50' : 'text-[var(--color-on-surface)]'
          }`}
        >
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span
            className="font-label-sm text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md"
            style={{
              color: item.done ? 'var(--color-outline)' : accentColor,
              backgroundColor: `color-mix(in srgb, ${item.done ? 'var(--color-outline)' : accentColor} 10%, transparent)`,
            }}
          >
            {item.type === 'task' ? (item.priority || 'medium') : (item.routineType !== 'none' ? item.routineType : item.category)}
          </span>
          {item.type === 'habit' && item.streak !== undefined && item.streak > 0 && (
            <span className="font-label-sm text-[10px] text-[var(--color-outline)] flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]" style={{ color: '#f97316' }}>local_fire_department</span>
              {item.streak}d
            </span>
          )}

          {isStacked && parentHabit && (
            <span className="font-label-sm text-[9px] font-bold uppercase tracking-wider text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-md border border-[var(--color-primary)]/20 flex items-center gap-1">
              <span className="material-symbols-outlined text-[11px] font-bold">link</span>
              <span>After: {parentHabit.title}</span>
            </span>
          )}
        </div>
      </div>

      {/* Complete button */}
      {!item.done && (
        <button
          onClick={handleClick}
          className="w-7 h-7 rounded-full border-2 border-[var(--color-outline-variant)] group-hover:border-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/10 transition-all duration-200 flex items-center justify-center shrink-0"
          title={item.type === 'task' ? 'Complete task' : 'Log habit'}
        >
          <span className="material-symbols-outlined text-[14px] text-transparent group-hover:text-[var(--color-primary)] transition-colors">
            check
          </span>
        </button>
      )}
    </div>
  );

  if (isStacked) {
    return (
      <div className="relative pl-8">
        {/* Elegant vertical solid connection line */}
        <div className="absolute left-3.5 top-[-14px] bottom-1/2 w-0.5 bg-[var(--color-primary)]/25" />
        {/* Elegant horizontal branch line */}
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-[var(--color-primary)]/25" />
        {rowContent}
      </div>
    );
  }

  return rowContent;
}

// ─────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<(Habit & { completed_today: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const [brief, setBrief] = useState<string>('');
  const [briefLoading, setBriefLoading] = useState<boolean>(true);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(true);
  
  const [burnoutRisk, setBurnoutRisk] = useState<{ risk: 'low' | 'medium' | 'high'; details: string } | null>(null);
  const [burnoutLoading, setBurnoutLoading] = useState(true);

  const load = async () => {
    try {
      const data = await fetchDashboard();
      setTasks(data.tasks ?? []);
      setHabits((data.habits ?? []) as (Habit & { completed_today: boolean })[]);
      setError(null);
    } catch {
      setError('Cannot reach the Evolv server. Is the backend running?');
    } finally {
      setLoading(false);
    }

    try {
      const briefData = await fetchMorningBrief();
      setBrief(briefData.brief);
    } catch (e) {
      console.error('Failed to fetch morning brief', e);
    } finally {
      setBriefLoading(false);
    }

    try {
      const insightsData = await fetchAIInsights();
      setInsights(insightsData);
    } catch (e) {
      console.error('Failed to fetch insights', e);
    } finally {
      setInsightsLoading(false);
    }

    try {
      const riskData = await fetchBurnoutRisk();
      setBurnoutRisk(riskData);
    } catch (e) {
      console.error('Failed to fetch burnout risk', e);
    } finally {
      setBurnoutLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener('task-added-globally', load);
    return () => window.removeEventListener('task-added-globally', load);
  }, []);

  // ── Build unified blueprint ──────────────────────────────────
  const blueprintItems = useMemo<BlueprintItem[]>(() => {
    const habitItems: BlueprintItem[] = habits.map(h => ({
      id: `habit-${h.id}`,
      refId: h.id,
      type: 'habit',
      title: h.title,
      done: h.completed_today,
      streak: h.streak,
      routineType: h.routine_type,
      category: h.category,
      stackAfterId: h.stack_after_id,
    }));

    const taskItems: BlueprintItem[] = tasks.map(t => ({
      id: `task-${t.id}`,
      refId: t.id,
      type: 'task',
      title: t.title,
      done: t.is_completed,
      priority: t.priority,
    }));

    // Morning habits → Tasks → Evening habits
    const morning = habitItems.filter(i => i.routineType === 'morning');
    const evening = habitItems.filter(i => i.routineType === 'night');
    const anytime = habitItems.filter(i => i.routineType !== 'morning' && i.routineType !== 'night');

    const sortedMorning = sortBlueprintHabitsByStack(morning);
    const sortedEvening = sortBlueprintHabitsByStack(evening);
    const sortedAnytime = sortBlueprintHabitsByStack(anytime);

    return [...sortedMorning, ...taskItems, ...sortedAnytime, ...sortedEvening];
  }, [tasks, habits]);

  const doneCount = blueprintItems.filter(i => i.done).length;
  const totalCount = blueprintItems.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // ── Handlers ────────────────────────────────────────────────
  const handleComplete = async (item: BlueprintItem) => {
    if (item.type === 'task') {
      await completeTask(item.refId);
      setTasks(p => p.map(t => t.id === item.refId ? { ...t, is_completed: true } : t));
    } else {
      try {
        await logHabit(item.refId);
        setHabits(p => p.map(h => h.id === item.refId ? { ...h, completed_today: true } : h));
      } catch { /* already logged */ }
    }
  };

  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    const t = await createTask(title, 'medium');
    setTasks(p => [t, ...p]);
    setNewTaskTitle('');
    setShowAddTask(false);
    setJustAddedId(`task-${t.id}`);
    setTimeout(() => setJustAddedId(null), 2500);
  };

  // Pending/done split
  const pendingItems = blueprintItems.filter(i => !i.done);
  const doneItems = blueprintItems.filter(i => i.done);

  return (
    <div className="flex-1 overflow-y-auto w-full no-scrollbar relative z-10 pb-24 md:pb-0">
      {/* Ambient bg */}
      <div className="absolute top-0 right-[5%] w-[500px] h-[500px] bg-[var(--color-primary)]/5 rounded-full blur-[150px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-[10%] left-[2%] w-[400px] h-[400px] bg-[var(--color-secondary)]/5 rounded-full blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] pt-6 md:pt-12 pb-12 flex flex-col gap-8 relative z-10">

        {/* ── HEADER ─────────────────────────────────────────── */}
        <section className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-[var(--color-on-surface)] leading-tight">
              {getGreeting()},{' '}
              <span className="text-[var(--color-primary)] italic">{user?.name || 'Builder'}</span>
            </h2>
            <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)] opacity-75">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Pulse badge */}
          <div className="flex items-center gap-2 bg-[var(--color-surface-container-low)] px-4 py-2 rounded-full border border-[var(--color-outline-variant)]/30 backdrop-blur-md self-start mt-1">
            <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)] animate-pulse shadow-[0_0_8px_rgba(90,218,206,0.8)]" />
            <span className="font-label-sm text-label-sm text-[var(--color-secondary)] uppercase tracking-widest">System Active</span>
          </div>
        </section>

        {/* ── EVENING SHUTDOWN TRANSITION BANNER ───────────────── */}
        {new Date().getHours() >= 20 && (
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-[var(--color-secondary)]/20 bg-gradient-to-br from-[var(--color-secondary)]/5 to-transparent hover:border-[var(--color-secondary)]/40 transition-all duration-300 anim-fade-up flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">power_settings_new</span>
              </div>
              <div>
                <h3 className="font-title-md text-[16px] text-[var(--color-on-surface)] font-bold flex items-center gap-2">
                  System Transition Imminent
                </h3>
                <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] mt-1 opacity-80 leading-relaxed">
                  It's past 8 PM. Clear your mind, reflect on your wins, and schedule tomorrow's MITs with the **End-of-Day Shutdown Ritual**.
                </p>
              </div>
            </div>
            <Link
              to="/shutdown"
              className="w-full md:w-auto px-5 py-3 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90 text-[#000000] font-label-sm text-label-sm uppercase tracking-widest rounded-xl text-center shadow-[0_0_15px_color-mix(in_srgb,var(--color-secondary)_25%,transparent)] hover:shadow-[0_0_25px_color-mix(in_srgb,var(--color-secondary)_45%,transparent)] transition-all shrink-0 font-bold"
            >
              Start Shutdown
            </Link>
          </div>
        )}

        {/* ── AI MORNING BRIEFING ──────────────────────────────── */}
        {briefLoading ? (
          <div className="glass-panel rounded-2xl p-6 animate-pulse space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-[var(--color-surface-container-high)] animate-pulse"></div>
              <div className="h-4 bg-[var(--color-surface-container-high)] rounded w-1/4"></div>
            </div>
            <div className="h-3.5 bg-[var(--color-surface-container-high)] rounded w-11/12"></div>
            <div className="h-3.5 bg-[var(--color-surface-container-high)] rounded w-3/4"></div>
          </div>
        ) : brief ? (
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-[var(--color-primary)]/10">
            <div className="absolute top-0 right-0 p-4">
              <span className="material-symbols-outlined text-[var(--color-primary)]/10 text-[64px] pointer-events-none select-none">wb_sunny</span>
            </div>
            <div className="flex items-center gap-2 mb-3 text-[var(--color-primary)]">
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              <h3 className="font-title-md font-bold text-[13px] uppercase tracking-wider">AI Daily Coach Briefing</h3>
            </div>
            <p className="font-body-md text-[14px] leading-relaxed text-[var(--color-on-surface-variant)] whitespace-pre-wrap">{brief}</p>
          </div>
        ) : null}

        {/* ── AI BURNOUT ASSESSMENT ────────────────────────────── */}
        {burnoutLoading ? (
          <div className="glass-panel rounded-2xl p-5 animate-pulse space-y-2">
            <div className="h-4 bg-[var(--color-surface-container-high)] rounded w-1/3"></div>
            <div className="h-3 bg-[var(--color-surface-container-high)] rounded w-3/4"></div>
          </div>
        ) : burnoutRisk ? (
          <div 
            className="glass-panel rounded-2xl p-5 border flex gap-4 hover:shadow-md transition-all duration-300 anim-fade-up"
            style={{
              borderColor: burnoutRisk.risk === 'high' ? 'color-mix(in srgb, var(--color-error) 25%, transparent)' :
                           burnoutRisk.risk === 'medium' ? 'color-mix(in srgb, var(--color-secondary) 25%, transparent)' :
                                                           'color-mix(in srgb, var(--color-secondary) 15%, transparent)'
            }}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: burnoutRisk.risk === 'high' ? 'color-mix(in srgb, var(--color-error) 12%, transparent)' :
                                 burnoutRisk.risk === 'medium' ? 'color-mix(in srgb, var(--color-secondary) 12%, transparent)' :
                                                                 'color-mix(in srgb, var(--color-secondary) 12%, transparent)',
                color: burnoutRisk.risk === 'high' ? 'var(--color-error)' : 'var(--color-secondary)'
              }}
            >
              <span className="material-symbols-outlined text-[22px]">
                {burnoutRisk.risk === 'high' ? 'heart_broken' :
                 burnoutRisk.risk === 'medium' ? 'battery_charging_50' : 'favorite'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h4 className="font-title-md text-[14px] text-[var(--color-on-surface)] font-bold">Burnout Risk Assessment</h4>
                <span 
                  className="font-label-sm text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: burnoutRisk.risk === 'high' ? 'color-mix(in srgb, var(--color-error) 15%, transparent)' :
                                     burnoutRisk.risk === 'medium' ? 'color-mix(in srgb, var(--color-secondary) 15%, transparent)' :
                                                                     'color-mix(in srgb, var(--color-secondary) 10%, transparent)',
                    color: burnoutRisk.risk === 'high' ? 'var(--color-error)' : 'var(--color-secondary)'
                  }}
                >
                  {burnoutRisk.risk} risk
                </span>
              </div>
              <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] mt-1.5 opacity-80 leading-relaxed">
                {burnoutRisk.details}
              </p>
            </div>
          </div>
        ) : null}

        {error && (
          <div className="bg-[var(--color-error-container)]/20 border border-[var(--color-error)]/30 rounded-xl px-4 py-3 text-[var(--color-error)] text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            {error}
          </div>
        )}

        {/* ── PROGRESS OVERVIEW ──────────────────────────────── */}
        <section className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent pointer-events-none" />

          {/* Ring */}
          <div className="relative shrink-0">
            <ProgressRing pct={pct} size={96} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display-lg text-[22px] font-bold text-[var(--color-primary)]">{pct}%</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 w-full">
            <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] mb-0.5">Daily Blueprint</h3>
            <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] mb-4">
              {doneCount} of {totalCount} items complete
            </p>
            <div className="w-full h-1.5 bg-[var(--color-surface-container-highest)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex sm:flex-col gap-4 sm:gap-3 shrink-0 text-center sm:text-right">
            <div>
              <p className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-0.5">Tasks</p>
              <p className="font-title-md text-[20px] text-[var(--color-on-surface)] font-bold">
                {tasks.filter(t => t.is_completed).length}
                <span className="text-[var(--color-outline)] font-normal text-[14px]">/{tasks.length}</span>
              </p>
            </div>
            <div>
              <p className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-0.5">Habits</p>
              <p className="font-title-md text-[20px] text-[var(--color-on-surface)] font-bold">
                {habits.filter(h => h.completed_today).length}
                <span className="text-[var(--color-outline)] font-normal text-[14px]">/{habits.length}</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── DAILY BLUEPRINT TIMELINE ───────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[var(--color-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>
                checklist
              </span>
              Today's Blueprint
            </h3>
            <button
              onClick={() => setShowAddTask(v => !v)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-label-sm text-label-sm transition-all duration-200 press-scale ${
                showAddTask
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                  : 'border border-[var(--color-outline-variant)]/40 text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{showAddTask ? 'close' : 'add'}</span>
              {showAddTask ? 'Cancel' : 'Add Task'}
            </button>
          </div>

          {/* Quick add */}
          {showAddTask && (
            <form
              onSubmit={handleAddTask}
              className="flex items-center gap-3 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/25 rounded-2xl px-4 py-3 backdrop-blur-md"
            >
              <span className="material-symbols-outlined text-[var(--color-primary)] text-[20px]">task_alt</span>
              <input
                autoFocus
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="What's the next mission objective?"
                className="flex-1 bg-transparent outline-none text-[var(--color-on-surface)] font-body-md text-[15px] placeholder:text-[var(--color-outline)]"
              />
              <button
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="px-4 py-1.5 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full font-label-sm text-label-sm disabled:opacity-40 hover:shadow-[0_0_12px_rgba(210,187,255,0.4)] transition-all"
              >
                Add
              </button>
            </form>
          )}

          {/* Blueprint list */}
          {loading ? (
            <div className="flex flex-col gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[68px] rounded-2xl bg-[var(--color-surface-container)]/50 animate-pulse" />
              ))}
            </div>
          ) : blueprintItems.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center border border-[var(--color-outline-variant)]/20">
                <span className="material-symbols-outlined text-[40px] text-[var(--color-outline)]">check_circle</span>
              </div>
              <div>
                <p className="font-title-md text-title-md text-[var(--color-on-surface)] mb-1">Blueprint is empty</p>
                <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)]">
                  Add tasks here or set habits in the{' '}
                  <Link to="/habits" className="text-[var(--color-primary)] hover:underline">Habit Engine</Link>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {/* Pending items */}
              {pendingItems.map(item => (
                <BlueprintRow
                  key={item.id}
                  item={item}
                  onComplete={handleComplete}
                  isNew={item.id === justAddedId}
                  allHabits={habits}
                />
              ))}

              {/* Done items (collapsed) */}
              {doneItems.length > 0 && (
                <details className="group" open={pct === 100}>
                  <summary className="cursor-pointer list-none flex items-center gap-2 py-2 px-1 text-[var(--color-outline)] font-label-sm text-[11px] uppercase tracking-widest hover:text-[var(--color-on-surface-variant)] transition-colors select-none">
                    <span className="material-symbols-outlined text-[14px] transition-transform group-open:rotate-90">chevron_right</span>
                    {doneItems.length} completed
                  </summary>
                  <div className="flex flex-col gap-2 mt-2">
                    {doneItems.map(item => (
                      <BlueprintRow key={item.id} item={item} onComplete={handleComplete} allHabits={habits} />
                    ))}
                  </div>
                </details>
              )}

              {/* All done celebration */}
              {pct === 100 && totalCount > 0 && (
                <div className="mt-2 bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-secondary)]/10 border border-[var(--color-primary)]/20 rounded-2xl p-5 text-center">
                  <span className="material-symbols-outlined text-[36px] text-[var(--color-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    celebration
                  </span>
                  <p className="font-title-md text-title-md text-[var(--color-on-surface)] mt-2">Blueprint Complete!</p>
                  <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] mt-1">Outstanding execution. All items checked off.</p>
                </div>
              )}
            </div>
          )}

          {totalCount > 0 && (
            <div className="flex justify-center pt-2">
              <Link
                to="/daily"
                className="font-label-sm text-label-sm text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 flex items-center gap-1 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 px-4 py-2 rounded-full transition-all press-scale hover:shadow-md"
              >
                <span>View Full Task Queue</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          )}
        </section>

        {/* ── AI INSIGHTS ────────────────────────────────────── */}
        {!insightsLoading && insights.length > 0 && (
          <section className="space-y-4">
            <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[var(--color-secondary)]" style={{ fontVariationSettings: "'FILL' 1" }}>
                lightbulb
              </span>
              Personalized Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, idx) => (
                <div key={idx} className="glass-panel rounded-2xl p-5 border border-[var(--color-secondary)]/10 flex gap-4 hover:border-[var(--color-secondary)]/30 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      {insight.category.toLowerCase().includes('routine') ? 'sync' :
                       insight.category.toLowerCase().includes('goal') ? 'track_changes' : 'bolt'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-label-sm text-[10px] text-[var(--color-secondary)] uppercase tracking-widest font-bold bg-[var(--color-secondary)]/10 px-2.5 py-1 rounded">
                        {insight.category}
                      </span>
                    </div>
                    <h4 className="font-title-md text-[16px] text-[var(--color-on-surface)] mt-2 font-bold">{insight.title}</h4>
                    <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] mt-1.5 opacity-80 leading-relaxed">{insight.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── QUICK LINKS ────────────────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/focus', icon: 'self_improvement', label: 'Focus Mode', color: 'var(--color-primary)' },
            { to: '/journal', icon: 'psychology', label: 'Journal', color: 'var(--color-secondary)' },
            { to: '/goals', icon: 'rocket_launch', label: 'Goals', color: 'var(--color-tertiary)' },
            { to: '/analytics', icon: 'analytics', label: 'Analytics', color: 'var(--color-outline)' },
          ].map(({ to, icon, label, color }) => (
            <Link
              key={to}
              to={to}
              className="glass-panel rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:shadow-md transition-all duration-200 card-hover press-scale group text-center"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
              >
                <span
                  className="material-symbols-outlined text-[22px] transition-all group-hover:scale-110"
                  style={{ color }}
                >
                  {icon}
                </span>
              </div>
              <span className="font-label-sm text-[11px] text-[var(--color-on-surface-variant)] tracking-wide">{label}</span>
            </Link>
          ))}
        </section>

      </div>
    </div>
  );
}
