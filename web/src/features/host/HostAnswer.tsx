// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ANSWER_SLOTS } from '@/components/AnswerTile';
import { defaultAnswerColor } from '@/features/editor/editorData';
import { getForegroundColor } from '@/lib/color';
import { cn } from '@/lib/utils';
import type { ChoiceAnswer } from './gameQuiz';

type Props = {
  index: number;
  answer: ChoiceAnswer;
  /** The time is over and this answer is wrong: it fades back. */
  dimmed?: boolean;
  /** The time is over and this answer is right: it gets a check mark. */
  marked?: boolean;
};

/** The colour of an answer: its own, or the default of its slot (as in the editor). */
export function answerColor(answer: ChoiceAnswer, index: number): string {
  return answer.color ?? defaultAnswerColor(index);
}

/**
 * One answer on the projector. Not a button: the class answers on their phones. Like the
 * player tiles it carries a shape as well as a colour.
 */
export function HostAnswer({ index, answer, dimmed = false, marked = false }: Props) {
  const { t } = useTranslation();
  const slot = ANSWER_SLOTS[index % ANSWER_SLOTS.length] ?? ANSWER_SLOTS[0];
  const Icon = slot.icon;
  const color = answerColor(answer, index);

  return (
    // The answer's own colour is quiz data, so it is applied inline.
    <div
      className={cn(
        'flex min-h-20 items-center gap-4 rounded-xl px-5 py-4 font-display font-semibold text-2xl transition-opacity lg:text-3xl',
        dimmed && 'opacity-40',
      )}
      style={{ backgroundColor: color, color: getForegroundColor(color) }}
    >
      <Icon className="size-9 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span className="flex-1 break-words">{answer.answer}</span>
      {marked ? (
        <>
          <Check className="size-9 shrink-0" strokeWidth={3} aria-hidden="true" />
          <span className="sr-only">{t('admin_page.loop.correct')}</span>
        </>
      ) : null}
    </div>
  );
}
