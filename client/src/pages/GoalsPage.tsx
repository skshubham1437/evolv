import { useState, useEffect } from 'react';
import {
  fetchGoals, createGoal, deleteGoal, toggleKeyResult, aiBreakDownGoal, createKeyResult,
  fetchMilestones, createMilestone, deleteMilestone, updateMilestone,
  type Goal, type SubtaskBreakdown, type Milestone
} from '../api';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';

type Priority = 'high' | 'medium' | 'low';

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string; border: string }> = {
  high:   { label: 'High',   color: 'var(--color-error)',     bg: 'color-mix(in srgb, var(--color-error) 8%, transparent)',     border: 'color-mix(in srgb, var(--color-error) 25%, transparent)' },
  medium: { label: 'Medium', color: 'var(--color-secondary)', bg: 'color-mix(in srgb, var(--color-secondary) 8%, transparent)', border: 'color-mix(in srgb, var(--color-secondary) 25%, transparent)' },
  low:    { label: 'Low',    color: 'var(--color-outline)',   bg: 'color-mix(in srgb, var(--color-outline) 8%, transparent)',   border: 'color-mix(in srgb, var(--color-outline) 25%, transparent)' },
};

// ── Progress arc for each OKR card ────────────────────────
function MiniRing({ pct }: { pct: number }) {
  const r = 18; const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <svg width="44" height="44" className="rotate-[-90deg]">
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-surface-container-highest)" strokeWidth="3.5" />
      <circle cx="22" cy="22" r={r} fill="none" stroke="url(#goalGrad)" strokeWidth="3.5"
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
      <defs>
        <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-secondary)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── OKR Card ───────────────────────────────────────────────
function GoalCard({
  goal,
  idx,
  isActive,
  onSelect,
  onToggleKR,
  onDelete,
  onAiBreakdown,
}: {
  goal: Goal;
  idx: number;
  isActive: boolean;
  onSelect: () => void;
  onToggleKR: (goalId: string | number, krId: string | number) => void;
  onDelete: (id: string | number) => void;
  onAiBreakdown: (goal: Goal) => void;
}) {
  const [expanded, setExpanded] = useState(idx === 0);
  const pm = PRIORITY_META[goal.priority] || PRIORITY_META['medium'];
  
  // Ensure key_results is an array
  const keyResults = goal.key_results || [];

  // Auto-expand when active
  useEffect(() => {
    if (isActive) {
      setExpanded(true);
    }
  }, [isActive]);

  return (
    <div
      onClick={onSelect}
      className={`bg-[var(--color-surface-container-low)]/60 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
        isActive 
          ? 'border-[var(--color-primary)]/50 shadow-[0_0_15px_rgba(210,187,255,0.15)] bg-[var(--color-surface-container-low)]/90' 
          : 'border-[var(--color-outline-variant)]/15 hover:border-[var(--color-primary)]/20'
      } anim-fade-up`}
      style={{ animationDelay: `${idx * 80}ms` }}
    >
      {/* Top progress bar */}
      <div className="h-1 w-full bg-[var(--color-surface-container-high)]">
        <div
          className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] transition-all duration-700"
          style={{ width: `${goal.progress}%` }}
        />
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Priority + due */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span
                className="font-label-sm text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border font-bold flex items-center gap-1.5"
                style={{ color: pm.color, backgroundColor: pm.bg, borderColor: pm.border }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: pm.color }} />
                {pm.label} Priority
              </span>
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest">
                {goal.due_date}
              </span>
            </div>
            <h4
              className="font-title-md text-[20px] text-[var(--color-on-surface)] cursor-pointer hover:text-[var(--color-primary)] transition-colors leading-tight font-bold"
              onClick={(e) => { e.stopPropagation(); setExpanded(e => !e); onSelect(); }}
            >
              {goal.title}
            </h4>
            <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] mt-1.5 opacity-70 line-clamp-2">{goal.description}</p>
          </div>

          {/* Ring + pct */}
          <div className="relative shrink-0 flex flex-col items-center">
            <MiniRing pct={goal.progress} />
            <span className="absolute inset-0 flex items-center justify-center font-label-sm text-[11px] font-bold text-[var(--color-primary)]">
              {goal.progress}%
            </span>
          </div>
        </div>

        {/* Key Results */}
        {expanded && (
          <div className="mt-5 border-t border-[var(--color-outline-variant)]/10 pt-5 space-y-3 anim-fade-up">
            <p className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-3">
              Key Results · {keyResults.filter(k => k.is_done).length}/{keyResults.length}
            </p>
            {keyResults.map(kr => (
              <button
                key={kr.id}
                onClick={(e) => { e.stopPropagation(); onToggleKR(goal.id, kr.id); }}
                className="w-full flex items-center gap-3 group/kr hover:bg-[var(--color-surface-container-high)]/50 p-2 rounded-xl transition-all -mx-2 text-left"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  kr.is_done
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15'
                    : 'border-[var(--color-outline-variant)] group-hover/kr:border-[var(--color-primary)]/60'
                }`}>
                  {kr.is_done && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <polyline points="1.5,5 4,8 8.5,2" stroke="var(--color-primary)" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round"
                        strokeDasharray="15" strokeDashoffset="15" className="svg-stroke-draw" />
                    </svg>
                  )}
                </div>
                <span className={`font-body-md text-[14px] transition-all ${
                  kr.is_done
                    ? 'text-[var(--color-outline)] line-through decoration-[var(--color-outline)]/50'
                    : 'text-[var(--color-on-surface-variant)] group-hover/kr:text-[var(--color-on-surface)]'
                }`}>
                  {kr.text}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Expand toggle + delete */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-outline-variant)]/10">
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(e => !e); onSelect(); }}
              className="font-label-sm text-[11px] text-[var(--color-outline)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5 uppercase tracking-widest"
            >
              <span className="material-symbols-outlined text-[14px]">{expanded ? 'expand_less' : 'expand_more'}</span>
              {expanded ? 'Collapse' : 'Key Results'}
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); onAiBreakdown(goal); }}
              className="font-label-sm text-[11px] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5 uppercase tracking-widest"
            >
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              Break Down
            </button>
          </div>
          
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(goal.id); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Milestone node ─────────────────────────────────────────
function MilestoneNode({
  m,
  onDelete,
  onToggleStatus,
}: {
  m: Milestone;
  onDelete: () => void;
  onToggleStatus: () => void;
}) {
  const isDone   = m.status === 'done';
  const isActive = m.status === 'active';

  return (
    <div className="relative group/ms">
      {/* Node dot button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
        title="Toggle status"
        className={`absolute -left-[33px] top-1.5 flex items-center justify-center cursor-pointer transition-all hover:scale-110 z-10 ${
          isDone   ? 'w-4 h-4 rounded-full bg-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/15 border-0' :
          isActive ? 'w-6 h-6 rounded-full bg-[var(--color-background)] border-2 border-[var(--color-secondary)]' :
                     'w-3 h-3 rounded-full bg-[var(--color-surface-container-high)] border-2 border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]'
        }`}
      >
        {isActive && (
          <>
            <div className="w-2.5 h-2.5 bg-[var(--color-secondary)] rounded-full animate-ping absolute" />
            <div className="w-2 h-2 bg-[var(--color-secondary)] rounded-full relative z-10" style={{ boxShadow: '0 0 10px rgba(90,218,206,1)' }} />
          </>
        )}
        {isDone && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <polyline points="1,4 3,6.5 7,1.5" stroke="var(--color-on-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="pl-2 pb-8">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <span className={`font-label-sm text-[10px] uppercase tracking-[0.2em] font-bold block mb-1 ${
              isDone ? 'text-[var(--color-primary)]' : isActive ? 'text-[var(--color-secondary)]' : 'text-[var(--color-outline)]'
            }`}>
              {m.quarter} · {m.date}
            </span>
            <h4 className={`font-title-md text-[16px] flex items-center gap-2 flex-wrap ${isActive || isDone ? 'text-[var(--color-on-surface)] font-bold' : 'text-[var(--color-on-surface-variant)]'}`}>
              {m.title}
              {isActive && (
                <span className="px-2 py-0.5 bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] text-[8px] rounded uppercase font-bold border border-[var(--color-secondary)]/20 animate-pulse">
                  In Progress
                </span>
              )}
              {isDone && (
                <span className="px-2 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[8px] rounded uppercase font-bold border border-[var(--color-primary)]/20">
                  Completed
                </span>
              )}
            </h4>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete Milestone"
            className="opacity-0 group-hover/ms:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
          >
            <span className="material-symbols-outlined text-[15px]">delete</span>
          </button>
        </div>
        <p className={`font-body-md text-[13px] mt-1 leading-relaxed ${
          isDone || isActive ? 'text-[var(--color-on-surface-variant)] opacity-70' : 'text-[var(--color-outline)]'
        }`}>
          {m.description}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export function GoalsPage() {
  const { showToast } = useToast();
  const [goals, setGoals]           = useState<Goal[]>([]);
  const [activeGoalId, setActiveGoalId] = useState<string | number | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [showAddGoal, setShowAdd]   = useState(false);
  const [loading, setLoading]       = useState(true);

  // AI Breakdown states
  const [breakdownGoal, setBreakdownGoal] = useState<Goal | null>(null);
  const [breakdownSubtasks, setBreakdownSubtasks] = useState<SubtaskBreakdown[]>([]);
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  

  // New goal form
  const [newTitle, setNewTitle]       = useState('');
  const [newDesc, setNewDesc]         = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newKRs, setNewKRs]           = useState(['', '']);
  const [newDue, setNewDue]           = useState('');

  // New Milestone Form States
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const [msDesc, setMsDesc] = useState('');
  const [msQuarter, setMsQuarter] = useState('Q1');
  const [msDate, setMsDate] = useState('');
  const [msStatus, setMsStatus] = useState<'upcoming' | 'active' | 'done'>('upcoming');

  useEffect(() => {
    loadGoals(true);
  }, []);

  const loadGoals = async (shouldSelectFirst = false) => {
    try {
      const data = await fetchGoals();
      setGoals(data || []);
      if (data && data.length > 0 && (activeGoalId === null || shouldSelectFirst)) {
        setActiveGoalId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to load goals', e);
      showToast('Failed to load goals', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMilestones = async (goalId: string | number) => {
    setLoadingMilestones(true);
    try {
      const data = await fetchMilestones(goalId);
      setMilestones(data || []);
    } catch (e) {
      console.error('Failed to load milestones', e);
    } finally {
      setLoadingMilestones(false);
    }
  };

  useEffect(() => {
    if (activeGoalId) {
      loadMilestones(activeGoalId);
    } else {
      setMilestones([]);
    }
  }, [activeGoalId]);

  const handleToggleKR = async (goalId: string | number, krId: string | number) => {
    // Optimistic UI update
    setGoals(gs => gs.map(g => g.id !== goalId ? g : {
      ...g,
      key_results: (g.key_results || []).map(k => k.id !== krId ? k : { ...k, is_done: !k.is_done }),
      progress: Math.round(
        (g.key_results || []).map(k => k.id !== krId ? k : { ...k, is_done: !k.is_done })
          .filter(k => k.is_done).length /
        (g.key_results?.length || 1) * 100
      ),
    }));

    try {
      await toggleKeyResult(goalId, krId);
      // Reload to ensure sync
      loadGoals();
    } catch (e) {
      console.error('Failed to toggle key result', e);
      loadGoals(); // Revert
    }
  };

  const handleDeleteGoal = async (id: string | number) => {
    try {
      setGoals(gs => gs.filter(g => g.id !== id)); // Optimistic
      if (activeGoalId === id) {
        setActiveGoalId(null);
      }
      await deleteGoal(id);
      showToast('Goal deleted successfully', 'success');
      loadGoals(true);
    } catch (e) {
      console.error('Failed to delete goal', e);
      loadGoals(); // Revert
      showToast('Failed to delete goal', 'error');
    }
  };

  const handleAddGoal = async () => {
    if (!newTitle.trim()) return;
    const krs = newKRs.filter(k => k.trim());
    
    try {
      const created = await createGoal({
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        due_date: newDue || 'Ongoing',
        key_results: krs.length > 0 ? krs : ['Define key results']
      });
      setGoals(gs => [created, ...gs]);
      setActiveGoalId(created.id);
      
      setNewTitle(''); setNewDesc(''); setNewKRs(['', '']); setNewPriority('medium'); setNewDue('');
      setShowAdd(false);
      showToast('Goal created successfully', 'success');
    } catch (e) {
      console.error('Failed to create goal', e);
      showToast('Failed to create goal', 'error');
    }
  };

  const handleAiBreakdown = async (goal: Goal) => {
    setBreakdownGoal(goal);
    setIsBreakingDown(true);
    setBreakdownSubtasks([]);
    setErrorMsg('');

    try {
      const data = await aiBreakDownGoal(Number(goal.id));
      setBreakdownSubtasks(data || []);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to generate breakdown. Please try again.');
      showToast('AI Breakdown failed', 'error');
    } finally {
      setIsBreakingDown(false);
    }
  };

  const handleAddAsKeyResult = async (text: string) => {
    if (!breakdownGoal) return;
    try {
      await createKeyResult(breakdownGoal.id, text);
      await loadGoals();
      setBreakdownSubtasks(prev => prev.filter(sub => sub.title !== text));
      showToast('Key Result added', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to add key result', 'error');
    }
  };

  const handleAddAllAsKeyResults = async () => {
    if (!breakdownGoal) return;
    try {
      await Promise.all(breakdownSubtasks.map(sub => createKeyResult(breakdownGoal.id, sub.title)));
      await loadGoals();
      setBreakdownGoal(null);
      showToast('All Key Results added', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to add key results', 'error');
    }
  };

  const handleToggleMilestoneStatus = async (m: Milestone) => {
    if (!activeGoalId) return;
    const nextStatusMap: Record<'upcoming' | 'active' | 'done', 'upcoming' | 'active' | 'done'> = {
      upcoming: 'active',
      active: 'done',
      done: 'upcoming',
    };
    const nextStatus = nextStatusMap[m.status] || 'upcoming';
    try {
      await updateMilestone(activeGoalId, m.id, { status: nextStatus });
      showToast(`Milestone status updated to ${nextStatus}`, 'success');
      loadMilestones(activeGoalId);
    } catch (e) {
      console.error('Failed to update milestone status', e);
      showToast('Failed to update milestone status', 'error');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string | number) => {
    if (!activeGoalId) return;
    try {
      await deleteMilestone(activeGoalId, milestoneId);
      showToast('Milestone deleted successfully', 'success');
      loadMilestones(activeGoalId);
    } catch (e) {
      console.error('Failed to delete milestone', e);
      showToast('Failed to delete milestone', 'error');
    }
  };

  const handleAddMilestone = async () => {
    if (!activeGoalId) {
      showToast('Please select a goal first', 'error');
      return;
    }
    if (!msTitle.trim()) {
      showToast('Milestone title is required', 'error');
      return;
    }
    try {
      await createMilestone(activeGoalId, {
        title: msTitle.trim(),
        description: msDesc.trim(),
        quarter: msQuarter,
        date: msDate.trim() || 'Ongoing',
        status: msStatus,
      });
      showToast('Milestone added successfully', 'success');
      setMsTitle('');
      setMsDesc('');
      setMsDate('');
      setMsStatus('upcoming');
      setShowAddMilestone(false);
      loadMilestones(activeGoalId);
    } catch (e) {
      console.error('Failed to create milestone', e);
      showToast('Failed to create milestone', 'error');
    }
  };

  // Overall stats
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length) : 0;
  const highPriority = goals.filter(g => g.priority === 'high').length;

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar w-full page-enter">
      {/* Ambient */}
      <div className="fixed top-[10%] left-[5%] w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-[20%] right-[10%] w-[500px] h-[500px] bg-[var(--color-secondary)]/4 rounded-full blur-[160px] pointer-events-none -z-10" />

      <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-8 pb-24 flex flex-col gap-8">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="font-display-lg text-[clamp(28px,5vw,48px)] text-[var(--color-on-surface)] mb-2 tracking-tight leading-none">
              Goals &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">
                Milestones
              </span>
            </h1>
            <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)] opacity-70 max-w-xl">
              Execute your vision with precision. Track key objectives and unblock critical path milestones.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(v => !v)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-label-sm text-label-sm uppercase tracking-widest transition-all press-scale shrink-0 ${
              showAddGoal
                ? 'bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface-variant)]'
                : 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[0_0_20px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{showAddGoal ? 'close' : 'add'}</span>
            {showAddGoal ? 'Cancel' : 'New Goal'}
          </button>
        </div>

        {/* ── Summary row ────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Goals', value: goals.length, icon: 'flag', color: 'var(--color-primary)' },
            { label: 'Avg Progress', value: `${avgProgress}%`, icon: 'trending_up', color: 'var(--color-secondary)' },
            { label: 'High Priority', value: highPriority, icon: 'priority_high', color: 'var(--color-error)' },
          ].map(stat => (
            <div key={stat.label} className="glass-panel rounded-xl p-4 flex flex-col items-center gap-1.5 text-center">
              <span className="material-symbols-outlined text-[22px]" style={{ color: stat.color }}>{stat.icon}</span>
              <span className="font-display-lg text-[24px] font-bold text-[var(--color-on-surface)]">{stat.value}</span>
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── Add goal form ──────────────────────────────── */}
        {showAddGoal && (
          <div className="glass-panel rounded-2xl p-6 anim-fade-up">
            <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] mb-5">New Goal</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-2">Title *</label>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Goal title…"
                    className="w-full bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/40 rounded-xl px-4 py-3 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-outline)]" />
                </div>
                <div>
                  <label className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-2">Due</label>
                  <input value={newDue} onChange={e => setNewDue(e.target.value)} placeholder="e.g. Q3 2025"
                    className="w-full bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/40 rounded-xl px-4 py-3 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-outline)]" />
                </div>
              </div>
              <div>
                <label className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-2">Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} placeholder="What does success look like?"
                  className="w-full bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/40 rounded-xl px-4 py-3 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-outline)] resize-none" />
              </div>
              <div>
                <label className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-2">Priority</label>
                <div className="flex gap-2">
                  {(['high', 'medium', 'low'] as Priority[]).map(p => (
                    <button key={p} onClick={() => setNewPriority(p)}
                      className={`px-4 py-2 rounded-full font-label-sm text-[11px] uppercase tracking-widest border transition-all press-scale ${newPriority === p ? 'scale-105' : 'opacity-50'}`}
                      style={{ color: PRIORITY_META[p].color, backgroundColor: newPriority === p ? PRIORITY_META[p].bg : 'transparent', borderColor: PRIORITY_META[p].border }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-2">Key Results</label>
                {newKRs.map((kr, i) => (
                  <input key={i} value={kr} onChange={e => setNewKRs(ks => ks.map((k, j) => j === i ? e.target.value : k))}
                    placeholder={`Key result ${i + 1}…`}
                    className="w-full bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/40 rounded-xl px-4 py-2.5 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-outline)] mb-2" />
                ))}
                <button onClick={() => setNewKRs(ks => [...ks, ''])}
                  className="font-label-sm text-[11px] text-[var(--color-primary)] hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">add</span> Add key result
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl border border-[var(--color-outline-variant)]/40 text-[var(--color-on-surface-variant)] font-label-sm text-label-sm">Cancel</button>
                <button onClick={handleAddGoal} disabled={!newTitle.trim()}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] font-label-sm text-label-sm disabled:opacity-40 shadow-[0_0_15px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] transition-all">
                  Create Goal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Main content grid ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* OKR list */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--color-secondary)] text-[20px]">track_changes</span>
              OKRs
            </h3>
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-32 bg-[var(--color-surface-container-low)] rounded-2xl"></div>
                <div className="h-32 bg-[var(--color-surface-container-low)] rounded-2xl"></div>
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-[48px] text-[var(--color-outline)]">rocket_launch</span>
                <p className="font-body-md text-[var(--color-on-surface-variant)]">No goals yet. Create your first objective.</p>
              </div>
            ) : (
              goals.map((goal, idx) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  idx={idx}
                  isActive={activeGoalId === goal.id}
                  onSelect={() => setActiveGoalId(goal.id)}
                  onToggleKR={handleToggleKR}
                  onDelete={handleDeleteGoal}
                  onAiBreakdown={handleAiBreakdown}
                />
              ))
            )}
          </div>

          {/* Milestone roadmap */}
          <div className="lg:col-span-5 flex flex-col gap-4 lg:mt-0 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--color-primary)] text-[20px]">flag</span>
                Milestone Roadmap
              </h3>
              {activeGoalId && (
                <button
                  onClick={() => setShowAddMilestone(v => !v)}
                  className="font-label-sm text-[10px] text-[var(--color-primary)] hover:text-[var(--color-secondary)] uppercase tracking-wider flex items-center gap-1 transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {showAddMilestone ? 'close' : 'add_circle'}
                  </span>
                  {showAddMilestone ? 'Cancel' : 'Add Milestone'}
                </button>
              )}
            </div>

            <div className="bg-[var(--color-surface-container-low)]/60 backdrop-blur-xl border border-[var(--color-outline-variant)]/15 rounded-2xl p-6 flex flex-col gap-5">
              {/* Active Goal context subhead */}
              {activeGoalId && (
                <div className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest border-b border-[var(--color-outline-variant)]/10 pb-3 -mt-2">
                  Goal: <span className="text-[var(--color-primary)] font-bold">{goals.find(g => g.id === activeGoalId)?.title}</span>
                </div>
              )}

              {/* Add Milestone Form */}
              {showAddMilestone && activeGoalId && (
                <div className="bg-[var(--color-surface-container)]/40 border border-[var(--color-outline-variant)]/20 rounded-xl p-4 flex flex-col gap-3.5 anim-fade-up">
                  <h4 className="font-title-sm text-[13px] text-[var(--color-on-surface)] uppercase tracking-wider font-bold">New Milestone</h4>
                  
                  <div className="flex flex-col gap-2">
                    <input 
                      value={msTitle} 
                      onChange={e => setMsTitle(e.target.value)} 
                      placeholder="Title *"
                      className="w-full bg-[var(--color-surface-container-high)]/60 border border-[var(--color-outline-variant)]/30 rounded-lg px-3 py-2 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]/50 transition-colors"
                    />
                    <textarea 
                      value={msDesc} 
                      onChange={e => setMsDesc(e.target.value)} 
                      placeholder="Description"
                      rows={2}
                      className="w-full bg-[var(--color-surface-container-high)]/60 border border-[var(--color-outline-variant)]/30 rounded-lg px-3 py-2 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]/50 transition-colors resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-label-sm text-[9px] text-[var(--color-outline)] uppercase tracking-widest block mb-1">Quarter</label>
                      <select 
                        value={msQuarter} 
                        onChange={e => setMsQuarter(e.target.value)}
                        className="w-full bg-[var(--color-surface-container-high)]/60 border border-[var(--color-outline-variant)]/30 rounded-lg px-2 py-2 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]/50 transition-colors"
                      >
                        {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                          <option key={q} value={q} className="bg-[var(--color-surface-container-high)]">{q}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-label-sm text-[9px] text-[var(--color-outline)] uppercase tracking-widest block mb-1">Target Date</label>
                      <input 
                        value={msDate} 
                        onChange={e => setMsDate(e.target.value)} 
                        placeholder="e.g. June 30"
                        className="w-full bg-[var(--color-surface-container-high)]/60 border border-[var(--color-outline-variant)]/30 rounded-lg px-3 py-2 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-label-sm text-[9px] text-[var(--color-outline)] uppercase tracking-widest block mb-1">Status</label>
                    <div className="flex gap-2">
                      {(['upcoming', 'active', 'done'] as const).map(status => (
                        <button
                          key={status}
                          onClick={() => setMsStatus(status)}
                          type="button"
                          className={`flex-1 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border transition-all ${
                            msStatus === status 
                              ? 'bg-[var(--color-primary)] text-black border-transparent' 
                              : 'bg-transparent text-[var(--color-outline)] border-[var(--color-outline-variant)]/30 hover:border-[var(--color-outline-variant)]'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={() => setShowAddMilestone(false)} 
                      type="button"
                      className="flex-1 py-2 text-[11px] uppercase tracking-wider border border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface-variant)] rounded-lg hover:bg-[var(--color-surface-container-high)]/30 transition-all font-bold"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleAddMilestone}
                      disabled={!msTitle.trim()}
                      type="button"
                      className="flex-1 py-2 bg-[var(--color-primary)] text-black text-[11px] uppercase tracking-wider rounded-lg hover:scale-[1.02] disabled:opacity-40 transition-all font-bold"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Milestones list or empty states */}
              {!activeGoalId ? (
                <div className="text-center py-12 flex flex-col items-center gap-3 text-[var(--color-outline)]">
                  <span className="material-symbols-outlined text-[32px] opacity-40">ads_click</span>
                  <p className="font-body-md text-xs leading-relaxed max-w-[200px]">Select a goal card to view and manage milestones.</p>
                </div>
              ) : loadingMilestones ? (
                <div className="space-y-6 pl-6 relative ml-3 border-l border-[var(--color-outline-variant)]/10 animate-pulse">
                  <div className="h-16 bg-[var(--color-surface-container-high)]/30 rounded-xl"></div>
                  <div className="h-16 bg-[var(--color-surface-container-high)]/30 rounded-xl"></div>
                </div>
              ) : milestones.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-3 text-[var(--color-outline)]">
                  <span className="material-symbols-outlined text-[32px] opacity-40">flag_circle</span>
                  <p className="font-body-md text-xs leading-relaxed max-w-[200px]">No milestones defined for this goal yet.</p>
                  <button
                    onClick={() => setShowAddMilestone(true)}
                    className="mt-1 px-4 py-2 bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black font-label-sm text-[10px] uppercase tracking-widest rounded-lg transition-all"
                  >
                    Add First Milestone
                  </button>
                </div>
              ) : (
                <div className="relative pl-6 border-l border-[var(--color-outline-variant)]/20 ml-3">
                  {milestones.map(m => (
                    <MilestoneNode 
                      key={m.id} 
                      m={m} 
                      onDelete={() => handleDeleteMilestone(m.id)}
                      onToggleStatus={() => handleToggleMilestoneStatus(m)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* AI Breakdown Modal */}
      <Modal 
        open={!!breakdownGoal} 
        onClose={() => setBreakdownGoal(null)} 
        title="AI Goal Breakdown"
      >
        <div className="flex flex-col gap-5">
          <p className="font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest -mt-2">
            Target Goal: <span className="text-[var(--color-primary)] font-bold">{breakdownGoal?.title}</span>
          </p>

          {/* Content */}
          <div className="overflow-y-auto max-h-[350px] pr-1 space-y-4 no-scrollbar">
            {isBreakingDown && (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
                <p className="font-body-md text-sm text-[var(--color-outline)] animate-pulse">Gemini is analyzing and parsing goal architecture...</p>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-xl text-center text-sm text-[var(--color-error)]">
                {errorMsg}
              </div>
            )}

            {!isBreakingDown && !errorMsg && breakdownSubtasks.map((sub, i) => (
              <div 
                key={i} 
                className="bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/10 hover:border-[var(--color-primary)]/30 p-4 rounded-xl flex items-start gap-4 transition-all duration-300 anim-fade-up card-hover"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex-1">
                  <h4 className="font-title-md text-[15px] text-[var(--color-on-surface)] font-bold">{sub.title}</h4>
                  <p className="font-body-md text-xs text-[var(--color-on-surface-variant)] opacity-70 mt-1 leading-relaxed">{sub.description}</p>
                </div>
                <button
                  onClick={() => handleAddAsKeyResult(sub.title)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-black font-label-sm text-[10px] uppercase tracking-wider rounded-lg border border-[var(--color-primary)]/20 hover:scale-105 transition-all"
                >
                  <span className="material-symbols-outlined text-[12px] font-bold">add</span>
                  Key Result
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-3 border-t border-[var(--color-outline-variant)]/10">
            <button 
              onClick={() => setBreakdownGoal(null)} 
              className="flex-1 py-3 border border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface-variant)] font-label-sm text-label-sm rounded-xl hover:bg-[var(--color-surface-container-high)]/30 transition-all"
            >
              Close
            </button>
            {!isBreakingDown && !errorMsg && breakdownSubtasks.length > 0 && (
              <button 
                onClick={handleAddAllAsKeyResults}
                className="flex-1 py-3 bg-[var(--color-primary)] text-black font-label-sm text-label-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_15px_rgba(210,187,255,0.4)]"
              >
                Add All
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
