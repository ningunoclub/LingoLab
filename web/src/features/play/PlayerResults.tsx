// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `lib/play/results_kahoot.svelte` and the results branch of
// `routes/play/+page.svelte`: the points this question earned and the running total.
import { useTranslation } from 'react-i18next';
import type { PlayerResults as Results } from './playStore';

type Props = {
  results: Results;
  username: string;
  /** Running total, this question included. */
  total: number;
};

export function PlayerResults({ results, username, total }: Props) {
  const { t } = useTranslation();

  if (results === 'none') {
    return (
      <Panel>
        <h1 className="font-display font-semibold text-3xl">{t('admin_page.no_answers')}</h1>
      </Panel>
    );
  }

  const points = results.find((a) => a.username === username)?.score ?? 0;
  return (
    <Panel>
      <h1 className="font-display font-semibold text-3xl">{t('words.results')}</h1>
      <p className="flex flex-col items-center gap-1">
        <span className="text-lg">{t('play_page.points_added')}</span>
        <span className="rounded-full bg-highlight px-6 py-2 font-display font-semibold text-5xl text-highlight-foreground tabular-nums">
          +{points}
        </span>
      </p>
      <p className="text-xl tabular-nums">{t('play_page.your_score', { score: total })}</p>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-xl border bg-card p-8 text-center text-card-foreground">
        {children}
      </div>
    </div>
  );
}
