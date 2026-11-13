// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `lib/admin.svelte` and the final-results half of `routes/admin/+page.svelte`:
// the host screen once the game has started.
import { Check, Download, Save } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { FinalRanking } from '@/components/FinalRanking';
import { SlideRenderer } from '@/components/SlideRenderer';
import { Button } from '@/components/ui/button';
import { GameTitle } from '@/features/play/GameTitle';
import type { GameQuiz } from './gameQuiz';
import { questionSeconds, slideAnswers } from './gameQuiz';
import { HostControlBar } from './HostControlBar';
import { HostQuestion } from './HostQuestion';
import { HostResults } from './HostResults';
import { type HostAction, nextHostAction } from './hostLoop';
import { loopState, useHostStore } from './hostStore';
import type { HostGameControls } from './useHostGame';

type Props = {
  quiz: GameQuiz;
  gamePin: string;
  controls: HostGameControls;
};

export function HostGame({ quiz, gamePin, controls }: Props) {
  const loop = useHostStore(useShallow(loopState));
  const controlVisible = useHostStore((s) => s.controlVisible);
  const answerCount = useHostStore((s) => s.answerCount);
  const finalScores = useHostStore((s) => s.finalScores);
  const action = nextHostAction(quiz, loop);
  const { run } = controls;

  // Enter and Space do what the control button does (legacy `tinykeys` on the window). They
  // work even while a remote controller has hidden the bar, as in legacy.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      // A focused button, link or field handles these keys itself.
      if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
      const state = useHostStore.getState();
      const next = state.quiz ? nextHostAction(state.quiz, loopState(state)) : null;
      if (!next) return;
      event.preventDefault();
      run(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run]);

  const question = loop.questionIndex >= 0 ? quiz.questions[loop.questionIndex] : undefined;
  const total = question ? questionSeconds(question) : 0;
  const timerRunning = question !== undefined && loop.timeLeft !== null && loop.timeLeft > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      {controlVisible ? (
        <HostControlBar
          questionIndex={loop.questionIndex}
          questionCount={quiz.questions.length}
          action={action}
          onRun={(a: HostAction) => run(a)}
          timeShare={timerRunning && total > 0 ? (loop.timeLeft ?? 0) / total : null}
        />
      ) : null}
      <main className="flex flex-1 flex-col">
        {finalScores !== null ? (
          <Stage>
            {controlVisible ? <FinalActions gamePin={gamePin} controls={controls} /> : null}
            <FinalRanking scores={finalScores} />
          </Stage>
        ) : !question ? (
          <GameTitle
            game={{
              title: quiz.title,
              description: quiz.description ?? '',
              coverImage: quiz.cover_image ?? null,
            }}
            className="min-h-0 flex-1"
          />
        ) : question.type === 'SLIDE' ? (
          <Stage>
            <SlideRenderer
              slide={slideAnswers(question)}
              className="mx-auto max-h-[80vh] w-auto max-w-full"
            />
          </Stage>
        ) : loop.questionResults !== null ? (
          question.hide_results === true ? (
            // The results were fetched only to keep the server in step; nothing is shown.
            <Stage>
              <HostQuestion question={question} timeLeft={0} answerCount={answerCount} />
            </Stage>
          ) : (
            <Stage>
              <ResultsFromStore quizQuestion={question} />
            </Stage>
          )
        ) : (
          <Stage>
            <HostQuestion
              question={question}
              timeLeft={loop.timeLeft ?? 0}
              answerCount={answerCount}
            />
          </Stage>
        )}
      </main>
    </div>
  );
}

const INTERACTIVE =
  'button, a[href], input, textarea, select, summary, [contenteditable="true"], [role="button"]';

/** A readable panel on top of the quiz's own background. */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 rounded-xl border bg-card p-6 text-card-foreground sm:p-10">
        {children}
      </div>
    </div>
  );
}

function ResultsFromStore({
  quizQuestion,
}: {
  quizQuestion: NonNullable<GameQuiz['questions'][number]>;
}) {
  const questionIndex = useHostStore((s) => s.questionIndex);
  const answers = useHostStore((s) => s.questionResults) ?? [];
  const scores = useHostStore((s) => s.scores);
  const scoresBefore = useHostStore((s) => s.scoresBefore);
  return (
    <HostResults
      // A new question starts its scoreboard (and its one-second reveal) afresh.
      key={questionIndex}
      question={quizQuestion}
      answers={answers}
      scores={scores}
      scoresBefore={scoresBefore}
    />
  );
}

function FinalActions({ gamePin, controls }: { gamePin: string; controls: HostGameControls }) {
  const { t } = useTranslation();
  const exportToken = useHostStore((s) => s.exportToken);
  const resultsSaved = useHostStore((s) => s.resultsSaved);

  const exportHref = exportToken
    ? `/api/v1/quiz/export_data/${encodeURIComponent(exportToken)}?ts=${Date.now()}&game_pin=${encodeURIComponent(gamePin)}`
    : null;

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {exportHref ? (
        <Button asChild variant="secondary">
          <a href={exportHref} target="_blank" rel="noopener">
            <Download aria-hidden="true" />
            {t('admin_page.download_export_results')}
          </a>
        </Button>
      ) : (
        <Button variant="secondary" onClick={controls.requestExport}>
          <Download aria-hidden="true" />
          {t('admin_page.request_export_results')}
        </Button>
      )}
      <Button variant="secondary" onClick={controls.saveResults} disabled={resultsSaved}>
        {resultsSaved ? (
          <>
            <Check aria-hidden="true" />
            {t('admin_page.loop.results_saved')}
          </>
        ) : (
          <>
            <Save aria-hidden="true" />
            {t('admin_page.save_results')}
          </>
        )}
      </Button>
    </div>
  );
}
