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
    <div className="min-h-screen w-full flex items-center justify-center p-6 py-12 relative overflow-y-auto bg-ambient-mesh text-[var(--color-on-surface)] selection:bg-[var(--color-primary)]/30 selection:text-[var(--color-on-surface)]">
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
            Password Recovery
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 shadow-xl">
          <div className="mb-8 border-b border-[var(--glass-border)] pb-4">
            <h2 className="text-2xl font-bold text-[var(--color-on-surface)] tracking-tight">
              Reset Password
            </h2>
            <p className="text-sm text-[var(--color-outline)] mt-1">
              Enter your email to receive a reset link
            </p>
          </div>

          {submitted ? (
            <div className="flex flex-col gap-6">
              <div className="px-4 py-6 bg-[var(--color-secondary)]/10 border border-[var(--color-secondary)]/20 rounded-xl text-center">
                <span className="material-symbols-outlined text-[32px] text-[var(--color-secondary)] block mb-3" aria-hidden="true">
                  mark_email_read
                </span>
                <p className="text-base font-semibold text-[var(--color-on-surface)] tracking-tight">
                  Check your inbox
                </p>
                <p className="text-sm text-[var(--color-outline)] mt-2 leading-relaxed">
                  If an account exists for <span className="text-[var(--color-secondary)] font-medium">{email}</span>,
                  you will receive password reset instructions shortly.
                </p>
              </div>
              <Link
                to="/login"
                className="btn-gradient w-full py-3 text-base rounded-xl flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
                Return to Login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 px-4 py-3 bg-[var(--color-error)]/10 text-[var(--color-error)] text-sm font-medium rounded-xl flex items-center gap-2 border border-[var(--color-error)]/20">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">error</span>
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="text-sm font-medium text-[var(--color-on-surface-variant)] block">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    className="input-field w-full"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gradient w-full mt-4 py-3 text-base rounded-xl flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]" aria-hidden="true">sync</span>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center pt-6 border-t border-[var(--glass-border)]">
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  Remembered your password?{' '}
                  <Link to="/login" className="text-[var(--color-secondary)] hover:underline font-medium ml-1">
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
