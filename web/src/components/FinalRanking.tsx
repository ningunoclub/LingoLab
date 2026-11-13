// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `lib/play/admin/final_results.svelte`: the top five, revealed from fifth
// place up to the winner, then confetti. On a player's phone their own score and place follow.
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ranking } from '@/features/host/hostLoop';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { cn } from '@/lib/utils';

const PLACES = 5;
/** Legacy timing: place i appears at (n·1200 − (i+1)·1000) ms, confetti at n·1200 − 800 ms. */
const STEP_MS = 1200;

const SIZES = [
  'text-5xl lg:text-7xl',
  'text-4xl lg:text-6xl',
  'text-3xl lg:text-5xl',
  'text-2xl lg:text-4xl',
  'text-xl lg:text-3xl',
];

type Props = {
  scores: Record<string, number>;
  /** The player looking at this screen; their own score and place are shown below the list. */
  username?: string;
};

export function FinalRanking({ scores, username }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const everyone = ranking(scores);
  const names = everyone.slice(0, PLACES);
  const shown = names.length;

  useEffect(() => {
    if (reducedMotion || shown === 0) return;
    const id = setTimeout(
      () => confetti({ particleCount: 200, spread: 160, disableForReducedMotion: true }),
      shown * STEP_MS - 800,
    );
    return () => {
      clearTimeout(id);
      confetti.reset();
    };
  }, [reducedMotion, shown]);

  if (shown === 0) {
    return (
      <p className="text-center font-display font-semibold text-3xl">
        {t('admin_page.no_answers')}
      </p>
    );
  }

  const ownPlace = username === undefined ? -1 : everyone.indexOf(username);

  return (
    <>
      <ol
        className="flex flex-col items-center gap-4"
        aria-label={t('admin_page.loop.final_ranking')}
      >
        {names.map((name, i) => (
          <li
            key={name}
            className={cn(
              'text-balance break-words text-center font-display font-semibold',
              SIZES[i],
              !reducedMotion &&
                'fade-in slide-in-from-top-48 fill-mode-backwards animate-in duration-700',
            )}
            style={
              reducedMotion
                ? undefined
                : { animationDelay: `${shown * STEP_MS - (i + 1) * 1000}ms` }
            }
          >
            {t('play_page.final_result_rank', {
              place: i + 1,
              username: name,
              points: scores[name],
            })}
          </li>
        ))}
      </ol>
      {ownPlace >= 0 && username !== undefined ? (
        // Legacy hid this box for a player with 0 points.
        <div className="mx-auto rounded-xl border-4 border-highlight px-6 py-3 text-center text-xl">
          <p className="tabular-nums">
            {t('play_page.your_score', { score: scores[username] ?? 0 })}
          </p>
          <p>{t('play_page.your_place', { place: ownPlace + 1 })}</p>
        </div>
      ) : null}
    </>
  );
}
