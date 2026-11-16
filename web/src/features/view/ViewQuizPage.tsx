// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `routes/view/[quiz_id]/+page.svelte`: the public page of one quiz.
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Download, ExternalLink, Flag, GraduationCap, Play } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/auth/useCurrentUser';
import { MediaComponent } from '@/components/MediaComponent';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { config } from '@/config';
import { DownloadQuizDialog } from '@/features/dashboard/DownloadQuizDialog';
import { StartGameDialog } from '@/features/dashboard/StartGameDialog';
import { ImportedBadge } from './ImportedBadge';
import { ModerationPanel } from './ModerationPanel';
import { QuestionPreview } from './QuestionPreview';
import { QuizRating } from './QuizRating';
import { QuizNotFoundError, type ViewQuiz, viewQueries } from './viewApi';

type Options = { modView: boolean; autoExpand: boolean; autoReturn: boolean };

/**
 * An action that needs a sign-in. Signed out, it stays focusable but does nothing
 * (`aria-disabled` rather than `disabled`), so the reason in the tooltip can be reached by
 * pointer and keyboard alike (legacy: a tippy on a wrapper around a disabled button).
 */
function SignInAction({
  signedIn,
  reason,
  icon,
  label,
  onClick,
}: {
  signedIn: boolean;
  reason: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  const button = (
    <Button
      type="button"
      variant="secondary"
      className="h-11 w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      aria-disabled={!signedIn || undefined}
      aria-description={signedIn ? undefined : reason}
      onClick={signedIn ? onClick : undefined}
    >
      {icon}
      {label}
    </Button>
  );
  if (signedIn) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

function Loaded({ quiz, options }: { quiz: ViewQuiz; options: Options }) {
  const { t } = useTranslation();
  const { isSignedIn } = useCurrentUser();
  const [startOpen, setStartOpen] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const returnTo = `/view/${quiz.id}`;

  return (
    <>
      <header className="flex flex-col items-center gap-2 text-center">
        {/* Titles and descriptions are plain text, as on the dashboard. */}
        <h1 className="break-words font-display font-semibold text-3xl sm:text-4xl">
          {quiz.title}
        </h1>
        {quiz.description ? (
          <p className="prose-measure break-words text-muted-foreground">{quiz.description}</p>
        ) : null}
        <p>
          {t('view_quiz_page.made_by')}{' '}
          <Link
            to="/user/$userId"
            params={{ userId: quiz.user_id.id }}
            className="underline underline-offset-4"
          >
            @{quiz.user_id.username}
          </Link>
        </p>
        {quiz.cover_image ? (
          <MediaComponent src={quiz.cover_image} className="my-2 h-[15vh] w-auto" />
        ) : null}
        <ImportedBadge imported={quiz.imported_from_kahoot} />
      </header>

      <div className="flex flex-row flex-wrap items-start justify-center gap-3">
        <QuizRating quiz={quiz} signedIn={isSignedIn} />
        {options.modView ? (
          <ModerationPanel quizId={quiz.id} autoReturn={options.autoReturn} />
        ) : null}
      </div>

      <div className="mx-auto flex w-full max-w-xs flex-col gap-2">
        {quiz.imported_from_kahoot && quiz.kahoot_id ? (
          <Button asChild variant="secondary" className="h-11 w-full">
            <a
              href={`https://create.kahoot.it/details/${encodeURIComponent(quiz.kahoot_id)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink aria-hidden="true" />
              {t('view_quiz_page.view_on_kahoot')}
            </a>
          </Button>
        ) : null}
        <SignInAction
          signedIn={isSignedIn}
          reason={t('view_quiz_page.start_game_login')}
          icon={<Play aria-hidden="true" />}
          label={t('start_game.start_game')}
          onClick={() => setStartOpen(true)}
        />
        <Button asChild variant="secondary" className="h-11 w-full">
          <Link to="/practice" search={{ quiz_id: quiz.id }}>
            <GraduationCap aria-hidden="true" />
            {t('words.practice')}
          </Link>
        </Button>
        <SignInAction
          signedIn={isSignedIn}
          reason={t('view_quiz_page.download_login')}
          icon={<Download aria-hidden="true" />}
          label={t('words.download')}
          onClick={() => setDownloadId(quiz.id)}
        />
        {config.reportEmail ? (
          <a
            href={`mailto:${config.reportEmail}?subject=${encodeURIComponent(`Report quiz ${quiz.id}`)}`}
            className="mt-1 inline-flex min-h-11 items-center justify-center gap-1.5 self-center text-sm underline underline-offset-4"
          >
            <Flag className="size-4" aria-hidden="true" />
            {t('words.report')}
          </a>
        ) : null}
      </div>

      <section className="flex flex-col gap-2" aria-label={t('words.question_plural')}>
        {quiz.questions.map((question, index) => (
          <QuestionPreview
            // biome-ignore lint/suspicious/noArrayIndexKey: questions have no id; the list never reorders
            key={index}
            question={question}
            index={index}
            defaultOpen={options.autoExpand}
          />
        ))}
      </section>

      <StartGameDialog
        quiz={startOpen ? quiz : null}
        onClose={() => setStartOpen(false)}
        returnTo={returnTo}
      />
      <DownloadQuizDialog quizId={downloadId} onClose={() => setDownloadId(null)} />
    </>
  );
}

export function ViewQuizPage({ quizId, ...options }: { quizId: string } & Options) {
  const { t } = useTranslation();
  const quiz = useQuery(viewQueries.quiz(quizId));

  let content: ReactNode;
  if (quiz.isPending) {
    content = (
      <div className="flex flex-col items-center gap-3" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-32 w-56" />
        <Skeleton className="h-11 w-full max-w-xs" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  } else if (quiz.isError && quiz.error instanceof QuizNotFoundError) {
    content = (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-16 text-center">
        <h1 className="font-display font-semibold text-xl">{t('view_quiz_page.not_found')}</h1>
        <p className="prose-measure text-muted-foreground">{t('view_quiz_page.not_found_text')}</p>
        <Button asChild variant="secondary">
          <Link to="/">{t('words.home')}</Link>
        </Button>
      </div>
    );
  } else if (quiz.isError) {
    content = (
      <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
        <p role="alert" className="text-destructive text-sm">
          {t('view_quiz_page.load_failed')}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={() => quiz.refetch()}>
          {t('words.retry')}
        </Button>
      </div>
    );
  } else {
    content = <Loaded quiz={quiz.data} options={options} />;
  }

  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">{content}</div>;
}
