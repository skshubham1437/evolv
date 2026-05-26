import { useState, useEffect, useRef } from 'react';
import {
  fetchWeeklyOverview, upsertWeeklyPlan, createTimeBlock, deleteTimeBlock, generateWeeklyReview,
  type WeeklyOverview, type TimeBlock, type Task,
} from '../api';
import { useToast } from '../context/ToastContext';

// ── helpers ──────────────────────────────────────────────────────────────────
function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
function today() { return toDateStr(new Date()); }

function buildWeek(weekStart: string): { label: string; date: string; isWeekend: boolean }[] {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const start = new Date(weekStart + 'T00:00:00');
  return days.map((label, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i);
    return { label, date: toDateStr(d), isWeekend: i >= 5 };
  });
}

const BLOCK_COLORS: Record<string, string> = {
  deep_work: 'border-l-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]',
  meeting:   'border-l-[var(--color-tertiary)] bg-[var(--color-tertiary)]/5 text-[var(--color-tertiary)]',
  break:     'border-l-[var(--color-secondary)] bg-[var(--color-secondary)]/5 text-[var(--color-secondary)]',
  personal:  'border-l-[var(--color-secondary)] bg-[var(--color-secondary)]/5 text-[var(--color-secondary)]',
  admin:     'border-l-[var(--color-outline)] bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]',
};

const BLOCK_TYPES = ['deep_work','meeting','break','personal','admin'];

function fmt(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
}

// ── sub-components ────────────────────────────────────────────────────────────
function MITCard({ task, isFeatured }: { task: Task; isFeatured: boolean }) {
  const PRIORITY_COLOR: Record<string, string> = {
    high:   'text-[var(--color-primary)]',
    medium: 'text-[var(--color-secondary)]',
    low:    'text-[var(--color-outline)]',
  };
  return (
    <div className={`snap-start shrink-0 w-[270px] md:w-[320px] flex flex-col gap-4 p-5 rounded-2xl backdrop-blur-md border transition-all duration-300 ${
      isFeatured
        ? 'bg-[var(--color-surface-container)]/80 border-[var(--color-primary)]/30 shadow-[0_8px_32px_rgba(210,187,255,0.1)] relative overflow-hidden'
        : 'bg-[var(--color-surface-container-low)]/70 border-[var(--color-outline-variant)]/20'
    }`}>
      {isFeatured && <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--color-primary)] shadow-[0_0_20px_rgba(210,187,255,0.5)]" />}
      <div className="flex justify-between items-start">
        <span className={`font-label-sm text-[10px] uppercase tracking-widest font-bold ${PRIORITY_COLOR[task.priority]}`}>
          {task.priority} priority
        </span>
        <span className="w-5 h-5 rounded-full border-2 border-[var(--color-outline-variant)]/60 flex items-center justify-center" />
      </div>
      <p className={`font-title-md text-[16px] leading-snug ${isFeatured ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}>
        {task.title}
      </p>
      {task.due_date && (
        <div className="mt-auto flex items-center gap-1.5 border-t border-[var(--color-outline-variant)]/10 pt-3">
          <span className="material-symbols-outlined text-[14px] text-[var(--color-outline)]">schedule</span>
          <span className="font-label-sm text-[10px] text-[var(--color-outline)]">{task.due_date}</span>
        </div>
      )}
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
    <form onSubmit={submit} className="bg-[var(--color-surface-container)] border border-[var(--color-primary)]/20 rounded-xl p-4 flex flex-col gap-3 anim-fade-up">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Block title…"
        className="bg-transparent border-b border-[var(--color-outline-variant)]/30 pb-1 text-[var(--color-on-surface)] font-body-md outline-none" />
      <div className="flex gap-2 flex-wrap">
        <label className="flex flex-col gap-1 text-[10px] text-[var(--color-outline)] uppercase tracking-widest">
          Start
          <input type="time" value={start} onChange={e => setStart(e.target.value)}
            className="bg-[var(--color-surface-container-high)] rounded px-2 py-1 text-[var(--color-on-surface)] font-label-sm text-[12px] outline-none" />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-[var(--color-outline)] uppercase tracking-widest">
          End
          <input type="time" value={end} onChange={e => setEnd(e.target.value)}
            className="bg-[var(--color-surface-container-high)] rounded px-2 py-1 text-[var(--color-on-surface)] font-label-sm text-[12px] outline-none" />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-[var(--color-outline)] uppercase tracking-widest">
          Type
          <select value={type} onChange={e => setType(e.target.value)}
            className="bg-[var(--color-surface-container-high)] rounded px-2 py-1 text-[var(--color-on-surface)] font-label-sm text-[12px] outline-none capitalize">
            {BLOCK_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
          </select>
        </label>
      </div>
      <div className="flex gap-2 justify-end mt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg font-label-sm text-[11px] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-primary)] font-label-sm text-[11px] disabled:opacity-50">
          {saving ? 'Saving…' : 'Add Block'}
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
            <h4 key={idx} className="font-title-md font-bold text-[14px] text-[var(--color-primary)] mt-4 mb-1 border-b border-[var(--color-outline-variant)]/10 pb-1 uppercase tracking-wider first:mt-0">
              {content}
            </h4>
          );
        }
        if (line.startsWith('##')) {
          const content = line.replace(/^##\s*/, '');
          return (
            <h3 key={idx} className="font-title-md font-bold text-[16px] text-[var(--color-secondary)] mt-5 mb-2 border-b border-[var(--color-outline-variant)]/25 pb-1 uppercase tracking-wider">
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
  const [theme, setTheme]               = useState('');
  const [editingTheme, setEditingTheme] = useState(false);
  const [generatingReview, setGeneratingReview] = useState(false);
  const themeRef = useRef<HTMLInputElement>(null);

  // fetch overview whenever selected date changes
  useEffect(() => {
    setLoading(true);
    fetchWeeklyOverview(selectedDate).then(d => {
      setData(d);
      setTheme(d.plan?.theme || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedDate]);

  const weekDays = data ? buildWeek(data.week_start) : [];
  const score    = data?.week_score ?? 0;
  const mits: Task[]        = data?.mits ?? [];
  const blocks: TimeBlock[] = (data?.time_blocks ?? []).sort((a,b) => a.start_time.localeCompare(b.start_time));

  const saveTheme = async () => {
    if (!data) return;
    setEditingTheme(false);
    await upsertWeeklyPlan({ date: selectedDate, theme: theme.trim() });
  };

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
      showToast('Weekly AI Retrospective generated successfully!', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to generate weekly review', 'error');
    } finally {
      setGeneratingReview(false);
    }
  };

  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  // week header label  e.g. "W19 · May 5–11"
  const weekLabel = data ? (() => {
    const s = new Date(data.week_start + 'T00:00:00');
    const e = new Date(data.week_end   + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month:'short', day:'numeric' };
    return `W${data.week_number} · ${s.toLocaleDateString('en-US',opts)}–${e.toLocaleDateString('en-US',{ day:'numeric' })}`;
  })() : '';

  return (
    <div className="flex-1 overflow-y-auto w-full no-scrollbar relative z-10 pb-24 md:pb-0">
      {/* Ambient */}
      <div className="absolute top-[5%] right-[2%] w-[400px] h-[400px] bg-[var(--color-primary)]/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-[15%] left-[2%] w-[500px] h-[500px] bg-[var(--color-secondary)]/5 rounded-full blur-[160px] pointer-events-none -z-10" />

      <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] pt-6 md:pt-12 pb-12 flex flex-col gap-8 md:gap-10 relative z-10">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-[var(--color-on-surface)]">
            Weekly Command
          </h2>
          <span className="font-label-sm text-label-sm text-[var(--color-primary)] uppercase tracking-widest font-bold bg-[var(--color-primary)]/10 px-4 py-2 rounded-full border border-[var(--color-primary)]/20 text-glow-primary">
            {loading ? '—' : weekLabel}
          </span>
        </div>

        {/* ── Score + Theme row ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Score card */}
          <div className="col-span-1 lg:col-span-4 bg-[var(--color-surface-container-low)]/50 backdrop-blur-xl border border-[var(--color-outline-variant)]/20 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-[var(--color-primary)] text-xl text-glow-primary" style={{ fontVariationSettings:"'FILL' 1" }}>vital_signs</span>
              <h3 className="font-title-md text-title-md text-[var(--color-on-surface)] uppercase tracking-widest text-[13px] opacity-80">Week Score</h3>
            </div>
            <div className="flex items-end gap-2 mb-4">
              <span className="font-display-lg text-[52px] text-[var(--color-primary)] leading-none text-glow-primary font-bold">
                {loading ? '—' : score}
              </span>
              <span className="font-body-lg text-[var(--color-on-surface-variant)] pb-1 opacity-50">/ 100</span>
            </div>
            <div className="w-full h-1 bg-[var(--color-surface-container-highest)] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] rounded-full shadow-[0_0_10px_rgba(210,187,255,0.6)] transition-all duration-1000"
                style={{ width: `${score}%` }} />
            </div>
            <p className="font-label-sm text-[11px] text-[var(--color-on-surface-variant)] mt-3 opacity-70">
              {score >= 80 ? '🔥 Outstanding week' : score >= 50 ? '⚡ On track' : score > 0 ? '📈 Build momentum' : 'Log habits to score'}
            </p>
          </div>

          {/* Week theme card */}
          <div className="col-span-1 lg:col-span-8 bg-[var(--color-surface-container)]/60 backdrop-blur-xl border border-t-[var(--color-primary)]/30 border-[var(--color-outline-variant)]/20 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-[-10%] top-[-10%] w-48 h-48 bg-[var(--color-primary)]/10 rounded-full blur-[40px] pointer-events-none" />
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[var(--color-secondary)] text-xl">auto_fix_high</span>
              <h3 className="font-title-md text-title-md text-[var(--color-on-surface)]">Week Theme</h3>
            </div>
            {editingTheme ? (
              <div className="flex gap-2 items-center">
                <input ref={themeRef} autoFocus value={theme} onChange={e => setTheme(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTheme(); if (e.key === 'Escape') setEditingTheme(false); }}
                  placeholder="e.g. Ship the MVP, Deep Recovery Week…"
                  className="flex-1 bg-transparent border-b-2 border-[var(--color-primary)] text-[var(--color-on-surface)] font-title-md text-[18px] outline-none pb-1" />
                <button onClick={saveTheme} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-primary)] font-label-sm text-[11px]">Save</button>
              </div>
            ) : (
              <button onClick={() => { setEditingTheme(true); setTimeout(() => themeRef.current?.focus(), 50); }}
                className="text-left group/theme">
                <p className={`font-title-md text-[18px] leading-relaxed transition-colors group-hover/theme:text-[var(--color-primary)] ${theme ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-outline)] italic'}`}>
                  {theme || 'Click to set your week\'s intention…'}
                </p>
              </button>
            )}
            <p className="font-label-sm text-[11px] text-[var(--color-on-surface-variant)] mt-4 opacity-60">
              A clear intention focuses your energy. What will define this week?
            </p>
          </div>
        </div>

        {/* ── Day navigator ───────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-title-md text-[18px] text-[var(--color-on-surface)]">Time Continuum</h3>
            <button onClick={() => setSelectedDate(today())}
              className="text-[var(--color-primary)] hover:text-[var(--color-primary-fixed-dim)] transition-colors font-label-sm text-[11px] uppercase tracking-widest">
              Today
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x pb-2">
            {weekDays.map(({ label, date, isWeekend }) => {
              const isSelected = date === selectedDate;
              const isToday    = date === today();
              return (
                <button key={date} onClick={() => setSelectedDate(date)}
                  className={`snap-start shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center border transition-all duration-200 relative ${
                    isSelected
                      ? 'border-t-2 border-t-[var(--color-primary)] border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[0_0_15px_rgba(210,187,255,0.3)]'
                      : isWeekend
                        ? 'border-[var(--color-outline-variant)]/10 bg-[var(--color-surface-container-lowest)]/50 text-[var(--color-on-surface-variant)] opacity-50'
                        : 'border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container-low)]/50 text-[var(--color-on-surface)] hover:border-[var(--color-outline-variant)]/50'
                  }`}>
                  <span className="font-label-sm text-[11px] uppercase mb-1">{label}</span>
                  <span className="font-title-md text-[20px]">{new Date(date + 'T00:00:00').getDate()}</span>
                  {isToday && <div className="absolute bottom-2 w-1 h-1 rounded-full bg-[var(--color-secondary)] shadow-[0_0_8px_rgba(90,218,206,0.8)]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── MITs ────────────────────────────────────────────── */}
        {mits.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)] shadow-[0_0_10px_rgba(90,218,206,0.6)]" />
                <h3 className="font-title-md text-[18px] text-[var(--color-on-surface)]">Most Important Tasks</h3>
              </div>
              <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase">{mits.length} task{mits.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x pb-4">
              {mits.map((t, i) => <MITCard key={t.id} task={t} isFeatured={i === 0} />)}
            </div>
          </section>
        )}

        {mits.length === 0 && !loading && (
          <div className="glass-panel rounded-2xl p-6 border border-dashed border-[var(--color-outline-variant)]/30 flex items-center gap-4">
            <span className="material-symbols-outlined text-[var(--color-outline)] text-[28px]">task_alt</span>
            <div>
              <p className="font-title-md text-[15px] text-[var(--color-on-surface)]">No high-priority tasks</p>
              <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] opacity-60">Add high-priority tasks in the Tasks section to see your MITs here.</p>
            </div>
          </div>
        )}

        {/* ── Today's Blueprint (time blocks) ─────────────────── */}
        <section className="bg-[var(--color-surface-container-lowest)]/30 rounded-2xl p-4 md:p-6 border border-[var(--color-outline-variant)]/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-title-md text-[18px] text-[var(--color-on-surface)]">
              {selectedDate === today() ? "Today's Blueprint" : `Blueprint · ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US',{ weekday:'long', month:'short', day:'numeric' })}`}
            </h3>
            <button onClick={() => setShowAddBlock(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] font-label-sm text-[11px] uppercase tracking-widest hover:bg-[var(--color-primary)]/20 transition-colors press-scale">
              <span className="material-symbols-outlined text-[16px]">{showAddBlock ? 'close' : 'add'}</span>
              {showAddBlock ? 'Cancel' : 'Add Block'}
            </button>
          </div>

          {showAddBlock && (
            <div className="mb-6">
              <AddBlockForm date={selectedDate} onCreated={handleBlockCreated} onCancel={() => setShowAddBlock(false)} />
            </div>
          )}

          <div className="flex flex-col relative">
            {/* Current time indicator — only on today */}
            {selectedDate === today() && (
              <div className="absolute left-0 w-full flex items-center z-20 pointer-events-none"
                style={{ top: '0%' }}>
                <div className="w-16 text-right pr-4 font-label-sm text-[10px] text-[var(--color-secondary)] shrink-0">
                  {fmt(nowStr)}
                </div>
                <div className="flex-1 h-px bg-[var(--color-secondary)] relative shadow-[0_0_10px_rgba(90,218,206,0.5)]">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--color-secondary)] shadow-[0_0_10px_rgba(90,218,206,0.6)]" />
                </div>
              </div>
            )}

            {blocks.length === 0 && (
              <div className="flex items-center gap-4 py-10 justify-center flex-col opacity-50">
                <span className="material-symbols-outlined text-[32px] text-[var(--color-outline)]">calendar_today</span>
                <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)]">No blocks yet — add one above.</p>
              </div>
            )}

            {blocks.map((block) => {
              const isPast = selectedDate === today() && block.end_time < nowStr;
              const isActive = selectedDate === today() && block.start_time <= nowStr && block.end_time > nowStr;
              const colorClass = BLOCK_COLORS[block.block_type] ?? BLOCK_COLORS.admin;

              return (
                <div key={block.id} className={`flex min-h-[80px] ${isPast ? 'opacity-50' : ''}`}>
                  {/* Time label */}
                  <div className={`w-16 shrink-0 text-right pr-4 py-2 border-r ${isActive ? 'border-[var(--color-primary)]/50 relative' : 'border-[var(--color-outline-variant)]/20'}`}>
                    <span className={`font-label-sm text-[10px] block ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline-variant)]'}`}>
                      {fmt(block.start_time)}
                    </span>
                    {isActive && <div className="absolute right-[-1px] top-0 bottom-0 w-[2px] bg-[var(--color-primary)] shadow-[0_0_10px_rgba(210,187,255,0.4)]" />}
                  </div>
                  {/* Block content */}
                  <div className="flex-1 pl-4 pb-4 pt-1">
                    <div className={`p-3 rounded-lg border-l-2 h-full flex flex-col justify-center gap-1 group/block ${colorClass}`}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-title-md text-[15px]">{block.title}</h4>
                        <button onClick={() => handleDeleteBlock(block.id)}
                          className="opacity-0 group-hover/block:opacity-100 transition-opacity text-[var(--color-error)] hover:scale-110">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                      <span className="font-label-sm text-[10px] opacity-60 uppercase tracking-widest">
                        {fmt(block.start_time)} – {fmt(block.end_time)} · {block.block_type.replace('_',' ')}
                      </span>
                      {block.notes && <p className="font-body-md text-[12px] opacity-70 mt-1">{block.notes}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Weekly Retrospective & AI Analysis ─────────────────── */}
        <section className="bg-[var(--color-surface-container-low)]/50 backdrop-blur-xl border border-t-[var(--color-primary)]/30 border-[var(--color-outline-variant)]/20 rounded-2xl p-6 md:p-8 relative overflow-hidden group">
          <div className="absolute right-[-10%] top-[-10%] w-64 h-64 bg-[var(--color-primary)]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--color-primary)] text-[28px] text-glow-primary animate-pulse">psychology</span>
              <div>
                <h3 className="font-title-md text-[18px] text-[var(--color-on-surface)]">Weekly Retrospective & AI Analysis</h3>
                <p className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] opacity-70 mt-0.5">
                  AI-powered assessment of your performance, wins, lessons, and energy balance.
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerateReview}
              disabled={generatingReview}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[var(--color-primary)] text-black font-bold text-[13px] uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(210,187,255,0.35)] hover:shadow-[0_0_30px_rgba(210,187,255,0.6)] press-scale disabled:opacity-50 min-w-[200px]"
            >
              {generatingReview ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Analyzing Week…</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  <span>{data?.plan?.review_summary ? 'Regenerate Review' : 'Generate Review'}</span>
                </>
              )}
            </button>
          </div>

          <div className="border-t border-[var(--color-outline-variant)]/10 pt-6">
            {data?.plan?.review_summary ? (
              <FormatMarkdown text={data.plan.review_summary} />
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-8 px-4 opacity-75">
                <span className="material-symbols-outlined text-[48px] text-[var(--color-outline)] mb-3">analytics</span>
                <p className="font-body-md text-[14px] text-[var(--color-on-surface-variant)] max-w-md">
                  No retrospective has been generated for this week yet. Click the button above to analyze your habits, completed tasks, and reflections.
                </p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
