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
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] overflow-hidden font-mono selection:bg-[var(--color-primary)] selection:text-black">
      {/* Boxy Grid Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] grid-rows-[repeat(auto-fill,minmax(80px,1fr))] opacity-[0.04]">
          {Array.from({ length: 300 }).map((_, i) => (
            <div key={i} className="border-r border-b border-[var(--color-on-surface)]" />
          ))}
        </div>
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col gap-8">
        
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-block border-2 border-[var(--color-primary)] px-4 py-2 mb-4 bg-[var(--color-primary)]/10 shadow-[4px_4px_0px_var(--color-primary)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            <h1 className="font-mono text-4xl font-bold tracking-tighter text-[var(--color-primary)] uppercase">
              Evolv
            </h1>
          </Link>
          <p className="font-mono text-[12px] text-[var(--color-outline)] uppercase tracking-widest font-bold">
            System Authentication
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[var(--color-surface-container)] border-4 border-[var(--color-on-surface)] p-8 shadow-[12px_12px_0px_var(--color-on-surface)]">
          
          <div className="mb-8 border-b-4 border-[var(--color-on-surface)] pb-4">
            <h2 className="font-mono text-3xl font-bold text-[var(--color-on-surface)] uppercase tracking-tighter">Access Node</h2>
            <p className="font-mono text-[12px] text-[var(--color-outline)] font-bold uppercase tracking-widest mt-1">Provide credentials to enter</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-[var(--color-error)] text-white text-[12px] font-bold uppercase tracking-widest flex items-center gap-2 border-2 border-[var(--color-error)] shadow-[4px_4px_0px_rgba(255,0,0,0.5)]">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="font-mono text-[12px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-widest block">
                Com-Link (Email)
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-[var(--color-surface-container-low)] border-2 border-[var(--color-outline-variant)] text-[var(--color-on-surface)] font-mono text-sm placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[4px_4px_0px_var(--color-primary)] transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="font-mono text-[12px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-widest block">
                Security Key (Password)
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-[var(--color-surface-container-low)] border-2 border-[var(--color-outline-variant)] text-[var(--color-on-surface)] font-mono text-sm placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[4px_4px_0px_var(--color-primary)] transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 border-2 border-black bg-[var(--color-primary)] text-black font-mono text-sm font-bold uppercase tracking-widest hover:bg-[var(--color-primary-fixed)] shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                  Authenticating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Establish Connection
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t-2 border-[var(--color-outline-variant)]">
            <p className="font-mono text-[12px] text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold">
              Unregistered Node?{' '}
              <Link to="/register" className="text-[var(--color-secondary)] hover:bg-[var(--color-secondary)] hover:text-black transition-colors font-bold px-2 py-1 ml-1 border-2 border-transparent hover:border-black">
                Initialize System
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center font-mono text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-[0.2em]">
          V2.0 Core · Encrypted
        </p>
      </div>
    </div>
  );
}
