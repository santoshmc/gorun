import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        className="mx-auto max-w-md rounded-3xl bg-white/80 p-8 text-center shadow-soft"
      >
        <p className="font-display text-xl font-bold text-slate-800">
          Something tripped us up
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Your saved goal is safe. Give it another go.
        </p>
        <Button className="mt-6" onClick={() => this.setState({ hasError: false })}>
          Try again
        </Button>
      </div>
    );
  }
}
