import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--color-secondary)]/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--color-tertiary)]/5 rounded-full blur-[150px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display-lg text-display-lg text-[var(--color-primary)] mb-2" style={{ textShadow: '0 0 30px rgba(210,187,255,0.3)' }}>
            Evolv
          </h1>
          <p className="font-label-sm text-label-sm text-[var(--color-on-surface-variant)] uppercase tracking-[0.3em]">
            Begin Your Evolution
          </p>
        </div>

        {/* Register Card */}
        <div className="glass-panel rounded-2xl p-8 shadow-2xl">
          <h2 className="font-title-md text-title-md text-[var(--color-on-surface)] mb-1">Create your system</h2>
          <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)] text-sm mb-8">Set up your personal Life OS</p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-[var(--color-error-container)]/20 border border-[var(--color-error)]/30 text-[var(--color-error)] text-sm font-body-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm text-[var(--color-on-surface-variant)] uppercase tracking-widest block">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface-container-high)]/60 border border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface)] font-body-md text-sm placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)]/60 focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-200"
                placeholder="What should we call you?"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm text-[var(--color-on-surface-variant)] uppercase tracking-widest block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface-container-high)]/60 border border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface)] font-body-md text-sm placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)]/60 focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-200"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm text-[var(--color-on-surface-variant)] uppercase tracking-widest block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface-container-high)]/60 border border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface)] font-body-md text-sm placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)]/60 focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-200"
                placeholder="Min 6 characters"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm text-[var(--color-on-surface-variant)] uppercase tracking-widest block">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface-container-high)]/60 border border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface)] font-body-md text-sm placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)]/60 focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-200"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-background)] font-label-sm text-label-sm uppercase tracking-widest hover:shadow-[0_0_25px_rgba(210,187,255,0.4)] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[var(--color-background)] border-t-transparent rounded-full animate-spin" />
                  Creating system...
                </span>
              ) : (
                'Initialize Evolv'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="font-body-md text-body-md text-[var(--color-on-surface-variant)] text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--color-secondary)] hover:text-[var(--color-secondary-fixed)] transition-colors font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 font-label-sm text-[10px] text-[var(--color-outline)] uppercase tracking-[0.2em]">
          V2.0 Cyber-Lavender · Encrypted & Secure
        </p>
      </div>
    </div>
  );
}
