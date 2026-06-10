import { useState, useEffect } from 'react';
import {
  fetchGoals, createGoal, deleteGoal, toggleKeyResult, aiBreakDownGoal, createKeyResult,
  fetchMilestones, createMilestone, deleteMilestone, updateMilestone,
  type Goal, type SubtaskBreakdown, type Milestone
} from '../api';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';

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

function ProgressBar({ pct, colorClass = "bg-[var(--color-primary)]" }: { pct: number, colorClass?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 h-1.5 bg-[var(--color-surface-variant)] overflow-hidden rounded-none">
        <div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] font-bold text-[var(--color-on-surface-variant)] w-8 text-right">{pct}%</span>
    </div>
  );
}

function GoalCard({
  goal, idx, isActive, onSelect, onToggleKR, onDelete, onAiBreakdown,
}: {
  goal: Goal; idx: number; isActive: boolean; onSelect: () => void;
  onToggleKR: (goalId: string | number, krId: string | number) => void;
  onDelete: (id: string | number) => void;
  onAiBreakdown: (goal: Goal) => void;
}) {
  const [expanded, setExpanded] = useState(idx === 0);
  const pm = PRIORITY_META[goal.priority] || PRIORITY_META['medium'];
  const keyResults = goal.key_results || [];

  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  return (
    <div
      onClick={onSelect}
      className={`bg-[var(--color-surface-container)] border transition-all duration-150 cursor-pointer relative overflow-hidden group
        ${isActive ? 'border-[var(--color-primary)]/50' : 'border-[var(--color-surface-variant)] hover:border-[var(--color-outline-variant)]'}
      `}
    >
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)]" />
      )}
      
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`font-label-sm text-[10px] px-2 py-0.5 uppercase tracking-widest font-bold ${pm.bg} ${pm.text}`}>
                {pm.label}
              </span>
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-bold">
                ETA: {formatDate(goal.due_date)}
              </span>
            </div>
            <h4
              className={`text-[16px] font-semibold leading-snug cursor-pointer transition-colors ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface)]/80 group-hover:text-[var(--color-primary)]'}`}
              onClick={(e) => { e.stopPropagation(); setExpanded(e => !e); onSelect(); }}
            >
              {goal.title}
            </h4>
            <p className="text-[13px] text-[var(--color-outline)] mt-1.5 line-clamp-2 leading-relaxed">{goal.description}</p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            <ProgressBar pct={goal.progress} colorClass={isActive ? "bg-[var(--color-primary)]" : "bg-[var(--color-outline)]"} />
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(goal.id); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center text-[var(--color-outline)] hover:text-red-400 mt-2"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-5 border-t border-[var(--color-surface-variant)] pt-4 space-y-1">
            <div className="flex justify-between items-center mb-3">
              <p className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-bold">
                KEY RESULTS · {keyResults.filter(k => k.is_done).length}/{keyResults.length}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); onAiBreakdown(goal); }}
                className="font-label-sm text-[10px] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1 uppercase tracking-widest font-bold"
              >
                <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                AI Breakdown
              </button>
            </div>
            
            <div className="space-y-1.5">
              {keyResults.map(kr => (
                <button
                  key={kr.id}
                  onClick={(e) => { e.stopPropagation(); onToggleKR(goal.id, kr.id); }}
                  className="w-full flex items-start gap-3 group/kr hover:bg-[var(--color-surface-container-high)] p-2.5 transition-colors text-left border border-transparent hover:border-[var(--color-surface-variant)]"
                >
                  <div className={`w-4 h-4 border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    kr.is_done
                      ? 'border-[var(--color-outline-variant)] bg-[var(--color-outline-variant)]/20 text-[var(--color-outline)]'
                      : 'border-[var(--color-outline-variant)] group-hover/kr:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-transparent'
                  }`}>
                    {kr.is_done && <span className="material-symbols-outlined text-[12px]">check</span>}
                    {!kr.is_done && <span className="material-symbols-outlined text-[12px] opacity-0 group-hover/kr:opacity-100">check</span>}
                  </div>
                  <span className={`font-body-md text-[14px] transition-all leading-snug ${
                    kr.is_done
                      ? 'text-[var(--color-outline)] line-through'
                      : 'text-[var(--color-on-surface-variant)] group-hover/kr:text-[var(--color-on-surface)]'
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
        <div className="absolute top-8 bottom-[-24px] w-px bg-[var(--color-surface-variant)]" />
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
          className={`w-6 h-6 mt-1 flex items-center justify-center rounded-sm border z-10 transition-colors ${
            isDone ? 'bg-[var(--color-surface-variant)] border-[var(--color-surface-variant)] text-[var(--color-outline)]' :
            isActive ? 'bg-[var(--color-secondary)]/10 border-[var(--color-secondary)] text-[var(--color-secondary)]' :
            'bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-transparent hover:border-[var(--color-outline)]'
          }`}
        >
          {isDone && <span className="material-symbols-outlined text-[14px]">check</span>}
          {isActive && <div className="w-2 h-2 bg-[var(--color-secondary)]" />}
        </button>
      </div>

      <div className="flex-1 pb-6 pr-4">
        <div className="p-4 bg-[var(--color-surface-container)] border border-[var(--color-surface-variant)] relative group-hover/ms:border-[var(--color-outline-variant)] transition-colors">
          {isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--color-secondary)]" />}
          
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className={`font-label-sm text-[10px] uppercase tracking-widest font-bold block mb-1.5 ${
                isDone ? 'text-[var(--color-outline)]' : isActive ? 'text-[var(--color-secondary)]' : 'text-[var(--color-outline)]'
              }`}>
                {m.quarter} · {formatDate(m.date)}
              </span>
              <h4 className={`text-[15px] font-semibold ${isActive ? 'text-[var(--color-on-surface)]/80' : isDone ? 'text-[var(--color-outline)] line-through' : 'text-[var(--color-on-surface-variant)]'}`}>
                {m.title}
              </h4>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover/ms:opacity-100 transition-opacity text-[var(--color-outline)] hover:text-red-400"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
          <p className={`text-[13px] leading-relaxed ${isDone ? 'text-[var(--color-outline)]' : 'text-[var(--color-on-surface-variant)] opacity-80'}`}>
            {m.description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function GoalsPage() {
  const { showToast } = useToast();
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

  const handleDeleteGoal = async (id: string | number) => {
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
    } finally { setIsBreakingDown(false); }
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

  const handleDeleteMilestone = async (id: string | number) => {
    if (!activeGoalId) return;
    try { await deleteMilestone(activeGoalId, id); loadMilestones(activeGoalId); } catch (e) {}
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
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] items-center overflow-hidden">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[var(--color-outline-variant)] relative">
        
        {/* Top Header */}
        <div className="flex items-end justify-between px-8 py-6 border-b border-[var(--color-outline-variant)] shrink-0 bg-[var(--color-surface-container-lowest)]">
          <div>
            <h2 className="font-title-md text-[32px] font-medium tracking-tight text-[var(--color-primary-fixed)]">
              Strategic Planning
            </h2>
            <p className="font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest mt-1 font-bold">
              OBJECTIVES & KEY RESULTS • ROADMAP
            </p>
          </div>
          
          <div className="flex gap-10">
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1">Active Goals</span>
              <span className="font-label-sm text-[28px] text-[var(--color-on-surface)] font-normal tracking-tight">{goals.length}</span>
            </div>
            <div className="w-px h-10 bg-[var(--color-outline-variant)] self-center" />
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1">High Priority</span>
              <span className="font-label-sm text-[28px] text-[var(--color-error)] font-normal tracking-tight">{highPriority}</span>
            </div>
            <div className="w-px h-10 bg-[var(--color-outline-variant)] self-center" />
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1">Avg Progress</span>
              <span className="font-label-sm text-[28px] text-[var(--color-primary)] font-normal tracking-tight">{avgProgress}%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Column (OKRs) */}
          <div className="flex-1 flex flex-col border-r border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] relative overflow-hidden">
            <div className="flex items-center justify-between p-6 px-8 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] z-10 shrink-0">
              <h3 className="font-label-sm text-[11px] uppercase tracking-widest text-[var(--color-primary)] font-bold">
                Objectives & Key Results
              </h3>
              <button
                onClick={() => setShowAdd(v => !v)}
                className="font-label-sm text-[10px] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] uppercase tracking-widest flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">{showAddGoal ? 'close' : 'add'}</span>
                {showAddGoal ? 'Cancel' : 'New Goal'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-8">
              {showAddGoal && (
                <div className="bg-[var(--color-surface-container)] border border-[var(--color-primary)]/20 p-6 mb-6">
                  <h4 className="font-title-sm text-[14px] text-[var(--color-on-surface)] font-bold mb-4">Create New Goal</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <label className="block">
                        <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-2">Title *</span>
                        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-primary)]" />
                      </label>
                      <label className="block">
                        <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-2">Target Date</span>
                        <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-primary)] [color-scheme:dark]" />
                      </label>
                    </div>
                    <label className="block">
                      <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-2">Description</span>
                      <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-primary)] resize-none" />
                    </label>
                    <div>
                      <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-2">Priority</span>
                      <div className="flex gap-2">
                        {(['high', 'medium', 'low'] as Priority[]).map(p => (
                          <button key={p} onClick={() => setNewPriority(p)} className={`px-4 py-1.5 font-label-sm text-[10px] uppercase tracking-widest font-bold border transition-colors ${newPriority === p ? `${PRIORITY_META[p].bg} ${PRIORITY_META[p].text} border-transparent` : 'border-[var(--color-surface-variant)] text-[var(--color-outline)] hover:border-[var(--color-outline-variant)]'}`}>{PRIORITY_META[p].label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-2">Key Results</span>
                      {newKRs.map((kr, i) => (
                        <input key={i} value={kr} onChange={e => setNewKRs(ks => ks.map((k, j) => j === i ? e.target.value : k))} placeholder={`Key result ${i + 1}…`} className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-primary)] mb-2" />
                      ))}
                      <button onClick={() => setNewKRs(ks => [...ks, ''])} className="font-label-sm text-[10px] text-[var(--color-primary)] uppercase tracking-widest mt-1 flex items-center gap-1 font-bold"><span className="material-symbols-outlined text-[12px]">add</span> Add KR</button>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button onClick={handleAddGoal} disabled={!newTitle.trim()} className="px-6 py-2 bg-[var(--color-primary)] text-black font-label-sm text-[11px] font-bold disabled:opacity-50 uppercase tracking-widest hover:bg-[var(--color-primary-fixed)] transition-colors">Deploy Goal</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4">
                {loading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-[var(--color-surface-container)] border border-[var(--color-surface-variant)]"></div>
                    <div className="h-32 bg-[var(--color-surface-container)] border border-[var(--color-surface-variant)]"></div>
                  </div>
                ) : goals.length === 0 ? (
                  <div className="text-center py-16 opacity-50 font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest">NO GOALS ESTABLISHED.</div>
                ) : (
                  goals.map((goal, idx) => (
                    <GoalCard key={goal.id} goal={goal} idx={idx} isActive={activeGoalId === goal.id} onSelect={() => setActiveGoalId(goal.id)} onToggleKR={handleToggleKR} onDelete={handleDeleteGoal} onAiBreakdown={handleAiBreakdown} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Milestone Roadmap) */}
          <div className="w-[450px] shrink-0 flex flex-col overflow-hidden bg-[var(--color-surface-container-lowest)] relative">
            <div className="flex items-center justify-between p-6 px-8 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] z-10 shrink-0">
              <h3 className="font-label-sm text-[11px] uppercase tracking-widest text-[var(--color-secondary)] font-bold">
                Milestone Roadmap
              </h3>
              {activeGoalId && (
                <button
                  onClick={() => setShowAddMilestone(v => !v)}
                  className="font-label-sm text-[10px] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] uppercase tracking-widest flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">{showAddMilestone ? 'close' : 'add'}</span>
                  {showAddMilestone ? 'Cancel' : 'Add Node'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8">
              {activeGoalId && (
                <div className="mb-8 pl-12 border-b border-[var(--color-outline-variant)]/50 pb-4">
                  <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-1">Targeting</span>
                  <h4 className="font-title-md text-[16px] text-[var(--color-on-surface)] font-bold leading-snug">{activeGoal?.title}</h4>
                </div>
              )}

              {showAddMilestone && activeGoalId && (
                <div className="bg-[var(--color-surface-container)] border border-[var(--color-secondary)]/30 p-5 mb-8 ml-12 relative">
                  <div className="absolute -left-12 top-6 w-12 h-px bg-[var(--color-surface-variant)]" />
                  <h4 className="font-label-sm text-[10px] text-[var(--color-secondary)] uppercase tracking-widest font-bold mb-4">New Milestone Node</h4>
                  <div className="space-y-3">
                    <input value={msTitle} onChange={e => setMsTitle(e.target.value)} placeholder="Node Title *" className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-secondary)]" />
                    <textarea value={msDesc} onChange={e => setMsDesc(e.target.value)} placeholder="Description" rows={2} className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-secondary)] resize-none" />
                    <div className="grid grid-cols-2 gap-4">
                      <select value={msQuarter} onChange={e => setMsQuarter(e.target.value)} className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-secondary)]">
                        {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <option key={q} value={q} className="bg-[var(--color-surface-container-high)]">{q}</option>)}
                      </select>
                      <input type="date" value={msDate} onChange={e => setMsDate(e.target.value)} className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-secondary)] [color-scheme:dark]" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      {(['upcoming', 'active', 'done'] as const).map(status => (
                        <button key={status} onClick={() => setMsStatus(status)} type="button" className={`flex-1 py-1 text-[10px] uppercase tracking-widest font-bold border transition-colors ${msStatus === status ? 'bg-[var(--color-secondary)] text-black border-[var(--color-secondary)]' : 'border-[var(--color-surface-variant)] text-[var(--color-outline)] hover:border-[var(--color-outline)]'}`}>{status}</button>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2 mt-2 border-t border-[var(--color-surface-variant)]/50">
                      <button onClick={() => setShowAddMilestone(false)} type="button" className="flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold text-[var(--color-outline)] hover:text-[var(--color-on-surface)]">Cancel</button>
                      <button onClick={handleAddMilestone} disabled={!msTitle.trim()} type="button" className="flex-1 py-1.5 bg-[var(--color-secondary)] text-black text-[10px] uppercase tracking-widest font-bold disabled:opacity-50">Save Node</button>
                    </div>
                  </div>
                </div>
              )}

              {!activeGoalId ? (
                <div className="text-center py-16 opacity-50 font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest">AWAITING GOAL SELECTION.</div>
              ) : loadingMilestones ? (
                <div className="animate-pulse space-y-6 pl-12">
                  <div className="h-20 bg-[var(--color-surface-container)] border border-[var(--color-surface-variant)]"></div>
                </div>
              ) : milestones.length === 0 ? (
                <div className="text-center py-16 opacity-50 font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest">NO NODES ALLOCATED.</div>
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
          <p className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest -mt-2">
            Target: <span className="text-[var(--color-primary)] font-bold">{breakdownGoal?.title}</span>
          </p>
          <div className="overflow-y-auto max-h-[400px] pr-2 space-y-3 no-scrollbar">
            {isBreakingDown && (
              <div className="py-12 flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-[var(--color-surface-variant)] border-t-[var(--color-primary)] rounded-full animate-spin" />
                <p className="font-label-sm text-[10px] uppercase tracking-widest text-[var(--color-outline)] animate-pulse">Parsing objective geometry...</p>
              </div>
            )}
            {errorMsg && <div className="p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-center text-[12px] text-[var(--color-error)]">{errorMsg}</div>}
            {!isBreakingDown && !errorMsg && breakdownSubtasks.map((sub, i) => (
              <div key={i} className="bg-[var(--color-surface-container)] border border-[var(--color-surface-variant)] p-4 flex items-start gap-4">
                <div className="flex-1">
                  <h4 className="text-[14px] font-bold text-[var(--color-on-surface)]">{sub.title}</h4>
                  <p className="text-[12px] text-[var(--color-outline)] mt-1">{sub.description}</p>
                </div>
                <button onClick={() => handleAddAsKeyResult(sub.title)} className="shrink-0 px-2.5 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black font-label-sm text-[10px] uppercase tracking-widest border border-[var(--color-primary)]/20 transition-colors font-bold">+ KR</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-4 border-t border-[var(--color-surface-variant)]">
            <button onClick={() => setBreakdownGoal(null)} className="flex-1 py-2 border border-[var(--color-surface-variant)] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] font-label-sm text-[10px] uppercase tracking-widest font-bold">Close</button>
            {!isBreakingDown && !errorMsg && breakdownSubtasks.length > 0 && (
              <button onClick={handleAddAllAsKeyResults} className="flex-1 py-2 bg-[var(--color-primary)] text-black font-label-sm text-[10px] uppercase tracking-widest font-bold hover:bg-[var(--color-primary-fixed)]">Ingest All</button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
