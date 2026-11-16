// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `routes/results/[result_id]/question_overview.svelte`: one row per question,
// one of them open at a time.
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RichText } from '@/components/RichText';
import { cn } from '@/lib/utils';
import type { AnswerData } from '@/realtime/events';
import { QuestionDetails } from './QuestionDetails';
import { averageScore, correctCount } from './resultStats';
import type { ResultQuestion } from './resultsApi';

type Props = {
  questions: ResultQuestion[];
  answers: AnswerData[][];
};

export function QuestionOverview({ questions, answers }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ul className="flex flex-col gap-3">
      {questions.map((question, i) => (
        <QuestionRow
          // biome-ignore lint/suspicious/noArrayIndexKey: questions have no id and never reorder here.
          key={i}
          question={question}
          answers={answers[i] ?? []}
          open={open === i}
          onToggle={() => setOpen(open === i ? null : i)}
        />
      ))}
    </ul>
  );
}

type RowProps = {
  question: ResultQuestion;
  answers: AnswerData[];
  open: boolean;
  onToggle: () => void;
};

function QuestionRow({ question, answers, open, onToggle }: RowProps) {
  const { t } = useTranslation();
  const detailsId = useId();
  // A slide has nothing to answer, so it has no figures and nothing to open (see Legacy quirks).
  const isSlide = question.type === 'SLIDE';
  const average = averageScore(answers);

  return (
    <li className="rounded-xl border bg-card">
      <div className="grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
        {isSlide ? (
          <p className="flex items-center gap-2 px-1 text-lg">
            <span className="rounded-full border px-2 py-0.5 text-muted-foreground text-xs">
              {t('words.slide')}
            </span>
            <RichText html={question.question} />
          </p>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={detailsId}
            className="flex min-h-11 items-center gap-2 rounded-md px-1 text-left text-lg hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ChevronDown
              className={cn('size-5 shrink-0 transition-transform', open && 'rotate-180')}
              aria-hidden="true"
            />
            <RichText html={question.question} className="break-words" />
          </button>
        )}
        {/* VOTING has no right answers and no points. */}
        {!isSlide && question.type !== 'VOTING' ? (
          <>
            <p className="text-muted-foreground text-sm tabular-nums">
              {t('result_page.average_score', {
                average_score: average === null ? '–' : average.toFixed(0),
              })}
            </p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {t('result_page.correct_answer', { count: correctCount(answers) })}
            </p>
          </>
        ) : null}
      </div>
      {open && !isSlide ? (
        <div
          id={detailsId}
          className="border-t p-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2"
        >
          <QuestionDetails question={question} answers={answers} />
        </div>
      ) : null}
    </li>
  );
}
