// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `lib/play/admin/results.svelte` (scoreboard) and `voting_results.svelte`
// (answer chart): what the class sees after a question.
import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RichText } from '@/components/RichText';
import { cn } from '@/lib/utils';
import type { AnswerData } from '@/realtime/events';
import { choiceAnswers, type GameQuestion } from './gameQuiz';
import { answerColor } from './HostAnswer';
import { countVotes, ranking, scoresOf } from './hostLoop';

/** Legacy waits a second before it adds this question's points. */
const REVEAL_DELAY_MS = 1000;
/** Legacy's scoreboard shows the top four. */
const SCOREBOARD_ROWS = 4;

type Props = {
  question: GameQuestion;
  answers: AnswerData[];
  scores: Record<string, number>;
  scoresBefore: Record<string, number>;
};

export function HostResults({ question, answers, scores, scoresBefore }: Props) {
  const { t } = useTranslation();
  // VOTING has no right answer and no points, so legacy shows only its chart.
  const showScoreboard = question.type !== 'VOTING';
  const showChart =
    answers.length > 0 &&
    (question.type === 'ABCD' || question.type === 'VOTING' || question.type === 'TEXT');

  return (
    <div className="flex flex-col items-center gap-10">
      <h1 className="text-balance break-words text-center font-display font-semibold text-3xl lg:text-5xl">
        <RichText html={question.question} />
      </h1>
      {answers.length === 0 ? (
        <p className="font-display font-semibold text-3xl">{t('admin_page.no_answers')}</p>
      ) : null}
      {showScoreboard && Object.keys(scores).length > 0 ? (
        <Scoreboard answers={answers} scores={scores} scoresBefore={scoresBefore} />
      ) : null}
      {showChart ? <AnswerChart question={question} answers={answers} /> : null}
    </div>
  );
}

type ScoreboardProps = Omit<Props, 'question'>;

function Scoreboard({ answers, scores, scoresBefore }: ScoreboardProps) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  const shown = revealed ? scores : scoresBefore;
  const added = scoresOf(answers);
  // Players who scored for the first time are listed from the start, with 0 points so far.
  const names = ranking({
    ...Object.fromEntries(Object.keys(scores).map((n) => [n, 0])),
    ...shown,
  });

  return (
    <table className="w-full max-w-2xl text-xl lg:text-2xl">
      <caption className="sr-only">{t('admin_page.loop.scoreboard')}</caption>
      <thead>
        <tr className="border-b-2 border-foreground/70">
          <th scope="col" className="p-3 text-left font-display">
            {t('words.name')}
          </th>
          <th scope="col" className="p-3 text-right font-display">
            {t('words.point_plural')}
          </th>
          <th
            scope="col"
            className={cn(
              'p-3 text-right font-display transition-opacity duration-500',
              revealed ? 'opacity-100' : 'opacity-0',
            )}
          >
            {t('play_page.points_added')}
          </th>
        </tr>
      </thead>
      <tbody>
        {names.slice(0, SCOREBOARD_ROWS).map((name) => {
          const plus = added[name] ?? 0;
          return (
            <tr key={name} className="border-b last:border-b-0">
              <td className="break-all p-3">{name}</td>
              <td className="p-3 text-right font-semibold tabular-nums">{shown[name] ?? 0}</td>
              <td
                className={cn(
                  'p-3 text-right tabular-nums transition-opacity duration-500',
                  revealed ? 'opacity-100' : 'opacity-0',
                  plus === 0 && 'text-muted-foreground',
                )}
              >
                +{plus}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function AnswerChart({ question, answers }: { question: GameQuestion; answers: AnswerData[] }) {
  const { t } = useTranslation();
  const options = choiceAnswers(question);
  const votes = countVotes(
    options.map((o) => o.answer),
    answers,
  );
  const judged = question.type !== 'VOTING';

  return (
    <figure className="w-full max-w-3xl">
      <figcaption className="sr-only">{t('admin_page.loop.chart')}</figcaption>
      <ul className="flex items-end justify-center gap-6 sm:gap-10">
        {options.map((option, i) => {
          const count = votes[i] ?? 0;
          const color = answerColor(option, i);
          const wrong = judged && !option.right;
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: answers have no id and never reorder here.
              key={i}
              className="flex w-20 flex-col items-center gap-2 sm:w-24"
            >
              {/* The count sits right on top of its bar; the full bar is 14rem tall. */}
              <div className="flex h-64 w-full flex-col items-center justify-end gap-2">
                <span
                  aria-hidden="true"
                  className="font-display font-semibold text-2xl tabular-nums"
                >
                  {count > 0 ? count : null}
                </span>
                <div
                  className={cn('w-full rounded-t-md border', wrong && 'opacity-60')}
                  // Bar height is the share of all answers; the colour is the answer's own.
                  style={{
                    height: `${(count / answers.length) * 14}rem`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span
                className={cn(
                  'flex items-start gap-1 text-center text-lg',
                  wrong && 'text-muted-foreground line-through',
                )}
              >
                {judged ? (
                  option.right ? (
                    <Check className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
                  ) : (
                    <X className="mt-1 size-5 shrink-0" aria-hidden="true" />
                  )
                ) : null}
                <span className="break-words">{option.answer}</span>
                <span className="sr-only">
                  {judged
                    ? t(option.right ? 'admin_page.loop.correct' : 'admin_page.loop.wrong')
                    : null}
                  {t('admin_page.loop.votes', { count })}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
