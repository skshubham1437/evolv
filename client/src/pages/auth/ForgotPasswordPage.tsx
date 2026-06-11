import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../../api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch {
      // Intentionally don't surface error to prevent email enumeration
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 py-12 relative bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] overflow-y-auto font-mono selection:bg-[var(--color-primary)] selection:text-black">
      {/* Grid Background */}
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
            Password Recovery
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-surface-container)] border-4 border-[var(--color-on-surface)] p-8 shadow-[12px_12px_0px_var(--color-on-surface)]">
          <div className="mb-8 border-b-4 border-[var(--color-on-surface)] pb-4">
            <h2 className="font-mono text-3xl font-bold text-[var(--color-on-surface)] uppercase tracking-tighter">
              Reset Key
            </h2>
            <p className="font-mono text-[12px] text-[var(--color-outline)] font-bold uppercase tracking-widest mt-1">
              Enter your email to receive a reset link
            </p>
          </div>

          {submitted ? (
            <div className="flex flex-col gap-6">
              <div className="px-4 py-5 bg-[var(--color-secondary)]/10 border-2 border-[var(--color-secondary)] text-center">
                <span className="material-symbols-outlined text-[32px] text-[var(--color-secondary)] block mb-2" aria-hidden="true">
                  mark_email_read
                </span>
                <p className="font-mono text-[13px] text-[var(--color-on-surface)] font-bold uppercase tracking-wide">
                  Check your inbox
                </p>
                <p className="font-mono text-[11px] text-[var(--color-outline)] mt-2 leading-relaxed">
                  If an account exists for <span className="text-[var(--color-secondary)]">{email}</span>,
                  you will receive password reset instructions shortly.
                </p>
              </div>
              <Link
                to="/login"
                className="w-full py-4 border-2 border-[var(--color-on-surface)] text-[var(--color-on-surface)] font-mono text-sm font-bold uppercase tracking-widest hover:bg-[var(--color-surface-container-high)] transition-all flex justify-center items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
                Return to Login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 px-4 py-3 bg-[var(--color-error)] text-white text-[12px] font-bold uppercase tracking-widest flex items-center gap-2 border-2 border-[var(--color-error)]">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">error</span>
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="forgot-email" className="font-mono text-[12px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-widest block">
                    Com-Link (Email)
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    className="w-full px-4 py-3 bg-[var(--color-surface-container-low)] border-2 border-[var(--color-outline-variant)] text-[var(--color-on-surface)] font-mono text-sm placeholder:text-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[4px_4px_0px_var(--color-primary)] transition-all"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-4 border-2 border-black bg-[var(--color-primary)] text-black font-mono text-sm font-bold uppercase tracking-widest hover:bg-[var(--color-primary-fixed)] shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">sync</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">send</span>
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center pt-6 border-t-2 border-[var(--color-outline-variant)]">
                <p className="font-mono text-[12px] text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold">
                  Remembered your key?{' '}
                  <Link to="/login" className="text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black transition-colors font-bold px-2 py-1 ml-1 border-2 border-transparent hover:border-black">
                    Access Node
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center font-mono text-[10px] text-[var(--color-outline)] font-bold uppercase tracking-[0.2em]">
          V2.0 Core · Encrypted
        </p>
      </div>
    </div>
  );
}
