// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `routes/results/[result_id]/question_tab_dropdown.svelte`: the answer chart
// and every player's answer to one question.
import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AnswerData } from '@/realtime/events';
import { answerBars, displayAnswer } from './resultStats';
import type { ResultQuestion } from './resultsApi';

type Props = {
  question: ResultQuestion;
  answers: AnswerData[];
};

function RightMark({ right }: { right: boolean }) {
  const { t } = useTranslation();
  return right ? (
    <span className="inline-flex items-center gap-1 text-primary">
      <Check className="size-4" aria-hidden="true" />
      <span className="sr-only">{t('words.correct')}</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <X className="size-4" aria-hidden="true" />
      <span className="sr-only">{t('admin_page.loop.wrong')}</span>
    </span>
  );
}

export function QuestionDetails({ question, answers }: Props) {
  const { t, i18n } = useTranslation();
  const bars = answerBars(question, answers);
  const judged = question.type !== 'VOTING';
  // Legacy shows ✓/✗ next to the bars except for VOTING and TEXT.
  const markBars = judged && question.type !== 'TEXT';
  const seconds = new Intl.NumberFormat(i18n.language, {
    style: 'unit',
    unit: 'second',
    unitDisplay: 'narrow',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

  return (
    <div className="flex flex-col gap-4">
      {bars.length > 0 ? (
        <figure>
          <figcaption className="sr-only">{t('result_page.answer_chart')}</figcaption>
          <ul className="flex flex-col gap-2">
            {bars.map((bar, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: answers have no id and never reorder here.
                key={i}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-center gap-3"
              >
                <span className="break-words">{bar.answer}</span>
                <span className="flex items-center gap-2 border-l pl-2">
                  <span className="h-2 flex-1 rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{
                        width: `${answers.length === 0 ? 0 : (bar.count / answers.length) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="w-8 text-right tabular-nums">
                    <span aria-hidden="true">{bar.count}</span>
                    <span className="sr-only">
                      {t('result_page.answer_count', { count: bar.count })}
                    </span>
                  </span>
                  {markBars ? <RightMark right={bar.right} /> : null}
                </span>
              </li>
            ))}
          </ul>
        </figure>
      ) : null}

      {answers.length === 0 ? (
        <p className="text-muted-foreground">{t('result_page.no_answers')}</p>
      ) : (
        <Table className="text-sm sm:text-base [&_td]:px-1.5 [&_th]:px-1.5 sm:[&_td]:px-2 sm:[&_th]:px-2">
          <TableHeader>
            <TableRow>
              <TableHead>{t('result_page.player_name')}</TableHead>
              {judged ? <TableHead className="text-right">{t('words.score')}</TableHead> : null}
              <TableHead className="text-right">{t('result_page.time_taken')}</TableHead>
              <TableHead>{t('words.answer')}</TableHead>
              {judged ? <TableHead>{t('words.correct')}</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {answers.map((answer) => (
              <TableRow key={answer.username}>
                <TableCell className="whitespace-normal break-all">{answer.username}</TableCell>
                {judged ? (
                  <TableCell className="text-right tabular-nums">{answer.score}</TableCell>
                ) : null}
                <TableCell className="text-right tabular-nums">
                  {seconds.format(answer.time_taken / 1000)}
                </TableCell>
                <TableCell className="whitespace-normal break-words">
                  {displayAnswer(question, answer.answer)}
                </TableCell>
                {judged ? (
                  <TableCell>
                    <RightMark right={answer.right} />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
