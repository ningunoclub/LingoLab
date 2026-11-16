// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { Check, ChevronDown, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ANSWER_SLOTS } from '@/components/AnswerTile';
import { MediaComponent } from '@/components/MediaComponent';
import { RichText } from '@/components/RichText';
import { SlideRenderer } from '@/components/SlideRenderer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { choiceAnswers } from '@/features/host/gameQuiz';
import { answerColor } from '@/features/host/HostAnswer';
import { getForegroundColor } from '@/lib/color';
import type { ViewQuestion } from './viewApi';

type Range = { min: number; max: number; min_correct: number; max_correct: number };

/** The numbers of a RANGE question; null when they are missing. */
export function rangeOf(answers: unknown): Range | null {
  if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) return null;
  const a = answers as Record<string, unknown>;
  const keys = ['min', 'max', 'min_correct', 'max_correct'] as const;
  if (!keys.every((k) => typeof a[k] === 'number')) return null;
  return a as Range;
}

function Answers({ question }: { question: ViewQuestion }) {
  const { t } = useTranslation();

  switch (question.type) {
    case 'ABCD':
    case 'CHECK':
      // Legacy marked right and wrong answers only by a blue or yellow shadow; here the right
      // ones carry a check mark (and a text for screen readers) next to their own colour.
      return (
        <ul className="grid gap-3 sm:grid-cols-2">
          {choiceAnswers(question).map((answer, index) => {
            const slot = ANSWER_SLOTS[index % ANSWER_SLOTS.length] ?? ANSWER_SLOTS[0];
            const Icon = slot.icon;
            const color = answerColor(answer, index);
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: answers have no id; the list never reorders
              <li key={index}>
                <div
                  className="flex min-h-14 items-center gap-3 rounded-lg px-4 py-3 font-semibold"
                  style={{ backgroundColor: color, color: getForegroundColor(color) }}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span className="flex-1 break-words">{answer.answer}</span>
                  {answer.right ? (
                    <>
                      <Check className="size-6 shrink-0" strokeWidth={3} aria-hidden="true" />
                      <span className="sr-only">{t('view_quiz_page.correct')}</span>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      );
    case 'RANGE': {
      const range = rangeOf(question.answers);
      return range ? (
        <p className="prose-measure mx-auto text-center">{t('view_quiz_page.range_text', range)}</p>
      ) : null;
    }
    case 'ORDER':
      return (
        <ol className="flex flex-col gap-2">
          {choiceAnswers(question).map((answer, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: the stored order is the content
            <li key={index} className="rounded-lg bg-muted px-4 py-3 text-center">
              {answer.answer}
            </li>
          ))}
        </ol>
      );
    case 'VOTING':
    case 'TEXT':
      return (
        <ul className="grid gap-3 sm:grid-cols-2">
          {choiceAnswers(question).map((answer, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: answers have no id; the list never reorders
            <li key={index} className="rounded-lg bg-muted px-4 py-3 text-center">
              {answer.answer}
            </li>
          ))}
        </ul>
      );
    case 'SLIDE':
      return (
        <SlideRenderer
          slide={typeof question.answers === 'string' ? question.answers : ''}
          className="mx-auto max-w-[90%]"
        />
      );
  }
}

/** One question of legacy `/view`, in a section that opens and closes (legacy `collapsible.svelte`). */
export function QuestionPreview({
  question,
  index,
  defaultOpen,
}: {
  question: ViewQuestion;
  index: number;
  defaultOpen: boolean;
}) {
  const { t } = useTranslation();
  const seconds = Number.parseInt(question.time, 10) || 0;

  return (
    <Collapsible defaultOpen={defaultOpen} className="group rounded-xl border bg-card">
      <h2>
        <CollapsibleTrigger className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-2 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
          <span className="tabular-nums text-muted-foreground">{index + 1}</span>
          <RichText html={question.question} className="flex-1 break-words" />
          <ChevronDown
            className="size-5 shrink-0 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent className="flex flex-col gap-4 border-t px-4 pt-4 pb-5">
        <p className="text-center font-display text-2xl">
          {index + 1}: <RichText html={question.question} />
        </p>
        {question.image ? (
          <MediaComponent src={question.image} className="mx-auto max-h-64" muted />
        ) : null}
        <p className="flex items-center justify-center gap-2">
          <Clock className="size-6" aria-hidden="true" />
          <span aria-hidden="true" className="text-lg tabular-nums">
            {t('view_quiz_page.seconds', { seconds })}
          </span>
          <span className="sr-only">{t('view_quiz_page.time_label', { seconds })}</span>
        </p>
        <Answers question={question} />
      </CollapsibleContent>
    </Collapsible>
  );
}
