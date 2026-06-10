import { useState, useEffect } from 'react';
import {
  fetchWeeklyOverview, createTimeBlock, deleteTimeBlock, generateWeeklyReview,
  type WeeklyOverview, type TimeBlock, type Task,
} from '../api';
import { useToast } from '../context/ToastContext';

// ── helpers ──────────────────────────────────────────────────────────────────
function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
function today() { return toDateStr(new Date()); }

function buildWeek(weekStart: string): { label: string; date: string; dayNum: number; isWeekend: boolean }[] {
  const days = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  const start = new Date(weekStart + 'T00:00:00');
  return days.map((label, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i);
    return { label, date: toDateStr(d), dayNum: d.getDate(), isWeekend: i >= 5 };
  });
}

const BLOCK_COLORS: Record<string, string> = {
  deep_work: 'border-[var(--color-primary)] text-[var(--color-primary)]',
  meeting:   'border-[var(--color-tertiary)] text-[var(--color-tertiary)]',
  break:     'border-[var(--color-secondary)] text-[var(--color-secondary)]',
  personal:  'border-[var(--color-secondary)] text-[var(--color-secondary)]',
  admin:     'border-[var(--color-outline)] text-[var(--color-on-surface-variant)]',
};

const BLOCK_TYPES = ['deep_work','meeting','break','personal','admin'];

function fmt(t: string) {
  return t; // Keep HH:MM format as seen in the design
}

function getDuration(start: string, end: string) {
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  const diffHours = (h2 + m2/60) - (h1 + m1/60);
  return diffHours > 0 ? `${diffHours}h` : '';
}

// ── sub-components ────────────────────────────────────────────────────────────

function PriorityCard({ task }: { task: Task }) {
  const isP1 = task.priority === 'high';
  const isP2 = task.priority === 'medium';
  
  const badgeColors = isP1 
    ? 'bg-[var(--color-primary)] text-black' 
    : isP2 
      ? 'bg-[var(--color-secondary)] text-black' 
      : 'bg-[var(--color-outline)] text-white';

  const barColors = isP1
    ? 'bg-[var(--color-primary)]'
    : isP2
      ? 'bg-[var(--color-secondary)]'
      : 'bg-[var(--color-outline)]';

  const pLabel = isP1 ? 'P1' : isP2 ? 'P2' : 'P3';
  const progress = task.is_completed ? 100 : 0;

  return (
    <div className="flex flex-col gap-3 p-4 bg-[var(--color-surface-container)] border border-[var(--color-surface-variant)] rounded-sm">
      <div className="flex justify-between items-start">
        <span className={`font-label-sm text-[10px] px-2 py-0.5 rounded-sm uppercase tracking-widest font-bold ${badgeColors}`}>
          {pLabel} • {task.title.split(' ')[0] || 'TASK'}
        </span>
        <span className="font-label-sm text-[10px] text-[var(--color-on-surface-variant)]">{progress}%</span>
      </div>
      <h4 className="font-title-md text-[16px] text-[var(--color-on-surface)]/80 font-semibold leading-snug">
        {task.title}
      </h4>
      <div className="w-full h-[3px] bg-[var(--color-surface-variant)] mt-1 rounded-full overflow-hidden">
        <div className={`h-full ${barColors}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

interface AddBlockFormProps {
  date: string;
  onCreated: (b: TimeBlock) => void;
  onCancel: () => void;
}
function AddBlockForm({ date, onCreated, onCancel }: AddBlockFormProps) {
  const [title, setTitle]     = useState('');
  const [start, setStart]     = useState('09:00');
  const [end, setEnd]         = useState('10:00');
  const [type, setType]       = useState('deep_work');
  const [saving, setSaving]   = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const b = await createTimeBlock({ date, start_time: start, end_time: end, title: title.trim(), notes: '', block_type: type as TimeBlock['block_type'] });
      onCreated(b);
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="bg-[var(--color-surface-container)] border border-[var(--color-primary)]/20 p-4 flex flex-col gap-3 anim-fade-up ml-20 mb-6">
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Block title…"
        className="bg-transparent border-b border-[var(--color-surface-variant)] pb-1 text-[var(--color-on-surface)] font-body-md outline-none" />
      <div className="flex gap-4 flex-wrap">
        <label className="flex flex-col gap-1 text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-label-sm">
          Start
          <input type="time" value={start} onChange={e => setStart(e.target.value)}
            className="bg-[var(--color-surface-container-high)] rounded px-2 py-1 text-[var(--color-on-surface)] font-label-sm outline-none border border-[var(--color-surface-variant)]" />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-label-sm">
          End
          <input type="time" value={end} onChange={e => setEnd(e.target.value)}
            className="bg-[var(--color-surface-container-high)] rounded px-2 py-1 text-[var(--color-on-surface)] font-label-sm outline-none border border-[var(--color-surface-variant)]" />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-label-sm">
          Type
          <select value={type} onChange={e => setType(e.target.value)}
            className="bg-[var(--color-surface-container-high)] rounded px-2 py-1 text-[var(--color-on-surface)] font-label-sm outline-none border border-[var(--color-surface-variant)] capitalize">
            {BLOCK_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
          </select>
        </label>
      </div>
      <div className="flex gap-2 justify-end mt-2">
        <button type="button" onClick={onCancel} className="px-4 py-1.5 font-label-sm text-[11px] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors">CANCEL</button>
        <button type="submit" disabled={saving} className="px-4 py-1.5 bg-[var(--color-primary)] text-black font-label-sm text-[11px] font-bold disabled:opacity-50">
          {saving ? 'SAVING…' : 'ADD BLOCK'}
        </button>
      </div>
    </form>
  );
}

export function FormatMarkdown({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="flex flex-col gap-2.5">
      {lines.map((line, idx) => {
        if (line.startsWith('###')) {
          const content = line.replace(/^###\s*/, '');
          return (
            <h4 key={idx} className="font-title-md font-bold text-[14px] text-[var(--color-primary)] mt-4 mb-1 uppercase tracking-wider first:mt-0">
              {content}
            </h4>
          );
        }
        if (line.startsWith('##')) {
          const content = line.replace(/^##\s*/, '');
          return (
            <h3 key={idx} className="font-title-md font-bold text-[16px] text-[var(--color-secondary)] mt-5 mb-2 uppercase tracking-wider">
              {content}
            </h3>
          );
        }
        if (line.startsWith('-') || line.startsWith('*')) {
          const content = line.replace(/^[-*]\s*/, '');
          return (
            <div key={idx} className="font-body-md text-sm text-[var(--color-on-surface-variant)] flex items-start gap-2 pl-1">
              <span className="text-[var(--color-primary)] font-bold mt-0.5">•</span>
              <span>{content}</span>
            </div>
          );
        }
        if (line.trim() === '') {
          return <div key={idx} className="h-1" />;
        }
        return (
          <p key={idx} className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] leading-relaxed">
            {line}
          </p>
        );
      })}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export function WeeklyPage() {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(today());
  const [data, setData]                 = useState<WeeklyOverview | null>(null);
  const [loading, setLoading]           = useState(true);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [generatingReview, setGeneratingReview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchWeeklyOverview(selectedDate).then(d => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedDate]);

  const weekDays = data ? buildWeek(data.week_start) : [];
  const score    = data?.week_score ?? 0;
  const mits: Task[]        = data?.mits ?? [];
  const blocks: TimeBlock[] = (data?.time_blocks ?? []).sort((a,b) => a.start_time.localeCompare(b.start_time));

  const handleBlockCreated = (b: TimeBlock) => {
    setData(prev => prev ? { ...prev, time_blocks: [...prev.time_blocks, b] } : prev);
    setShowAddBlock(false);
  };

  const handleDeleteBlock = async (id: number) => {
    await deleteTimeBlock(id);
    setData(prev => prev ? { ...prev, time_blocks: prev.time_blocks.filter(b => b.id !== id) } : prev);
  };

  const handleGenerateReview = async () => {
    setGeneratingReview(true);
    try {
      const updatedPlan = await generateWeeklyReview(selectedDate);
      setData(prev => prev ? { ...prev, plan: updatedPlan } : prev);
      showToast('System Reset sequence initiated and review generated.', 'success');
      setShowReviewModal(true);
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to generate weekly review', 'error');
    } finally {
      setGeneratingReview(false);
    }
  };

  const weekLabel = data ? (() => {
    return `WEEK ${data.week_number}`;
  })() : 'WEEK --';

  const completedCount = mits.filter(t => t.is_completed).length;
  const goalCompletion = mits.length > 0 ? Math.round((completedCount / mits.length) * 100) : 0;

  let focusYield = 0;
  blocks.forEach(b => {
    if (b.block_type === 'deep_work') {
      const [h1, m1] = b.start_time.split(':').map(Number);
      const [h2, m2] = b.end_time.split(':').map(Number);
      focusYield += (h2 + m2/60) - (h1 + m1/60);
    }
  });

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] items-center">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[var(--color-outline-variant)] relative">
      
      {/* ── Top Header ─────────────────────────────────────────── */}
      <div className="flex items-end justify-between px-8 py-6 border-b border-[var(--color-outline-variant)] shrink-0">
        <div>
          <h2 className="font-title-md text-[32px] font-medium tracking-tight text-[var(--color-primary-fixed)]">
            Tactical View
          </h2>
          <p className="font-label-sm text-[11px] text-[var(--color-outline)] uppercase tracking-widest mt-1 font-bold">
            {loading ? 'LOADING...' : `${weekLabel} • FOCUS MODE`}
          </p>
        </div>
        
        <div className="flex gap-10">
          <div className="flex flex-col items-end">
            <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1">Weekly Score</span>
            <span className="font-label-sm text-[28px] text-[var(--color-secondary)] font-normal tracking-tight">{loading ? '--' : score.toFixed(1)}</span>
          </div>
          <div className="w-px h-10 bg-[var(--color-outline-variant)] self-center" />
          <div className="flex flex-col items-end">
            <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1">Focus Yield</span>
            <span className="font-label-sm text-[28px] text-[var(--color-primary)] font-normal tracking-tight">{loading ? '--' : `${focusYield.toFixed(1)}h`}</span>
          </div>
          <div className="w-px h-10 bg-[var(--color-outline-variant)] self-center" />
          <div className="flex flex-col items-end">
            <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest mb-1">Goal Completion</span>
            <span className="font-label-sm text-[28px] text-[var(--color-on-surface)] font-normal tracking-tight">{loading ? '--' : `${goalCompletion}%`}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* ── Left Column (Priorities) ─────────────────────────── */}
        <div className="w-[380px] shrink-0 flex flex-col border-r border-[var(--color-outline-variant)] overflow-y-auto no-scrollbar pb-8">
          <div className="p-8 pb-6 sticky top-0 bg-[var(--color-surface-container-lowest)] z-10 border-b border-[var(--color-outline-variant)]/50">
            <h3 className="font-headline-lg-mobile text-[18px] text-[var(--color-on-surface)] font-bold mb-1">Weekly Priorities</h3>
            <p className="font-body-md text-[13px] text-[var(--color-outline)]">Strategic buckets for current sprint.</p>
          </div>
          
          <div className="flex flex-col gap-4 px-8 pt-4">
            {mits.length > 0 ? (
              mits.map((t) => <PriorityCard key={t.id} task={t} />)
            ) : (
              !loading && (
                <div className="p-4 border border-dashed border-[var(--color-surface-variant)] text-[var(--color-outline)] font-label-sm text-center">
                  NO HIGH PRIORITY TASKS
                </div>
              )
            )}
          </div>
        </div>

        {/* ── Right Column (Schedule) ──────────────────────────── */}
        <div className="flex-1 flex flex-col bg-[var(--color-surface-container-low)] relative overflow-hidden">
          
          {/* Day Navigator */}
          <div className="flex border-b border-[var(--color-outline-variant)] pt-2 px-8 shrink-0 bg-[var(--color-surface-container-low)] z-10">
            {weekDays.map(({ label, date, dayNum }) => {
              const isSelected = date === selectedDate;
              return (
                <button key={date} onClick={() => setSelectedDate(date)}
                  className={`flex-1 flex flex-col items-center justify-center pb-3 pt-4 border-b-2 transition-all ${
                    isSelected 
                      ? 'border-[var(--color-primary)] text-[var(--color-on-surface)]' 
                      : 'border-transparent text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)]'
                  }`}>
                  <span className="font-label-sm text-[10px] uppercase tracking-widest font-bold">{label}</span>
                  <span className={`text-[22px] mt-1 ${isSelected ? 'font-medium' : 'font-normal'}`}>{dayNum}</span>
                </button>
              );
            })}
          </div>

          {/* Schedule List */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-8 pb-32">
            
            <div className="flex justify-between items-center mb-6 pl-20">
               <span className="font-label-sm text-[var(--color-secondary)] text-[10px] uppercase tracking-widest">
                 {selectedDate === today() ? "Today's Blueprint" : "Daily Blueprint"}
               </span>
               <button onClick={() => setShowAddBlock(v => !v)}
                  className="font-label-sm text-[10px] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] uppercase tracking-widest flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">add</span> Add Block
               </button>
            </div>

            {showAddBlock && (
              <AddBlockForm date={selectedDate} onCreated={handleBlockCreated} onCancel={() => setShowAddBlock(false)} />
            )}

            <div className="flex flex-col gap-6 relative">
              {/* Vertical line connecting blocks */}
              <div className="absolute left-[54px] top-4 bottom-4 w-px bg-[var(--color-outline-variant)]" />

              {blocks.length === 0 && !showAddBlock && (
                <div className="pl-20 py-10 opacity-50 font-label-sm text-[11px] text-[var(--color-outline)]">
                  NO BLOCKS SCHEDULED FOR THIS DAY.
                </div>
              )}

              {blocks.map((block) => {
                const colorClass = BLOCK_COLORS[block.block_type] ?? BLOCK_COLORS.admin;
                const isDeepWork = block.block_type === 'deep_work';

                return (
                  <div key={block.id} className="flex relative group">
                    {/* Time */}
                    <div className="w-16 shrink-0 pt-3">
                      <span className="font-label-sm text-[11px] text-[var(--color-on-surface-variant)] font-bold tracking-wider">
                        {fmt(block.start_time)}
                      </span>
                    </div>

                    {/* Block Content */}
                    <div className="flex-1 pl-6">
                      <div className={`p-4 bg-[var(--color-surface-container)] border border-[var(--color-surface-variant)] rounded-sm relative overflow-hidden`}>
                        <div className={`absolute left-0 top-0 bottom-0 ${isDeepWork ? 'w-1.5' : 'w-0.5'} ${colorClass.split(' ')[0]} bg-current opacity-70`} />
                        
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {isDeepWork && <span className="material-symbols-outlined text-[14px] text-[var(--color-primary)]">psychology</span>}
                            <span className={`font-label-sm text-[10px] uppercase tracking-widest font-bold ${colorClass.split(' ')[1]}`}>
                              {block.block_type === 'deep_work' ? 'DEEP WORK BLOCK' : block.block_type.replace('_',' ')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleDeleteBlock(block.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-outline)] hover:text-red-400">
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                            <span className="bg-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] font-label-sm text-[10px] px-2 py-0.5 rounded-sm">
                              {getDuration(block.start_time, block.end_time)}
                            </span>
                          </div>
                        </div>

                        <h4 className="font-title-md text-[16px] text-[var(--color-on-surface)]/80 font-semibold leading-snug mb-1">
                          {block.title}
                        </h4>
                        {block.notes && (
                          <p className="font-body-md text-[13px] text-[var(--color-outline)]">
                            {block.notes}
                          </p>
                        )}
                        
                        {isDeepWork && (
                          <div className="flex gap-2 mt-4">
                            <span className="px-2 py-1 bg-[var(--color-surface-container-high)] border border-[var(--color-surface-variant)] text-[var(--color-outline)] font-label-sm text-[9px] uppercase tracking-widest rounded-sm">
                              Focused
                            </span>
                            <span className="px-2 py-1 bg-[var(--color-surface-container-high)] border border-[var(--color-surface-variant)] text-[var(--color-outline)] font-label-sm text-[9px] uppercase tracking-widest rounded-sm">
                              High Priority
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Shutdown Action - Fixed at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-surface-container-low)] border-t border-[var(--color-outline-variant)] p-6 z-20">
            <button 
              onClick={handleGenerateReview}
              disabled={generatingReview}
              className="w-full py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)] text-black rounded-md flex flex-col items-center justify-center transition-colors disabled:opacity-50">
              <div className="flex items-center gap-2 font-title-md font-bold text-[16px]">
                {generatingReview ? (
                  <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">power_settings_new</span>
                )}
                <span>{generatingReview ? 'Processing...' : 'Initiate Weekly Shutdown'}</span>
              </div>
            </button>
            <div className="text-center mt-3">
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest font-bold">
                {data?.plan?.review_summary ? 'REVIEW COMPLETE. SYSTEM READY FOR RESET.' : 'SYSTEM AWAITING SHUTDOWN COMMAND.'}
              </span>
            </div>
          </div>

        </div>
      </div>
      </div>
      
      {/* Review Modal overlay */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
          <div className="bg-[var(--color-surface-container)] border border-[var(--color-surface-variant)] rounded-sm max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-[var(--color-surface-variant)] flex justify-between items-center">
              <h3 className="font-title-md text-[20px] text-[var(--color-primary)] font-bold">System Review Log</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-[var(--color-outline)] hover:text-[var(--color-on-surface)]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 text-[var(--color-on-surface-variant)]">
               {data?.plan?.review_summary ? (
                 <FormatMarkdown text={data.plan.review_summary} />
               ) : (
                 <p className="text-[var(--color-outline)] font-label-sm">No review data generated.</p>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
