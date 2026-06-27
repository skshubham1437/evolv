import { useState, type FormEvent } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 py-12 relative overflow-y-auto bg-ambient-mesh text-[var(--color-on-surface)] selection:bg-[var(--color-secondary)]/30 selection:text-[var(--color-on-surface)]">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[rgba(108,74,176,0.1)] blur-[100px] animate-ambient-pulse" />
        <div className="absolute -bottom-[15%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[rgba(90,218,206,0.05)] blur-[80px] animate-ambient-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="w-full max-w-[440px] relative z-10 flex flex-col gap-8">
        
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-block px-4 py-2 mb-2 hover:scale-105 transition-transform">
            <h1 className="font-title-md text-4xl font-bold tracking-tight text-gradient-primary">
              Evolv
            </h1>
          </Link>
          <p className="text-sm text-[var(--color-outline)] font-medium">
            Create your account
          </p>
        </div>

        {/* Register Card */}
        <div className="glass-card glow-card glow-shadow-primary rounded-2xl p-8 shadow-xl">
          
          <div className="mb-8 border-b border-[var(--glass-border)] pb-4">
            <h2 className="text-2xl font-bold text-[var(--color-on-surface)] tracking-tight">Create Account</h2>
            <p className="text-sm text-[var(--color-outline)] mt-1">Set up your Evolv account</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-[var(--color-error)]/10 text-[var(--color-error)] text-sm font-medium rounded-xl flex items-center gap-2 border border-[var(--color-error)]/20">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-on-surface-variant)] block">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
                className="input-field w-full"
                placeholder="Your name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-on-surface-variant)] block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-field w-full"
                placeholder="you@example.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-on-surface-variant)] block">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="input-field w-full"
                  placeholder="Min 8 chars"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-on-surface-variant)] block">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="input-field w-full"
                  placeholder="Confirm password"
                />
              </div>
            </div>

            {password && (
              <div className="p-3 bg-[var(--color-surface-container-low)] rounded-xl border border-[var(--color-outline-variant)] text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[14px] ${password.length >= 8 ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)]'}`}>
                    {password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className={password.length >= 8 ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-outline)]'}>
                    At least 8 characters ({password.length}/8)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[14px] ${/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)]'}`}>
                    {/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className={/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-outline)]'}>
                    Uppercase, lowercase & number
                  </span>
                </div>
                {confirmPassword && (
                  <div className="flex items-center gap-2 border-t border-[var(--color-outline-variant)] pt-1.5 mt-1.5">
                    <span className={`material-symbols-outlined text-[14px] ${password === confirmPassword ? 'text-[var(--color-primary)]' : 'text-[var(--color-error)]'}`}>
                      {password === confirmPassword ? 'check_circle' : 'cancel'}
                    </span>
                    <span className={password === confirmPassword ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-error)]'}>
                      {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full mt-4 py-3 text-base rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-[var(--glass-border)]">
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--color-secondary)] hover:underline font-medium ml-1">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
