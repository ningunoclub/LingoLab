// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `lib/play/admin/controls.svelte` plus the timer bar of `lib/admin.svelte`.
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { HostAction } from './hostLoop';

type Props = {
  questionIndex: number;
  questionCount: number;
  action: HostAction | null;
  onRun: (action: HostAction) => void;
  /** Share of the time left, 0–1, or null when no timer runs. */
  timeShare: number | null;
};

export function HostControlBar({ questionIndex, questionCount, action, onRun, timeShare }: Props) {
  const { t } = useTranslation();
  const label = action ? actionLabel(action, questionIndex, t) : null;

  return (
    <div className="sticky top-0 z-20 border-b bg-card/95 text-card-foreground backdrop-blur-sm">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <p className="font-display font-semibold text-xl tabular-nums">
          <span className="sr-only">{t('admin_page.loop.progress')}: </span>
          {questionIndex + 1} / {questionCount}
        </p>
        {action && label ? (
          <Button size="lg" onClick={() => onRun(action)}>
            {label}
            <kbd className="ml-2 hidden rounded border border-current/40 px-1.5 font-sans text-xs sm:inline">
              ↵
            </kbd>
          </Button>
        ) : null}
      </div>
      {timeShare !== null ? (
        <div className="h-2 bg-muted" aria-hidden="true">
          <div
            className="h-full bg-highlight transition-[width] duration-1000 ease-linear"
            style={{ width: `${timeShare * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function actionLabel(
  action: HostAction,
  questionIndex: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const nextNumber = { question: questionIndex + 2 };
  switch (action.kind) {
    case 'next':
      return t('admin_page.next_question', { question: action.question + 1 });
    case 'solutions':
      return t('admin_page.stop_time_and_solutions');
    case 'results':
      return t('admin_page.show_results');
    case 'skip_results':
      return action.after === 'final'
        ? t('admin_page.get_final_results')
        : t('admin_page.next_question', nextNumber);
    case 'final':
      return t('admin_page.get_final_results');
  }
}
