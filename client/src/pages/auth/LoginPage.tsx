import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative bg-ambient-mesh text-[var(--color-on-surface)] selection:bg-[var(--color-primary)]/30 overflow-hidden font-body-md">
      
      {/* Immersive Background Aesthetics */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Glowing Cursor-Following Orb */}
        <div 
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[120px] transition-transform duration-1000 ease-out opacity-25 mix-blend-screen"
          style={{
            background: 'radial-gradient(circle, rgba(210,187,255,0.3) 0%, rgba(90,218,206,0.08) 50%, transparent 75%)',
            left: `${mousePos.x}%`,
            top: `${mousePos.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      </div>
      
      {/* Dot-grid overlay */}
      <div className="absolute inset-0 bg-dot-grid opacity-35 pointer-events-none z-0" />
      
      <div className="w-full max-w-[420px] relative z-10 flex flex-col gap-6 anim-fade-up">
        
        {/* Logo and Header */}
        <div className="text-center">
          <Link to="/" className="inline-block px-4 py-2 hover:scale-105 transition-transform active:scale-95">
            <h1 className="font-title-md text-4xl font-extrabold tracking-tight text-gradient-primary">
              Evolv
            </h1>
          </Link>
          <p className="text-sm text-[var(--color-outline)] mt-2 font-medium">
            Welcome back. Enter your details to continue.
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden border border-[var(--glass-border)] bg-[var(--color-surface)]/40 backdrop-blur-xl">
          
          {error && (
            <div className="mb-6 p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)]/25 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-[var(--color-error)] text-[18px] mt-0.5 select-none">error</span>
              <p className="text-xs text-[var(--color-error)] font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] block ml-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-field w-full px-4 py-3.5"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] block">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[var(--color-secondary)] hover:underline transition-colors"
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
                className="input-field w-full px-4 py-3.5 font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full mt-2 py-3.5 rounded-xl text-sm font-bold tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

        </div>
          
        <div className="text-center">
          <p className="text-sm text-[var(--color-outline)] font-medium">
            New to Evolv?{' '}
            <Link to="/register" className="text-[var(--color-primary)] hover:underline ml-1 font-semibold transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
