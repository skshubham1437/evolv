import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchDashboard, createTask, completeTask, deleteTask, updateTask,
  fetchProjects, createProject, deleteProject,
  type Task, type Project,
} from '../api';
import { useToast } from '../context/ToastContext';

type Filter = 'all' | 'pending' | 'done';
type Priority = 'low' | 'medium' | 'high';

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  high:   { label: 'High',   color: 'var(--color-error)',     bg: 'color-mix(in srgb, var(--color-error) 10%, transparent)' },
  medium: { label: 'Medium', color: 'var(--color-secondary)', bg: 'color-mix(in srgb, var(--color-secondary) 10%, transparent)' },
  low:    { label: 'Low',    color: 'var(--color-outline)',   bg: 'color-mix(in srgb, var(--color-outline) 10%, transparent)' },
};

function PriorityBadge({ priority }: { priority: Priority }) {
  const m = PRIORITY_META[priority];
  return (
    <span
      className="font-label-sm text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md border font-bold"
      style={{ color: m.color, backgroundColor: m.bg, borderColor: `color-mix(in srgb, ${m.color} 25%, transparent)` }}
    >
      {m.label}
    </span>
  );
}

function TaskRow({
  task,
  onComplete,
  onDelete,
  onChangePriority,
  idx,
  projects,
  allTasks,
  subtasks = [],
  onAddSubtask,
  isTaskBlocked,
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
    <div
      className="anim-fade-up w-full"
      style={{ animationDelay: `${idx * 30}ms` }}
    >
      <div
        className={`group flex flex-col gap-2 px-4 py-3.5 rounded-2xl border transition-all duration-200 backdrop-blur-md ${
          task.is_completed
            ? 'bg-[var(--color-surface-container-lowest)]/50 border-[var(--color-outline-variant)]/10 opacity-50'
            : expanded
              ? 'bg-[var(--color-surface-container)]/80 border-[var(--color-primary)]/25 shadow-lg'
              : 'bg-[var(--color-surface-container-low)]/70 border-[var(--color-outline-variant)]/20 hover:border-[var(--color-outline-variant)]/50 hover:shadow-sm'
        } ${completing ? 'scale-[0.98] opacity-60' : ''}`}
      >
        <div className="flex items-start gap-3">
          {/* Complete button with SVG checkmark animation */}
          <button
            onClick={handleComplete}
            disabled={task.is_completed}
            className={`shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
              task.is_completed
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15'
                : 'border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 group-hover:border-[var(--color-primary)]/60'
            }`}
          >
            {task.is_completed ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <polyline
                  points="2,6 5,9 10,3"
                  stroke="var(--color-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="20"
                  strokeDashoffset="20"
                  className="svg-stroke-draw"
                />
              </svg>
            ) : (
              <span className="w-2 h-2 rounded-full bg-transparent group-hover:bg-[var(--color-primary)]/40 transition-colors" />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0" onClick={() => !task.is_completed && setExpanded(e => !e)}>
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`font-body-md text-[15px] leading-snug transition-colors ${
                task.is_completed
                  ? 'line-through text-[var(--color-outline)] decoration-[var(--color-outline)]/50'
                  : 'text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)]'
              }`}>
                {task.title}
              </p>
              <PriorityBadge priority={task.priority as Priority} />
              
              {project && (
                <span
                  className="font-label-sm text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md border font-bold"
                  style={{
                    color: project.color,
                    backgroundColor: `color-mix(in srgb, ${project.color} 10%, transparent)`,
                    borderColor: `color-mix(in srgb, ${project.color} 25%, transparent)`
                  }}
                >
                  {project.title}
                </span>
              )}

              {blockCheck.blocked && (
                <span 
                  className="material-symbols-outlined text-orange-400 text-[18px] select-none"
                  title={`Blocked by: ${blockCheck.blockingTitle}`}
                >
                  lock
                </span>
              )}
            </div>

            {/* Tag List */}
            {tagList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tagList.map(tag => (
                  <span key={tag} className="font-label-sm text-[9px] uppercase tracking-wider bg-[var(--color-surface-container-high)] text-[var(--color-outline)] border border-[var(--color-outline-variant)]/20 px-2 py-0.5 rounded-md font-bold">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Expanded detail */}
            {expanded && !task.is_completed && (
              <div className="mt-4 border-t border-[var(--color-outline-variant)]/10 pt-3 flex flex-col gap-3 anim-fade-up">
                {/* Priority updates */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-label-sm text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-widest">Priority:</span>
                  {(['high', 'medium', 'low'] as Priority[]).map(p => (
                    <button
                      key={p}
                      onClick={e => { e.stopPropagation(); onChangePriority(task.id, p); }}
                      className={`px-3 py-1 rounded-full font-label-sm text-[10px] uppercase tracking-widest border transition-all press-scale ${
                        task.priority === p ? 'opacity-100 scale-100' : 'opacity-50 hover:opacity-80'
                      }`}
                      style={{
                        color: PRIORITY_META[p].color,
                        backgroundColor: PRIORITY_META[p].bg,
                        borderColor: `color-mix(in srgb, ${PRIORITY_META[p].color} 25%, transparent)`,
                      }}
                    >
                      {PRIORITY_META[p].label}
                    </button>
                  ))}
                </div>

                {/* Subtask Add outcome */}
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
                    className="flex-1 bg-[var(--color-surface-container-high)]/60 border border-[var(--color-outline-variant)]/20 rounded-xl px-3 py-1.5 text-[12px] text-[var(--color-on-surface)] outline-none placeholder:text-[var(--color-outline)] focus:border-[var(--color-primary)]/40"
                  />
                  <button type="submit" className="px-4 py-1.5 bg-[var(--color-primary)] text-black font-bold font-label-sm text-[10px] uppercase tracking-widest rounded-xl hover:scale-105 transition-transform">
                    Add Subtask
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity no-print">
            {!task.is_completed && (
              <button
                onClick={() => { setExpanded(e => !e); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all"
                title="Edit priority"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
              </button>
            )}
            <button
              onClick={() => onDelete(task.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-all"
              title="Delete task"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Render children subtasks */}
      {subtasks.length > 0 && (
        <div className="pl-6 mt-2 flex flex-col gap-2 border-l border-[var(--color-outline-variant)]/20 ml-6 relative">
          {subtasks.map((sub, sidx) => (
            <TaskRow
              key={sub.id}
              task={sub}
              idx={sidx}
              onComplete={onComplete}
              onDelete={onDelete}
              onChangePriority={onChangePriority}
              projects={projects}
              allTasks={allTasks}
              subtasks={allTasks.filter(t => t.parent_task_id === sub.id)}
              onAddSubtask={onAddSubtask}
              isTaskBlocked={isTaskBlocked}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TasksPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [tasks, setTasks]         = useState<Task[]>([]);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<Filter>('pending');
  const [newTitle, setNewTitle]   = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [showAdd, setShowAdd]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // New states for Projects & Subtasks
  const [collapsedProjects, setCollapsedProjects] = useState<Record<number, boolean>>({});
  const [showAddProject, setShowAddProject]       = useState(false);
  const [newProjectTitle, setNewProjectTitle]     = useState('');
  const [newProjectColor, setNewProjectColor]     = useState('#D2BBFF');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<number | null>(null);
  const [newTags, setNewTags]                     = useState('');
  const [newDependencyId, setNewDependencyId]     = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [dashboardData, projectsData] = await Promise.all([
        fetchDashboard(),
        fetchProjects(),
      ]);
      setTasks(dashboardData.tasks ?? []);
      setProjects(projectsData ?? []);
    } catch {
      setError('Cannot reach the server.');
    } finally {
      setLoading(false);
    }
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
        newDependencyId ? String(newDependencyId) : ''
      );
      setTasks(p => [t, ...p]);
      setNewTitle('');
      setNewTags('');
      setSelectedProjectId(null);
      setSelectedParentTaskId(null);
      setNewDependencyId(null);
      setShowAdd(false);
      showToast('Action logged in Priority Queue', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to create task', 'error');
    }
  };

  const handleAddProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    try {
      const p = await createProject(newProjectTitle.trim(), newProjectColor);
      setProjects(prev => [p, ...prev]);
      setNewProjectTitle('');
      setShowAddProject(false);
      showToast('Project container established', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to create project', 'error');
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      // unlink tasks
      setTasks(prev => prev.map(t => t.project_id === id ? { ...t, project_id: null } : t));
      showToast('Project removed, actions retained', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to delete project', 'error');
    }
  };

  const handleAddSubtask = async (parentId: number, title: string) => {
    try {
      const parent = tasks.find(t => t.id === parentId);
      const sub = await createTask(
        title,
        parent ? parent.priority : 'medium',
        parent ? parent.project_id : null,
        parentId,
        '',
        ''
      );
      setTasks(p => [sub, ...p]);
      showToast('Sub-outcome mapped successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to add subtask', 'error');
    }
  };

  const isTaskBlocked = (task: Task): { blocked: boolean; blockingTitle?: string } => {
    if (!task.dependencies) return { blocked: false };
    const depIds = task.dependencies.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    for (const depId of depIds) {
      const depTask = tasks.find(t => t.id === depId);
      if (depTask && !depTask.is_completed) {
        return { blocked: true, blockingTitle: depTask.title };
      }
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

  const handleDelete = async (id: number) => {
    await deleteTask(id);
    setTasks(p => p.filter(t => t.id !== id));
  };

  const handlePriority = async (id: number, priority: Priority) => {
    await updateTask(id, { priority });
    setTasks(p => p.map(t => t.id === id ? { ...t, priority } : t));
  };

  const filtered = tasks.filter(t =>
    filter === 'all'     ? true :
    filter === 'pending' ? !t.is_completed :
    t.is_completed
  );

  const pending = tasks.filter(t => !t.is_completed).length;
  const done    = tasks.filter(t => t.is_completed).length;
  const pct     = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  const TABS: { id: Filter; label: string; count: number }[] = [
    { id: 'pending', label: 'Pending', count: pending },
    { id: 'done',    label: 'Done',    count: done },
    { id: 'all',     label: 'All',     count: tasks.length },
  ];

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar w-full page-enter">
      {/* Ambient orbs */}
      <div className="fixed top-[10%] right-[5%] w-80 h-80 bg-[var(--color-primary)]/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-[20%] left-[5%] w-96 h-96 bg-[var(--color-secondary)]/4 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-8 pb-24 flex flex-col gap-6">

        {/* ── Header ────────────────────────────────────── */}
        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-[var(--color-on-surface)] mb-1">
              Priority Queue
            </h1>
            <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)] opacity-70">
              {loading ? 'Loading…' : `${pending} pending · ${done} complete · ${pct}% done`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddProject(v => !v)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[var(--color-secondary)]/20 text-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/10 font-label-sm text-label-sm uppercase tracking-widest transition-all press-scale"
            >
              <span className="material-symbols-outlined text-[20px]">{showAddProject ? 'close' : 'folder'}</span>
              {showAddProject ? 'Cancel Project' : 'New Project'}
            </button>
            <button
              onClick={() => setShowAdd(v => !v)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-label-sm text-label-sm uppercase tracking-widest transition-all press-scale ${
                showAdd
                  ? 'bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface-variant)]'
                  : 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[0_0_20px_color-mix(in_srgb,var(--color-primary)_30%,transparent)] hover:shadow-[0_0_28px_color-mix(in_srgb,var(--color-primary)_50%,transparent)]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{showAdd ? 'close' : 'add'}</span>
              {showAdd ? 'Cancel' : 'New Task'}
            </button>
          </div>
        </section>

        {error && (
          <div className="bg-[var(--color-error-container)]/20 border border-[var(--color-error)]/30 rounded-xl px-4 py-3 text-[var(--color-error)] text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">warning</span>{error}
          </div>
        )}

        {/* ── Progress bar ──────────────────────────────── */}
        {tasks.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-[var(--color-surface-container-highest)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-label-sm text-[11px] text-[var(--color-outline)] shrink-0">{pct}%</span>
          </div>
        )}

        {/* ── New Project Form ───────────────────────────── */}
        {showAddProject && (
          <form onSubmit={handleAddProject} className="glass-panel rounded-2xl p-5 flex flex-col gap-4 anim-fade-up">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--color-secondary)] text-[22px]">folder</span>
              <input
                autoFocus
                value={newProjectTitle}
                onChange={e => setNewProjectTitle(e.target.value)}
                placeholder="Project Title…"
                className="flex-1 bg-transparent outline-none text-[var(--color-on-surface)] font-body-md text-[15px] placeholder:text-[var(--color-outline)]"
              />
            </div>
            <div className="flex items-center gap-4 pl-8 flex-wrap">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest">Accent Color:</span>
              <div className="flex gap-2">
                {["#D2BBFF", "#5ADACE", "#FF8DA1", "#F5D0A9", "#A8E6CF"].map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setNewProjectColor(c)}
                    className={`w-6 h-6 rounded-full border transition-all ${newProjectColor === c ? 'scale-110 border-white ring-2 ring-[var(--color-secondary)]' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={!newProjectTitle.trim()}
                  className="px-5 py-1.5 bg-[var(--color-secondary)] text-black font-bold rounded-full font-label-sm text-label-sm disabled:opacity-40 transition-all uppercase tracking-widest text-[11px]"
                >
                  Create Project
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── Quick Add Task Form ────────────────────────── */}
        {showAdd && (
          <form
            onSubmit={handleAdd}
            className="glass-panel rounded-2xl p-5 flex flex-col gap-4 anim-fade-up"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--color-primary)] text-[20px]">task_alt</span>
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Task Title…"
                className="flex-1 bg-transparent outline-none text-[var(--color-on-surface)] font-body-md text-[15px] placeholder:text-[var(--color-outline)]"
              />
            </div>
            
            {/* Project, Parent Task, and Dependency dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-8">
              <label className="flex flex-col gap-1 text-[10px] text-[var(--color-outline)] uppercase tracking-widest">
                Project
                <select
                  value={selectedProjectId || ''}
                  onChange={e => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : null)}
                  className="bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] rounded-xl px-3 py-2 font-label-sm text-[12px] border border-[var(--color-outline-variant)]/20 outline-none"
                >
                  <option value="">No Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[10px] text-[var(--color-outline)] uppercase tracking-widest">
                Parent Task
                <select
                  value={selectedParentTaskId || ''}
                  onChange={e => setSelectedParentTaskId(e.target.value ? parseInt(e.target.value) : null)}
                  className="bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] rounded-xl px-3 py-2 font-label-sm text-[12px] border border-[var(--color-outline-variant)]/20 outline-none"
                >
                  <option value="">Top-level Task</option>
                  {tasks.filter(t => !t.is_completed && !t.parent_task_id).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[10px] text-[var(--color-outline)] uppercase tracking-widest">
                Blocking Dependency
                <select
                  value={newDependencyId || ''}
                  onChange={e => setNewDependencyId(e.target.value ? parseInt(e.target.value) : null)}
                  className="bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] rounded-xl px-3 py-2 font-label-sm text-[12px] border border-[var(--color-outline-variant)]/20 outline-none"
                >
                  <option value="">No Dependency</option>
                  {tasks.filter(t => !t.is_completed).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-3 pl-8 flex-wrap">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest">Priority:</span>
              <div className="flex gap-1.5">
                {(['high', 'medium', 'low'] as Priority[]).map(p => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setNewPriority(p)}
                    className={`px-3 py-1 rounded-full font-label-sm text-[10px] uppercase tracking-widest border transition-all press-scale ${
                      newPriority === p ? 'scale-105 opacity-100 font-bold' : 'opacity-50 hover:opacity-80'
                    }`}
                    style={{
                      color: PRIORITY_META[p].color,
                      backgroundColor: newPriority === p ? PRIORITY_META[p].bg : 'transparent',
                      borderColor: `color-mix(in srgb, ${PRIORITY_META[p].color} 30%, transparent)`,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-w-[200px] flex gap-2">
                <input
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  placeholder="Tags (e.g. ui, design)…"
                  className="flex-1 bg-[var(--color-surface-container-high)]/60 border border-[var(--color-outline-variant)]/20 rounded-xl px-3 py-1.5 text-[12px] text-[var(--color-on-surface)] outline-none placeholder:text-[var(--color-outline)] focus:border-[var(--color-primary)]/40"
                />
              </div>

              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-5 py-1.5 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full font-label-sm text-label-sm disabled:opacity-40 transition-all uppercase tracking-widest text-[11px]"
                >
                  Create Task
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── Filter tabs ───────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-[var(--color-outline-variant)]/20 pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-label-sm text-[11px] uppercase tracking-widest transition-all press-scale ${
                filter === tab.id
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]/80 border border-[var(--color-primary)]/20 shadow-sm'
                  : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                filter === tab.id ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-[var(--color-surface-variant)] text-[var(--color-outline)]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
          <div className="ml-auto">
            <button
              onClick={() => navigate('/focus')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--color-secondary)]/30 text-[var(--color-secondary)] font-label-sm text-[11px] uppercase tracking-widest hover:bg-[var(--color-secondary)]/8 transition-all press-scale"
            >
              <span className="material-symbols-outlined text-[14px]">self_improvement</span>
              Focus
            </button>
          </div>
        </div>

        {/* ── Collapsible Projects Sections List ─────────── */}
        <div className="flex flex-col gap-6">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-36 rounded-3xl bg-[var(--color-surface-container)]/50 animate-pulse" />
            ))
          ) : (
            <>
              {projects.map(proj => {
                const projTasks = filtered.filter(t => t.project_id === proj.id && !t.parent_task_id);
                const isCollapsed = collapsedProjects[proj.id] ?? false;

                return (
                  <div key={proj.id} className="bg-[var(--color-surface-container-low)]/40 rounded-3xl p-6 border border-[var(--color-outline-variant)]/15 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div 
                        className="flex items-center gap-3 cursor-pointer select-none group/title" 
                        onClick={() => setCollapsedProjects(prev => ({ ...prev, [proj.id]: !isCollapsed }))}
                      >
                        <span className="w-3.5 h-3.5 rounded-full shadow-sm animate-pulse" style={{ backgroundColor: proj.color }} />
                        <div>
                          <h3 className="font-title-md text-[17px] text-[var(--color-on-surface)] flex items-center gap-1.5 group-hover/title:text-[var(--color-primary)] transition-colors">
                            {proj.title}
                            <span 
                              className="material-symbols-outlined text-[18px] text-[var(--color-outline)] transition-transform duration-200" 
                              style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none' }}
                            >
                              expand_more
                            </span>
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 no-print">
                        <span className="font-label-sm text-[10px] bg-[var(--color-surface-variant)] text-[var(--color-outline)] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {projTasks.length} task{projTasks.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={() => handleDeleteProject(proj.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-outline)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-all"
                          title="Delete Project"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="flex flex-col gap-2 mt-2">
                        {projTasks.length === 0 ? (
                          <div className="text-center py-6 text-[var(--color-outline)] font-body-md text-[12px] border border-dashed border-[var(--color-outline-variant)]/20 rounded-2xl opacity-60">
                            No active tasks in this project.
                          </div>
                        ) : (
                          projTasks.map((task, idx) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              idx={idx}
                              onComplete={handleComplete}
                              onDelete={handleDelete}
                              onChangePriority={handlePriority}
                              projects={projects}
                              allTasks={tasks}
                              subtasks={filtered.filter(t => t.parent_task_id === task.id)}
                              onAddSubtask={handleAddSubtask}
                              isTaskBlocked={isTaskBlocked}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Standalone Tasks (No Project) */}
              {(() => {
                const standaloneTasks = filtered.filter(t => !t.project_id && !t.parent_task_id);
                return (
                  <div className="bg-[var(--color-surface-container-low)]/30 rounded-3xl p-6 border border-dashed border-[var(--color-outline-variant)]/20">
                    <h3 className="font-title-md text-[16px] text-[var(--color-on-surface-variant)] mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-[var(--color-outline)]">inbox</span>
                      Standalone Actions
                    </h3>
                    <div className="flex flex-col gap-2">
                      {standaloneTasks.length === 0 ? (
                        <p className="text-center py-4 font-body-md text-[12px] text-[var(--color-outline)] opacity-50">All standalone actions sorted.</p>
                      ) : (
                        standaloneTasks.map((task, idx) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            idx={idx}
                            onComplete={handleComplete}
                            onDelete={handleDelete}
                            onChangePriority={handlePriority}
                            projects={projects}
                            allTasks={tasks}
                            subtasks={filtered.filter(t => t.parent_task_id === task.id)}
                            onAddSubtask={handleAddSubtask}
                            isTaskBlocked={isTaskBlocked}
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
  );
}
