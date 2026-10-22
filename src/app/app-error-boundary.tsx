import { Component } from 'react';

import { Button } from '@/shared/ui/button';

import type { ErrorInfo, ReactNode } from 'react';

interface AppErrorBoundaryProps {
  readonly children: ReactNode;
}

interface AppErrorBoundaryState {
  readonly hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Shapebound crashed:', error, errorInfo.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 text-center">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-aurora" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-grid opacity-40"
          />
          <p className="relative font-mono text-[0.62rem] tracking-[0.24em] text-magenta uppercase">
            SYSTEM FAILURE // RECOVERY REQUIRED
          </p>
          <h1 className="relative mt-3 font-display text-5xl font-bold tracking-[-0.04em] text-ink uppercase text-glitch">
            Link Severed
          </h1>
          <p className="relative mt-4 max-w-md text-lg leading-snug text-muted">
            The interface hit an unrecoverable error. Reload the local session to continue.
          </p>
          <div className="relative mt-8">
            <Button
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload session
            </Button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
