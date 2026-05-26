import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { completeOnboarding } from '../../api';

const FOCUS_OPTIONS = [
  { id: 'health', icon: 'favorite', label: 'Health & Vitality' },
  { id: 'career', icon: 'work', label: 'Career & Mission' },
  { id: 'wealth', icon: 'account_balance', label: 'Wealth & Finance' },
  { id: 'mind', icon: 'psychology', label: 'Mind & Intellect' },
  { id: 'relationships', icon: 'diversity_1', label: 'Relationships' },
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

  // Quick safety check - if they are already onboarded somehow, bounce them
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
      // Update global context so ProtectedRoute knows they are onboarded
      updateUser(updatedUser);
      // ProtectedRoute will automatically redirect them to "/" since they are now onboarded,
      // but we can manually trigger it to be safe
      navigate('/');
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Ambient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[var(--color-primary)]/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[var(--color-secondary)]/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen float" style={{ animationDelay: '-2s' }}></div>

      <div className="w-full max-w-md relative z-10 page-enter">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="font-display-lg text-display-lg text-4xl font-bold text-[var(--color-primary)] italic inline-block mb-4 float" style={{ textShadow: '0 0 30px rgba(210,187,255,0.4)' }}>Evolv</span>
          
          {/* Progress Indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  step === i ? 'w-8 bg-[var(--color-primary)] shadow-[0_0_10px_rgba(210,187,255,0.8)]' : 
                  step > i ? 'w-4 bg-[var(--color-primary)]/50' : 
                  'w-2 bg-[var(--color-outline-variant)]/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Container - Glassmorphic */}
        <div className="bg-[var(--color-surface-container-low)]/80 backdrop-blur-2xl border border-[var(--color-outline-variant)]/20 rounded-3xl p-8 shadow-2xl glass-panel-glow">
          
          {/* STEP 1 */}
          {step === 1 && (
            <div className="flex flex-col gap-6 page-enter">
              <div>
                <h2 className="font-headline-md text-headline-md text-[var(--color-on-surface)] mb-2">System Initialized.</h2>
                <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)]">What designation should we use for you?</p>
              </div>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/50 rounded-xl px-4 py-4 text-[var(--color-on-surface)] font-body-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all placeholder:text-[var(--color-outline)]/30"
                autoFocus
              />
              <button 
                onClick={() => {
                  if (!name.trim()) setName('Builder');
                  setStep(2);
                }}
                className="w-full py-4 bg-[var(--color-primary)] text-[#000000] font-title-md text-title-md text-base rounded-xl shadow-[0_0_15px_rgba(210,187,255,0.4)] hover:shadow-[0_0_25px_rgba(210,187,255,0.8)] transition-all duration-300 font-bold active:scale-95 mt-4"
              >
                Proceed
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="flex flex-col gap-6 page-enter">
              <div>
                <h2 className="font-headline-md text-headline-md text-[var(--color-on-surface)] mb-2">Focus Matrix</h2>
                <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)]">Select up to 3 life areas to prioritize this cycle.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {FOCUS_OPTIONS.map(opt => {
                  const isSelected = focusAreas.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleFocusArea(opt.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition-all duration-300 active:scale-95 ${
                        isSelected 
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[0_0_15px_rgba(210,187,255,0.15)]' 
                          : 'border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-high)]/30 text-[var(--color-on-surface-variant)] hover:border-[var(--color-outline-variant)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[24px]">{opt.icon}</span>
                      <span className="font-label-sm text-label-sm">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => setStep(1)}
                  className="px-6 py-4 rounded-xl border border-[var(--color-outline-variant)]/50 text-[var(--color-on-surface)] hover:bg-white/5 transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <button 
                  onClick={() => setStep(3)}
                  disabled={focusAreas.length === 0}
                  className="flex-1 py-4 bg-[var(--color-primary)] text-[#000000] font-title-md text-title-md text-base rounded-xl shadow-[0_0_15px_rgba(210,187,255,0.4)] hover:shadow-[0_0_25px_rgba(210,187,255,0.8)] transition-all duration-300 font-bold active:scale-95 disabled:opacity-50 disabled:shadow-none"
                >
                  Confirm Priority ({focusAreas.length}/3)
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="flex flex-col gap-6 page-enter">
              <div>
                <h2 className="font-headline-md text-headline-md text-[var(--color-on-surface)] mb-2">Prime Objective</h2>
                <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)]">Set your first major goal to execute this week.</p>
              </div>
              
              <textarea 
                value={primaryGoal}
                onChange={(e) => setPrimaryGoal(e.target.value)}
                placeholder="E.g., Complete Phase 1 of my project..."
                className="w-full bg-[var(--color-surface-container-high)]/50 border border-[var(--color-outline-variant)]/50 rounded-xl px-4 py-4 text-[var(--color-on-surface)] font-body-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all placeholder:text-[var(--color-outline)]/30 min-h-[120px] resize-none"
                autoFocus
              />

              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => setStep(2)}
                  className="px-6 py-4 rounded-xl border border-[var(--color-outline-variant)]/50 text-[var(--color-on-surface)] hover:bg-white/5 transition-colors active:scale-95 disabled:opacity-50"
                  disabled={isLoading}
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <button 
                  onClick={handleComplete}
                  disabled={!primaryGoal.trim() || isLoading}
                  className="flex-1 py-4 bg-[var(--color-primary)] text-[#000000] font-title-md text-title-md text-base rounded-xl shadow-[0_0_15px_rgba(210,187,255,0.4)] hover:shadow-[0_0_25px_rgba(210,187,255,0.8)] transition-all duration-300 font-bold active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                      Booting System...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined font-bold text-[20px]">power_settings_new</span>
                      Initialize Evolv
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
