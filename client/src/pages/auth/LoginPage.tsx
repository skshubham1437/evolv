import { useState, type FormEvent } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 py-12 relative overflow-y-auto bg-ambient-mesh text-[var(--color-on-surface)]">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[rgba(108,74,176,0.1)] blur-[100px] animate-ambient-pulse" />
        <div className="absolute -bottom-[15%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[rgba(90,218,206,0.05)] blur-[80px] animate-ambient-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col gap-8">
        
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-block px-4 py-2 mb-2 hover:scale-105 transition-transform">
            <h1 className="font-title-md text-4xl font-bold tracking-tight text-gradient-primary">
              Evolv
            </h1>
          </Link>
          <p className="text-sm text-[var(--color-outline)] font-medium">
            Welcome back
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card glow-card glow-shadow-primary rounded-2xl p-8 shadow-xl">
          
          <div className="mb-8 border-b border-[var(--glass-border)] pb-4">
            <h2 className="text-2xl font-bold text-[var(--color-on-surface)] tracking-tight">Sign In</h2>
            <p className="text-sm text-[var(--color-outline)] mt-1">Enter your credentials to continue</p>
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-medium text-[var(--color-on-surface-variant)] block">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors font-medium"
                >
                  Forgot?
                </Link>
              </div>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input-field w-full"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full mt-4 py-3 text-base rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-[var(--glass-border)]">
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              Don't have an account?{' '}
              <Link to="/register" className="text-[var(--color-secondary)] hover:underline font-medium ml-1">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
