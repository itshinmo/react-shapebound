import { LinkButton } from '@/shared/ui/button';
import { SectionLabel } from '@/shared/ui/section-label';

export function NotFoundScreen() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-paper px-4 py-6 text-ink-inverse sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-halftone opacity-30"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid-ink opacity-30"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col">
        <SectionLabel tone="red" className="text-red">
          ROUTE_ERROR // 404
        </SectionLabel>

        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <p className="font-mono text-[0.62rem] tracking-[0.24em] text-red uppercase">
            SIGNAL LOST // ROUTE UNKNOWN
          </p>
          <h1 className="mt-6 font-hero text-[clamp(7rem,26vw,20rem)] leading-[0.78] tracking-[-0.03em] text-glitch">
            404
          </h1>
          <p className="mt-4 max-w-md font-body text-lg leading-snug text-ink-inverse/70">
            This node does not exist in the local network.
          </p>
          <div className="mt-8">
            <LinkButton to="/" variant="inverse">
              RETURN TO TITLE
            </LinkButton>
          </div>
        </div>

        <div className="border border-ink-inverse bg-void px-4 py-3 text-ink">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[0.58rem] tracking-[0.22em] text-muted uppercase">
              SHAPEBOUND // UNKNOWN NODE
            </p>
            <div aria-hidden="true" className="h-2 w-full max-w-xs bg-hazard opacity-80" />
            <p className="font-mono text-[0.58rem] tracking-[0.22em] text-muted uppercase">
              LOCAL SESSION // 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
