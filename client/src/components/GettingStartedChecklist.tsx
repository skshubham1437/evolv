import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'evolv_onboarding_dismissed';
const STEPS_KEY = 'evolv_onboarding_steps';

interface ChecklistStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}

const CHECKLIST: ChecklistStep[] = [
  {
    id: 'goal',
    icon: 'flag',
    title: 'Create your first goal',
    description: 'Set a goal with key results and a due date to give your system direction.',
    href: '/goals',
    linkLabel: 'Open Goals',
  },
  {
    id: 'habit',
    icon: 'bolt',
    title: 'Add a daily habit',
    description: 'Build identity-based habits tied to your focus areas. Start with just one.',
    href: '/habits',
    linkLabel: 'Open Habits',
  },
  {
    id: 'task',
    icon: 'format_list_bulleted',
    title: 'Add tasks to your queue',
    description: 'Capture your open actions and drag them into the Eisenhower matrix.',
    href: '/daily',
    linkLabel: 'Open Task Queue',
  },
  {
    id: 'focus',
    icon: 'timer',
    title: 'Run your first Focus session',
    description: 'Enter Focus Mode and complete a Pomodoro. Your first deep work block.',
    href: '/focus',
    linkLabel: 'Enter Focus Mode',
  },
  {
    id: 'journal',
    icon: 'edit_note',
    title: 'Write your first journal entry',
    description: 'Log your mood, energy and daily wins. Takes 2 minutes.',
    href: '/journal',
    linkLabel: 'Open Journal',
  },
];

export function GettingStartedChecklist() {
  const [dismissed, setDismissed] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    const savedSteps = localStorage.getItem(STEPS_KEY);
    if (isDismissed) {
      setDismissed(true);
    }
    if (savedSteps) {
      try { setChecked(new Set(JSON.parse(savedSteps))); } catch (_) {}
    }
    // Short delay so it doesn't pop in immediately on page load
    const t = setTimeout(() => setMounted(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const toggleStep = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(STEPS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const completedCount = checked.size;
  const totalCount = CHECKLIST.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;

  if (dismissed || !mounted) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 transition-all duration-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
      style={{ maxWidth: minimised ? '200px' : '340px', width: '100%' }}
    >
      <div className="glass-card rounded-2xl border border-[var(--glass-border)] bg-[var(--color-surface)]/60 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden">

        {/* Header */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer select-none"
          onClick={() => setMinimised(p => !p)}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${allDone ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/25'}`}>
              <span className={`material-symbols-outlined text-[16px] ${allDone ? 'text-emerald-400' : 'text-[var(--color-primary)]'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {allDone ? 'celebration' : 'rocket_launch'}
              </span>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-[var(--color-on-surface)]">
                {allDone ? 'All done! 🎉' : 'Getting Started'}
              </p>
              <p className="font-mono text-[9px] text-[var(--color-outline)]">
                {completedCount}/{totalCount} completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[var(--color-outline)] transition-transform duration-200" style={{ transform: minimised ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
              expand_more
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {!minimised && (
          <div className="px-4 pb-2">
            <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.05]">
              <div
                className={`h-full rounded-full transition-all duration-700 ${allDone ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Steps */}
        {!minimised && (
          <div className="px-2 pb-2 flex flex-col gap-0.5">
            {CHECKLIST.map((step) => {
              const done = checked.has(step.id);
              return (
                <div
                  key={step.id}
                  className={`rounded-xl px-3 py-2.5 flex items-start gap-3 transition-colors ${done ? 'opacity-50' : 'hover:bg-white/[0.03]'}`}
                >
                  <button
                    onClick={() => toggleStep(step.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      done
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-black'
                        : 'border-[var(--color-outline-variant)] bg-transparent text-transparent hover:border-[var(--color-primary)]/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px] font-bold">check</span>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px] text-[var(--color-outline)] shrink-0">{step.icon}</span>
                      <p className={`text-[12px] font-semibold leading-snug ${done ? 'line-through text-[var(--color-outline)]' : 'text-[var(--color-on-surface)]'}`}>
                        {step.title}
                      </p>
                    </div>
                    {!done && (
                      <div className="flex items-center justify-between mt-1.5 ml-6">
                        <p className="text-[11px] text-[var(--color-outline)] leading-snug flex-1 mr-2 line-clamp-2">
                          {step.description}
                        </p>
                        <Link
                          to={step.href}
                          className="font-mono text-[9px] uppercase tracking-wide text-[var(--color-primary)] hover:underline whitespace-nowrap shrink-0"
                          onClick={() => toggleStep(step.id)}
                        >
                          {step.linkLabel} →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {!minimised && (
          <div className="px-4 py-3 border-t border-[var(--color-outline-variant)]/30 flex items-center justify-between">
            {allDone ? (
              <p className="font-mono text-[9px] uppercase tracking-widest text-emerald-400 font-bold">
                System initialized. Execute.
              </p>
            ) : (
              <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-outline)]">
                Your setup guide
              </p>
            )}
            <button
              onClick={handleDismiss}
              className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
