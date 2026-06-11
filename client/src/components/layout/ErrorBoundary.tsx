import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in Evolv interface:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex items-center justify-center bg-[var(--color-surface-container-lowest)] p-8">
          <div className="max-w-md w-full border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] p-6 rounded-sm flex flex-col gap-6 shadow-2xl relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-error)]" />
            
            <div className="flex items-center gap-3 border-b border-[var(--color-outline-variant)]/50 pb-3">
              <span className="material-symbols-outlined text-[24px] text-[var(--color-error)]">terminal</span>
              <h3 className="font-mono text-[13px] font-bold text-[var(--color-error)] uppercase tracking-widest">System Interface Crash</h3>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[14px] text-[var(--color-on-surface)] leading-relaxed font-semibold">
                Evolv experienced a rendering exception.
              </p>
              <p className="text-[12px] text-[var(--color-on-surface-variant)] leading-relaxed">
                An unexpected interface state occurred. You can attempt a hard session recovery.
              </p>
            </div>

            {this.state.error && (
              <details className="group border border-[var(--color-outline-variant)]/50 bg-[var(--color-surface-container-low)]">
                <summary className="cursor-pointer list-none flex items-center gap-2 px-3 py-2 text-[var(--color-outline)] font-mono text-[9px] uppercase tracking-wider hover:text-[var(--color-on-surface-variant)] transition-colors select-none">
                  <span className="material-symbols-outlined text-[10px] transition-transform group-open:rotate-90">chevron_right</span>
                  Exception Log Details
                </summary>
                <div className="border-t border-[var(--color-outline-variant)]/50 p-3 max-h-48 overflow-y-auto custom-scrollbar">
                  <p className="font-mono text-[10px] text-red-400 break-all leading-normal">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="font-mono text-[9px] text-[var(--color-outline)] mt-2 leading-relaxed whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-2.5">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 bg-[var(--color-error)] hover:brightness-110 text-black font-mono text-[11px] font-bold uppercase tracking-widest flex justify-center items-center gap-2 transition-colors rounded-sm"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                Restore
              </button>
              <a
                href={`mailto:support@evolv.app?subject=Evolv%20Crash%20Report&body=Error:%20${encodeURIComponent(this.state.error?.toString() || '')}`}
                className="flex-1 py-3 border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] font-mono text-[11px] font-bold uppercase tracking-widest flex justify-center items-center gap-2 transition-colors rounded-sm text-center"
              >
                <span className="material-symbols-outlined text-[14px]">mail</span>
                Report
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
