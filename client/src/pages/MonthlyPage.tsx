import { useState, useEffect } from 'react';
import { 
  fetchMonthlyPlan, upsertMonthlyPlan,
  fetchFocusAreas, type FocusArea,
  fetchGoals, type Goal,
  generateMonthlyReview
} from '../api';
import { useToast } from '../context/ToastContext';
import { FormatMarkdown } from './WeeklyPage';

export function MonthlyPage() {
  const { showToast } = useToast();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1); // 1-12
  
  const [theme, setTheme] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<number[]>([]);
  const [lifeScores, setLifeScores] = useState<Record<number, number>>({});
  
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewSummary, setReviewSummary] = useState('');
  const [generatingReview, setGeneratingReview] = useState(false);

  useEffect(() => {
    loadData();
  }, [year, month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [planData, areasData, goalsData] = await Promise.all([
        fetchMonthlyPlan(year, month),
        fetchFocusAreas(),
        fetchGoals()
      ]);
      
      setFocusAreas(areasData);
      setAllGoals(goalsData);
      setTheme(planData.theme || '');
      setReviewSummary(planData.review_summary || '');
      
      let parsedGoals: number[] = [];
      try { parsedGoals = JSON.parse(planData.goals || '[]'); } catch {}
      setSelectedGoals(parsedGoals);
      
      let parsedScores: Record<number, number> = {};
      try { parsedScores = JSON.parse(planData.life_scores || '{}'); } catch {}
      
      // If no scores saved, use current focus areas as default for new plan
      if (Object.keys(parsedScores).length === 0 && areasData.length > 0) {
        areasData.forEach(fa => { parsedScores[fa.id] = fa.current_score; });
      }
      setLifeScores(parsedScores);
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertMonthlyPlan({
        year,
        month,
        theme,
        goals: JSON.stringify(selectedGoals),
        life_scores: JSON.stringify(lifeScores)
      });
      // reload to sync
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateReview = async () => {
    setGeneratingReview(true);
    try {
      const updated = await generateMonthlyReview(year, month);
      setReviewSummary(updated.review_summary || '');
      showToast('Monthly AI Retrospective generated successfully!', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to generate monthly review', 'error');
    } finally {
      setGeneratingReview(false);
    }
  };

  const toggleGoal = (id: number) => {
    setSelectedGoals(prev => prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Generate SVG Polygon points based on snapshot values
  const getRadarPoints = (radius: number = 70) => {
    if (!focusAreas.length) return "";
    const cx = 100, cy = 100;
    const angleStep = (Math.PI * 2) / focusAreas.length;
    
    return focusAreas.map((fa, i) => {
      const value = lifeScores[fa.id] || 5; // Default to 5 if missing
      const r = (Math.max(value, 1) / 10) * radius;
      const angle = (i * angleStep) - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");
  };

  const getBaseRadarPoints = (radius: number = 70) => {
    if (!focusAreas.length) return "";
    const cx = 100, cy = 100;
    const angleStep = (Math.PI * 2) / focusAreas.length;
    return focusAreas.map((_fa, i) => {
      const angle = (i * angleStep) - Math.PI / 2;
      return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
    }).join(" ");
  };

  return (
    <div className="flex-1 overflow-y-auto w-full no-scrollbar relative z-10 page-enter pb-24 md:pb-0">
      <div className="absolute top-[10%] right-[20%] w-[400px] h-[400px] bg-[var(--color-secondary)]/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-[10%] left-[10%] w-[300px] h-[300px] bg-[var(--color-primary)]/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] pt-6 md:pt-12 pb-12 flex flex-col gap-8">
        
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-headline-lg text-[32px] md:text-[40px] text-[var(--color-on-surface)]">
              Monthly Planning
            </h2>
            <p className="font-body-md text-[var(--color-on-surface-variant)] mt-1 opacity-70">
              Set the theme and focus for the month ahead.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-[var(--color-surface-container-low)] p-2 rounded-xl border border-[var(--color-outline-variant)]/20">
            <button 
              onClick={() => {
                if (month === 1) { setYear(y => y - 1); setMonth(12); }
                else setMonth(m => m - 1);
              }} 
              className="material-symbols-outlined text-[18px] text-[var(--color-outline)] hover:text-[var(--color-on-surface)]"
            >
              chevron_left
            </button>
            <span className="font-title-md text-[16px] min-w-[120px] text-center">{monthNames[month-1]} {year}</span>
            <button 
              onClick={() => {
                if (month === 12) { setYear(y => y + 1); setMonth(1); }
                else setMonth(m => m + 1);
              }} 
              className="material-symbols-outlined text-[18px] text-[var(--color-outline)] hover:text-[var(--color-on-surface)]"
            >
              chevron_right
            </button>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse flex flex-col gap-6">
            <div className="h-32 bg-[var(--color-surface-container-low)] rounded-2xl" />
            <div className="h-64 bg-[var(--color-surface-container-low)] rounded-2xl" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Theme & Focus */}
            <div className="md:col-span-8 flex flex-col gap-6">
              
              <section className="glass-panel p-6 md:p-8 rounded-2xl flex flex-col gap-4 border border-[var(--color-secondary)]/20 hover:border-[var(--color-secondary)]/40 transition-colors">
                <h3 className="font-title-md text-[18px] text-[var(--color-secondary)] flex items-center gap-2">
                  <span className="material-symbols-outlined">auto_awesome</span> Focus Theme
                </h3>
                <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] opacity-80">
                  A single guiding principle or objective for the month.
                </p>
                <input 
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  placeholder="e.g. Deep Work & Delivery"
                  className="bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] px-4 py-4 rounded-xl border border-[var(--color-outline-variant)]/20 focus:border-[var(--color-secondary)]/60 outline-none font-display-lg text-[24px] w-full"
                />
              </section>

              <section className="glass-panel p-6 md:p-8 rounded-2xl flex flex-col gap-4 border border-[var(--color-primary)]/20 hover:border-[var(--color-primary)]/40 transition-colors">
                <h3 className="font-title-md text-[18px] text-[var(--color-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined">rocket_launch</span> Goal Targeting
                </h3>
                <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] opacity-80 mb-2">
                  Select the yearly goals that you will actively push forward this month.
                </p>
                <div className="flex flex-col gap-2">
                  {allGoals.length === 0 ? (
                    <p className="text-[var(--color-outline)] text-[13px]">No active goals found. Create some in the Goals section.</p>
                  ) : (
                    allGoals.map(goal => {
                      const gid = Number(goal.id);
                      const isSelected = selectedGoals.includes(gid);
                      return (
                        <div 
                          key={goal.id} 
                          onClick={() => toggleGoal(gid)}
                          className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${
                            isSelected 
                              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/40' 
                              : 'bg-[var(--color-surface-container)] border-transparent hover:border-[var(--color-outline-variant)]/20'
                          }`}
                        >
                          <div>
                            <h4 className={`font-title-md text-[16px] ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface)]'}`}>{goal.title}</h4>
                          </div>
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                            isSelected ? 'bg-[var(--color-primary)] text-white' : 'border-2 border-[var(--color-outline-variant)]'
                          }`}>
                            {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </section>
              
            </div>

            {/* Radar Chart Snapshot */}
            <div className="md:col-span-4 flex flex-col">
              <section className="glass-panel p-6 rounded-2xl flex flex-col h-full items-center">
                <h3 className="font-title-md text-[18px] text-[var(--color-on-surface)] self-start mb-6">Life Score Snapshot</h3>
                <div className="w-full aspect-square max-w-[250px] relative">
                  <svg className="w-full h-full drop-shadow-[0_0_15px_rgba(90,218,206,0.3)]" viewBox="0 0 200 200">
                    {[20, 40, 60].map(_r => (
                      <polygon key={_r} fill="none" points={getBaseRadarPoints(_r)} stroke="rgba(149, 142, 157, 0.15)" strokeWidth="1" />
                    ))}
                    {focusAreas.map((_fa, i) => {
                      const angle = (i * ((Math.PI * 2) / focusAreas.length)) - Math.PI / 2;
                      return <line key={i} x1="100" y1="100" x2={100 + 70 * Math.cos(angle)} y2={100 + 70 * Math.sin(angle)} stroke="rgba(149, 142, 157, 0.2)" strokeWidth="1" />
                    })}
                    {focusAreas.length > 0 && (
                      <polygon fill="none" points={getBaseRadarPoints(70)} stroke="var(--color-outline-variant)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5"/>
                    )}
                    {focusAreas.length > 0 && (
                      <polygon fill="rgba(90, 218, 206, 0.2)" points={getRadarPoints(70)} stroke="var(--color-secondary)" strokeWidth="2" className="transition-all duration-700"></polygon>
                    )}
                    {focusAreas.map((fa, i) => {
                      const angle = (i * ((Math.PI * 2) / focusAreas.length)) - Math.PI / 2;
                      const value = lifeScores[fa.id] || 5;
                      const r = (Math.max(value, 1) / 10) * 70;
                      const cx = 100 + r * Math.cos(angle);
                      const cy = 100 + r * Math.sin(angle);
                      const labelR = 90;
                      const lx = 100 + labelR * Math.cos(angle);
                      const ly = 100 + labelR * Math.sin(angle);

                      return (
                        <g key={fa.id}>
                          <text x={lx} y={ly} fontSize="7" fill="var(--color-on-surface-variant)" textAnchor="middle" alignmentBaseline="middle" className="pointer-events-none font-bold uppercase tracking-widest">{fa.name}</text>
                          <circle cx={cx} cy={cy} r="4" fill="var(--color-secondary)" className="pointer-events-none transition-all duration-700" />
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <p className="font-label-sm text-[11px] text-[var(--color-outline)] text-center mt-6 uppercase tracking-widest">
                  Snapshot taken at month start.
                </p>
              </section>
            </div>
    
  </div>

  {/* Monthly Reset & AI Retrospective */}
  <section className="glass-panel p-6 md:p-8 rounded-2xl flex flex-col gap-6 border border-t-[var(--color-secondary)]/30 border-[var(--color-outline-variant)]/20 relative overflow-hidden group mt-6">
    <div className="absolute right-[-10%] top-[-10%] w-64 h-64 bg-[var(--color-secondary)]/5 rounded-full blur-[80px] pointer-events-none" />
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[var(--color-secondary)] text-[28px] text-glow-secondary animate-pulse">psychology</span>
        <div>
          <h3 className="font-title-md text-[18px] text-[var(--color-on-surface)]">Monthly Reset & AI Retrospective</h3>
          <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] opacity-70 mt-0.5">
            Evaluate your monthly achievements, habits, and emotional trajectory with AI.
          </p>
        </div>
      </div>
      <button
        onClick={handleGenerateReview}
        disabled={generatingReview}
        className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[var(--color-secondary)] text-black font-bold text-[13px] uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(90,218,206,0.2)] hover:shadow-[0_0_30px_rgba(90,218,206,0.4)] press-scale disabled:opacity-50 min-w-[220px]"
      >
        {generatingReview ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Synthesizing Month…</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            <span>{reviewSummary ? 'Regenerate Retrospective' : 'Generate Retrospective'}</span>
          </>
        )}
      </button>
    </div>

    <div className="border-t border-[var(--color-outline-variant)]/10 pt-6">
      {reviewSummary ? (
        <FormatMarkdown text={reviewSummary} />
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-8 px-4 opacity-75">
          <span className="material-symbols-outlined text-[48px] text-[var(--color-outline)] mb-3">analytics</span>
          <p className="font-body-md text-[14px] text-[var(--color-on-surface-variant)] max-w-md">
            No retrospective has been generated for this month yet. Click the button above to synthesize your daily reflections, life scores, and targeted goals.
          </p>
        </div>
      )}
    </div>
  </section>
  </>
)}

        {/* Floating Save Bar */}
        <div className="fixed bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[var(--color-surface)]/90 backdrop-blur-xl border border-[var(--color-outline-variant)]/20 px-6 py-4 rounded-full shadow-2xl z-50">
          <span className="font-body-md text-[14px] text-[var(--color-on-surface-variant)] whitespace-nowrap">
            {saving ? 'Saving changes...' : 'Unsaved changes?'}
          </span>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-[var(--color-primary)] text-black font-bold text-[13px] px-6 py-2 rounded-full uppercase tracking-widest hover:scale-105 transition-all press-scale disabled:opacity-50"
          >
            Save Plan
          </button>
        </div>

      </div>
    </div>
  );
}
