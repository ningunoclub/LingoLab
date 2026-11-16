// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useMutation } from '@tanstack/react-query';
import { Eye, Play, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { rateQuiz, type ViewQuiz } from './viewApi';

type Counts = Pick<ViewQuiz, 'likes' | 'dislikes'>;

/**
 * The counts after a successful rating. The backend swaps an earlier opposite rating, so a
 * like after a dislike given on this page also takes the dislike back. Legacy only added one,
 * which left both counts up until a reload.
 */
export function countsAfterRating(counts: Counts, positive: boolean, previous: boolean | null) {
  const next = { ...counts };
  if (positive) next.likes += 1;
  else next.dislikes += 1;
  if (previous !== null && previous !== positive) {
    if (previous) next.likes = Math.max(0, next.likes - 1);
    else next.dislikes = Math.max(0, next.dislikes - 1);
  }
  return next;
}

/** Port of legacy `lib/view_quiz/RatingComponent.svelte`: like/dislike plus plays and views. */
export function QuizRating({ quiz, signedIn }: { quiz: ViewQuiz; signedIn: boolean }) {
  const { t } = useTranslation();
  const [counts, setCounts] = useState<Counts>({ likes: quiz.likes, dislikes: quiz.dislikes });
  const [myRating, setMyRating] = useState<boolean | null>(null);

  const rate = useMutation({
    mutationFn: (positive: boolean) => rateQuiz(quiz.id, positive),
    onSuccess: (result, positive) => {
      if (result === 'already_rated') {
        toast.info(t('view_quiz_page.already_rated'));
      } else if (result === 'failed') {
        toast.error(t('view_quiz_page.rate_failed'));
      } else {
        setCounts((c) => countsAfterRating(c, positive, myRating));
        setMyRating(positive);
      }
    },
    onError: () => toast.error(t('view_quiz_page.rate_failed')),
  });

  const thumb = (positive: boolean) => {
    const Icon = positive ? ThumbsUp : ThumbsDown;
    const label = t(positive ? 'view_quiz_page.like' : 'view_quiz_page.dislike');
    const button = (
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={signedIn ? label : t('view_quiz_page.rate_login')}
        aria-pressed={myRating === positive}
        className="size-11 rounded-full aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        // Signed out the thumb stays focusable, so its tooltip can say why it does nothing.
        aria-disabled={!signedIn || rate.isPending || undefined}
        onClick={() => {
          if (signedIn && !rate.isPending) rate.mutate(positive);
        }}
      >
        <Icon aria-hidden="true" className={myRating === positive ? 'fill-current' : undefined} />
      </Button>
    );
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{signedIn ? label : t('view_quiz_page.rate_login')}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 justify-items-center">
        {thumb(true)}
        {thumb(false)}
        <span className="tabular-nums" aria-live="polite">
          <span aria-hidden="true">{counts.likes}</span>
          <span className="sr-only">{t('view_quiz_page.likes', { count: counts.likes })}</span>
        </span>
        <span className="tabular-nums" aria-live="polite">
          <span aria-hidden="true">{counts.dislikes}</span>
          <span className="sr-only">
            {t('view_quiz_page.dislikes', { count: counts.dislikes })}
          </span>
        </span>
      </div>
      <div className="border-t" />
      <dl className="grid grid-cols-2 gap-4 justify-items-center">
        <Stat icon={Play} label={t('view_quiz_page.plays')} value={quiz.plays} />
        <Stat icon={Eye} label={t('view_quiz_page.views')} value={quiz.views} />
      </dl>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Focusable so the tooltip also opens from the keyboard. */}
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: tooltip trigger for keyboard users */}
        <div className="flex flex-col items-center gap-0.5 rounded-md px-1" tabIndex={0}>
          <dt>
            <Icon className="size-7 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </dt>
          <dd className="tabular-nums">{value}</dd>
        </div>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
