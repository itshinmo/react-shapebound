import { Button } from '@/shared/ui/button';

interface StartOverlayProps {
  readonly onStart: () => void;
  readonly pending: boolean;
}

export function StartOverlay({ onStart, pending }: StartOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-void/95 px-6 py-10">
      <div className="max-w-md text-center">
        <p className="font-mono text-[0.62rem] tracking-[0.24em] text-cyan uppercase">
          /// PLAYFIELD_READY
        </p>
        <h2 className="mt-4 font-display text-4xl font-bold tracking-[0.02em] text-ink uppercase sm:text-5xl">
          Tap to start
        </h2>
        <p className="mt-4 font-body text-lg leading-snug text-muted">
          Landscape is required. Fullscreen and orientation lock are requested where supported.
        </p>
        <p className="mt-3 font-mono text-[0.62rem] leading-relaxed tracking-[0.18em] text-cyan uppercase">
          ONE FINGER MOVES // A SECOND FINGER AIMS THE SHIELD WHEN CHARGES ARE AVAILABLE.
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={onStart}
          disabled={pending}
          className="mt-8 focus-visible:outline-cyan"
        >
          {pending ? 'STARTING' : 'START'}
        </Button>
      </div>
    </div>
  );
}
