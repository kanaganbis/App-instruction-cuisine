import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryState {
  error: Error | null;
}

/** Last-resort screen if something breaks while rendering. */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-4 px-5">
        <p className="text-[13px] font-bold tracking-[0.08em] text-danger uppercase">
          Oups
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Quelque chose s&apos;est mal passé
        </h1>
        <p className="text-muted">
          {this.state.error.message || "Une erreur inattendue est survenue."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-12 self-start rounded-2xl bg-accent px-5 font-bold text-on-accent hover:bg-accent-hover"
        >
          Recharger
        </button>
      </main>
    );
  }
}
