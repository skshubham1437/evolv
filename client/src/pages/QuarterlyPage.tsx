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

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [outcome, setOutcome] = useState('');
  const [goalId, setGoalId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [year, quarter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [objs, gs] = await Promise.all([
        fetchQuarterlyScorecard(year, quarter),
        fetchGoals()
      ]);
      setObjectives(objs); setGoals(gs);
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
        year, quarter, title, outcome,
        goal_id: goalId === '' ? null : Number(goalId)
      });
      setObjectives([...objectives, newObj]);
      setShowForm(false); setTitle(''); setOutcome(''); setGoalId('');
    } finally { setSaving(false); }
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
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] items-center overflow-hidden">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[var(--color-outline-variant)] relative">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between px-8 py-6 border-b border-[var(--color-outline-variant)] shrink-0 bg-[var(--color-surface-container-lowest)] gap-4">
          <div>
            <h2 className="font-title-md text-[32px] font-medium tracking-tight text-[var(--color-primary-fixed)]">
              Quarterly Objectives
            </h2>
            <p className="font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest mt-1 font-bold">
              YEAR {year} • Q{quarter} SCORECARD
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 pr-4 border-r border-[var(--color-outline-variant)]/50">
              <button onClick={() => setYear(year - 1)} className="material-symbols-outlined text-[18px] text-[var(--color-outline)] hover:text-[var(--color-primary)] transition-colors">chevron_left</button>
              <span className="font-label-sm text-[12px] font-bold">{year}</span>
              <button onClick={() => setYear(year + 1)} className="material-symbols-outlined text-[18px] text-[var(--color-outline)] hover:text-[var(--color-primary)] transition-colors">chevron_right</button>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map(q => (
                <button 
                  key={q} 
                  onClick={() => setQuarter(q)}
                  className={`w-9 h-8 font-label-sm text-[11px] font-bold uppercase tracking-widest transition-colors border flex items-center justify-center ${
                    quarter === q 
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-black' 
                      : 'border-[var(--color-outline-variant)] text-[var(--color-outline)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  Q{q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-[var(--color-surface-container-low)]">
          {/* Scorecard Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--color-outline-variant)] border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
            {['not_started', 'on_track', 'at_risk', 'completed'].map(status => {
              const count = objectives.filter(o => o.status === status).length;
              const config = STATUS_CONFIG[status];
              return (
                <div key={status} className="p-6 flex flex-col justify-center items-center text-center gap-2 relative group">
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-[10px] uppercase tracking-widest font-bold" style={{ color: config.color }}>{config.label}</span>
                  </div>
                  <span className="text-[32px] font-medium leading-none text-[var(--color-on-surface)]">
                    {loading ? '-' : count}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-8">
            <div className="flex items-center justify-between mb-6 pl-1 border-l-2 border-[var(--color-primary)]">
              <h3 className="font-label-sm text-[11px] uppercase tracking-widest text-[var(--color-primary)] font-bold ml-3">
                Scorecard Overview
              </h3>
              <button 
                onClick={() => setShowForm(!showForm)}
                className="font-label-sm text-[10px] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] uppercase tracking-widest flex items-center gap-1 font-bold"
              >
                <span className="material-symbols-outlined text-[14px]">{showForm ? 'close' : 'add'}</span>
                {showForm ? 'Cancel' : 'New Objective'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleCreate} className="bg-[var(--color-surface-container)] border border-[var(--color-primary)]/20 p-6 mb-8 relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)]" />
                <h4 className="font-label-sm text-[10px] text-[var(--color-primary)] uppercase tracking-widest font-bold mb-4">Define Objective</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <label className="block">
                    <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-2">Title *</span>
                    <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
                      className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-primary)]" />
                  </label>
                  <label className="block">
                    <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-2">Link Yearly Goal</span>
                    <select value={goalId} onChange={e => setGoalId(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-primary)]">
                      <option value="" className="bg-[var(--color-surface-container-high)]">-- None --</option>
                      {goals.map(g => (
                        <option key={g.id} value={g.id} className="bg-[var(--color-surface-container-high)]">{g.title}</option>
                      ))}
                    </select>
                  </label>
                </div>
                
                <label className="block mb-4">
                  <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest block mb-2">Outcome</span>
                  <textarea value={outcome} onChange={e => setOutcome(e.target.value)} rows={2}
                    className="w-full bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[var(--color-on-surface)] font-body-md outline-none focus:border-[var(--color-primary)] resize-none" />
                </label>

                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={saving} className="px-6 py-2 bg-[var(--color-primary)] text-black font-label-sm text-[11px] font-bold disabled:opacity-50 uppercase tracking-widest hover:bg-[var(--color-primary-fixed)] transition-colors">
                    {saving ? 'Creating...' : 'Create Objective'}
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-col gap-4">
              {loading ? (
                <div className="animate-pulse flex flex-col gap-4">
                  {[1,2,3].map(i => <div key={i} className="h-28 bg-[var(--color-surface-container)] border border-[var(--color-surface-variant)]" />)}
                </div>
              ) : objectives.length === 0 ? (
                <div className="text-center py-16 opacity-50 font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest border border-dashed border-[var(--color-surface-variant)]">
                  NO OBJECTIVES SET FOR Q{quarter} {year}.
                </div>
              ) : (
                objectives.map(obj => {
                  const goal = goals.find(g => g.id === obj.goal_id);
                  const config = STATUS_CONFIG[obj.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['not_started'];
                  const isCompleted = obj.status === 'completed';
                  
                  return (
                    <div key={obj.id} className="bg-[var(--color-surface-container)] border border-[var(--color-surface-variant)] p-5 md:p-6 flex flex-col gap-4 group hover:border-[var(--color-outline-variant)] transition-colors relative overflow-hidden">
                      {isCompleted && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)]" />}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pl-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <select 
                              value={obj.status}
                              onChange={(e) => handleStatusChange(obj.id, e.target.value as any)}
                              className="font-label-sm text-[10px] uppercase tracking-widest font-bold bg-transparent outline-none cursor-pointer border-b border-transparent hover:border-current pb-0.5"
                              style={{ color: config.color }}
                            >
                              {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
                                <option key={val} value={val} className="text-[var(--color-on-surface)] bg-[var(--color-surface-container-high)]">{conf.label}</option>
                              ))}
                            </select>
                            {goal && (
                              <div className="px-2 py-0.5 border border-[var(--color-surface-variant)] text-[var(--color-outline)] font-label-sm text-[9px] uppercase tracking-widest font-bold">
                                Goal: {goal.title}
                              </div>
                            )}
                          </div>
                          <h4 className="text-[16px] text-[var(--color-on-surface)]/80 font-semibold leading-snug">
                            {obj.title}
                          </h4>
                          {obj.outcome && <p className="font-body-md text-[13px] text-[var(--color-outline)] mt-1.5 opacity-80">{obj.outcome}</p>}
                        </div>
                        
                        <button 
                          onClick={() => handleDelete(obj.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 flex items-center justify-center text-[var(--color-outline)] hover:text-red-400 shrink-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
