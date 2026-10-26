import { useSettings } from '@/features/settings/settings-context';
import { BOSS_INTERVAL_MS, formatElapsed } from '@/game/run';
import type { BossColor } from '@/game/run';
import { cx } from '@/shared/lib/cx';

import type { RunBannerSnapshot } from './use-run-loop';

interface BossBannerProps {
  readonly banner: RunBannerSnapshot | null;
}

const BOSS_STYLES: Record<
  BossColor,
  {
    readonly wrapper: string;
    readonly edge: string;
    readonly diamond: string;
    readonly wash: string;
  }
> = {
  purple: {
    wrapper: 'text-boss-purple',
    edge: 'bg-boss-purple',
    diamond: 'bg-boss-purple',
    wash: 'bg-boss-purple/10',
  },
  green: {
    wrapper: 'text-boss-green',
    edge: 'bg-boss-green',
    diamond: 'bg-boss-green',
    wash: 'bg-boss-green/10',
  },
  orange: {
    wrapper: 'text-boss-orange',
    edge: 'bg-boss-orange',
    diamond: 'bg-boss-orange',
    wash: 'bg-boss-orange/10',
  },
};

const BANNER_POSITION_CLASS =
  'pointer-events-none absolute left-1/2 z-10 w-80 -translate-x-1/2 [--boss-plate-height:2.75rem] [@media(min-height:480px)]:[--boss-plate-height:4rem] [top:max(calc(env(safe-area-inset-top)_+_8px),calc(var(--arena-top,0px)_-_var(--boss-plate-height)_-_8px))]';

const PLATE_CLASS =
  'clip-border clip-corner-sm relative w-full [--clip-border:var(--color-ink)] [--clip-fill:color-mix(in_srgb,var(--color-void)_85%,transparent)]';

export function BossBanner({ banner }: BossBannerProps) {
  const { settings } = useSettings();

  if (banner === null) {
    return null;
  }

  const style = BOSS_STYLES[banner.color];
  const clock = formatElapsed(banner.bossIndex * BOSS_INTERVAL_MS);
  const milestone = `${String(clock.minutes).padStart(2, '0')}:00`;

  return (
    <div
      data-boss-banner=""
      data-testid="boss-banner"
      data-boss-index={banner.bossIndex}
      data-boss-color={banner.color}
      data-reduced-motion={settings.reducedMotion ? 'true' : undefined}
      className={cx(BANNER_POSITION_CLASS, style.wrapper, 'glow-hud')}
    >
      <div className={cx(PLATE_CLASS, 'h-[var(--boss-plate-height)]')}>
        <span aria-hidden="true" className={cx('absolute inset-0', style.wash)} />
        <span
          aria-hidden="true"
          className={cx('absolute top-0 bottom-0 left-0 w-[3px]', style.edge)}
        />
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-ink" />
        {settings.reducedMotion ? null : (
          <span
            aria-hidden="true"
            data-boss-glitch=""
            data-testid="boss-glitch"
            className="absolute inset-x-0 bottom-0 h-0.5 bg-glitch motion-reduce:hidden"
          />
        )}

        <div
          role="status"
          aria-live="polite"
          className="relative flex h-full items-center gap-2 pr-3 pl-3"
        >
          <span className="font-mono text-[0.5rem] tracking-[0.16em] text-muted uppercase [@media(min-height:480px)]:text-[0.55rem]">
            /// BOSS MARKER
          </span>
          <span
            aria-hidden="true"
            className={cx(
              'h-2 w-2 shrink-0 clip-diamond [@media(min-height:480px)]:h-2.5 [@media(min-height:480px)]:w-2.5',
              style.diamond,
            )}
          />
          <span className="font-display text-[1.05rem] leading-none font-bold tracking-[0.04em] text-ink uppercase [@media(min-height:480px)]:text-[1.35rem]">
            {banner.color.toUpperCase()}
          </span>
          <span className="ml-auto font-mono text-[0.62rem] text-muted tabular-nums [@media(min-height:480px)]:text-[0.7rem]">
            {milestone}
          </span>
        </div>
      </div>
    </div>
  );
}
