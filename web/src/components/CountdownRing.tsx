// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type Props = {
  secondsLeft: number;
  totalSeconds: number;
  className?: string;
};

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A round countdown: the ring empties as time runs out and the seconds sit in the middle.
 * Replaces legacy `lib/play/circular_progress.svelte`.
 */
export function CountdownRing({ secondsLeft, totalSeconds, className }: Props) {
  const { t } = useTranslation();
  const share = totalSeconds > 0 ? Math.min(1, Math.max(0, secondsLeft / totalSeconds)) : 0;

  return (
    <div
      role="timer"
      aria-label={t('admin_page.loop.time_left', { seconds: secondsLeft })}
      className={cn('relative size-28', className)}
    >
      <svg viewBox="0 0 100 100" className="-rotate-90 size-full" aria-hidden="true">
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - share)}
          className="stroke-highlight transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center font-display font-semibold text-4xl tabular-nums"
      >
        {secondsLeft}
      </span>
    </div>
  );
}
