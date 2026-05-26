import { useState, useEffect } from 'react';
import { 
  fetchGoals, fetchQuarterlyScorecard, 
  createQuarterlyObjective, updateQuarterlyObjective, deleteQuarterlyObjective,
  type Goal, type QuarterlyObjective 
} from '../api';

export function QuarterlyPage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [quarter, setQuarter] = useState(() => Math.floor(new Date().getMonth() / 3) + 1);
  const [objectives, setObjectives] = useState<QuarterlyObjective[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [outcome, setOutcome] = useState('');
  const [goalId, setGoalId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [year, quarter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [objs, gs] = await Promise.all([
        fetchQuarterlyScorecard(year, quarter),
        fetchGoals()
      ]);
      setObjectives(objs);
      setGoals(gs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const newObj = await createQuarterlyObjective({
        year,
        quarter,
        title,
        outcome,
        goal_id: goalId === '' ? null : Number(goalId)
      });
      setObjectives([...objectives, newObj]);
      setShowForm(false);
      setTitle('');
      setOutcome('');
      setGoalId('');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteQuarterlyObjective(id);
    setObjectives(objectives.filter(o => o.id !== id));
  };

  const handleStatusChange = async (id: number, status: QuarterlyObjective['status']) => {
    setObjectives(objectives.map(o => o.id === id ? { ...o, status } : o));
    await updateQuarterlyObjective(id, { status });
  };

  const STATUS_CONFIG: Record<string, { label: string, color: string, icon: string }> = {
    'not_started': { label: 'Not Started', color: 'var(--color-outline)', icon: 'trip_origin' },
    'on_track': { label: 'On Track', color: 'var(--color-secondary)', icon: 'trending_up' },
    'at_risk': { label: 'At Risk', color: 'orange', icon: 'warning' },
    'completed': { label: 'Completed', color: 'var(--color-primary)', icon: 'check_circle' },
  };

  return (
    <div className="flex-1 overflow-y-auto w-full no-scrollbar relative z-10 page-enter pb-24 md:pb-0">
      <div className="absolute top-[10%] right-[10%] w-[300px] h-[300px] bg-[var(--color-primary)]/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-[20%] left-[5%] w-[400px] h-[400px] bg-[var(--color-secondary)]/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] pt-6 md:pt-12 pb-12 flex flex-col gap-8">
        
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-headline-lg text-[32px] md:text-[40px] text-[var(--color-on-surface)]">
              Quarterly Objectives
            </h2>
            <p className="font-body-md text-[var(--color-on-surface-variant)] mt-1 opacity-70">
              Bridge the gap between yearly goals and weekly execution.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-[var(--color-surface-container-low)] p-2 rounded-xl border border-[var(--color-outline-variant)]/20">
            <div className="flex items-center gap-2 pr-4 border-r border-[var(--color-outline-variant)]/20">
              <button onClick={() => setYear(year - 1)} className="material-symbols-outlined text-[18px] text-[var(--color-outline)] hover:text-[var(--color-on-surface)]">chevron_left</button>
              <span className="font-title-md text-[16px]">{year}</span>
              <button onClick={() => setYear(year + 1)} className="material-symbols-outlined text-[18px] text-[var(--color-outline)] hover:text-[var(--color-on-surface)]">chevron_right</button>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(q => (
                <button 
                  key={q} 
                  onClick={() => setQuarter(q)}
                  className={`w-10 h-8 rounded-lg font-label-sm text-[11px] font-bold transition-all ${quarter === q ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[0_0_15px_rgba(210,187,255,0.4)]' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'}`}
                >
                  Q{q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scorecard Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['not_started', 'on_track', 'at_risk', 'completed'].map(status => {
            const count = objectives.filter(o => o.status === status).length;
            const config = STATUS_CONFIG[status];
            return (
              <div key={status} className="glass-panel p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]" style={{ color: config.color }}>{config.icon}</span>
                  <span className="font-label-sm text-[10px] uppercase tracking-widest" style={{ color: config.color }}>{config.label}</span>
                </div>
                <span className="font-display-lg text-[32px] leading-none text-[var(--color-on-surface)]">{loading ? '-' : count}</span>
              </div>
            );
          })}
        </div>

        {/* Objectives List */}
        <div className="flex items-center justify-between mt-4">
          <h3 className="font-title-md text-[18px] text-[var(--color-on-surface)]">Q{quarter} Scorecard</h3>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 font-label-sm text-[11px] uppercase tracking-widest hover:bg-[var(--color-primary)]/20 transition-all press-scale"
          >
            <span className="material-symbols-outlined text-[16px]">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancel' : 'New Objective'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="glass-panel rounded-2xl p-6 flex flex-col gap-4 border border-[var(--color-primary)]/30 anim-fade-up">
            <h4 className="font-title-md text-[16px] text-[var(--color-primary)]">Define Quarterly Objective</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Objective title..." autoFocus
                className="bg-[var(--color-surface-container)] px-4 py-3 rounded-xl outline-none border border-[var(--color-outline-variant)]/20 focus:border-[var(--color-primary)]/50 font-body-md"
              />
              <select 
                value={goalId} onChange={e => setGoalId(e.target.value === '' ? '' : Number(e.target.value))}
                className="bg-[var(--color-surface-container)] px-4 py-3 rounded-xl outline-none border border-[var(--color-outline-variant)]/20 font-body-md text-[var(--color-on-surface-variant)]"
              >
                <option value="">-- Optional: Link to Yearly Goal --</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
            <textarea 
              value={outcome} onChange={e => setOutcome(e.target.value)}
              placeholder="What does success look like? (Outcome)"
              className="bg-[var(--color-surface-container)] px-4 py-3 rounded-xl outline-none border border-[var(--color-outline-variant)]/20 focus:border-[var(--color-primary)]/50 font-body-md min-h-[80px] resize-none"
            />
            <div className="flex justify-end mt-2">
              <button type="submit" disabled={saving} className="px-6 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-xl font-label-sm text-[11px] uppercase tracking-widest font-bold disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Objective'}
              </button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-4">
          {loading ? (
             <div className="animate-pulse flex flex-col gap-4">
               {[1,2,3].map(i => <div key={i} className="h-24 bg-[var(--color-surface-container-low)] rounded-2xl" />)}
             </div>
          ) : objectives.length === 0 ? (
            <div className="glass-panel p-10 text-center rounded-2xl flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-[48px] text-[var(--color-outline)]">flag</span>
              <p className="font-body-md text-[var(--color-on-surface-variant)]">No objectives set for Q{quarter} {year}.</p>
            </div>
          ) : (
            objectives.map(obj => {
              const goal = goals.find(g => g.id === obj.goal_id);
              const config = STATUS_CONFIG[obj.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['not_started'];
              
              return (
                <div key={obj.id} className="glass-panel rounded-2xl p-5 md:p-6 flex flex-col gap-4 group anim-fade-up hover:border-[var(--color-outline-variant)]/40 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <select 
                          value={obj.status}
                          onChange={(e) => handleStatusChange(obj.id, e.target.value as any)}
                          className="font-label-sm text-[10px] uppercase tracking-widest font-bold bg-transparent outline-none cursor-pointer appearance-none"
                          style={{ color: config.color }}
                        >
                          {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
                            <option key={val} value={val} className="text-black">{conf.label}</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined text-[14px]" style={{ color: config.color }}>{config.icon}</span>
                        {goal && (
                          <div className="ml-3 px-2 py-0.5 rounded bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] font-label-sm text-[9px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">track_changes</span>
                            {goal.title}
                          </div>
                        )}
                      </div>
                      <h4 className="font-title-md text-[18px] text-[var(--color-on-surface)] leading-snug">{obj.title}</h4>
                      {obj.outcome && <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] mt-2 opacity-80">{obj.outcome}</p>}
                    </div>
                    
                    <button 
                      onClick={() => handleDelete(obj.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-error)]/10 text-[var(--color-outline)] hover:text-[var(--color-error)] shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
