import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchJournalByDate, fetchJournalEntries,
  createJournalEntry, updateJournalEntry,
  type JournalEntry,
} from '../api';
import { useToast } from '../context/ToastContext';
import { useAI } from '../context/AIContext';

// ── Controlled chip list (gratitude / wins / lessons) ─────
function ChipList({
  label, icon, items, onChange, placeholder, color,
}: {
  label: string; icon: string; items: string[];
  onChange: (items: string[]) => void;
  placeholder: string; color: string;
}) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]" style={{ color }}>{icon}</span>
        <p className="font-label-sm text-[11px] uppercase tracking-widest font-bold" style={{ color }}>{label}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body-md text-[13px] border transition-all group"
            style={{
              color,
              backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
              borderColor: `color-mix(in srgb, ${color} 20%, transparent)`,
            }}
          >
            <span>{item}</span>
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          placeholder={placeholder}
          className="flex-1 bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/30 rounded-xl px-3 py-2 text-[13px] text-[var(--color-on-surface)] outline-none placeholder:text-[var(--color-outline)] focus:border-[var(--color-primary)]/50 transition-colors"
        />
        <button
          onClick={commit}
          disabled={!draft.trim()}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
        </button>
      </div>
    </div>
  );
}

// ── History entry card ─────────────────────────────────────
const MOOD_LABELS: Record<number, { label: string; icon: string; color: string }> = {
  5: { label: 'Focused',  icon: 'center_focus_strong', color: 'var(--color-primary)' },
  4: { label: 'Good',     icon: 'mood',                color: 'var(--color-secondary)' },
  3: { label: 'Calm',     icon: 'water_drop',          color: 'var(--color-secondary)' },
  2: { label: 'Tired',    icon: 'bedtime',             color: 'var(--color-outline)' },
  1: { label: 'Stressed', icon: 'storm',               color: 'var(--color-error)' },
};

function HistoryCard({ entry, expanded }: { entry: JournalEntry, expanded?: boolean }) {
  const mood = MOOD_LABELS[entry.mood] || MOOD_LABELS[3];
  const date = new Date(entry.date + 'T12:00:00');
  const themes = parseArrSafe(entry.themes || '[]');

  return (
    <div className="flex items-start gap-4 bg-[var(--color-surface-container-low)]/50 border border-[var(--color-outline-variant)]/15 rounded-2xl p-4 hover:border-[var(--color-primary)]/20 transition-all group anim-fade-up">
      {/* Date badge */}
      <div className="flex flex-col items-center gap-0.5 shrink-0 w-10">
        <span className="font-label-sm text-[9px] text-[var(--color-outline)] uppercase tracking-widest">
          {date.toLocaleDateString('en', { month: 'short' })}
        </span>
        <span className="font-display-lg text-[20px] font-bold text-[var(--color-on-surface)] leading-none">
          {date.getDate()}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="material-symbols-outlined text-[16px]" style={{ color: mood.color, fontVariationSettings: "'FILL' 1" }}>
            {mood.icon}
          </span>
          <span className="font-label-sm text-[10px] uppercase tracking-widest font-bold" style={{ color: mood.color }}>
            {mood.label}
          </span>
          {entry.sentiment && (
            <span className="font-label-sm text-[9px] bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {entry.sentiment}
            </span>
          )}
          <span className="font-label-sm text-[10px] text-[var(--color-outline)] ml-auto flex gap-3 flex-wrap">
            <span>Energy: {entry.energy}%</span>
            {entry.stress !== undefined && entry.stress > 0 && <span>Stress: {entry.stress}/5</span>}
            {entry.confidence !== undefined && entry.confidence > 0 && <span>Conf: {entry.confidence}/5</span>}
          </span>
        </div>
        <p className={`font-body-md text-[13px] text-[var(--color-on-surface-variant)] leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
          {entry.content || <em className="opacity-40">No content</em>}
        </p>

        {/* Themes tags */}
        {themes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {themes.map((t, idx) => (
              <span key={idx} className="font-label-sm text-[9px] bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] px-2 py-0.5 rounded-md border border-[var(--color-outline-variant)]/20 uppercase tracking-widest font-bold">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function parseArrSafe(raw: string): string[] {
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function ReadOnlyChipList({ label, icon, items, color }: { label: string; icon: string; items: string[]; color: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/10 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px]" style={{ color }}>{icon}</span>
        <p className="font-label-sm text-[10px] uppercase tracking-widest font-bold" style={{ color }}>{label}</p>
      </div>
      <div className="flex flex-col gap-1.5 mt-1">
        {items.map((item, i) => (
          <div key={i} className="font-body-md text-[13px] text-[var(--color-on-surface-variant)] flex items-start gap-2">
            <span className="opacity-50 mt-0.5">•</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryView({ entries }: { entries: JournalEntry[] }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const entryMap = new Map<string, JournalEntry>();
  entries.forEach(e => entryMap.set(e.date, e));

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const grid = [];
  for (let i = 0; i < startOffset; i++) grid.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    // adjust timezone offset to avoid previous day bug
    grid.push(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  }

  const selectedEntry = selectedDate ? entryMap.get(selectedDate) : null;
  const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  return (
    <div className="flex flex-col md:flex-row gap-6 anim-fade-up">
      {/* Calendar */}
      <div className="bg-[var(--color-surface-container-low)]/50 border border-[var(--color-outline-variant)]/15 rounded-2xl p-6 md:w-[320px] shrink-0 h-fit">
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-container-high)] transition-colors material-symbols-outlined text-[var(--color-outline)] hover:text-[var(--color-on-surface)]">chevron_left</button>
          <h3 className="font-title-md text-[16px] text-[var(--color-on-surface)]">{currentMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-container-high)] transition-colors material-symbols-outlined text-[var(--color-outline)] hover:text-[var(--color-on-surface)]">chevron_right</button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase">{d}</div>)}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {grid.map((dateStr, i) => {
            if (!dateStr) return <div key={i} className="aspect-square" />;
            const isToday = dateStr === todayStr;
            const entry = entryMap.get(dateStr);
            const isSelected = dateStr === selectedDate;
            const mood = entry ? MOOD_LABELS[entry.mood] || MOOD_LABELS[3] : null;

            return (
              <button
                key={i}
                onClick={() => entry && setSelectedDate(dateStr)}
                disabled={!entry}
                className={`aspect-square rounded-full flex items-center justify-center font-body-md text-[13px] transition-all relative ${
                  isSelected ? 'border-2 shadow-sm scale-110 z-10' : 'border border-transparent'
                } ${entry ? 'cursor-pointer hover:scale-105' : 'opacity-30 cursor-default'}`}
                style={{
                  backgroundColor: entry ? `color-mix(in srgb, ${mood!.color} 20%, transparent)` : 'transparent',
                  color: entry ? mood!.color : 'var(--color-on-surface-variant)',
                  borderColor: isSelected ? mood!.color : isToday ? 'var(--color-outline-variant)' : 'transparent',
                }}
              >
                {parseInt(dateStr.split('-')[2])}
                {entry && <div className="absolute bottom-1 w-1 h-1 rounded-full" style={{ backgroundColor: mood!.color }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Entry Detail */}
      <div className="flex-1">
        {selectedEntry ? (
          <div className="flex flex-col gap-4">
            <button onClick={() => setSelectedDate(null)} className="text-[var(--color-outline)] hover:text-[var(--color-on-surface)] font-label-sm text-[11px] uppercase tracking-widest flex items-center gap-1 w-fit transition-colors">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back to calendar
            </button>
            <HistoryCard entry={selectedEntry} expanded={true} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
               <ReadOnlyChipList label="Gratitude" icon="favorite" items={parseArrSafe(selectedEntry.gratitude)} color="var(--color-secondary)" />
               <ReadOnlyChipList label="Wins" icon="emoji_events" items={parseArrSafe(selectedEntry.wins)} color="var(--color-primary)" />
               <ReadOnlyChipList label="Lessons" icon="lightbulb" items={parseArrSafe(selectedEntry.lessons)} color="orange" />
            </div>
          </div>
        ) : (
          <div className="bg-[var(--color-surface-container-low)]/30 border border-dashed border-[var(--color-outline-variant)]/20 rounded-2xl h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center text-[var(--color-outline)] anim-fade-up">
             <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">calendar_month</span>
             <p className="font-body-md text-[13px]">Select a highlighted date to view your entry.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export function JournalPage() {
  const { showToast } = useToast();
  const { openPanel } = useAI();
  const [aiQuery, setAiQuery] = useState('');
  const [entry, setEntry]       = useState<JournalEntry | null>(null);
  const [content, setContent]   = useState('');
  const [mood, setMood]         = useState(3);
  const [energy, setEnergy]     = useState(75);
  const [stress, setStress]     = useState(3);
  const [confidence, setConfidence] = useState(3);
  const [gratitude, setGratitude] = useState<string[]>([]);
  const [wins, setWins]         = useState<string[]>([]);
  const [lessons, setLessons]   = useState<string[]>([]);
  const [saving, setSaving]     = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [history, setHistory]   = useState<JournalEntry[]>([]);
  const [view, setView]         = useState<'write' | 'history'>('write');

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const todayStr   = new Date().toISOString().split('T')[0];

  useEffect(() => { loadToday(); loadHistory(); }, []);

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    const ctx = `Journal Entry for ${todayStr}:
Content: ${content || 'No text written yet.'}
Gratitude: ${gratitude.length > 0 ? JSON.stringify(gratitude) : 'None listed'}
Wins: ${wins.length > 0 ? JSON.stringify(wins) : 'None listed'}
Lessons: ${lessons.length > 0 ? JSON.stringify(lessons) : 'None listed'}
Mood: ${mood} (1-5 scale)
Energy: ${energy}%
Stress: ${stress}/5
Confidence: ${confidence}/5`;

    openPanel(aiQuery, ctx);
    setAiQuery('');
  };

  const loadToday = async () => {
    try {
      const data = await fetchJournalByDate(todayStr);
      setEntry(data);
      setContent(data.content || '');
      setMood(data.mood || 3);
      setEnergy(data.energy || 75);
      setStress(data.stress || 3);
      setConfidence(data.confidence || 3);
      setGratitude(parseArr(data.gratitude));
      setWins(parseArr(data.wins));
      setLessons(parseArr(data.lessons));
    } catch { /* new entry */ }
  };

  const loadHistory = async () => {
    try {
      const all = await fetchJournalEntries();
      // Use all entries for the calendar, do not slice.
      setHistory(all);
    } catch { /* ignore */ }
  };

  const parseArr = (raw: string): string[] => {
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  };

  const saveEntry = useCallback(async (
    c: string, m: number, en: number, st: number, cf: number, gr: string[], w: string[], l: string[]
  ) => {
    setSaving(true);
    const payload = {
      date: todayStr, content: c, mood: m, energy: en, stress: st, confidence: cf,
      gratitude: JSON.stringify(gr),
      wins: JSON.stringify(w),
      lessons: JSON.stringify(l),
    };
    try {
      if (entry) {
        await updateJournalEntry(entry.id, payload);
      } else {
        const created = await createJournalEntry(payload);
        setEntry(created);
      }
      setLastSaved(new Date());
    } catch (e) {
      console.error('Save failed', e);
      showToast('Failed to save reflection', 'error');
    } finally {
      setSaving(false);
    }
  }, [entry, todayStr, showToast]);

  const triggerAutoSave = (overrides?: Partial<{ c: string; m: number; en: number; st: number; cf: number; gr: string[]; w: string[]; l: string[] }>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveEntry(
        overrides?.c ?? content,
        overrides?.m ?? mood,
        overrides?.en ?? energy,
        overrides?.st ?? stress,
        overrides?.cf ?? confidence,
        overrides?.gr ?? gratitude,
        overrides?.w ?? wins,
        overrides?.l ?? lessons,
      );
    }, 1200);
  };

  const handleContent = (val: string) => { setContent(val); triggerAutoSave({ c: val }); };
  const handleMood    = (val: number) => { setMood(val); saveEntry(content, val, energy, stress, confidence, gratitude, wins, lessons); };
  const handleEnergy  = (val: number) => { setEnergy(val); };
  const handleEnergyRelease = () => saveEntry(content, mood, energy, stress, confidence, gratitude, wins, lessons);
  const handleStress  = (val: number) => { setStress(val); saveEntry(content, mood, energy, val, confidence, gratitude, wins, lessons); };
  const handleConfidence = (val: number) => { setConfidence(val); saveEntry(content, mood, energy, stress, val, gratitude, wins, lessons); };
  const handleGratitude = (v: string[]) => { setGratitude(v); triggerAutoSave({ gr: v }); };
  const handleWins      = (v: string[]) => { setWins(v); triggerAutoSave({ w: v }); };
  const handleLessons   = (v: string[]) => { setLessons(v); triggerAutoSave({ l: v }); };

  const MOODS = [
    { val: 5, icon: 'center_focus_strong', label: 'Focused', color: 'var(--color-primary)' },
    { val: 3, icon: 'water_drop',          label: 'Calm',    color: 'var(--color-secondary)' },
    { val: 1, icon: 'storm',               label: 'Stressed',color: 'var(--color-error)' },
  ];

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar w-full page-enter">
      {/* Ambient */}
      <div className="fixed top-[10%] left-[5%] w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-[20%] right-[10%] w-[500px] h-[500px] bg-[var(--color-secondary)]/4 rounded-full blur-[160px] pointer-events-none -z-10" />

      <div className="max-w-3xl mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-8 pb-24 flex flex-col gap-6">

        {/* ── Header ─────────────────────────────────────── */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-label-sm text-[11px] text-[var(--color-secondary)] tracking-[0.2em] uppercase mb-1">
              {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="font-display-lg text-[clamp(26px,5vw,40px)] text-[var(--color-on-surface)] tracking-tight leading-none">
              Daily Reflection
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Save status */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--color-surface-container-low)] rounded-full border border-[var(--color-outline-variant)]/20 shadow-sm transition-all duration-300">
              {saving ? (
                <>
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[var(--color-secondary)] border-t-transparent animate-spin" />
                  <span className="font-label-sm text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-widest">Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <span className="material-symbols-outlined text-[14px] text-[var(--color-secondary)] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  <span className="font-label-sm text-[10px] text-[var(--color-secondary)] uppercase tracking-widest font-bold">
                    Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-outline)] animate-pulse" />
                  <span className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest">Draft</span>
                </>
              )}
            </div>

            {/* View toggle */}
            <div className="flex p-1 bg-[var(--color-surface-container-low)] rounded-xl border border-[var(--color-outline-variant)]/15">
              {(['write', 'history'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 rounded-lg font-label-sm text-[11px] uppercase tracking-widest transition-all ${
                    view === v
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm'
                      : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
                  }`}
                >
                  {v === 'write' ? 'Today' : 'History'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── Write view ─────────────────────────────────── */}
        {view === 'write' && (
          <>
            {/* Mind & Body Metrics Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mood */}
              <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
                <p className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest">State of Mind</p>
                <div className="flex gap-2 flex-wrap">
                  {MOODS.map(m => (
                    <button
                      key={m.val}
                      onClick={() => handleMood(m.val)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border font-label-sm text-[12px] transition-all press-scale ${
                        mood === m.val
                          ? 'font-bold shadow-sm'
                          : 'border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface-variant)] hover:border-[var(--color-outline-variant)]'
                      }`}
                      style={mood === m.val ? {
                        color: m.color,
                        backgroundColor: `color-mix(in srgb, ${m.color} 10%, transparent)`,
                        borderColor: `color-mix(in srgb, ${m.color} 25%, transparent)`,
                      } : {}}
                    >
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: mood === m.val ? "'FILL' 1" : "'FILL' 0", color: mood === m.val ? m.color : undefined }}
                      >
                        {m.icon}
                      </span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy */}
              <div className="glass-panel rounded-2xl p-5 flex flex-col justify-center gap-4">
                <div className="flex justify-between items-center">
                  <p className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest">Cognitive Energy</p>
                  <p className="font-label-sm text-[13px] font-bold text-[var(--color-primary)]">{energy}%</p>
                </div>
                <div className="relative h-5 flex items-center group">
                  <div className="absolute w-full h-2 bg-[var(--color-surface-container-highest)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-primary)] rounded-full transition-all duration-100"
                      style={{ width: `${energy}%` }}
                    />
                  </div>
                  <input
                    type="range" min="0" max="100" value={energy}
                    onChange={e => handleEnergy(parseInt(e.target.value))}
                    onMouseUp={handleEnergyRelease} onTouchEnd={handleEnergyRelease}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                  <div
                    className="absolute w-4 h-4 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] pointer-events-none transition-all duration-100 border-2 border-[var(--color-primary)]/30"
                    style={{ left: `calc(${energy}% - 8px)` }}
                  />
                </div>
              </div>

              {/* Stress Level */}
              <div className="glass-panel rounded-2xl p-5 flex flex-col justify-center gap-4">
                <div className="flex justify-between items-center">
                  <p className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest">Cognitive Stress</p>
                  <p className="font-label-sm text-[13px] font-bold text-[var(--color-error)]">
                    {stress === 1 ? 'Calm (1)' : stress === 2 ? 'Low (2)' : stress === 3 ? 'Moderate (3)' : stress === 4 ? 'High (4)' : 'Severe (5)'}
                  </p>
                </div>
                <div className="relative h-5 flex items-center group">
                  <div className="absolute w-full h-2 bg-[var(--color-surface-container-highest)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-error)] rounded-full transition-all duration-100"
                      style={{ width: `${(stress - 1) * 25}%` }}
                    />
                  </div>
                  <input
                    type="range" min="1" max="5" value={stress}
                    onChange={e => handleStress(parseInt(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                  <div
                    className="absolute w-4 h-4 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] pointer-events-none transition-all duration-100 border-2 border-[var(--color-error)]/30"
                    style={{ left: `calc(${(stress - 1) * 25}% - 8px)` }}
                  />
                </div>
              </div>

              {/* Confidence */}
              <div className="glass-panel rounded-2xl p-5 flex flex-col justify-center gap-4">
                <div className="flex justify-between items-center">
                  <p className="font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-widest">Personal Confidence</p>
                  <p className="font-label-sm text-[13px] font-bold text-[var(--color-secondary)]">
                    {confidence === 1 ? 'Uncertain (1)' : confidence === 2 ? 'Hesitant (2)' : confidence === 3 ? 'Steady (3)' : confidence === 4 ? 'Strong (4)' : 'Unstoppable (5)'}
                  </p>
                </div>
                <div className="relative h-5 flex items-center group">
                  <div className="absolute w-full h-2 bg-[var(--color-surface-container-highest)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--color-outline)] to-[var(--color-secondary)] rounded-full transition-all duration-100"
                      style={{ width: `${(confidence - 1) * 25}%` }}
                    />
                  </div>
                  <input
                    type="range" min="1" max="5" value={confidence}
                    onChange={e => handleConfidence(parseInt(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                  <div
                    className="absolute w-4 h-4 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] pointer-events-none transition-all duration-100 border-2 border-[var(--color-secondary)]/30"
                    style={{ left: `calc(${(confidence - 1) * 25}% - 8px)` }}
                  />
                </div>
              </div>
            </section>

            {/* Prompt chips */}
            <section className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { text: 'What challenged you today?', icon: 'storm' },
                { text: "Three things I'm grateful for…", icon: 'favorite' },
                { text: "Tomorrow's primary objective?", icon: 'route' },
                { text: 'What did I learn?', icon: 'lightbulb' },
              ].map(p => (
                <button
                  key={p.text}
                  onClick={() => handleContent(content + (content ? '\n\n' : '') + p.text + ' ')}
                  className="whitespace-nowrap flex items-center gap-1.5 px-4 py-2.5 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/20 rounded-full font-body-md text-[12px] text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all press-scale shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">{p.icon}</span>
                  {p.text}
                </button>
              ))}
            </section>

            {/* Main write area */}
            <section className="relative group min-h-[240px] flex flex-col">
              <div className="absolute inset-0 bg-[var(--color-surface-container-low)]/70 backdrop-blur-2xl rounded-2xl border border-[var(--color-outline-variant)]/20 group-focus-within:border-[var(--color-primary)]/40 transition-all duration-500 shadow-lg" />
              <textarea
                value={content}
                onChange={e => handleContent(e.target.value)}
                className="relative z-10 w-full flex-1 bg-transparent resize-none px-6 py-5 text-[18px] leading-relaxed text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)]/30 focus:outline-none min-h-[240px]"
                style={{ fontFamily: 'Newsreader, serif', fontWeight: 300 }}
                placeholder="Begin your transmission…"
              />
              {/* Focus glow */}
              <div className="absolute bottom-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            </section>

            {/* Gratitude / Wins / Lessons */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel rounded-2xl p-5">
                <ChipList
                  label="Gratitude" icon="favorite" items={gratitude} onChange={handleGratitude}
                  placeholder="I'm grateful for…" color="var(--color-secondary)"
                />
              </div>
              <div className="glass-panel rounded-2xl p-5">
                <ChipList
                  label="Wins" icon="emoji_events" items={wins} onChange={handleWins}
                  placeholder="Today I won…" color="var(--color-primary)"
                />
              </div>
              <div className="glass-panel rounded-2xl p-5">
                <ChipList
                  label="Lessons" icon="lightbulb" items={lessons} onChange={handleLessons}
                  placeholder="I learned that…" color="orange"
                />
              </div>
            </section>

            {/* AI Coach bar */}
            <form onSubmit={handleAskAI} className="bg-[var(--color-surface-container)]/60 backdrop-blur-xl border border-[var(--color-secondary)]/15 rounded-2xl p-2 flex items-center gap-3 focus-within:border-[var(--color-secondary)]/35 transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-[var(--color-secondary)]/10 flex items-center justify-center shrink-0 ml-1">
                <span className="material-symbols-outlined text-[var(--color-secondary)]" style={{ fontVariationSettings: "'FILL' 1" }}>robot_2</span>
              </div>
              <input
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none font-body-md text-body-md text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/40 px-2"
                placeholder="Ask Evolv Coach to analyze your entry..."
                type="text"
              />
              <button type="submit" disabled={!aiQuery.trim()} className="w-10 h-10 rounded-full bg-[var(--color-secondary)] text-[var(--color-on-secondary)] flex items-center justify-center hover:scale-105 transition-transform shrink-0 shadow-[0_0_12px_rgba(90,218,206,0.3)] disabled:opacity-50 disabled:hover:scale-100">
                <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
              </button>
            </form>
          </>
        )}

        {/* ── History view ────────────────────────────────── */}
        {view === 'history' && (
          <HistoryView entries={history} />
        )}

      </div>
    </div>
  );
}
