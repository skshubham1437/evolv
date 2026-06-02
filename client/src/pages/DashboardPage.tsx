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

function getPriorityCode(priority?: string) {
  if (priority === 'high') return 'P0';
  if (priority === 'medium') return 'P1';
  return 'P2';
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
// Blueprint row component
// ─────────────────────────────────────────────────────────────
function BlueprintRow({
  item,
  onComplete,
  isNew = false,
  allHabits = [],
  isLast = false,
}: {
  item: BlueprintItem;
  onComplete: (item: BlueprintItem) => void;
  isNew?: boolean;
  allHabits?: Habit[];
  isLast?: boolean;
}) {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    if (item.done) return;
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
      className={`group flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover-row
        ${!isLast ? 'border-b border-[var(--color-outline-variant)]/50' : ''}
        ${item.done ? 'opacity-40' : ''}
        ${isNew ? 'bg-[var(--color-primary)]/5' : ''}
        ${animating ? 'opacity-50' : ''}
      `}
    >
      {/* Checkbox / Complete button */}
      <button
        onClick={handleClick}
        disabled={item.done}
        className={`w-5 h-5 border flex items-center justify-center shrink-0 transition-colors
          ${item.done
            ? 'border-[var(--color-outline-variant)] bg-[var(--color-outline-variant)]/20 text-[var(--color-outline)]'
            : 'border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-transparent'
          }
        `}
      >
        {item.done && <span className="material-symbols-outlined text-[14px]">check</span>}
        {!item.done && <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">check</span>}
      </button>

      {/* Priority / Type badge */}
      <span
        className="font-mono text-[10px] font-semibold tracking-wide w-8 text-center shrink-0"
        style={{ color: item.done ? 'var(--color-outline)' : (item.type === 'task' ? getPriorityColor(item.priority) : 'var(--color-primary)') }}
      >
        {item.type === 'task' ? getPriorityCode(item.priority) : '⚡'}
      </span>

      {/* Title */}
      <span className={`flex-1 text-[14px] truncate ${item.done ? 'line-through text-[var(--color-outline)]' : 'text-[var(--color-on-surface)]'}`}>
        {item.title}
      </span>

      {/* Meta tags */}
      <div className="flex items-center gap-2 shrink-0">
        {item.type === 'habit' && routineLabel && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-outline)] hidden sm:inline">
            {routineLabel}
          </span>
        )}
        {item.type === 'habit' && item.streak !== undefined && item.streak > 0 && (
          <span className="font-mono text-[10px] text-[#f97316] flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[12px]">local_fire_department</span>
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
  const doneItems = blueprintItems.filter(i => !i.done ? false : true);

  const highPriorityCount = tasks.filter(t => t.priority === 'high' && !t.is_completed).length;

  const renderBlueprintGroup = (title: string, items: BlueprintItem[], timeLabel: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="font-mono text-[10px] text-[var(--color-outline)] uppercase tracking-[0.14em] font-semibold">{title}</span>
          <span className="font-mono text-[9px] bg-[var(--color-surface-container-high)] text-[var(--color-outline)] px-2 py-0.5 rounded-sm">{timeLabel}</span>
        </div>
        <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
          {items.map((item, idx) => (
            <BlueprintRow
              key={item.id}
              item={item}
              onComplete={handleComplete}
              isNew={item.id === justAddedId}
              allHabits={habits}
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

        {/* ── HEADER ─────────────────────────────────────────── */}
        <section className="flex flex-col gap-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-outline)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)]"></span>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} // SYSTEM ONLINE
          </p>
          <h2 className="font-title-md text-[32px] md:text-[36px] text-[var(--color-on-surface)] font-medium tracking-tight mt-1">
            {getGreeting()},{' '}
            <span className="text-[var(--color-primary)] font-serif italic">{user?.name || 'Builder'}</span>
          </h2>
          <p className="text-[13px] text-[var(--color-on-surface-variant)] mt-1">
            Ready for execution. {tasks.filter(t => !t.is_completed).length} tasks queued.
          </p>
        </section>

        {/* ── STATS ROW ──────────────────────────────────────── */}
        <div className="flex flex-col gap-4 mt-2">
          <section className="grid grid-cols-2 md:grid-cols-4 border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] divide-x divide-[var(--color-outline-variant)]">
            <div className="p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-outline)] mb-1">Execution</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[36px] font-light leading-none text-[var(--color-on-surface)]">{pct}</span>
                <span className="text-[14px] text-[var(--color-outline)]">%</span>
              </div>
            </div>
            <div className="p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-outline)] mb-1">Active Tasks</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[36px] font-light leading-none text-[var(--color-on-surface)]">{String(tasks.filter(t => !t.is_completed).length).padStart(2, '0')}</span>
                <span className="font-mono text-[11px] text-[var(--color-outline)]">/{tasks.length}</span>
              </div>
            </div>
            <div className="p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-outline)] mb-1">Habits</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[36px] font-light leading-none text-[var(--color-on-surface)]">{String(habits.filter(h => h.completed_today).length).padStart(2, '0')}</span>
                <span className="font-mono text-[11px] text-[var(--color-outline)]">/{habits.length}</span>
              </div>
            </div>
            <div className="p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-outline)] mb-1">High Priority</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[36px] font-light leading-none" style={{ color: highPriorityCount > 0 ? 'var(--color-error)' : 'var(--color-on-surface)' }}>{String(highPriorityCount).padStart(2, '0')}</span>
                <span className="font-mono text-[11px] text-[var(--color-outline)]">pending</span>
              </div>
            </div>
          </section>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-[var(--color-surface-container-highest)] relative rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 bg-[var(--color-primary)] transition-all duration-500 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-[var(--color-outline)] w-8 text-right">{pct}%</span>
          </div>
        </div>

        {/* ── BURNOUT ASSESSMENT ────────────────────────────── */}
        {!burnoutLoading && (
          <div className="border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-2">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] flex items-center justify-center shrink-0">
                 <span className="material-symbols-outlined text-[18px] text-[var(--color-secondary)]">show_chart</span>
               </div>
               <div>
                 <div className="flex items-center gap-2">
                   <h3 className="font-mono text-[12px] font-bold text-[var(--color-on-surface)] uppercase tracking-wider">Burnout Risk</h3>
                   <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 border border-[var(--color-secondary)] text-[var(--color-secondary)] bg-[var(--color-secondary)]/10 rounded-sm">
                     {burnoutRisk?.risk || 'LOW'}
                   </span>
                 </div>
                 <p className="font-mono text-[11px] text-[var(--color-outline)] mt-1">
                   {burnoutRisk?.details || 'Cognitive load optimal. Proceed with Deep Work phase.'}
                 </p>
               </div>
            </div>
            <button className="font-mono text-[10px] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] uppercase tracking-widest flex items-center gap-1 shrink-0">
              Calibrate <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>
        )}

        {/* ── TWO COLUMN LAYOUT ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-4">
           
           {/* LEFT COLUMN */}
           <div className="flex flex-col gap-6">
             {/* Today's Blueprint Header */}
             <div className="flex items-center justify-between border-b border-[var(--color-outline-variant)] pb-3">
               <h3 className="font-title-md font-bold text-[18px] text-[var(--color-on-surface)] flex items-center gap-2 tracking-wide uppercase">
                 <span className="material-symbols-outlined text-[20px]">account_tree</span>
                 Today's Blueprint
               </h3>
               <button onClick={() => setShowAddTask(v => !v)} className="font-mono text-[10px] text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 uppercase tracking-widest flex items-center gap-1 transition-colors">
                 <span className="material-symbols-outlined text-[14px]">{showAddTask ? 'close' : 'add'}</span> {showAddTask ? 'Cancel' : 'Add Task'}
               </button>
             </div>

             {/* Quick add */}
             {showAddTask && (
               <form onSubmit={handleAddTask} className="flex items-center gap-2 px-4 py-3 border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] mb-4">
                 <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">add</span>
                 <input autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="New task..." className="flex-1 bg-transparent outline-none text-[var(--color-on-surface)] text-[14px] placeholder:text-[var(--color-outline)]" />
                 <button type="submit" disabled={!newTaskTitle.trim()} className="px-3 py-1 bg-[var(--color-primary)] text-[var(--color-on-primary)] font-mono text-[10px] uppercase tracking-wider disabled:opacity-30 hover:opacity-90 transition-opacity">Add</button>
               </form>
             )}

             {/* Blueprint List */}
             {loading ? (
               <div className="divide-y divide-[var(--color-outline-variant)]/50">
                 {[...Array(4)].map((_, i) => (
                   <div key={i} className="h-[52px] animate-pulse bg-[var(--color-surface-container)]/30" />
                 ))}
               </div>
             ) : blueprintItems.length === 0 ? (
               <div className="text-center py-12 border border-[var(--color-outline-variant)]/50">
                 <span className="material-symbols-outlined text-[32px] text-[var(--color-outline)] mb-2">check_circle</span>
                 <p className="text-[14px] text-[var(--color-on-surface-variant)]">Blueprint is empty</p>
               </div>
             ) : (
               <div>
                 {renderBlueprintGroup('[01] MORNING ROUTINE', morningItems, '07:00 - 09:00')}
                 {renderBlueprintGroup('[02] DEEP WORK PHASE', taskItems, '09:30 - 12:30')}
                 {renderBlueprintGroup('[03] EVENING RITUAL', otherItems, '18:00 - 21:00')}

                 {/* Done items (collapsed) */}
                 {doneItems.length > 0 && (
                   <details className="group mt-4 border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
                     <summary className="cursor-pointer list-none flex items-center gap-2 px-4 py-3 text-[var(--color-outline)] font-mono text-[10px] uppercase tracking-wider hover:text-[var(--color-on-surface-variant)] transition-colors select-none">
                       <span className="material-symbols-outlined text-[12px] transition-transform group-open:rotate-90">chevron_right</span>
                       {doneItems.length} completed
                     </summary>
                     <div className="border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
                       {doneItems.map((item, idx) => (
                         <BlueprintRow key={item.id} item={item} onComplete={handleComplete} allHabits={habits} isLast={idx === doneItems.length - 1} />
                       ))}
                     </div>
                   </details>
                 )}

                 {pct === 100 && totalCount > 0 && (
                   <div className="px-4 py-4 mt-6 border border-[var(--color-outline-variant)] bg-[var(--color-primary)]/5 text-center">
                     <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-primary)]">
                       ✓ Blueprint Complete — Outstanding Execution
                     </p>
                   </div>
                 )}

                 {totalCount > 0 && (
                   <div className="flex justify-center mt-6">
                     <Link to="/daily" className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-outline)] hover:text-[var(--color-on-surface)] flex items-center gap-1 border border-[var(--color-outline-variant)] px-6 py-3 hover:bg-[var(--color-surface-container-high)] transition-colors">
                       View Full Task Queue <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                     </Link>
                   </div>
                 )}
               </div>
             )}
           </div>

           {/* RIGHT COLUMN */}
           <div className="flex flex-col gap-6">
             {/* Focus Mode Widget */}
             <div className="border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] overflow-hidden p-5 flex flex-col">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-mono text-[11px] font-bold text-[var(--color-on-surface)] uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">center_focus_strong</span>
                    Focus Mode
                  </h3>
                  <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest">Offline</span>
                </div>
                
                <div className="bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] py-8 flex flex-col items-center justify-center mb-4">
                  <span className="font-mono text-[36px] font-light text-[var(--color-on-surface)] tracking-widest">25:00</span>
                  <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest mt-2">Pomodoro Ready</span>
                </div>
                
                <Link to="/focus" className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-[var(--color-on-primary)] font-mono text-[11px] font-bold uppercase tracking-widest flex justify-center items-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                  Initiate Focus
                </Link>
             </div>

             {/* Scratchpad Widget */}
             <div className="border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] flex flex-col h-64 relative">
                <div className="px-5 py-4 border-b border-[var(--color-outline-variant)]">
                  <h3 className="font-mono text-[11px] font-bold text-[var(--color-on-surface)] uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">edit_note</span>
                    Scratchpad
                  </h3>
                </div>
                <div className="flex-1 p-5">
                  <textarea className="w-full h-full bg-transparent resize-none outline-none font-mono text-[11px] text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)]" placeholder="// Quick thoughts..."></textarea>
                </div>
                {/* Floating add button */}
                <button className="absolute bottom-[-16px] right-4 w-12 h-12 rounded-full bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90 flex items-center justify-center text-[var(--color-on-secondary)] shadow-lg transition-transform hover:scale-105 z-10">
                   <span className="material-symbols-outlined text-[24px]">add</span>
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
