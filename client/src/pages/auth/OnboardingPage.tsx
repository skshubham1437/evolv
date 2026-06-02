import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { completeOnboarding } from '../../api';

const FOCUS_OPTIONS = [
  { id: 'health', icon: 'favorite', label: 'Health' },
  { id: 'career', icon: 'work', label: 'Career' },
  { id: 'wealth', icon: 'account_balance', label: 'Wealth' },
  { id: 'mind', icon: 'psychology', label: 'Mind' },
  { id: 'relationships', icon: 'diversity_1', label: 'Relations' },
  { id: 'environment', icon: 'home', label: 'Environment' },
];

export function OnboardingPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.name || '');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.is_onboarded) {
      navigate('/');
    }
  }, [user, navigate]);

  const toggleFocusArea = (id: string) => {
    setFocusAreas(prev => {
      if (prev.includes(id)) return prev.filter(a => a !== id);
      if (prev.length < 3) return [...prev, id];
      return prev;
    });
  };

  const handleComplete = async () => {
    if (!name.trim() || focusAreas.length === 0 || !primaryGoal.trim()) return;
    
    setIsLoading(true);
    try {
      const updatedUser = await completeOnboarding({
        name,
        focus_areas: focusAreas,
        primary_goal: primaryGoal
      });
      updateUser(updatedUser);
      navigate('/');
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] overflow-hidden font-mono selection:bg-[var(--color-tertiary)] selection:text-black">
      {/* Boxy Grid Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] grid-rows-[repeat(auto-fill,minmax(80px,1fr))] opacity-[0.04]">
          {Array.from({ length: 300 }).map((_, i) => (
            <div key={i} className="border-r border-b border-[var(--color-on-surface)]" />
          ))}
        </div>
      </div>

      <div className="w-full max-w-[500px] relative z-10 flex flex-col gap-8">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-block border-2 border-[var(--color-tertiary)] px-4 py-2 mb-4 bg-[var(--color-tertiary)]/10 shadow-[4px_4px_0px_var(--color-tertiary)]">
            <h1 className="font-mono text-3xl font-bold tracking-tighter text-[var(--color-tertiary)] uppercase">
              Configuration
            </h1>
          </div>
          <div className="flex justify-center gap-2 mt-2">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`h-2 border-2 transition-all duration-300 ${
                  step === i ? 'w-10 border-[var(--color-tertiary)] bg-[var(--color-tertiary)]' : 
                  step > i ? 'w-6 border-[var(--color-tertiary)] bg-transparent' : 
                  'w-4 border-[var(--color-outline-variant)] bg-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Container */}
        <div className="bg-[var(--color-surface-container)] border-4 border-[var(--color-on-surface)] p-8 shadow-[12px_12px_0px_var(--color-on-surface)]">
          
          {/* STEP 1 */}
          {step === 1 && (
            <div className="flex flex-col gap-8 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="text-center">
                <h2 className="font-mono text-3xl font-bold tracking-tighter uppercase mb-2">Identify Node</h2>
                <p className="text-[12px] text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold">What is your designation?</p>
              </div>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-6 bg-[var(--color-surface-container-lowest)] border-4 border-[var(--color-outline-variant)] text-[var(--color-on-surface)] text-center text-xl font-bold font-mono placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-tertiary)] focus:shadow-[6px_6px_0px_var(--color-tertiary)] transition-all"
                autoFocus
              />
              <button 
                onClick={() => {
                  if (!name.trim()) setName('Builder');
                  setStep(2);
                }}
                className="w-full py-4 border-2 border-black bg-[var(--color-tertiary)] text-black font-mono font-bold text-lg uppercase tracking-widest hover:bg-[var(--color-tertiary-fixed)] shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none transition-all"
              >
                Acknowledge
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="flex flex-col gap-8 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="text-center">
                <h2 className="font-mono text-3xl font-bold tracking-tighter uppercase mb-2">Focus Matrix</h2>
                <p className="text-[12px] text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold">Select parameters (Max 3)</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {FOCUS_OPTIONS.map(opt => {
                  const isSelected = focusAreas.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleFocusArea(opt.id)}
                      className={`p-4 border-2 flex flex-col items-center gap-2 text-center transition-all ${
                        isSelected 
                          ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)] text-black shadow-[4px_4px_0px_var(--color-on-surface)]' 
                          : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-on-surface)] hover:text-[var(--color-on-surface)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[24px]">{opt.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="px-6 py-4 border-2 border-[var(--color-outline)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] hover:border-[var(--color-on-surface)] transition-all active:translate-x-1 active:translate-y-1 shadow-[4px_4px_0px_var(--color-outline)] active:shadow-none flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <button 
                  onClick={() => setStep(3)}
                  disabled={focusAreas.length === 0}
                  className="flex-1 py-4 border-2 border-black bg-[var(--color-tertiary)] text-black font-mono font-bold text-lg uppercase tracking-widest hover:bg-[var(--color-tertiary-fixed)] shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="flex flex-col gap-8 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="text-center">
                <h2 className="font-mono text-3xl font-bold tracking-tighter uppercase mb-2">Prime Objective</h2>
                <p className="text-[12px] text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold">Define your immediate target</p>
              </div>
              
              <textarea 
                value={primaryGoal}
                onChange={(e) => setPrimaryGoal(e.target.value)}
                placeholder="EXECUTE PHASE 1..."
                className="w-full px-4 py-6 bg-[var(--color-surface-container-lowest)] border-4 border-[var(--color-outline-variant)] text-[var(--color-on-surface)] text-sm font-bold font-mono placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-tertiary)] focus:shadow-[6px_6px_0px_var(--color-tertiary)] transition-all min-h-[160px] resize-none"
                autoFocus
              />

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(2)}
                  className="px-6 py-4 border-2 border-[var(--color-outline)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] hover:border-[var(--color-on-surface)] transition-all active:translate-x-1 active:translate-y-1 shadow-[4px_4px_0px_var(--color-outline)] active:shadow-none flex items-center justify-center disabled:opacity-50"
                  disabled={isLoading}
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <button 
                  onClick={handleComplete}
                  disabled={!primaryGoal.trim() || isLoading}
                  className="flex-1 py-4 border-2 border-black bg-[var(--color-tertiary)] text-black font-mono font-bold text-lg uppercase tracking-widest hover:bg-[var(--color-tertiary-fixed)] shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                      Initializing
                    </>
                  ) : (
                    <>
                      Boot System
                      <span className="material-symbols-outlined text-[20px]">power_settings_new</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
