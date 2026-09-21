import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DashboardPage } from '@/features/goal/DashboardPage';
import { useSound } from '@/hooks/useSound';

function BackgroundBlobs() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-pastel-mint/60 blur-3xl animate-float" />
      <div className="absolute -right-16 top-1/3 h-72 w-72 rounded-full bg-pastel-lilac/60 blur-3xl animate-float [animation-delay:2s]" />
      <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-pastel-rose/50 blur-3xl animate-float [animation-delay:4s]" />
    </div>
  );
}

export function App() {
  const { soundEnabled, toggleSound } = useSound();

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-pastel-mint via-pastel-sky to-pastel-lilac">
      <BackgroundBlobs />

      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-16 lg:px-8">
        <header className="mb-8 flex items-center justify-between">
          <p className="font-display text-2xl font-extrabold text-slate-800">
            Go<span className="text-pastel-coral-dark">Run</span>
          </p>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
            className="rounded-full bg-white/70 px-4 py-2 text-lg shadow-soft transition hover:bg-white"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </header>

        <main>
          <ErrorBoundary>
            <DashboardPage />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
