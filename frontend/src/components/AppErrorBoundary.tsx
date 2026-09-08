import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Prevent an unhandled render exception from leaving users with an empty page.
 * The error remains available in the browser console for diagnosis.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("LedgerCore UI render failed.", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
          <section className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold">Unable to display LedgerCore</h1>
            <p className="mt-3 text-slate-600">
              Refresh the page to load the latest application version.
            </p>
            <button
              className="mt-6 rounded bg-slate-900 px-4 py-2 text-white"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
