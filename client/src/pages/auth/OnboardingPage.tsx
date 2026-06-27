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
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-ambient-mesh text-[var(--color-on-surface)] selection:bg-[var(--color-primary)]/30 selection:text-[var(--color-on-surface)]">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[rgba(108,74,176,0.1)] blur-[100px] animate-ambient-pulse" />
        <div className="absolute -bottom-[15%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[rgba(90,218,206,0.05)] blur-[80px] animate-ambient-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="w-full max-w-[500px] relative z-10 flex flex-col gap-8">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-block px-4 py-2 mb-4">
            <h1 className="font-title-md text-3xl font-bold tracking-tight text-gradient-primary">
              Welcome to Evolv
            </h1>
          </div>
          <div className="flex justify-center gap-2 mt-2">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === i ? 'w-10 bg-[var(--color-primary)]' : 
                  step > i ? 'w-6 bg-[var(--color-primary)] opacity-50' : 
                  'w-4 bg-[var(--color-outline-variant)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Container */}
        <div className="glass-card rounded-2xl p-8 shadow-xl">
          
          {/* STEP 1 */}
          {step === 1 && (
            <div className="flex flex-col gap-8 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight mb-2 text-[var(--color-on-surface)]">What's your name?</h2>
                <p className="text-sm text-[var(--color-outline)]">How should we address you?</p>
              </div>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input-field w-full text-center text-lg py-4"
                autoFocus
              />
              <button 
                onClick={() => {
                  if (!name.trim()) setName('Builder');
                  setStep(2);
                }}
                className="btn-gradient w-full py-3.5 rounded-xl flex items-center justify-center gap-2"
              >
                Continue
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="flex flex-col gap-8 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight mb-2 text-[var(--color-on-surface)]">Your Focus Areas</h2>
                <p className="text-sm text-[var(--color-outline)]">Select up to 3 core priorities</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {FOCUS_OPTIONS.map(opt => {
                  const isSelected = focusAreas.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleFocusArea(opt.id)}
                      className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                        isSelected 
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[0_0_15px_rgba(210,187,255,0.15)]' 
                          : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-outline)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[24px]">{opt.icon}</span>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="px-4 py-3.5 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] text-[var(--color-outline)] hover:border-[var(--color-outline)] transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <button 
                  onClick={() => setStep(3)}
                  disabled={focusAreas.length === 0}
                  className="btn-gradient flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="flex flex-col gap-8 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight mb-2 text-[var(--color-on-surface)]">Primary Goal</h2>
                <p className="text-sm text-[var(--color-outline)]">What is your immediate target?</p>
              </div>
              
              <textarea 
                value={primaryGoal}
                onChange={(e) => setPrimaryGoal(e.target.value)}
                placeholder="E.g., Launch my side project by the end of the month"
                className="input-field w-full min-h-[120px] resize-none py-3"
                autoFocus
              />

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(2)}
                  className="px-4 py-3.5 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] text-[var(--color-outline)] hover:border-[var(--color-outline)] transition-colors flex items-center justify-center disabled:opacity-50"
                  disabled={isLoading}
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <button 
                  onClick={handleComplete}
                  disabled={!primaryGoal.trim() || isLoading}
                  className="btn-gradient flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                      Setting up...
                    </>
                  ) : (
                    'Complete Setup'
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
