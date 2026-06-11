import { useEffect, useState, type FormEvent } from 'react';
import {
  fetchDashboard, createTask, completeTask, deleteTask, updateTask,
  fetchProjects, createProject, deleteProject, fetchGoals,
  type Task, type Project, type Goal,
} from '../api';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

type Filter = 'all' | 'pending' | 'done';
type Priority = 'low' | 'medium' | 'high';

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  high:   { label: 'High',   color: 'var(--color-error)',     bg: 'color-mix(in srgb, var(--color-error) 10%, transparent)' },
  medium: { label: 'Medium', color: 'var(--color-secondary)', bg: 'color-mix(in srgb, var(--color-secondary) 10%, transparent)' },
  low:    { label: 'Low',    color: 'var(--color-outline)',   bg: 'color-mix(in srgb, var(--color-outline) 10%, transparent)' },
};

function PriorityBadge({ priority }: { priority: Priority }) {
  const m = PRIORITY_META[priority];
  const code = priority === 'high' ? 'P0' : priority === 'medium' ? 'P1' : 'P2';
  return (
    <span
      className="font-mono text-[10px] font-bold px-1.5 py-0.5 border"
      style={{ color: m.color, borderColor: `color-mix(in srgb, ${m.color} 30%, transparent)` }}
    >
      {code}
    </span>
  );
}

function TaskRow({
  task, onComplete, onDelete, onChangePriority, idx, projects, allTasks, subtasks = [], onAddSubtask, isTaskBlocked, goals = [], onToggleUrgent, onToggleImportant, onChangeGoal,
}: {
  task: Task;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onChangePriority: (id: number, p: Priority) => void;
  idx: number;
  projects: Project[];
  allTasks: Task[];
  subtasks?: Task[];
  onAddSubtask?: (parentId: number, title: string) => void;
  isTaskBlocked: (task: Task) => { blocked: boolean; blockingTitle?: string };
  goals?: Goal[];
  onToggleUrgent?: (id: number) => void;
  onToggleImportant?: (id: number) => void;
  onChangeGoal?: (id: number, goalId: number | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    if (task.is_completed) return;
    setCompleting(true);
    await new Promise(r => setTimeout(r, 100));
    onComplete(task.id);
    setCompleting(false);
  };

  const tagList = task.tags ? task.tags.split(',').map(t => t.trim()).filter(t => t !== '') : [];
  const project = projects.find(p => p.id === task.project_id);
  const blockCheck = isTaskBlocked(task);

  return (
    <div className="anim-fade-up w-full" style={{ animationDelay: `${idx * 30}ms` }}>
      <div
        className={`group flex flex-col gap-2 p-4 transition-colors duration-150 border-b border-[var(--color-surface-variant)] hover:bg-[var(--color-surface-container-high)] relative ${
          task.is_completed ? 'opacity-40' : expanded ? 'bg-[var(--color-surface-container-high)]' : 'bg-[var(--color-surface-container)]'
        } ${completing ? 'opacity-60' : ''}`}
      >
        {expanded && !task.is_completed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)]" />}
        <div className="flex items-start gap-4">
          <button
            onClick={handleComplete}
            disabled={task.is_completed}
            className={`shrink-0 mt-0.5 w-5 h-5 border flex items-center justify-center transition-colors ${
              task.is_completed
                ? 'border-[var(--color-outline-variant)] bg-[var(--color-outline-variant)]/20 text-[var(--color-outline)]'
                : 'border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] text-transparent hover:text-[var(--color-primary)]'
            }`}
          >
            {task.is_completed && <span className="material-symbols-outlined text-[14px]">check</span>}
            {!task.is_completed && <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">check</span>}
          </button>

          <div className="flex-1 min-w-0" onClick={() => !task.is_completed && setExpanded(e => !e)}>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className={`font-body-md text-[15px] font-semibold leading-snug transition-colors ${
                task.is_completed
                  ? 'line-through text-[var(--color-outline)] decoration-[var(--color-outline)]/50'
                  : 'text-[var(--color-on-surface)]/80 group-hover:text-[var(--color-primary)]'
              }`}>
                {task.title}
              </p>
              
              <PriorityBadge priority={task.priority as Priority} />
              
              {project && (
                <span className="font-label-sm text-[9px] uppercase tracking-widest px-2 py-0.5 border font-bold"
                  style={{
                    color: project.color,
                    backgroundColor: `color-mix(in srgb, ${project.color} 10%, transparent)`,
                    borderColor: `color-mix(in srgb, ${project.color} 25%, transparent)`
                  }}>
                  {project.title}
                </span>
              )}

              {goals.find(g => g.id === task.goal_id) && (
                <span className="font-label-sm text-[9px] uppercase tracking-widest px-2 py-0.5 border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold truncate max-w-[120px]">
                  🎯 {goals.find(g => g.id === task.goal_id)?.title}
                </span>
              )}

              {task.is_urgent && (
                <span className="font-label-sm text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-[var(--color-error)]/25 bg-[var(--color-error)]/10 text-[var(--color-error)] font-bold">
                  Urgent
                </span>
              )}

              {task.is_important && (
                <span className="font-label-sm text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-[var(--color-secondary)]/25 bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] font-bold">
                  Important
                </span>
              )}

              {blockCheck.blocked && (
                <span className="material-symbols-outlined text-orange-400 text-[18px] select-none" title={`Blocked by: ${blockCheck.blockingTitle}`}>lock</span>
              )}
            </div>

            {tagList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tagList.map(tag => (
                  <span key={tag} className="font-label-sm text-[9px] uppercase tracking-wider bg-[var(--color-surface-container-high)] text-[var(--color-outline)] border border-[var(--color-outline-variant)]/20 px-2 py-0.5 font-bold">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {expanded && !task.is_completed && (
              <div className="mt-4 border-t border-[var(--color-outline-variant)] pt-3 flex flex-col gap-3 anim-fade-up">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-bold">Priority:</span>
                  {(['high', 'medium', 'low'] as Priority[]).map(p => (
                    <button
                      key={p}
                      onClick={e => { e.stopPropagation(); onChangePriority(task.id, p); }}
                      className={`px-3 py-1 font-label-sm text-[10px] uppercase tracking-widest border transition-all ${
                        task.priority === p ? 'opacity-100 font-bold' : 'opacity-50 hover:opacity-80'
                      }`}
                      style={{
                        color: PRIORITY_META[p].color,
                        backgroundColor: task.priority === p ? PRIORITY_META[p].bg : 'transparent',
                        borderColor: task.priority === p ? PRIORITY_META[p].color : 'var(--color-outline-variant)',
                      }}
                    >
                      {PRIORITY_META[p].label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-6 flex-wrap" onClick={e => e.stopPropagation()}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={task.is_urgent || false}
                      onChange={() => onToggleUrgent && onToggleUrgent(task.id)}
                      className="accent-[var(--color-primary)]"
                    />
                    <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-bold">Urgent</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={task.is_important || false}
                      onChange={() => onToggleImportant && onToggleImportant(task.id)}
                      className="accent-[var(--color-primary)]"
                    />
                    <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-bold">Important</span>
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-bold">Goal:</span>
                    <select
                      value={task.goal_id || ''}
                      onChange={e => onChangeGoal && onChangeGoal(task.id, e.target.value ? Number(e.target.value) : null)}
                      className="bg-[var(--color-surface-container-high)] text-[11px] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] px-2 py-1 outline-none font-bold"
                    >
                      <option value="">None</option>
                      {goals.map(g => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const input = form.elements.namedItem('subtaskTitle') as HTMLInputElement;
                    if (input.value.trim() && onAddSubtask) {
                      onAddSubtask(task.id, input.value.trim());
                      input.value = '';
                    }
                  }}
                  onClick={e => e.stopPropagation()}
                  className="flex gap-2 mt-1.5"
                >
                  <input
                    name="subtaskTitle"
                    placeholder="Add subtask outcome…"
                    className="flex-1 bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[13px] text-[var(--color-on-surface)] outline-none placeholder:text-[var(--color-outline)] focus:border-[var(--color-primary)]"
                  />
                  <button type="submit" className="px-4 py-1.5 bg-[var(--color-primary)] text-black font-bold font-label-sm text-[10px] uppercase tracking-widest hover:bg-[var(--color-primary-fixed)] transition-colors">
                    Add
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity no-print">
            <button onClick={() => onDelete(task.id)} className="w-8 h-8 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors" title="Delete task">
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
      </div>

      {subtasks.length > 0 && (
        <div className="pl-4 border-l border-[var(--color-outline-variant)] ml-6 flex flex-col">
          {subtasks.map((sub, sidx) => (
            <TaskRow
              key={sub.id} task={sub} idx={sidx} onComplete={onComplete} onDelete={onDelete}
              onChangePriority={onChangePriority} projects={projects} allTasks={allTasks}
              subtasks={allTasks.filter(t => t.parent_task_id === sub.id)} onAddSubtask={onAddSubtask} isTaskBlocked={isTaskBlocked}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TasksPage() {
  const { showToast } = useToast();

  const [tasks, setTasks]         = useState<Task[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteProjectConfirmId, setDeleteProjectConfirmId] = useState<number | null>(null);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<Filter>('pending');
  const [newTitle, setNewTitle]   = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [showAdd, setShowAdd]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [newIsUrgent, setNewIsUrgent]       = useState(false);
  const [newIsImportant, setNewIsImportant] = useState(false);
  const [goals, setGoals]                   = useState<Goal[]>([]);
  const [viewMode, setViewMode]             = useState<'queue' | 'eisenhower'>('queue');

  const [collapsedProjects, setCollapsedProjects] = useState<Record<number, boolean>>({});
  const [showAddProject, setShowAddProject]       = useState(false);
  const [newProjectTitle, setNewProjectTitle]     = useState('');
  const [newProjectColor, setNewProjectColor]     = useState('#D2BBFF');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<number | null>(null);
  const [newTags, setNewTags]                     = useState('');
  const [newDependencyId, setNewDependencyId]     = useState<number | null>(null);

  useEffect(() => {
    load();
    window.addEventListener('task-added-globally', load);
    return () => window.removeEventListener('task-added-globally', load);
  }, []);

  const load = async () => {
    try {
      const [dashboardData, projectsData, goalsData] = await Promise.all([fetchDashboard(), fetchProjects(), fetchGoals()]);
      setTasks(dashboardData.tasks ?? []);
      setProjects(projectsData ?? []);
      setGoals(goalsData ?? []);
    } catch {
      setError('Cannot reach the server.');
    } finally { setLoading(false); }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const t = await createTask(
        newTitle.trim(),
        newPriority,
        selectedProjectId,
        selectedParentTaskId,
        newTags.trim(),
        newDependencyId ? String(newDependencyId) : '',
        undefined,
        selectedGoalId,
        null,
        newIsUrgent,
        newIsImportant
      );
      setTasks(p => [t, ...p]);
      setNewTitle(''); setNewTags(''); setSelectedProjectId(null); setSelectedParentTaskId(null); setNewDependencyId(null); setSelectedGoalId(null); setNewIsUrgent(false); setNewIsImportant(false); setShowAdd(false);
      showToast('Action logged in Priority Queue', 'success');
      if (selectedGoalId) {
        fetchGoals().then(setGoals);
      }
    } catch (e: any) { showToast(e.message || 'Failed to create task', 'error'); }
  };

  const handleToggleUrgent = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const nextVal = !task.is_urgent;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_urgent: nextVal } : t));
    await updateTask(id, { is_urgent: nextVal });
  };

  const handleToggleImportant = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const nextVal = !task.is_important;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_important: nextVal } : t));
    await updateTask(id, { is_important: nextVal });
  };

  const handleChangeGoal = async (id: number, goalId: number | null) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, goal_id: goalId } : t));
    await updateTask(id, { goal_id: goalId });
    // Reload goals to refresh progress
    const goalsData = await fetchGoals();
    setGoals(goalsData ?? []);
  };

  const handleAddProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    try {
      const p = await createProject(newProjectTitle.trim(), newProjectColor);
      setProjects(prev => [p, ...prev]);
      setNewProjectTitle(''); setShowAddProject(false);
      showToast('Project container established', 'success');
    } catch (e: any) { showToast(e.message || 'Failed to create project', 'error'); }
  };

  const handleDeleteProject = (id: number) => {
    setDeleteProjectConfirmId(id);
  };

  const confirmDeleteProject = async (id: number) => {
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      setTasks(prev => prev.map(t => t.project_id === id ? { ...t, project_id: null } : t));
      showToast('Project removed, actions retained', 'success');
    } catch (e: any) { showToast(e.message || 'Failed to delete project', 'error'); }
  };

  const handleAddSubtask = async (parentId: number, title: string) => {
    try {
      const parent = tasks.find(t => t.id === parentId);
      const sub = await createTask(title, parent ? parent.priority : 'medium', parent ? parent.project_id : null, parentId, '', '');
      setTasks(p => [sub, ...p]);
      showToast('Sub-outcome mapped successfully', 'success');
    } catch (e: any) { showToast(e.message || 'Failed to add subtask', 'error'); }
  };

  const isTaskBlocked = (task: Task): { blocked: boolean; blockingTitle?: string } => {
    if (!task.dependencies) return { blocked: false };
    const depIds = task.dependencies.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    for (const depId of depIds) {
      const depTask = tasks.find(t => t.id === depId);
      if (depTask && !depTask.is_completed) return { blocked: true, blockingTitle: depTask.title };
    }
    return { blocked: false };
  };

  const handleComplete = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      const blockCheck = isTaskBlocked(task);
      if (blockCheck.blocked) {
        showToast(`Blocked by dependency: "${blockCheck.blockingTitle}"`, 'error');
        return;
      }
    }
    await completeTask(id);
    setTasks(p => p.map(t => t.id === id ? { ...t, is_completed: true } : t));
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteTask = async (id: number) => {
    try {
      await deleteTask(id);
      setTasks(p => p.filter(t => t.id !== id));
      showToast('Task deleted', 'success');
    } catch (e: any) { showToast(e.message || 'Failed to delete task', 'error'); }
  };

  const handlePriority = async (id: number, priority: Priority) => {
    await updateTask(id, { priority });
    setTasks(p => p.map(t => t.id === id ? { ...t, priority } : t));
  };

  const filtered = tasks.filter(t => filter === 'all' ? true : filter === 'pending' ? !t.is_completed : t.is_completed);
  const pending = tasks.filter(t => !t.is_completed).length;
  const done    = tasks.filter(t => t.is_completed).length;
  const pct     = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  const TABS: { id: Filter; label: string; count: number }[] = [
    { id: 'pending', label: 'Pending', count: pending },
    { id: 'done',    label: 'Done',    count: done },
    { id: 'all',     label: 'All',     count: tasks.length },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] items-center overflow-hidden">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[var(--color-outline-variant)] relative">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between px-8 py-6 border-b border-[var(--color-outline-variant)] shrink-0 bg-[var(--color-surface-container-lowest)] gap-4">
          <div>
            <h2 className="font-title-md text-[32px] font-medium tracking-tight text-[var(--color-primary-fixed)]">
              Priority Queue
            </h2>
            <p className="font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest mt-1 font-bold">
              TASK MANAGEMENT • PROJECT CONTAINERS
            </p>
          </div>
          
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Pending</span>
              <span className="font-label-sm text-[28px] text-[var(--color-on-surface)] font-normal tracking-tight leading-none">{pending}</span>
            </div>
            <div className="w-px h-10 bg-[var(--color-outline-variant)] self-center" />
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Completed</span>
              <span className="font-label-sm text-[28px] text-[var(--color-on-surface)] font-normal tracking-tight leading-none">{done}</span>
            </div>
            <div className="w-px h-10 bg-[var(--color-outline-variant)] self-center" />
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1 font-bold">Completion</span>
              <span className="font-label-sm text-[28px] text-[var(--color-primary)] font-normal tracking-tight leading-none">{pct}%</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="border-b border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-8 py-3 text-[var(--color-error)] font-label-sm text-[11px] uppercase tracking-widest flex items-center gap-2 font-bold shrink-0">
            <span className="material-symbols-outlined text-[16px]">warning</span>{error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar bg-[var(--color-surface-container-low)]">
          {/* Controls Bar */}
          <div className="flex items-center justify-between border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-8 py-4 shrink-0">
            <div className="flex items-center gap-6">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`font-label-sm text-[11px] uppercase tracking-widest font-bold flex items-center gap-1.5 transition-colors ${
                    filter === tab.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface)]'
                  }`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 border text-[9px] ${filter === tab.id ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10' : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)]'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
              <div className="w-px h-4 bg-[var(--color-outline-variant)]" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('queue')}
                  className={`font-label-sm text-[10px] uppercase tracking-widest font-bold px-3 py-1 border transition-colors ${
                    viewMode === 'queue' ? 'text-[var(--color-primary)] border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10' : 'text-[var(--color-outline)] border-transparent hover:text-[var(--color-on-surface)]'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('eisenhower')}
                  className={`font-label-sm text-[10px] uppercase tracking-widest font-bold px-3 py-1 border transition-colors ${
                    viewMode === 'eisenhower' ? 'text-[var(--color-primary)] border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10' : 'text-[var(--color-outline)] border-transparent hover:text-[var(--color-on-surface)]'
                  }`}
                >
                  Eisenhower
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddProject(v => !v)}
                className="font-label-sm text-[10px] text-[var(--color-secondary)] uppercase tracking-widest font-bold flex items-center gap-1 border border-[var(--color-secondary)]/30 px-4 py-1.5 hover:bg-[var(--color-secondary)]/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">{showAddProject ? 'close' : 'folder_open'}</span>
                {showAddProject ? 'Cancel' : 'Project'}
              </button>
              <button
                onClick={() => setShowAdd(v => !v)}
                className={`font-label-sm text-[10px] uppercase tracking-widest font-bold flex items-center gap-1 px-4 py-1.5 transition-colors border ${
                  showAdd ? 'border-[var(--color-outline-variant)] text-[var(--color-outline)] hover:text-[var(--color-on-surface)]' : 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{showAdd ? 'close' : 'add'}</span>
                {showAdd ? 'Cancel' : 'Task'}
              </button>
            </div>
          </div>

          <div className="p-8 pb-32">
            {showAddProject && (
              <form onSubmit={handleAddProject} className="bg-[var(--color-surface-container)] border border-[var(--color-secondary)]/30 p-6 mb-8 relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-secondary)]" />
                <h4 className="font-label-sm text-[10px] text-[var(--color-secondary)] uppercase tracking-widest font-bold mb-4">Define Project Container</h4>
                <div className="flex flex-col gap-4">
                  <input
                    autoFocus
                    value={newProjectTitle} onChange={e => setNewProjectTitle(e.target.value)}
                    placeholder="Project Title *"
                    className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-secondary)]"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-bold mr-2">Color:</span>
                      {["#D2BBFF", "#5ADACE", "#FF8DA1", "#F5D0A9", "#A8E6CF"].map(c => (
                        <button
                          type="button" key={c} onClick={() => setNewProjectColor(c)}
                          className={`w-5 h-5 border transition-all ${newProjectColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button type="submit" disabled={!newProjectTitle.trim()} className="px-5 py-1.5 bg-[var(--color-secondary)] text-black font-label-sm text-[10px] font-bold disabled:opacity-50 uppercase tracking-widest hover:brightness-110 transition-colors">
                      Establish
                    </button>
                  </div>
                </div>
              </form>
            )}

            {showAdd && (
              <form onSubmit={handleAdd} className="bg-[var(--color-surface-container)] border border-[var(--color-primary)]/30 p-6 mb-8 relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)]" />
                <h4 className="font-label-sm text-[10px] text-[var(--color-primary)] uppercase tracking-widest font-bold mb-4">Queue New Action</h4>
                
                <div className="flex flex-col gap-5">
                  <input
                    autoFocus
                    value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="Action Title *"
                    className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-primary)]"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <select value={selectedProjectId || ''} onChange={e => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]">
                      <option value="" className="bg-[var(--color-surface-container-high)]">No Project</option>
                      {projects.map(p => <option key={p.id} value={p.id} className="bg-[var(--color-surface-container-high)]">{p.title}</option>)}
                    </select>
                    <select value={selectedParentTaskId || ''} onChange={e => setSelectedParentTaskId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]">
                      <option value="" className="bg-[var(--color-surface-container-high)]">Top-level Task</option>
                      {tasks.filter(t => !t.is_completed && !t.parent_task_id).map(t => <option key={t.id} value={t.id} className="bg-[var(--color-surface-container-high)]">{t.title}</option>)}
                    </select>
                    <select value={newDependencyId || ''} onChange={e => setNewDependencyId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]">
                      <option value="" className="bg-[var(--color-surface-container-high)]">No Dependency</option>
                      {tasks.filter(t => !t.is_completed).map(t => <option key={t.id} value={t.id} className="bg-[var(--color-surface-container-high)]">{t.title}</option>)}
                    </select>
                    <select value={selectedGoalId || ''} onChange={e => setSelectedGoalId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]">
                      <option value="" className="bg-[var(--color-surface-container-high)]">No Goal</option>
                      {goals.map(g => <option key={g.id} value={g.id} className="bg-[var(--color-surface-container-high)]">{g.title}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center justify-between mt-2 flex-wrap gap-4">
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-bold">Priority:</span>
                        <div className="flex gap-2">
                          {(['high', 'medium', 'low'] as Priority[]).map(p => (
                            <button
                              type="button" key={p} onClick={() => setNewPriority(p)}
                              className={`px-3 py-1 font-label-sm text-[10px] uppercase tracking-widest border transition-colors ${newPriority === p ? 'font-bold text-black' : 'text-[var(--color-outline)] border-[var(--color-surface-variant)] hover:border-[var(--color-outline-variant)]'}`}
                              style={newPriority === p ? { backgroundColor: PRIORITY_META[p].color, borderColor: PRIORITY_META[p].color } : {}}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="h-4 w-px bg-[var(--color-outline-variant)]" />

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newIsUrgent}
                          onChange={e => setNewIsUrgent(e.target.checked)}
                          className="accent-[var(--color-primary)]"
                        />
                        <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-bold">Urgent</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newIsImportant}
                          onChange={e => setNewIsImportant(e.target.checked)}
                          className="accent-[var(--color-primary)]"
                        />
                        <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-bold">Important</span>
                      </label>
                    </div>

                    <div className="flex gap-4 items-center">
                      <input
                        value={newTags} onChange={e => setNewTags(e.target.value)}
                        placeholder="Tags (csv)…"
                        className="w-32 bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[13px] text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]"
                      />
                      <button type="submit" disabled={!newTitle.trim()} className="px-6 py-2 bg-[var(--color-primary)] text-black font-label-sm text-[11px] font-bold disabled:opacity-50 uppercase tracking-widest hover:bg-[var(--color-primary-fixed)] transition-colors">
                        Deploy Task
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            <div className="flex flex-col gap-8">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-[var(--color-surface-container)] border border-[var(--color-surface-variant)]" />
                  <div className="h-24 bg-[var(--color-surface-container)] border border-[var(--color-surface-variant)]" />
                </div>
              ) : viewMode === 'eisenhower' ? (
                (() => {
                  const q1Tasks = filtered.filter(t => t.is_urgent && t.is_important && !t.parent_task_id);
                  const q2Tasks = filtered.filter(t => !t.is_urgent && t.is_important && !t.parent_task_id);
                  const q3Tasks = filtered.filter(t => t.is_urgent && !t.is_important && !t.parent_task_id);
                  const q4Tasks = filtered.filter(t => !t.is_urgent && !t.is_important && !t.parent_task_id);

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 anim-fade-up">
                      {/* Q1: Urgent & Important */}
                      <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] flex flex-col min-h-[350px]">
                        <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-error)] flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-[var(--color-error)]" />
                              Q1: Urgent & Important
                            </h3>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] text-[var(--color-outline)] font-bold">
                              {q1Tasks.length}
                            </span>
                          </div>
                          <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-wider">Do First · Immediate Action Required</span>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-[var(--color-surface-variant)] p-2">
                          {q1Tasks.length === 0 ? (
                            <div className="text-center py-12 font-label-sm text-[10px] uppercase tracking-widest text-[var(--color-outline)] opacity-50">
                              No actions in this quadrant.
                            </div>
                          ) : (
                            q1Tasks.map((task, idx) => (
                              <TaskRow
                                key={task.id} task={task} idx={idx} onComplete={handleComplete} onDelete={handleDelete}
                                onChangePriority={handlePriority} projects={projects} allTasks={tasks}
                                subtasks={filtered.filter(t => t.parent_task_id === task.id)}
                                onAddSubtask={handleAddSubtask} isTaskBlocked={isTaskBlocked}
                                goals={goals} onToggleUrgent={handleToggleUrgent} onToggleImportant={handleToggleImportant} onChangeGoal={handleChangeGoal}
                              />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Q2: Important, Not Urgent */}
                      <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] flex flex-col min-h-[350px]">
                        <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-secondary)] flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-[var(--color-secondary)]" />
                              Q2: Important, Not Urgent
                            </h3>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] text-[var(--color-outline)] font-bold">
                              {q2Tasks.length}
                            </span>
                          </div>
                          <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-wider">Plan / Schedule · Strategic Development</span>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-[var(--color-surface-variant)] p-2">
                          {q2Tasks.length === 0 ? (
                            <div className="text-center py-12 font-label-sm text-[10px] uppercase tracking-widest text-[var(--color-outline)] opacity-50">
                              No actions in this quadrant.
                            </div>
                          ) : (
                            q2Tasks.map((task, idx) => (
                              <TaskRow
                                key={task.id} task={task} idx={idx} onComplete={handleComplete} onDelete={handleDelete}
                                onChangePriority={handlePriority} projects={projects} allTasks={tasks}
                                subtasks={filtered.filter(t => t.parent_task_id === task.id)}
                                onAddSubtask={handleAddSubtask} isTaskBlocked={isTaskBlocked}
                                goals={goals} onToggleUrgent={handleToggleUrgent} onToggleImportant={handleToggleImportant} onChangeGoal={handleChangeGoal}
                              />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Q3: Urgent, Not Important */}
                      <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] flex flex-col min-h-[350px]">
                        <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-primary)] flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-[var(--color-primary)]" />
                              Q3: Urgent, Not Important
                            </h3>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] text-[var(--color-outline)] font-bold">
                              {q3Tasks.length}
                            </span>
                          </div>
                          <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-wider">Delegate / Speed · Secondary Actions</span>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-[var(--color-surface-variant)] p-2">
                          {q3Tasks.length === 0 ? (
                            <div className="text-center py-12 font-label-sm text-[10px] uppercase tracking-widest text-[var(--color-outline)] opacity-50">
                              No actions in this quadrant.
                            </div>
                          ) : (
                            q3Tasks.map((task, idx) => (
                              <TaskRow
                                key={task.id} task={task} idx={idx} onComplete={handleComplete} onDelete={handleDelete}
                                onChangePriority={handlePriority} projects={projects} allTasks={tasks}
                                subtasks={filtered.filter(t => t.parent_task_id === task.id)}
                                onAddSubtask={handleAddSubtask} isTaskBlocked={isTaskBlocked}
                                goals={goals} onToggleUrgent={handleToggleUrgent} onToggleImportant={handleToggleImportant} onChangeGoal={handleChangeGoal}
                              />
                            ))
                          )}
                        </div>
                      </div>

                      {/* Q4: Not Urgent & Not Important */}
                      <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] flex flex-col min-h-[350px]">
                        <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-label-sm text-[11px] font-bold uppercase tracking-widest text-[var(--color-outline)] flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-[var(--color-outline)]" />
                              Q4: Not Urgent & Not Important
                            </h3>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] text-[var(--color-outline)] font-bold">
                              {q4Tasks.length}
                            </span>
                          </div>
                          <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-wider">Eliminate / Postpone · Backburner</span>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-[var(--color-surface-variant)] p-2">
                          {q4Tasks.length === 0 ? (
                            <div className="text-center py-12 font-label-sm text-[10px] uppercase tracking-widest text-[var(--color-outline)] opacity-50">
                              No actions in this quadrant.
                            </div>
                          ) : (
                            q4Tasks.map((task, idx) => (
                              <TaskRow
                                key={task.id} task={task} idx={idx} onComplete={handleComplete} onDelete={handleDelete}
                                onChangePriority={handlePriority} projects={projects} allTasks={tasks}
                                subtasks={filtered.filter(t => t.parent_task_id === task.id)}
                                onAddSubtask={handleAddSubtask} isTaskBlocked={isTaskBlocked}
                                goals={goals} onToggleUrgent={handleToggleUrgent} onToggleImportant={handleToggleImportant} onChangeGoal={handleChangeGoal}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <>
                  {projects.map(proj => {
                    const projTasks = filtered.filter(t => t.project_id === proj.id && !t.parent_task_id);
                    const isCollapsed = collapsedProjects[proj.id] ?? false;

                    return (
                      <div key={proj.id} className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]">
                        <div 
                          className="flex items-center justify-between p-4 px-5 border-b border-[var(--color-surface-variant)] bg-[var(--color-surface-container-lowest)] cursor-pointer group"
                          onClick={() => setCollapsedProjects(prev => ({ ...prev, [proj.id]: !isCollapsed }))}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-none" style={{ backgroundColor: proj.color }} />
                            <h3 className="font-label-sm text-[11px] font-bold text-[var(--color-on-surface)] uppercase tracking-widest group-hover:text-[var(--color-primary)] transition-colors flex items-center gap-2">
                              {proj.title}
                              <span className="material-symbols-outlined text-[14px] text-[var(--color-outline)] transition-transform duration-200" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none' }}>
                                expand_more
                              </span>
                            </h3>
                          </div>
                          <div className="flex items-center gap-4 no-print">
                            <span className="font-label-sm text-[9px] uppercase tracking-widest text-[var(--color-outline)] font-bold">
                              {projTasks.length} {projTasks.length === 1 ? 'Action' : 'Actions'}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-error)]"
                              title="Delete Project"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          </div>
                        </div>

                        {!isCollapsed && (
                          <div className="flex flex-col">
                            {projTasks.length === 0 ? (
                              <div className="text-center py-6 font-label-sm text-[10px] uppercase tracking-widest text-[var(--color-outline)] opacity-50">
                                NO ACTIVE TASKS.
                              </div>
                            ) : (
                              projTasks.map((task, idx) => (
                                <TaskRow
                                  key={task.id} task={task} idx={idx} onComplete={handleComplete} onDelete={handleDelete}
                                  onChangePriority={handlePriority} projects={projects} allTasks={tasks}
                                  subtasks={filtered.filter(t => t.parent_task_id === task.id)}
                                  onAddSubtask={handleAddSubtask} isTaskBlocked={isTaskBlocked}
                                  goals={goals} onToggleUrgent={handleToggleUrgent} onToggleImportant={handleToggleImportant} onChangeGoal={handleChangeGoal}
                                />
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(() => {
                    const standaloneTasks = filtered.filter(t => !t.project_id && !t.parent_task_id);
                    if (standaloneTasks.length === 0 && projects.length > 0) return null;
                    return (
                      <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] mt-4">
                        <div className="p-4 px-5 border-b border-[var(--color-surface-variant)] bg-[var(--color-surface-container-lowest)]">
                          <h3 className="font-label-sm text-[11px] font-bold text-[var(--color-outline)] uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px]">inbox</span>
                            Standalone Actions
                          </h3>
                        </div>
                        <div className="flex flex-col">
                          {standaloneTasks.length === 0 ? (
                            <div className="text-center py-8 font-label-sm text-[10px] uppercase tracking-widest text-[var(--color-outline)] opacity-50">
                              INBOX ZERO.
                            </div>
                          ) : (
                            standaloneTasks.map((task, idx) => (
                              <TaskRow
                                key={task.id} task={task} idx={idx} onComplete={handleComplete} onDelete={handleDelete}
                                onChangePriority={handlePriority} projects={projects} allTasks={tasks}
                                subtasks={filtered.filter(t => t.parent_task_id === task.id)}
                                onAddSubtask={handleAddSubtask} isTaskBlocked={isTaskBlocked}
                                goals={goals} onToggleUrgent={handleToggleUrgent} onToggleImportant={handleToggleImportant} onChangeGoal={handleChangeGoal}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId !== null && confirmDeleteTask(deleteConfirmId)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Purge"
        cancelText="Keep"
        destructive={true}
      />

      <ConfirmDialog
        open={deleteProjectConfirmId !== null}
        onClose={() => setDeleteProjectConfirmId(null)}
        onConfirm={() => deleteProjectConfirmId !== null && confirmDeleteProject(deleteProjectConfirmId)}
        title="Delete Project"
        description="Are you sure you want to delete this project? Associated tasks will be detached but retained."
        confirmText="Purge"
        cancelText="Keep"
        destructive={true}
      />
    </div>
  );
}
