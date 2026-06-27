import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchJournalByDate, fetchJournalEntries,
  createJournalEntry, updateJournalEntry,
  type JournalEntry,
} from '../api';
import { useToast } from '../context/ToastContext';
import { useAI } from '../context/AIContext';

// ── Controlled chip list (gratitude / wins / lessons) ─────
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.05)] pb-2.5">
        <span className="material-symbols-outlined text-[16px]" style={{ color }}>{icon}</span>
        <p className="font-mono text-[10px] uppercase tracking-widest font-bold" style={{ color }}>{label}</p>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 p-2.5 border border-white/[0.03] rounded-xl transition-all group bg-white/[0.01]"
            style={{
              borderColor: `color-mix(in srgb, ${color} 15%, transparent)`,
            }}
          >
            <span className="font-body-md text-[13px] text-[var(--color-on-surface)] leading-snug">{item}</span>
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="opacity-0 group-hover:opacity-100 transition-all text-[var(--color-outline)] hover:text-[var(--color-error)] shrink-0 w-5 h-5 rounded hover:bg-white/[0.04] flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center border border-[rgba(255,255,255,0.08)] bg-white/[0.01] rounded-xl overflow-hidden focus-within:border-[var(--color-primary)]/40 transition-colors">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-3.5 py-2.5 text-[13px] text-[var(--color-on-surface)] outline-none placeholder:text-[var(--color-outline)]"
        />
        <button
          onClick={commit}
          disabled={!draft.trim()}
          className="w-10 h-10 flex items-center justify-center transition-all duration-300 disabled:opacity-20 border-l border-[rgba(255,255,255,0.08)] hover:bg-white/[0.03]"
          style={{ color }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
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
    <div className="flex flex-col sm:flex-row items-start gap-6 glass-card rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.015] border-[rgba(255,255,255,0.05)] shadow-md">
      {/* Date badge */}
      <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-0.5 shrink-0 sm:w-16 sm:border-r sm:border-[rgba(255,255,255,0.05)] sm:pr-6">
        <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest font-bold opacity-60">
          {date.toLocaleDateString('en', { month: 'short' })}
        </span>
        <span className="text-[26px] sm:text-[32px] font-black text-[var(--color-on-surface)] leading-none select-none tracking-tighter">
          {date.getDate()}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-3.5 flex-wrap">
          <div className="flex items-center gap-1.5 border border-transparent rounded-full px-3 py-0.5" style={{ backgroundColor: `color-mix(in srgb, ${mood.color} 10%, transparent)` }}>
            <span className="material-symbols-outlined text-[13px]" style={{ color: mood.color, fontVariationSettings: "'FILL' 1" }}>
              {mood.icon}
            </span>
            <span className="font-mono text-[8px] uppercase tracking-widest font-bold" style={{ color: mood.color }}>
              {mood.label}
            </span>
          </div>
          
          {entry.sentiment && (
            <span className="font-mono text-[8px] text-[var(--color-primary)] border border-[var(--color-primary)]/15 bg-[var(--color-primary)]/5 rounded-full px-3 py-0.5 font-bold uppercase tracking-widest">
              {entry.sentiment}
            </span>
          )}
          
          <div className="font-mono text-[9px] text-[var(--color-outline)] font-bold uppercase tracking-widest flex gap-3.5 ml-auto opacity-75">
            <span>NRG: {entry.energy}%</span>
            {entry.stress !== undefined && entry.stress > 0 && <span>STR: {entry.stress}/5</span>}
            {entry.confidence !== undefined && entry.confidence > 0 && <span>CNF: {entry.confidence}/5</span>}
          </div>
        </div>
        
        <p className={`font-body-md text-[14px] text-[var(--color-on-surface)] opacity-85 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
          {entry.content || <em className="opacity-40 font-mono text-[11px] uppercase">No textual log</em>}
        </p>

        {/* Themes tags */}
        {themes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)]">
            {themes.map((t, idx) => (
              <span key={idx} className="font-mono text-[8px] text-[var(--color-outline)] px-2.5 py-0.5 rounded-full border border-white/5 uppercase tracking-widest font-bold bg-white/[0.01]">
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
    <div className="glass-card rounded-2xl p-5 border-[rgba(255,255,255,0.05)] shadow-md flex flex-col gap-3">
      <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.04)] pb-2">
        <span className="material-symbols-outlined text-[16px]" style={{ color }}>{icon}</span>
        <p className="font-mono text-[9px] uppercase tracking-widest font-bold" style={{ color }}>{label}</p>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="font-body-md text-[13px] text-[var(--color-on-surface)] opacity-75 leading-snug flex items-start gap-2">
            <span className="text-[10px] font-bold mt-0.5" style={{ color }}>//</span>
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
    grid.push(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  }

  const selectedEntry = selectedDate ? entryMap.get(selectedDate) : null;
  const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Calendar */}
      <div className="glass-card rounded-2xl p-6 lg:w-[340px] shrink-0 h-fit border-[rgba(255,255,255,0.05)] shadow-lg bg-white/[0.005]">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[rgba(255,255,255,0.05)]">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] rounded-lg hover:bg-white/[0.03] transition-all material-symbols-outlined text-[var(--color-outline)] hover:text-[var(--color-on-surface)] text-[18px]">chevron_left</button>
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--color-on-surface)]">{currentMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] rounded-lg hover:bg-white/[0.03] transition-all material-symbols-outlined text-[var(--color-outline)] hover:text-[var(--color-on-surface)] text-[18px]">chevron_right</button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-3">
          {['M','T','W','T','F','S','S'].map((d, i) => <div key={i} className="font-mono text-[9px] font-bold text-[var(--color-outline)] uppercase tracking-wider opacity-60">{d}</div>)}
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
                className={`aspect-square flex items-center justify-center font-mono text-[11px] transition-all relative border rounded-lg ${
                  isSelected ? 'border-[var(--color-on-surface)] z-10 font-bold bg-white/[0.08]' : isToday ? 'border-[var(--color-primary)]/40' : 'border-transparent'
                } ${entry ? 'cursor-pointer hover:border-[rgba(255,255,255,0.2)]' : 'opacity-[0.12] cursor-default'}`}
                style={{
                  backgroundColor: entry ? `color-mix(in srgb, ${mood!.color} 12%, transparent)` : 'transparent',
                  color: entry ? mood!.color : 'var(--color-on-surface)',
                }}
              >
                {parseInt(dateStr.split('-')[2])}
                {entry && <div className="absolute bottom-1.5 w-1 h-1 rounded-full" style={{ backgroundColor: mood!.color }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Entry Detail */}
      <div className="flex-1">
        {selectedEntry ? (
          <div className="flex flex-col gap-6">
            <button onClick={() => setSelectedDate(null)} className="text-[var(--color-outline)] hover:text-[var(--color-on-surface)] font-mono text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5 w-fit transition-all border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] px-4 py-2 rounded-full hover:bg-white/[0.02] active:scale-95">
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              Back to Calendar
            </button>
            <HistoryCard entry={selectedEntry} expanded={true} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <ReadOnlyChipList label="Gratitude" icon="favorite" items={parseArrSafe(selectedEntry.gratitude)} color="var(--color-secondary)" />
               <ReadOnlyChipList label="Wins" icon="emoji_events" items={parseArrSafe(selectedEntry.wins)} color="var(--color-primary)" />
               <ReadOnlyChipList label="Lessons" icon="lightbulb" items={parseArrSafe(selectedEntry.lessons)} color="orange" />
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl border-dashed border-[rgba(255,255,255,0.1)] h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center text-[var(--color-outline)] bg-white/[0.005]">
             <span className="material-symbols-outlined text-[32px] mb-4 opacity-30">calendar_month</span>
             <p className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-60">Select a highlighted date to access log.</p>
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
        overrides?.c ?? content, overrides?.m ?? mood, overrides?.en ?? energy, overrides?.st ?? stress,
        overrides?.cf ?? confidence, overrides?.gr ?? gratitude, overrides?.w ?? wins, overrides?.l ?? lessons,
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
    <div className="flex flex-col h-full w-full bg-transparent text-[var(--color-on-surface)] items-center overflow-hidden">
      <div className="flex flex-col h-full w-full max-w-[var(--spacing-container-max)] border-x border-[rgba(255,255,255,0.06)] relative">

        {/* ── Header ─────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-end justify-between px-8 py-6 border-b border-[rgba(255,255,255,0.06)] shrink-0 bg-transparent gap-4">
          <div>
            <h2 className="text-[36px] font-black tracking-tighter text-[var(--color-on-surface)] leading-none select-none">
              Reflection Log
            </h2>
            <p className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-[0.25em] mt-2.5">
              {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-6">
            {/* Save status */}
            <div className="flex items-center gap-2 px-3 py-1.5 border border-[rgba(255,255,255,0.06)] bg-white/[0.01] transition-all rounded-lg">
              {saving ? (
                <>
                  <div className="w-2.5 h-2.5 border-2 border-[var(--color-secondary)] border-t-transparent animate-spin rounded-full" />
                  <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest font-bold">Syncing...</span>
                </>
              ) : lastSaved ? (
                <>
                  <span className="material-symbols-outlined text-[14px] text-[var(--color-secondary)]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    cloud_done
                  </span>
                  <span className="font-mono text-[9px] text-[var(--color-secondary)] uppercase tracking-widest font-bold">
                    Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-outline)] animate-pulse" />
                  <span className="font-mono text-[9px] text-[var(--color-outline)] uppercase tracking-widest font-bold">Draft</span>
                </>
              )}
            </div>

            {/* View toggle */}
            <div className="flex border border-[rgba(255,255,255,0.08)] bg-white/[0.01] rounded-full p-1 overflow-hidden">
              {(['write', 'history'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-5 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-widest font-bold transition-all active:scale-95 ${
                    view === v
                      ? 'bg-[var(--color-primary)] text-black'
                      : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface)]'
                  }`}
                >
                  {v === 'write' ? 'Today' : 'Archive'}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar bg-transparent pb-32">
          <div className="p-8 flex flex-col gap-8">
            
            {/* ── Write view ─────────────────────────────────── */}
            {view === 'write' && (
              <>
                {/* Mind & Body Metrics Grid */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Mood */}
                  <div className="glass-card rounded-2xl p-6 flex flex-col gap-6 border-[rgba(255,255,255,0.05)] shadow-md">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-outline)] font-bold border-b border-[rgba(255,255,255,0.04)] pb-2.5">State of Mind</p>
                    <div className="flex gap-3">
                      {MOODS.map(m => (
                        <button
                          key={m.val}
                          onClick={() => handleMood(m.val)}
                          className={`flex-1 flex flex-col items-center gap-2 py-3 border rounded-xl transition-all duration-300 active:scale-[0.95] ${
                            mood === m.val
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[0_0_16px_rgba(210,187,255,0.2)] scale-[1.04] animate-status-pulse'
                              : 'border-[rgba(255,255,255,0.08)] text-[var(--color-on-surface)] opacity-70 hover:opacity-100 hover:bg-white/[0.02]'
                          }`}
                        >
                          <span
                            className="material-symbols-outlined text-[20px]"
                            style={{ fontVariationSettings: mood === m.val ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            {m.icon}
                          </span>
                          <span className="font-mono text-[9px] font-bold uppercase tracking-widest">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Energy */}
                  <div className="glass-card rounded-2xl p-6 flex flex-col justify-center gap-6 border-[rgba(255,255,255,0.05)] shadow-md">
                    <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.04)] pb-2.5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-outline)] font-bold">Cognitive Energy</p>
                      <p className="font-mono text-[11px] font-bold text-[var(--color-primary)]">{energy}%</p>
                    </div>
                    <div className="relative h-6 flex items-center group cursor-pointer border border-[rgba(255,255,255,0.08)] bg-white/[0.01] p-1 rounded-lg overflow-hidden">
                      <div className="w-full h-full relative rounded-md overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-primary)] transition-all duration-100 glow-shadow-primary"
                          style={{ width: `${energy}%` }}
                        />
                        <input
                          type="range" min="0" max="100" value={energy}
                          onChange={e => handleEnergy(parseInt(e.target.value))}
                          onMouseUp={handleEnergyRelease} onTouchEnd={handleEnergyRelease}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stress Level */}
                  <div className="glass-card rounded-2xl p-6 flex flex-col justify-center gap-6 border-[rgba(255,255,255,0.05)] shadow-md">
                    <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.04)] pb-2.5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-outline)] font-bold">Cognitive Stress</p>
                      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--color-error)]">
                        {stress === 1 ? 'Calm (1)' : stress === 2 ? 'Low (2)' : stress === 3 ? 'Moderate (3)' : stress === 4 ? 'High (4)' : 'Severe (5)'}
                      </p>
                    </div>
                    <div className="relative h-6 flex items-center group cursor-pointer border border-[rgba(255,255,255,0.08)] bg-white/[0.01] p-1 rounded-lg overflow-hidden">
                      <div className="w-full h-full relative flex rounded-md overflow-hidden">
                        {[1, 2, 3, 4, 5].map(v => (
                          <div key={v} className="flex-1 border-r border-black/20 last:border-r-0 h-full relative">
                            {stress >= v && (
                              <div className="absolute inset-0 bg-[var(--color-error)] opacity-80" />
                            )}
                          </div>
                        ))}
                        <input
                          type="range" min="1" max="5" value={stress}
                          onChange={e => handleStress(parseInt(e.target.value))}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="glass-card rounded-2xl p-6 flex flex-col justify-center gap-6 border-[rgba(255,255,255,0.05)] shadow-md">
                    <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.04)] pb-2.5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-outline)] font-bold">Personal Confidence</p>
                      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">
                        {confidence === 1 ? 'Uncertain (1)' : confidence === 2 ? 'Hesitant (2)' : confidence === 3 ? 'Steady (3)' : confidence === 4 ? 'Strong (4)' : 'Unstoppable (5)'}
                      </p>
                    </div>
                    <div className="relative h-6 flex items-center group cursor-pointer border border-[rgba(255,255,255,0.08)] bg-white/[0.01] p-1 rounded-lg overflow-hidden">
                      <div className="w-full h-full relative flex rounded-md overflow-hidden">
                        {[1, 2, 3, 4, 5].map(v => (
                          <div key={v} className="flex-1 border-r border-black/20 last:border-r-0 h-full relative">
                            {confidence >= v && (
                              <div className="absolute inset-0 bg-[var(--color-secondary)] opacity-80" />
                            )}
                          </div>
                        ))}
                        <input
                          type="range" min="1" max="5" value={confidence}
                          onChange={e => handleConfidence(parseInt(e.target.value))}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Prompt chips */}
                <section className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {[
                    { text: 'What challenged you today?', icon: 'storm' },
                    { text: "Three things I'm grateful for…", icon: 'favorite' },
                    { text: "Tomorrow's primary objective?", icon: 'route' },
                    { text: 'What did I learn?', icon: 'lightbulb' },
                  ].map(p => (
                    <button
                      key={p.text}
                      onClick={() => handleContent(content + (content ? '\n\n' : '') + p.text + ' ')}
                      className="whitespace-nowrap flex items-center gap-2 px-5 py-3 glass-card rounded-xl font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--color-on-surface)]/85 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 transition-colors shrink-0 bg-white/[0.005]"
                    >
                      <span className="material-symbols-outlined text-[15px]">{p.icon}</span>
                      {p.text}
                    </button>
                  ))}
                </section>

                {/* Main write area */}
                <section className="glass-card rounded-2xl flex flex-col focus-within:border-[var(--color-primary)]/40 transition-colors overflow-hidden border-[rgba(255,255,255,0.05)] shadow-lg bg-white/[0.005]">
                  <div className="p-4 px-6 border-b border-[rgba(255,255,255,0.05)] bg-white/[0.02] flex justify-between items-center">
                    <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-on-surface)] font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">edit_document</span>
                      Freeform Log
                    </h3>
                  </div>
                  <textarea
                    value={content}
                    onChange={e => handleContent(e.target.value)}
                    className="w-full flex-1 bg-transparent resize-y px-6 py-5 text-[15px] leading-relaxed text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none min-h-[300px] font-mono"
                    placeholder="Begin your transmission…"
                  />
                </section>

                {/* Gratitude / Wins / Lessons */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-card rounded-2xl p-6 border-[rgba(255,255,255,0.05)] shadow-md bg-white/[0.005]">
                    <ChipList
                      label="Gratitude" icon="favorite" items={gratitude} onChange={handleGratitude}
                      placeholder="I'm grateful for…" color="var(--color-secondary)"
                    />
                  </div>
                  <div className="glass-card rounded-2xl p-6 border-[rgba(255,255,255,0.05)] shadow-md bg-white/[0.005]">
                    <ChipList
                      label="Wins" icon="emoji_events" items={wins} onChange={handleWins}
                      placeholder="Today I won…" color="var(--color-primary)"
                    />
                  </div>
                  <div className="glass-card rounded-2xl p-6 border-[rgba(255,255,255,0.05)] shadow-md bg-white/[0.005]">
                    <ChipList
                      label="Lessons" icon="lightbulb" items={lessons} onChange={handleLessons}
                      placeholder="I learned that…" color="orange"
                    />
                  </div>
                </section>

                {/* AI Coach bar */}
                <form onSubmit={handleAskAI} className="glass-card rounded-2xl border-[var(--color-secondary)]/35 p-3 flex items-center gap-4 focus-within:border-[var(--color-primary)] transition-all bg-[var(--color-surface)]/20 shadow-md">
                  <div className="w-10 h-10 bg-[var(--color-secondary)]/10 border border-[var(--color-secondary)]/30 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(90,218,206,0.15)]">
                    <span className="material-symbols-outlined text-[var(--color-secondary)]" style={{ fontVariationSettings: "'FILL' 1" }}>robot_2</span>
                  </div>
                  <input
                    value={aiQuery}
                    onChange={e => setAiQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none font-mono text-[13px] text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)]"
                    placeholder="Ask Evolv Coach to analyze your entry..."
                    type="text"
                  />
                  <button type="submit" disabled={!aiQuery.trim()} className="px-6 py-2.5 bg-[var(--color-secondary)] text-black font-mono text-[10px] font-bold uppercase tracking-widest disabled:opacity-30 hover:brightness-110 active:scale-95 transition-all rounded-xl shrink-0 shadow-[0_0_12px_rgba(90,218,206,0.2)]">
                    Analyze
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
      </div>
    </div>
  );
}
