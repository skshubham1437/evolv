import { useEffect, useState, type FormEvent, useMemo } from 'react';
import { fetchDashboard, createTask, completeTask, logHabit, fetchMorningBrief, fetchAIInsights, fetchBurnoutRisk, logEnergy, type Task, type Habit, type AIInsight } from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAI } from '../context/AIContext';
import { RadialProgress } from '../components/ui/RadialProgress';

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
  if (h < 5)  return { text: 'Burning the midnight oil', emoji: '🌙' };
  if (h < 12) return { text: 'Good Morning', emoji: '☀️' };
  if (h < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
  if (h < 21) return { text: 'Good Evening', emoji: '🌆' };
  return { text: 'Good Night', emoji: '🌙' };
}

// Simple Markdown parser for Morning Briefing
function FormatDashboardBrief({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, idx) => {
        const clean = line.replace(/\*\*/g, '').trim();
        if (clean.startsWith('Focus Area:')) {
          return (
            <div key={idx} className="font-bold text-[14px] text-[var(--color-on-surface)] not-italic mb-1">
              {clean}
            </div>
          );
        }
        if (clean.startsWith('-') || clean.startsWith('*')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 not-italic text-[13px] text-[var(--color-on-surface-variant)]">
              <span className="text-[var(--color-primary)] font-bold mt-1">•</span>
              <span>{clean.replace(/^[-*]\s*/, '')}</span>
            </div>
          );
        }
        if (clean === '') return <div key={idx} className="h-1" />;
        return <p key={idx} className="text-[13px] text-[var(--color-on-surface-variant)] leading-relaxed">{clean}</p>;
      })}
    </div>
  );
}

function getPriorityCode(priority?: string) {
  if (priority === 'high') return 'P0';
  if (priority === 'medium') return 'P1';
  return 'P2';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// Blueprint row component
// ─────────────────────────────────────────────────────────────
function BlueprintRow({
  item,
  onComplete,
  isNew = false,
  isLast = false,
}: {
  item: BlueprintItem;
  onComplete: (item: BlueprintItem) => void;
  isNew?: boolean;
  isLast?: boolean;
}) {
  const [animating, setAnimating] = useState(false);
  const [popped, setPopped] = useState(false);

  const handleClick = () => {
    if (item.done) return;
    setPopped(true);
    setAnimating(true);
    setTimeout(() => {
      onComplete(item);
      setAnimating(false);
    }, 250);
  };

  const routineLabel = item.type === 'habit'
    ? (item.routineType !== 'none' ? item.routineType?.toUpperCase() : item.category?.toUpperCase())
    : null;

  return (
    <div
      className={`group flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 relative overflow-hidden
        ${!isLast ? 'border-b border-[rgba(255,255,255,0.04)]' : ''}
        ${item.done ? 'opacity-35' : ''}
        ${isNew ? 'bg-[var(--color-primary)]/5' : ''}
        ${animating ? 'opacity-50' : ''}
        hover:bg-white/[0.02]
      `}
    >
      {/* Checkbox / Complete button */}
      <button
        onClick={handleClick}
        disabled={item.done}
        aria-label={`Mark ${item.title} as complete`}
        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-300 relative overflow-hidden
          ${item.done
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 text-[var(--color-primary)] shadow-[0_0_10px_rgba(210,187,255,0.4)]'
            : 'border-[rgba(255,255,255,0.15)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 hover:scale-105 active:scale-95 text-transparent hover:text-[var(--color-primary)]/40'
          }
        `}
      >
        {item.done ? (
          <span className={`material-symbols-outlined text-[12px] ${popped ? 'anim-check-pop' : ''}`}>check</span>
        ) : (
          <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">check</span>
        )}
      </button>

      {/* Priority / Type badge */}
      <span
        className="font-mono text-[9px] font-bold tracking-wider px-1.5 py-0.5 border rounded shrink-0 w-12 text-center"
        style={{ 
          color: item.done ? 'var(--color-outline)' : (item.type === 'task' ? getPriorityColor(item.priority) : 'var(--color-primary)'),
          borderColor: item.done ? 'rgba(255,255,255,0.04)' : `color-mix(in srgb, ${item.type === 'task' ? getPriorityColor(item.priority) : 'var(--color-primary)'} 20%, transparent)`,
          backgroundColor: item.done ? 'transparent' : `color-mix(in srgb, ${item.type === 'task' ? getPriorityColor(item.priority) : 'var(--color-primary)'} 5%, transparent)`
        }}
      >
        {item.type === 'task' ? `[${getPriorityCode(item.priority)}]` : '[⚡]'}
      </span>

      {/* Title */}
      <span className={`flex-1 text-[13px] tracking-wide font-medium truncate transition-all duration-300 ${item.done ? 'line-through text-[var(--color-outline)] opacity-50' : 'text-[var(--color-on-surface)]'}`}>
        {item.title}
      </span>

      {/* Meta tags */}
      <div className="flex items-center gap-2 shrink-0">
        {item.type === 'habit' && routineLabel && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-outline)] opacity-70 hidden sm:inline">
            {routineLabel}
          </span>
        )}
        {item.type === 'habit' && item.streak !== undefined && item.streak > 0 && (
          <span className="font-mono text-[9px] text-[#f97316] flex items-center gap-0.5 font-bold">
            <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            {item.streak}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { aiEnabled } = useAI();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<(Habit & { completed_today: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Focus Mode Widget states
  const [focusTimeLeft, setFocusTimeLeft] = useState(1500);
  const [focusIsRunning, setFocusIsRunning] = useState(false);
  const focusPercent = (focusTimeLeft / 1500) * 100;

  useEffect(() => {
    let interval: number | null = null;
    if (focusIsRunning && focusTimeLeft > 0) {
      interval = window.setInterval(() => {
        setFocusTimeLeft(t => t - 1);
      }, 1000);
    } else if (focusTimeLeft === 0) {
      setFocusIsRunning(false);
      showToast('Focus session complete!', 'success');
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [focusIsRunning, focusTimeLeft, showToast]);

  const formatFocusTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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

    if (aiEnabled) {
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
    } else {
      setBriefLoading(false);
      setInsightsLoading(false);
      setBurnoutLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener('task-added-globally', load);
    return () => window.removeEventListener('task-added-globally', load);
  }, [aiEnabled]);

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
  const doneItems = blueprintItems.filter(i => !i.done ? false : true);

  const highPriorityCount = tasks.filter(t => t.priority === 'high' && !t.is_completed).length;

  const renderBlueprintGroup = (title: string, items: BlueprintItem[], timeLabel: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3.5 px-1">
          <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-[0.25em] font-bold">{title}</span>
          <span className="font-mono text-[9px] border border-[rgba(255,255,255,0.06)] bg-white/[0.02] text-[var(--color-outline)] px-2.5 py-0.5 rounded-full">{timeLabel}</span>
        </div>
        <div className="glass-card rounded-2xl border-[rgba(255,255,255,0.05)] overflow-hidden shadow-lg">
          {items.map((item, idx) => (
            <BlueprintRow
              key={item.id}
              item={item}
              onComplete={handleComplete}
              isNew={item.id === justAddedId}
              isLast={idx === items.length - 1}
            />
          ))}
        </div>
      </div>
    );
  };

  const morningItems = pendingItems.filter(i => i.type === 'habit' && i.routineType === 'morning');
  const taskItems = pendingItems.filter(i => i.type === 'task');
  const otherItems = pendingItems.filter(i => (i.type === 'habit' && i.routineType !== 'morning') || i.type !== 'habit' && i.type !== 'task'); // fallback

  return (
    <div className="flex-1 overflow-y-auto w-full no-scrollbar relative z-10 pb-24 md:pb-0">
      <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] pt-5 md:pt-8 pb-12 flex flex-col gap-6 relative z-10">

        {/* ── CONNECTION ERROR ALERT ───────────────────────── */}
        {error && (
          <div className="border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-6 py-3 text-[var(--color-error)] font-mono text-[11px] uppercase tracking-widest flex items-center gap-2 font-bold anim-fade-up">
            <span className="material-symbols-outlined text-[16px]">warning</span>{error}
          </div>
        )}

        {/* ── HEADER ─────────────────────────────────────────── */}
        <section className="flex flex-col gap-1 anim-fade-up border-b border-[rgba(255,255,255,0.06)] pb-8 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)] animate-pulse glow-shadow-secondary"></span>
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--color-outline)]">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} // SYSTEM ONLINE
            </p>
          </div>
          <h2 className="text-[40px] md:text-[52px] font-black tracking-tighter text-[var(--color-on-surface)] leading-none mt-4 select-none">
            {getGreeting().emoji} {getGreeting().text}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">{user?.name || 'Builder'}</span>
          </h2>
          <p className="text-[13px] text-[var(--color-on-surface-variant)] mt-4 flex items-center gap-3 flex-wrap font-medium">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-[var(--color-outline)]">task_alt</span>
              <strong className="text-[var(--color-on-surface)]">{tasks.filter(t => !t.is_completed).length}</strong> tasks queued
            </span>
            <span className="text-[rgba(255,255,255,0.15)]">·</span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-[var(--color-outline)]">bolt</span>
              <strong className="text-[var(--color-on-surface)]">{habits.filter(h => !h.completed_today).length}</strong> habits remaining
            </span>
          </p>
        </section>

        {/* ── TODAY'S FOCUS CARD ─────────────────────────────── */}
        {!loading && tasks.filter(t => !t.is_completed && t.priority === 'high').length > 0 && (() => {
          const focusTask = tasks.filter(t => !t.is_completed && t.priority === 'high')[0];
          return (
            <div className="focus-card glass-card border-[rgba(255,255,255,0.06)] rounded-2xl p-5 flex items-center justify-between gap-6 anim-fade-up shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:border-[var(--color-primary)]/30 transition-all duration-300">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(210,187,255,0.1)]">
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>adjust</span>
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-primary)] mb-1">Today's Focus</p>
                  <p className="text-[16px] font-bold text-[var(--color-on-surface)] truncate">{focusTask.title}</p>
                </div>
              </div>
              <Link
                to="/focus"
                className="shrink-0 h-10 px-5 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-mono text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(210,187,255,0.2)]"
              >
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                Start Mode
              </Link>
            </div>
          );
        })()}

        {/* ── AI MORNING BRIEF ──────────────────────────────── */}
        {aiEnabled && (
          briefLoading ? (
          <div className="glass-card rounded-3xl p-8 flex flex-col gap-4 animate-pulse">
            <div className="h-4 bg-[rgba(255,255,255,0.04)] w-1/4 rounded"></div>
            <div className="h-3 bg-[rgba(255,255,255,0.04)] w-full rounded"></div>
            <div className="h-3 bg-[rgba(255,255,255,0.04)] w-5/6 rounded"></div>
          </div>
        ) : brief ? (
          <div className="glass-card glow-card rounded-3xl p-8 relative overflow-hidden flex flex-col gap-5 anim-fade-up border-[rgba(255,255,255,0.05)] bg-[var(--color-surface)]/10 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
            <div className="absolute right-8 top-8 opacity-[0.02] pointer-events-none select-none">
              <span className="material-symbols-outlined text-[140px] text-[var(--color-primary)]">psychology</span>
            </div>
            <div className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.06)] pb-4">
              <span className="material-symbols-outlined text-[22px] text-[var(--color-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              <h3 className="font-mono text-[10px] font-bold tracking-[0.25em] text-[var(--color-primary)] uppercase">AI Coach Morning Brief</h3>
            </div>
            <div className="text-[14px] text-[var(--color-on-surface-variant)] leading-relaxed pr-6">
              <FormatDashboardBrief text={brief} />
            </div>
          </div>
        ) : null
        )}

        {/* ── STATS ROW ──────────────────────────────────────── */}
        <div className="flex flex-col gap-4 mt-2">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 anim-fade-up">
            {/* Card 1: Execution */}
            <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-[rgba(255,255,255,0.05)] border-t-[3px] border-t-[var(--color-primary)] hover:border-[var(--color-primary)]/30 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(210,187,255,0.06)] transition-all duration-300">
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-outline)]">Execution</span>
                <span className="text-[36px] font-black tracking-tight text-[var(--color-on-surface)] leading-none">{pct}%</span>
                <span className="font-mono text-[9px] text-[var(--color-outline)] opacity-70">Daily progress</span>
              </div>
              <RadialProgress value={pct} size={64} strokeWidth={4} sublabel="today" />
            </div>

            {/* Card 2: Active Tasks */}
            <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-[rgba(255,255,255,0.05)] border-t-[3px] border-t-[var(--color-secondary)] hover:border-[var(--color-secondary)]/30 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(90,218,206,0.06)] transition-all duration-300">
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-outline)]">Active Tasks</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[36px] font-black tracking-tight text-[var(--color-on-surface)] leading-none">{String(tasks.filter(t => !t.is_completed).length).padStart(2, '0')}</span>
                  <span className="font-mono text-[10px] text-[var(--color-outline)]">/ {tasks.length}</span>
                </div>
                <span className="font-mono text-[9px] text-[var(--color-outline)] opacity-70">Tasks in queue</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[var(--color-secondary)]/10 border border-[var(--color-secondary)]/20 flex items-center justify-center text-[var(--color-secondary)] shadow-[0_0_15px_rgba(90,218,206,0.1)]">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
              </div>
            </div>

            {/* Card 3: Habits */}
            <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-[rgba(255,255,255,0.05)] border-t-[3px] border-t-[var(--color-tertiary)] hover:border-[var(--color-tertiary)]/30 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(206,194,220,0.06)] transition-all duration-300">
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-outline)]">Habits Completed</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[36px] font-black tracking-tight text-[var(--color-on-surface)] leading-none">{String(habits.filter(h => h.completed_today).length).padStart(2, '0')}</span>
                  <span className="font-mono text-[10px] text-[var(--color-outline)]">/ {habits.length}</span>
                </div>
                <span className="font-mono text-[9px] text-[var(--color-outline)] opacity-70">Daily streak triggers</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[var(--color-tertiary)]/10 border border-[var(--color-tertiary)]/20 flex items-center justify-center text-[var(--color-tertiary)] shadow-[0_0_15px_rgba(206,194,220,0.1)]">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </div>
            </div>

            {/* Card 4: High Priority */}
            <div className="glass-card rounded-2xl p-6 flex items-center justify-between border border-[rgba(255,255,255,0.05)] border-t-[3px] border-t-[var(--color-error)] hover:border-[var(--color-error)]/30 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(255,180,171,0.06)] transition-all duration-300">
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-outline)]">High Priority</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[36px] font-black tracking-tight leading-none" style={{ color: highPriorityCount > 0 ? 'var(--color-error)' : 'var(--color-on-surface)' }}>{String(highPriorityCount).padStart(2, '0')}</span>
                  <span className="font-mono text-[10px] text-[var(--color-outline)]">pending</span>
                </div>
                <span className="font-mono text-[9px] text-[var(--color-outline)] opacity-70">Requires deep focus</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/25 flex items-center justify-center text-[var(--color-error)] shadow-[0_0_15px_rgba(255,180,171,0.1)]">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              </div>
            </div>
          </section>

          {/* Progress bar */}
          <div className="flex items-center gap-4 px-2">
            <div className="flex-1 h-1 bg-[rgba(255,255,255,0.06)] relative rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(210,187,255,0.6)]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-[var(--color-primary)] w-8 text-right font-bold">{pct}%</span>
          </div>
        </div>

        {/* ── BURNOUT ASSESSMENT ────────────────────────────── */}
        {aiEnabled && !burnoutLoading && (
          <div className="glass-card rounded-2xl border-[rgba(255,255,255,0.05)] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg hover:border-[var(--color-secondary)]/30 transition-all duration-300">
            <div className="flex items-center gap-4">
               <div className="w-11 h-11 rounded-xl border border-[var(--color-secondary)]/20 bg-[var(--color-secondary)]/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(90,218,206,0.1)]">
                 <span className="material-symbols-outlined text-[18px] text-[var(--color-secondary)]">show_chart</span>
               </div>
               <div>
                 <div className="flex items-center gap-3">
                   <h3 className="font-mono text-[10px] font-bold text-[var(--color-on-surface)] uppercase tracking-[0.2em]">Burnout Risk</h3>
                   <span className="font-mono text-[9px] uppercase font-bold px-2.5 py-0.5 border border-[var(--color-secondary)] text-[var(--color-secondary)] bg-[var(--color-secondary)]/10 rounded-full animate-pulse">
                     {burnoutRisk?.risk || 'LOW'}
                   </span>
                 </div>
                 <p className="text-[13px] text-[var(--color-outline)] mt-1.5 font-medium">
                   {burnoutRisk?.details || 'Cognitive load optimal. Proceed with Deep Work phase.'}
                 </p>
               </div>
            </div>
            <button className="font-mono text-[10px] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] uppercase tracking-widest flex items-center gap-1.5 shrink-0 transition-colors">
              Calibrate <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>
        )}

        {/* ── TWO COLUMN LAYOUT ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-4">
           
           {/* LEFT COLUMN */}
           <div className="flex flex-col gap-6">
             {/* Today's Blueprint Header */}
             <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-3.5">
               <h3 className="font-title-md font-bold text-[16px] text-[var(--color-on-surface)] flex items-center gap-2.5 tracking-wider uppercase">
                 <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">account_tree</span>
                 Today's Blueprint
               </h3>
               <button onClick={() => setShowAddTask(v => !v)} className="font-mono text-[9px] text-[var(--color-primary)] hover:opacity-80 uppercase tracking-[0.2em] flex items-center gap-1.5 transition-opacity">
                 <span className="material-symbols-outlined text-[12px]">{showAddTask ? 'close' : 'add'}</span> {showAddTask ? 'Cancel' : 'Add Task'}
               </button>
             </div>

             {/* Quick add */}
             {showAddTask && (
               <form onSubmit={handleAddTask} className="flex items-center gap-3 px-4 py-3 glass-card rounded-xl border-[rgba(255,255,255,0.06)] bg-white/[0.02] mb-4">
                 <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">add</span>
                 <input autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="New task..." className="flex-1 bg-transparent outline-none text-[var(--color-on-surface)] text-[14px] placeholder:text-[var(--color-outline)] font-medium" />
                 <button type="submit" disabled={!newTaskTitle.trim()} className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] text-black font-mono text-[9px] uppercase tracking-wider font-bold disabled:opacity-30 hover:opacity-90 transition-opacity">Add</button>
               </form>
             )}

             {/* Blueprint List */}
             {loading ? (
                <div className="divide-y divide-[rgba(255,255,255,0.04)] rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.05)] bg-[#050505]/40 backdrop-blur-md">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-[52px] animate-pulse bg-white/[0.01]" />
                  ))}
                </div>
             ) : blueprintItems.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-2xl border-[rgba(255,255,255,0.05)] bg-white/[0.01] backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[32px] text-[var(--color-outline)] mb-3 opacity-60">check_circle</span>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-outline)]">Blueprint is empty</p>
                </div>
             ) : (
                <div>
                  {renderBlueprintGroup('[01] MORNING ROUTINE', morningItems, '07:00 - 09:00')}
                  {renderBlueprintGroup('[02] DEEP WORK PHASE', taskItems, '09:30 - 12:30')}
                  {renderBlueprintGroup('[03] EVENING RITUAL', otherItems, '18:00 - 21:00')}

                  {/* Done items (collapsed) */}
                  {doneItems.length > 0 && (
                    <details className="group mt-4 border border-[rgba(255,255,255,0.05)] bg-white/[0.01] rounded-2xl overflow-hidden shadow-sm">
                      <summary className="cursor-pointer list-none flex items-center gap-2 px-5 py-3.5 text-[var(--color-outline)] font-mono text-[9px] uppercase tracking-[0.25em] hover:text-[var(--color-on-surface-variant)] transition-colors select-none">
                        <span className="material-symbols-outlined text-[12px] transition-transform group-open:rotate-90">chevron_right</span>
                        {doneItems.length} completed
                      </summary>
                      <div className="border-t border-[rgba(255,255,255,0.04)] bg-white/[0.01]">
                        {doneItems.map((item, idx) => (
                          <BlueprintRow key={item.id} item={item} onComplete={handleComplete} isLast={idx === doneItems.length - 1} />
                        ))}
                      </div>
                    </details>
                  )}

                  {pct === 100 && totalCount > 0 && (
                    <div className="px-5 py-4 mt-6 glass-card border-[var(--color-primary)]/20 rounded-2xl bg-[var(--color-primary)]/5 text-center animate-pulse shadow-[0_0_20px_rgba(210,187,255,0.05)]">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-primary)] font-bold">
                        ✓ Blueprint Complete — Outstanding Execution
                      </p>
                    </div>
                  )}

                  {totalCount > 0 && (
                    <div className="flex justify-center mt-6">
                      <Link to="/daily" className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] flex items-center gap-2 border border-[rgba(255,255,255,0.08)] bg-white/[0.01] hover:bg-white/[0.04] px-6 py-3.5 rounded-full transition-all duration-300">
                        View Full Task Queue <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </div>
                  )}
                </div>
             )}
           </div>

           {/* RIGHT COLUMN */}
           <div className="flex flex-col gap-6">
             {/* Quick Energy Log Widget */}
             <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 border border-[rgba(255,255,255,0.05)] border-t-[3px] border-t-[var(--color-secondary)] shadow-lg hover-lift">
               <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-3">
                 <h3 className="font-mono text-[10px] font-bold text-[var(--color-on-surface)] uppercase tracking-[0.2em] flex items-center gap-2">
                   <span className="material-symbols-outlined text-[14px] text-[var(--color-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                   Energy Check-in
                 </h3>
                 <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-[0.15em] opacity-60">Circadian Log</span>
               </div>
               
               <p className="text-[13px] text-[var(--color-on-surface-variant)] leading-relaxed">
                  Rate your current energy state to calibrate your circadian focus windows.
                </p>

                <div className="bg-white/[0.015] border border-[rgba(255,255,255,0.04)] p-2 rounded-xl flex gap-2 justify-between">
                 {[1, 2, 3, 4, 5].map((val) => {
                   const colors = [
                      'bg-red-500/5 text-red-500 border-red-500/15 hover:bg-red-500/10 hover:border-red-500/35 hover:text-red-400 hover:shadow-[0_0_10px_rgba(239,68,68,0.15)]',
                      'bg-orange-500/5 text-orange-400 border-orange-500/15 hover:bg-orange-500/10 hover:border-orange-500/35 hover:text-orange-300 hover:shadow-[0_0_10px_rgba(249,115,22,0.15)]',
                      'bg-yellow-500/5 text-yellow-400 border-yellow-500/15 hover:bg-yellow-500/10 hover:border-yellow-500/35 hover:text-yellow-300 hover:shadow-[0_0_10px_rgba(234,179,8,0.15)]',
                      'bg-violet-500/5 text-violet-400 border-violet-500/15 hover:bg-violet-500/10 hover:border-violet-500/35 hover:text-violet-300 hover:shadow-[0_0_10px_rgba(139,92,246,0.15)]',
                      'bg-cyan-500/5 text-cyan-400 border-cyan-500/15 hover:bg-cyan-500/10 hover:border-cyan-500/35 hover:text-cyan-300 hover:shadow-[0_0_10px_rgba(6,182,212,0.15)]',
                   ];
                   return (
                     <button
                       key={val}
                       onClick={async () => {
                         try {
                           await logEnergy(val);
                           showToast(`Energy log registered: Level ${val}/5`, 'success');
                         } catch (err: any) {
                           showToast(err.message || 'Failed to log energy', 'error');
                         }
                       }}
                        className={`aspect-square w-10 flex-1 flex items-center justify-center rounded-lg border font-mono text-[13px] font-bold transition-all duration-100 active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] ${colors[val - 1]}`}
                     >
                       {val}
                     </button>
                   );
                 })}
               </div>
             </div>

             {/* AI Coach Insights Widget */}
             {aiEnabled && (
               <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 border border-[rgba(255,255,255,0.05)] border-t-[3px] border-t-[var(--color-secondary)] shadow-lg hover-lift">
                <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-3">
                  <h3 className="font-mono text-[10px] font-bold text-[var(--color-on-surface)] uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[var(--color-secondary)]" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
                    Coach Insights
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <span className="font-mono text-[9px] text-[var(--color-secondary)] uppercase tracking-[0.15em] font-bold">Active</span>
                  </div>
                </div>

                {insightsLoading ? (
                  <div className="flex flex-col gap-3 animate-pulse">
                    <div className="h-12 bg-white/[0.02] rounded-lg" />
                    <div className="h-12 bg-white/[0.02] rounded-lg" />
                  </div>
                ) : insights.length === 0 ? (
                  <p className="font-mono text-[10px] text-[var(--color-outline)] uppercase tracking-widest text-center py-4 opacity-60">No recommendations</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {insights.map((insight, idx) => (
                      <div key={idx} className="flex flex-col gap-1.5 border-l-2 border-[var(--color-secondary)] pl-3">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-secondary)] font-bold">
                          {insight.category} · {insight.title}
                        </span>
                        <p className="text-[12px] text-[var(--color-on-surface-variant)] leading-snug">
                          {insight.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
               </div>
             )}

             {/* Focus Mode Widget */}
             <div className="glass-card rounded-2xl border border-[rgba(255,255,255,0.05)] border-t-[3px] border-t-[var(--color-primary)] shadow-lg overflow-hidden p-5 flex flex-col gap-4 hover-lift">
                <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-3">
                  <h3 className="font-mono text-[10px] font-bold text-[var(--color-on-surface)] uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">center_focus_strong</span>
                    Focus Mode
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${focusIsRunning ? 'bg-[var(--color-primary)] shadow-[0_0_8px_rgba(210,187,255,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                    <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-[0.15em] font-bold">
                      {focusIsRunning ? 'ENGAGED' : 'READY'}
                    </span>
                  </div>
                </div>
                
                <div className="py-4 flex flex-col items-center justify-center relative">
                  {/* SVG Circular Dial */}
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Glow Filter */}
                      <defs>
                        <filter id="focus-glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>
                      {/* Track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-white/[0.04] fill-none"
                        strokeWidth="3"
                      />
                      {/* Progress with glow */}
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-[var(--color-primary)] fill-none transition-all duration-500 ease-out"
                        strokeWidth="3.5"
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={2 * Math.PI * 42 * (1 - focusPercent / 100)}
                        strokeLinecap="round"
                        filter="url(#focus-glow)"
                        style={{
                          transformOrigin: '50% 50%',
                        }}
                      />
                    </svg>
                    
                    {/* Time Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-mono text-3xl font-light text-[var(--color-on-surface)] tracking-wider">
                        {formatFocusTime(focusTimeLeft)}
                      </span>
                      <span className="font-mono text-[8px] text-[var(--color-outline)] uppercase tracking-[0.15em] mt-1 font-bold">
                        {focusIsRunning ? 'Deep Focus' : 'Pomodoro'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Control Panel */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFocusIsRunning(!focusIsRunning)}
                    className={`flex-1 py-2.5 rounded-xl font-mono text-[9px] font-bold uppercase tracking-widest flex justify-center items-center gap-1.5 transition-all ${
                      focusIsRunning
                        ? 'bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/20 active:scale-[0.98]'
                        : 'bg-[var(--color-primary)] text-black hover:opacity-95 active:scale-[0.98] shadow-[0_4px_15px_rgba(210,187,255,0.2)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {focusIsRunning ? 'pause' : 'play_arrow'}
                    </span>
                    {focusIsRunning ? 'Pause' : 'Start'}
                  </button>
                  
                  {(focusTimeLeft !== 1500 || focusIsRunning) && (
                    <button
                      onClick={() => {
                        setFocusIsRunning(false);
                        setFocusTimeLeft(1500);
                      }}
                      className="px-3.5 py-2.5 glass-card border-[rgba(255,255,255,0.05)] bg-[var(--color-surface)]/20 hover:bg-white/[0.05] hover:border-white/[0.15] text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] transition-all rounded-xl flex items-center justify-center"
                      title="Reset Pomodoro"
                    >
                      <span className="material-symbols-outlined text-[14px]">replay</span>
                    </button>
                  )}
                  
                  <Link 
                    to="/focus" 
                    className="px-3.5 py-2.5 glass-card border-[rgba(255,255,255,0.05)] bg-[var(--color-surface)]/20 hover:bg-white/[0.05] hover:border-white/[0.15] text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)] transition-all rounded-xl flex items-center justify-center"
                    title="Open Full Focus Screen"
                  >
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </Link>
                </div>
              </div>

             {/* Scratchpad Widget */}
             <div className="glass-card rounded-2xl border-[rgba(255,255,255,0.05)] flex flex-col h-64 relative shadow-lg hover-lift">
                <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center">
                  <h3 className="font-mono text-[10px] font-bold text-[var(--color-on-surface)] uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[var(--color-primary)]">edit_note</span>
                    Scratchpad
                  </h3>
                </div>
                <div className="flex-1 p-5">
                  <textarea className="w-full h-full bg-transparent resize-none outline-none font-mono text-[11px] text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] leading-relaxed" placeholder="// Quick thoughts..."></textarea>
                </div>
                {/* Floating add button */}
                <button className="absolute bottom-[-16px] right-6 w-11 h-11 rounded-full bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90 flex items-center justify-center text-[var(--color-on-secondary)] shadow-[0_0_15px_rgba(90,218,206,0.3)] transition-all active:scale-95 hover:scale-105 z-10">
                   <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
             </div>

             {/* Evening Shutdown Banner */}
             {new Date().getHours() >= 20 && (
               <div className="border border-[var(--color-secondary)]/30 bg-[var(--color-secondary)]/5 p-5 flex flex-col gap-3 anim-fade-up">
                 <div className="flex gap-2 items-start">
                   <span className="material-symbols-outlined text-[16px] text-[var(--color-secondary)] mt-0.5">power_settings_new</span>
                   <div>
                     <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-secondary)] font-semibold">System Transition</p>
                     <p className="text-[12px] text-[var(--color-on-surface-variant)] mt-1">Time for End-of-Day Shutdown Ritual.</p>
                   </div>
                 </div>
                 <Link to="/shutdown" className="w-full text-center py-2 bg-[var(--color-secondary)] text-[var(--color-on-secondary)] font-mono text-[10px] uppercase tracking-wider font-semibold hover:opacity-90 transition-opacity">
                   Start Shutdown
                 </Link>
               </div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}
