import { useState, useEffect } from 'react';
import {
  fetchGoals, createGoal, deleteGoal, toggleKeyResult, aiBreakDownGoal, createKeyResult,
  fetchMilestones, createMilestone, deleteMilestone, updateMilestone,
  type Goal, type SubtaskBreakdown, type Milestone
} from '../api';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { SkeletonCard, SkeletonRow } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { useAI } from '../context/AIContext';
import { RadialProgress } from '../components/ui/RadialProgress';

type Priority = 'high' | 'medium' | 'low';

const PRIORITY_META: Record<Priority, { label: string; bg: string; text: string }> = {
  high:   { label: 'P1', bg: 'bg-[var(--color-primary)]', text: 'text-black' },
  medium: { label: 'P2', bg: 'bg-[var(--color-secondary)]', text: 'text-black' },
  low:    { label: 'P3', bg: 'bg-[var(--color-outline)]', text: 'text-white' },
};

function formatDate(dateStr?: string) {
  if (!dateStr || dateStr === 'Ongoing') return 'Ongoing';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function GoalCard({
  goal, idx, isActive, onSelect, onToggleKR, onDelete, onAiBreakdown,
}: {
  goal: Goal; idx: number; isActive: boolean; onSelect: () => void;
  onToggleKR: (goalId: string | number, krId: string | number) => void;
  onDelete: (id: string | number) => void;
  onAiBreakdown: (goal: Goal) => void;
}) {
  const { aiEnabled, aiLimit } = useAI();
  const [expanded, setExpanded] = useState(idx === 0);
  const pm = PRIORITY_META[goal.priority] || PRIORITY_META['medium'];
  const keyResults = goal.key_results || [];

  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  return (
    <div
      onClick={onSelect}
      className={`glass-card rounded-2xl transition-all duration-300 cursor-pointer relative overflow-hidden group border-[rgba(255,255,255,0.05)] shadow-md
        ${isActive 
          ? 'border-[var(--color-primary)]/50 shadow-[0_0_20px_rgba(210,187,255,0.1)] bg-white/[0.015]' 
          : 'hover:border-[rgba(255,255,255,0.12)] hover:bg-white/[0.005]'
        }
      `}
    >
      {isActive && (
        <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-[var(--color-primary)] rounded-r-full glow-shadow-primary" />
      )}
      
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`font-mono text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-widest font-bold ${pm.bg === 'bg-[var(--color-primary)]' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20' : pm.bg === 'bg-[var(--color-secondary)]' ? 'bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border border-[var(--color-secondary)]/20' : 'bg-white/[0.04] text-[var(--color-outline)] border border-white/[0.08]'} `}>
                {pm.label}
              </span>
              <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest font-bold">
                ETA // {formatDate(goal.due_date)}
              </span>
            </div>
            <h4
              className={`text-[16px] font-semibold leading-snug cursor-pointer transition-colors ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)]'}`}
              onClick={(e) => { e.stopPropagation(); setExpanded(e => !e); onSelect(); }}
            >
              {goal.title}
            </h4>
            <p className="text-[13px] text-[var(--color-outline)] mt-1.5 line-clamp-2 leading-relaxed">{goal.description}</p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            <RadialProgress
              value={goal.progress}
              size={56}
              strokeWidth={5}
              color={isActive ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.4)'}
              animate
            />
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(goal.id); }}
              className="opacity-0 group-hover:opacity-100 transition-all w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-outline)] hover:text-red-400 hover:bg-red-400/10 mt-2"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-5 border-t border-[rgba(255,255,255,0.04)] pt-4 space-y-1">
            <div className="flex justify-between items-center mb-3">
              <p className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest font-bold">
                KEY RESULTS // {keyResults.filter(k => k.is_done).length}/{keyResults.length}
              </p>
              {aiEnabled && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAiBreakdown(goal); }}
                  className="font-mono text-[9px] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5 uppercase tracking-widest font-bold"
                >
                  <span className="material-symbols-outlined text-[12px] animate-pulse">auto_awesome</span>
                  AI Breakdown {aiLimit && `(${aiLimit.remaining}/${aiLimit.burst})`}
                </button>
              )}
            </div>
            
            <div className="space-y-1.5">
              {keyResults.map(kr => (
                <button
                  key={kr.id}
                  onClick={(e) => { e.stopPropagation(); onToggleKR(goal.id, kr.id); }}
                  className="w-full flex items-start gap-3 group/kr hover:bg-white/[0.015] rounded-xl p-2.5 transition-colors text-left border border-transparent hover:border-[rgba(255,255,255,0.04)]"
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-300 relative overflow-hidden mt-0.5
                    ${kr.is_done
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[0_0_8px_rgba(210,187,255,0.2)]'
                      : 'border-[rgba(255,255,255,0.15)] group-hover/kr:border-[var(--color-primary)] group-hover/kr:bg-[var(--color-primary)]/5 hover:scale-105 active:scale-95 text-transparent hover:text-[var(--color-primary)]/40'
                    }
                  `}>
                    {kr.is_done ? (
                      <span className="material-symbols-outlined text-[12px] anim-check-pop" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    ) : (
                      <span className="material-symbols-outlined text-[12px] opacity-0 group-hover/kr:opacity-100 transition-opacity">check</span>
                    )}
                  </div>
                  <span className={`font-body-md text-[14px] transition-all leading-snug ${
                    kr.is_done
                      ? 'text-[var(--color-outline)] line-through'
                      : 'text-[var(--color-on-surface)] opacity-85 group-hover/kr:text-[var(--color-on-surface)]'
                  }`}>
                    {kr.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MilestoneNode({ m, onDelete, onToggleStatus }: { m: Milestone; onDelete: () => void; onToggleStatus: () => void; }) {
  const isDone   = m.status === 'done';
  const isActive = m.status === 'active';

  return (
    <div className="relative group/ms flex">
      {/* Timeline track and node */}
      <div className="w-12 shrink-0 flex flex-col items-center relative">
        <div className="absolute top-8 bottom-[-24px] w-[1px] bg-white/10" />
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
          className={`w-6 h-6 mt-1 flex items-center justify-center rounded-md border z-10 transition-all duration-300 relative overflow-hidden ${
            isDone ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[0_0_8px_rgba(210,187,255,0.2)]' :
            isActive ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/15 text-[var(--color-secondary)] shadow-[0_0_8px_rgba(90,218,206,0.18)]' :
            'bg-white/[0.01] border-[rgba(255,255,255,0.15)] text-transparent hover:border-[var(--color-primary)] hover:scale-105 active:scale-95'
          }`}
        >
          {isDone && <span className="material-symbols-outlined text-[14px]">check</span>}
          {isActive && <div className="w-1.5 h-1.5 bg-[var(--color-secondary)] rounded-full animate-pulse shadow-[0_0_6px_rgba(90,218,206,0.5)]" />}
        </button>
      </div>

      <div className="flex-1 pb-6 pr-4">
        <div className="p-4 glass-card rounded-xl border-[rgba(255,255,255,0.05)] shadow-md relative group-hover/ms:border-[rgba(255,255,255,0.1)] group-hover/ms:shadow-lg transition-all duration-300 overflow-hidden bg-white/[0.005]">
          {isActive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--color-secondary)] glow-shadow-secondary" />}
          
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className={`font-mono text-[9px] uppercase tracking-widest font-bold block mb-1.5 ${
                isDone ? 'text-[var(--color-outline)]' : isActive ? 'text-[var(--color-secondary)]' : 'text-[var(--color-outline)]'
              }`}>
                {m.quarter} · {formatDate(m.date)}
              </span>
              <h4 className={`text-[15px] font-semibold ${isActive ? 'text-[var(--color-on-surface)]' : isDone ? 'text-[var(--color-outline)] line-through' : 'text-[var(--color-on-surface)] opacity-75'}`}>
                {m.title}
              </h4>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover/ms:opacity-100 transition-all text-[var(--color-outline)] hover:text-red-400 w-6 h-6 rounded flex items-center justify-center hover:bg-red-400/10"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
          <p className={`text-[13px] leading-relaxed ${isDone ? 'text-[var(--color-outline)]' : 'text-[var(--color-on-surface)] opacity-60'}`}>
            {m.description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function GoalsPage() {
  const { showToast } = useToast();
  const { aiEnabled, aiLimit, refreshLimit } = useAI();
  const [goals, setGoals]           = useState<Goal[]>([]);
  const [activeGoalId, setActiveGoalId] = useState<string | number | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [showAddGoal, setShowAdd]   = useState(false);
  const [loading, setLoading]       = useState(true);

  const [breakdownGoal, setBreakdownGoal] = useState<Goal | null>(null);
  const [breakdownSubtasks, setBreakdownSubtasks] = useState<SubtaskBreakdown[]>([]);
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [newTitle, setNewTitle]       = useState('');
  const [newDesc, setNewDesc]         = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newKRs, setNewKRs]           = useState(['', '']);
  const [newDue, setNewDue]           = useState('');

  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const [msDesc, setMsDesc] = useState('');
  const [msQuarter, setMsQuarter] = useState('Q1');
  const [msDate, setMsDate] = useState('');
  const [msStatus, setMsStatus] = useState<'upcoming' | 'active' | 'done'>('upcoming');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);
  const [deleteMilestoneConfirmId, setDeleteMilestoneConfirmId] = useState<string | number | null>(null);

  useEffect(() => { loadGoals(true); }, []);

  const loadGoals = async (shouldSelectFirst = false) => {
    try {
      const data = await fetchGoals();
      setGoals(data || []);
      if (data && data.length > 0 && (activeGoalId === null || shouldSelectFirst)) {
        setActiveGoalId(data[0].id);
      }
    } catch (e) {
      showToast('Failed to load goals', 'error');
    } finally { setLoading(false); }
  };

  const loadMilestones = async (goalId: string | number) => {
    setLoadingMilestones(true);
    try {
      const data = await fetchMilestones(goalId);
      setMilestones(data || []);
    } finally { setLoadingMilestones(false); }
  };

  useEffect(() => {
    if (activeGoalId) loadMilestones(activeGoalId);
    else setMilestones([]);
  }, [activeGoalId]);

  const handleToggleKR = async (goalId: string | number, krId: string | number) => {
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
      loadGoals();
    } catch (e) { loadGoals(); }
  };

  const handleDeleteGoal = (id: string | number) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteGoal = async (id: string | number) => {
    try {
      setGoals(gs => gs.filter(g => g.id !== id));
      if (activeGoalId === id) setActiveGoalId(null);
      await deleteGoal(id);
      showToast('Goal deleted', 'success');
      loadGoals(true);
    } catch (e) { loadGoals(); showToast('Failed to delete', 'error'); }
  };

  const handleAddGoal = async () => {
    if (!newTitle.trim()) return;
    const krs = newKRs.filter(k => k.trim());
    try {
      const created = await createGoal({
        title: newTitle.trim(), description: newDesc.trim(), priority: newPriority,
        due_date: newDue || '', key_results: krs.length > 0 ? krs : ['Define key results']
      });
      setGoals(gs => [created, ...gs]);
      setActiveGoalId(created.id);
      setNewTitle(''); setNewDesc(''); setNewKRs(['', '']); setNewPriority('medium'); setNewDue('');
      setShowAdd(false);
    } catch (e) { showToast('Failed to create goal', 'error'); }
  };

  const handleAiBreakdown = async (goal: Goal) => {
    setBreakdownGoal(goal); setIsBreakingDown(true); setBreakdownSubtasks([]); setErrorMsg('');
    try {
      const data = await aiBreakDownGoal(Number(goal.id));
      setBreakdownSubtasks(data || []);
    } catch (e: any) {
      setErrorMsg(e.message || 'Breakdown failed.');
      showToast('AI Breakdown failed', 'error');
    } finally {
      setIsBreakingDown(false);
      refreshLimit();
    }
  };

  const handleAddAsKeyResult = async (text: string) => {
    if (!breakdownGoal) return;
    try {
      await createKeyResult(breakdownGoal.id, text);
      await loadGoals();
      setBreakdownSubtasks(prev => prev.filter(sub => sub.title !== text));
      showToast('Key Result added', 'success');
    } catch (e) { showToast('Failed to add key result', 'error'); }
  };

  const handleAddAllAsKeyResults = async () => {
    if (!breakdownGoal) return;
    try {
      await Promise.all(breakdownSubtasks.map(sub => createKeyResult(breakdownGoal.id, sub.title)));
      await loadGoals();
      setBreakdownGoal(null);
      showToast('All Key Results added', 'success');
    } catch (e) { showToast('Failed to add key results', 'error'); }
  };

  const handleToggleMilestoneStatus = async (m: Milestone) => {
    if (!activeGoalId) return;
    const nextStatus = m.status === 'upcoming' ? 'active' : m.status === 'active' ? 'done' : 'upcoming';
    try {
      await updateMilestone(activeGoalId, m.id, { status: nextStatus });
      loadMilestones(activeGoalId);
    } catch (e) { showToast('Update failed', 'error'); }
  };

  const handleDeleteMilestone = (id: string | number) => {
    setDeleteMilestoneConfirmId(id);
  };

  const confirmDeleteMilestone = async (id: string | number) => {
    if (!activeGoalId) return;
    try {
      await deleteMilestone(activeGoalId, id);
      loadMilestones(activeGoalId);
      showToast('Milestone deleted', 'success');
    } catch (e) { showToast('Failed to delete milestone', 'error'); }
  };

  const handleAddMilestone = async () => {
    if (!activeGoalId || !msTitle.trim()) return;
    try {
      await createMilestone(activeGoalId, {
        title: msTitle.trim(), description: msDesc.trim(), quarter: msQuarter,
        date: msDate.trim() || '', status: msStatus,
      });
      setMsTitle(''); setMsDesc(''); setMsDate(''); setMsStatus('upcoming'); setShowAddMilestone(false);
      loadMilestones(activeGoalId);
    } catch (e) { showToast('Failed to add milestone', 'error'); }
  };

  const activeGoal = goals.find(g => g.id === activeGoalId);
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length) : 0;
  const highPriority = goals.filter(g => g.priority === 'high').length;

  return (
    <div className="flex-1 overflow-y-auto w-full no-scrollbar relative z-10 pb-24 md:pb-0">
      <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] pt-5 md:pt-8 pb-12 flex flex-col gap-6 relative z-10">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between px-8 py-6 border-b border-[rgba(255,255,255,0.06)] shrink-0 bg-transparent gap-4">
          <div>
            <h2 className="text-[36px] font-black tracking-tighter text-[var(--color-on-surface)] leading-none select-none">
              Strategic Planning
            </h2>
            <p className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-[0.25em] mt-2.5">
              OBJECTIVES & KEY RESULTS // ROADMAP
            </p>
          </div>
          
          <div className="flex gap-6 sm:gap-10 flex-wrap">
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Active Goals</span>
              <span className="font-mono text-[24px] text-[var(--color-on-surface)] font-bold tracking-tight leading-none">{goals.length}</span>
            </div>
            <div className="w-px h-8 bg-[rgba(255,255,255,0.08)] self-center" />
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">High Priority</span>
              <span className="font-mono text-[24px] text-[var(--color-error)] font-bold tracking-tight leading-none">{highPriority}</span>
            </div>
            <div className="w-px h-8 bg-[rgba(255,255,255,0.08)] self-center" />
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Avg Progress</span>
              <span className="font-mono text-[24px] text-[var(--color-primary)] font-bold tracking-tight leading-none">{avgProgress}%</span>
            </div>
            {aiEnabled && aiLimit && (
              <>
                <div className="w-px h-8 bg-[rgba(255,255,255,0.08)] self-center" />
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">AI Limit</span>
                  <span className={`font-mono text-[24px] font-bold tracking-tight leading-none ${aiLimit.remaining === 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-primary)]'}`}>
                    {aiLimit.remaining}/{aiLimit.burst}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* Left Column (OKRs) */}
          <div className="flex-1 flex flex-col glass-card rounded-2xl overflow-hidden min-h-[400px] border-[rgba(255,255,255,0.05)] shadow-lg">
            <div className="flex items-center justify-between p-6 px-8 border-b border-[rgba(255,255,255,0.06)] bg-white/[0.02] z-10 shrink-0">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-primary)] font-bold">
                Objectives & Key Results
              </h3>
              <button
                onClick={() => setShowAdd(v => !v)}
                className="font-mono text-[9px] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] uppercase tracking-widest flex items-center gap-1.5 border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-full hover:bg-white/[0.02] transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">{showAddGoal ? 'close' : 'add'}</span>
                {showAddGoal ? 'Cancel' : 'New Goal'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-6">
              {showAddGoal && (
                <div className="glass-card rounded-2xl p-6 mb-6 border-[var(--color-primary)]/25 shadow-md bg-[var(--color-surface)]/20 anim-fade-up relative">
                  <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-[var(--color-primary)] rounded-r-full glow-shadow-primary" />
                  <h4 className="font-mono text-[10px] text-[var(--color-primary)] uppercase tracking-widest font-bold mb-5">Create New Goal</h4>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="block">
                        <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest block mb-2 font-bold">Title *</span>
                        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-transparent border-b border-[rgba(255,255,255,0.08)] pb-1.5 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-primary)] transition-colors" />
                      </label>
                      <label className="block">
                        <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest block mb-2 font-bold">Target Date</span>
                        <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="w-full bg-transparent border-b border-[rgba(255,255,255,0.08)] pb-1.5 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-primary)] [color-scheme:dark] transition-colors" />
                      </label>
                    </div>
                    <label className="block">
                      <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest block mb-2 font-bold">Description</span>
                      <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} className="w-full bg-transparent border-b border-[rgba(255,255,255,0.08)] pb-1.5 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-primary)] resize-none transition-colors" />
                    </label>
                    <div>
                      <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest block mb-2 font-bold">Priority</span>
                      <div className="flex gap-2">
                        {(['high', 'medium', 'low'] as Priority[]).map(p => (
                          <button type="button" key={p} onClick={() => setNewPriority(p)} className={`px-4 py-1.5 rounded-lg font-mono text-[9px] uppercase tracking-widest font-bold border transition-all ${newPriority === p ? `${PRIORITY_META[p].bg} ${PRIORITY_META[p].text} border-transparent shadow-md` : 'border-[rgba(255,255,255,0.1)] text-[var(--color-outline)] hover:border-[rgba(255,255,255,0.2)]'}`}>{PRIORITY_META[p].label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest block mb-2 font-bold">Key Results</span>
                      {newKRs.map((kr, i) => (
                        <input key={i} value={kr} onChange={e => setNewKRs(ks => ks.map((k, j) => j === i ? e.target.value : k))} placeholder={`Key result ${i + 1}…`} className="w-full bg-transparent border-b border-[rgba(255,255,255,0.08)] pb-1.5 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-primary)] mb-2.5 transition-colors" />
                      ))}
                      <button type="button" onClick={() => setNewKRs(ks => [...ks, ''])} className="font-mono text-[9px] text-[var(--color-primary)] uppercase tracking-widest mt-1.5 flex items-center gap-1 font-bold"><span className="material-symbols-outlined text-[12px]">add</span> Add KR</button>
                    </div>
                    <div className="flex justify-end pt-3 border-t border-[rgba(255,255,255,0.04)]">
                      <button type="button" onClick={handleAddGoal} disabled={!newTitle.trim()} className="px-6 py-2.5 bg-[var(--color-primary)] text-black font-mono text-[10px] font-bold disabled:opacity-30 uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all rounded-xl shadow-[0_0_12px_rgba(210,187,255,0.2)]">Deploy Goal</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4">
                {loading ? (
                  <div className="space-y-4">
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : goals.length === 0 ? (
                  <div className="text-center py-20 opacity-50 font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest font-bold">NO GOALS ESTABLISHED.</div>
                ) : (
                  goals.map((goal, idx) => (
                    <GoalCard key={goal.id} goal={goal} idx={idx} isActive={activeGoalId === goal.id} onSelect={() => setActiveGoalId(goal.id)} onToggleKR={handleToggleKR} onDelete={handleDeleteGoal} onAiBreakdown={handleAiBreakdown} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Milestone Roadmap) */}
          <div className="w-full lg:w-[420px] lg:shrink-0 flex flex-col glass-card rounded-2xl overflow-hidden border-[rgba(255,255,255,0.05)] shadow-lg">
            <div className="flex items-center justify-between p-6 px-8 border-b border-[rgba(255,255,255,0.06)] bg-white/[0.02] z-10 shrink-0">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-secondary)] font-bold">
                Milestone Roadmap
              </h3>
              {activeGoalId && (
                <button
                  onClick={() => setShowAddMilestone(v => !v)}
                  className="font-mono text-[9px] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] uppercase tracking-widest flex items-center gap-1.5 border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-full hover:bg-white/[0.02] transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]">{showAddMilestone ? 'close' : 'add'}</span>
                  {showAddMilestone ? 'Cancel' : 'Add Node'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6">
              {activeGoalId && (
                <div className="mb-8 pl-12 border-b border-[rgba(255,255,255,0.04)] pb-4">
                  <span className="font-mono text-[8px] text-[var(--color-outline)] uppercase tracking-wider block mb-1">Targeting</span>
                  <h4 className="font-title-md text-[16px] text-[var(--color-on-surface)] font-bold leading-snug">{activeGoal?.title}</h4>
                </div>
              )}

              {showAddMilestone && activeGoalId && (
                <div className="glass-card rounded-2xl p-5 mb-8 ml-12 relative border-[rgba(255,255,255,0.05)] bg-[var(--color-surface)]/20 shadow-md anim-fade-up">
                  <div className="absolute -left-12 top-[22px] w-12 h-[1px] bg-white/10" />
                  <h4 className="font-mono text-[10px] text-[var(--color-secondary)] uppercase tracking-widest font-bold mb-4">New Milestone Node</h4>
                  <div className="space-y-4">
                    <input value={msTitle} onChange={e => setMsTitle(e.target.value)} placeholder="Node Title *" className="w-full bg-transparent border-b border-[rgba(255,255,255,0.08)] pb-1.5 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-secondary)] transition-colors" />
                    <textarea value={msDesc} onChange={e => setMsDesc(e.target.value)} placeholder="Description" rows={2} className="w-full bg-transparent border-b border-[rgba(255,255,255,0.08)] pb-1.5 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-secondary)] resize-none transition-colors" />
                    <div className="grid grid-cols-2 gap-4">
                      <select value={msQuarter} onChange={e => setMsQuarter(e.target.value)} className="w-full bg-[var(--color-surface)]/40 border border-[rgba(255,255,255,0.06)] rounded-lg p-2.5 text-[12px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-secondary)] font-bold">
                        {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <option key={q} value={q} className="bg-[var(--color-surface-container)]">{q}</option>)}
                      </select>
                      <input type="date" value={msDate} onChange={e => setMsDate(e.target.value)} className="w-full bg-transparent border-b border-[rgba(255,255,255,0.08)] pb-1.5 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-secondary)] [color-scheme:dark] transition-colors" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      {(['upcoming', 'active', 'done'] as const).map(status => (
                        <button key={status} onClick={() => setMsStatus(status)} type="button" className={`flex-1 py-1 rounded-lg text-[9px] uppercase tracking-widest font-bold border transition-colors ${msStatus === status ? 'bg-[var(--color-secondary)] text-black border-[var(--color-secondary)] shadow-sm' : 'border-[rgba(255,255,255,0.08)] text-[var(--color-outline)] hover:border-[rgba(255,255,255,0.15)]'}`}>{status}</button>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-4 mt-2 border-t border-[rgba(255,255,255,0.04)]">
                      <button onClick={() => setShowAddMilestone(false)} type="button" className="flex-1 py-2 text-[9px] uppercase tracking-widest font-bold text-[var(--color-outline)] hover:text-[var(--color-on-surface)] hover:bg-white/[0.015] rounded-xl active:scale-95 transition-all">Cancel</button>
                      <button onClick={handleAddMilestone} disabled={!msTitle.trim()} type="button" className="flex-1 py-2 bg-[var(--color-secondary)] text-black text-[9px] uppercase tracking-widest font-bold disabled:opacity-30 rounded-xl active:scale-95 transition-all shadow-[0_0_12px_rgba(90,218,206,0.15)]">Save Node</button>
                    </div>
                  </div>
                </div>
              )}

              {!activeGoalId ? (
                <div className="text-center py-20 opacity-50 font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest">AWAITING GOAL SELECTION.</div>
              ) : loadingMilestones ? (
                <div className="space-y-3 pl-12">
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : milestones.length === 0 ? (
                <div className="text-center py-20 opacity-50 font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest font-bold">NO NODES ALLOCATED.</div>
              ) : (
                <div className="flex flex-col">
                  {milestones.map(m => (
                    <MilestoneNode key={m.id} m={m} onDelete={() => handleDeleteMilestone(m.id)} onToggleStatus={() => handleToggleMilestoneStatus(m)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal open={!!breakdownGoal} onClose={() => setBreakdownGoal(null)} title="AI System Breakdown">
        <div className="flex flex-col gap-5">
          <p className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest -mt-2">
            Target: <span className="text-[var(--color-primary)] font-bold">{breakdownGoal?.title}</span>
          </p>
          <div className="overflow-y-auto max-h-[400px] pr-2 space-y-3 no-scrollbar">
            {isBreakingDown && (
              <div className="py-12 flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-white/5 border-t-[var(--color-primary)] rounded-full animate-spin" />
                <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-outline)] animate-pulse">Parsing objective geometry...</p>
              </div>
            )}
            {errorMsg && <div className="p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-center text-[12px] text-[var(--color-error)] rounded-xl">{errorMsg}</div>}
            {!isBreakingDown && !errorMsg && breakdownSubtasks.map((sub, i) => (
              <div key={i} className="glass-card rounded-2xl p-4 flex items-start gap-4 border-[rgba(255,255,255,0.05)] bg-white/[0.01]">
                <div className="flex-1">
                  <h4 className="text-[14px] font-bold text-[var(--color-on-surface)]">{sub.title}</h4>
                  <p className="text-[12px] text-[var(--color-outline)] mt-1">{sub.description}</p>
                </div>
                <button type="button" onClick={() => handleAddAsKeyResult(sub.title)} className="shrink-0 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black font-mono text-[9px] uppercase tracking-widest border border-[var(--color-primary)]/20 transition-all rounded-lg font-bold">+ KR</button>
              </div>
            ))}
          </div>
          <div className="flex gap-4 pt-4 border-t border-[rgba(255,255,255,0.04)]">
            <button type="button" onClick={() => setBreakdownGoal(null)} className="flex-1 py-2.5 border border-[rgba(255,255,255,0.08)] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] font-mono text-[10px] uppercase tracking-widest font-bold rounded-xl active:scale-95 transition-all">Close</button>
            {!isBreakingDown && !errorMsg && breakdownSubtasks.length > 0 && (
              <button type="button" onClick={handleAddAllAsKeyResults} className="flex-1 py-2.5 bg-[var(--color-primary)] text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:brightness-110 rounded-xl active:scale-95 transition-all shadow-[0_0_12px_rgba(210,187,255,0.2)]">Ingest All</button>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId !== null && confirmDeleteGoal(deleteConfirmId)}
        title="Delete Goal"
        description="Are you sure you want to delete this goal? All key results progress will be permanently lost."
        confirmText="Purge"
        cancelText="Keep"
        destructive={true}
      />

      <ConfirmDialog
        open={deleteMilestoneConfirmId !== null}
        onClose={() => setDeleteMilestoneConfirmId(null)}
        onConfirm={() => deleteMilestoneConfirmId !== null && confirmDeleteMilestone(deleteMilestoneConfirmId)}
        title="Delete Milestone"
        description="Are you sure you want to delete this milestone? This action cannot be undone."
        confirmText="Purge"
        cancelText="Keep"
        destructive={true}
      />
    </div>
  );
}