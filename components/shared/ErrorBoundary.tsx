import React, { Component, ErrorInfo, ReactNode } from 'react';
import { WarningCircle, ArrowsClockwise, Bug } from '@phosphor-icons/react';

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
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TrackXpense Uncaught UI Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[var(--bg-page)] text-[var(--text-primary)] flex items-center justify-center p-6 select-none font-sans">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            
            {/* Header with unboxed warning icon */}
            <div className="flex items-center gap-3">
              <WarningCircle size={24} weight="regular" className="text-[var(--status-warning-fg)] stroke-[1.5px] shrink-0" />
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                  Application Diagnostic Alert
                </h2>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  ERR_RUNTIME_EXCEPTION
                </span>
              </div>
            </div>

            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              An unexpected render fault was intercepted. Your underlying financial ledger stored in IndexedDB is intact.
            </p>

            {/* Error Stack Display */}
            {this.state.error && (
              <div className="p-3 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] overflow-x-auto max-h-[140px] text-[11px] font-mono text-[var(--text-muted)] no-scrollbar">
                <span className="text-[var(--status-error-fg)] font-semibold block mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </span>
                {this.state.error.stack && (
                  <span className="opacity-70 whitespace-pre">
                    {this.state.error.stack.split('\n').slice(0, 3).join('\n')}
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 h-[36px] bg-[var(--accent-solid)] text-[var(--accent-text)] rounded-[6px] text-[13px] font-medium hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                <ArrowsClockwise size={15} strokeWidth={1.5} />
                <span>Recover & Reload</span>
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
