// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `lib/play/admin/question.svelte`: the running question on the projector.
import { useTranslation } from 'react-i18next';
import { CountdownRing } from '@/components/CountdownRing';
import { MediaComponent } from '@/components/MediaComponent';
import { RichText } from '@/components/RichText';
import { choiceAnswers, type GameQuestion, questionSeconds } from './gameQuiz';
import { HostAnswer } from './HostAnswer';

type Props = {
  question: GameQuestion;
  timeLeft: number;
  answerCount: number;
};

export function HostQuestion({ question, timeLeft, answerCount }: Props) {
  const { t } = useTranslation();
  const timeOver = timeLeft === 0;
  const answers = choiceAnswers(question);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-balance break-words text-center font-display font-semibold text-4xl lg:text-6xl">
        <RichText html={question.question} />
      </h1>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <span />
        <CountdownRing secondsLeft={timeLeft} totalSeconds={questionSeconds(question)} />
        <p
          className="text-center font-display text-2xl tabular-nums lg:text-3xl"
          aria-live="polite"
        >
          {t('admin_page.answers_submitted', { answer_count: answerCount })}
        </p>
      </div>

      {question.image ? (
        <div className="flex justify-center">
          <MediaComponent
            src={question.image}
            muted={false}
            className="max-h-[30vh] w-auto rounded-lg object-contain"
          />
        </div>
      ) : null}

      {question.type === 'ABCD' || question.type === 'VOTING' || question.type === 'CHECK' ? (
        // Two rows filled column by column, as legacy laid them out.
        <div className="grid gap-3 sm:grid-flow-col sm:auto-cols-fr sm:grid-rows-2">
          {answers.map((answer, i) => {
            // Legacy only reveals the solution of ABCD questions on the host screen.
            const reveal = timeOver && question.type === 'ABCD';
            return (
              <HostAnswer
                // biome-ignore lint/suspicious/noArrayIndexKey: answers have no id and never reorder here.
                key={i}
                index={i}
                answer={answer}
                dimmed={reveal && !answer.right}
                marked={reveal && answer.right}
              />
            );
          })}
        </div>
      ) : null}

      {question.type === 'TEXT' ? (
        timeOver ? (
          <ul
            className="grid gap-3 sm:grid-cols-2"
            aria-label={t('admin_page.loop.accepted_answers')}
          >
            {answers.map((answer, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: answers have no id and never reorder here.
                key={i}
                className="rounded-xl border bg-card px-5 py-4 text-center font-display font-semibold text-2xl text-card-foreground"
              >
                {answer.answer}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-2xl">{t('admin_page.enter_answer_into_field')}</p>
        )
      ) : null}
    </div>
  );
}
