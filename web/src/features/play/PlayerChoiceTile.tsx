// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// One answer button of legacy `lib/play/question.svelte` / `questions/check.svelte`.
import { Check } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { ANSWER_SLOTS } from '@/components/AnswerTile';
import { defaultAnswerColor } from '@/features/editor/editorData';
import { getForegroundColor } from '@/lib/color';
import { cn } from '@/lib/utils';
import type { PlayerChoice } from './playerQuestion';

interface Props extends ComponentPropsWithoutRef<'button'> {
  index: number;
  choice: PlayerChoice;
  /** Kahoot mode: the text is on the projector, the phone shows the shape only (legacy icons). */
  shapeOnly: boolean;
  selected: boolean;
}

export function PlayerChoiceTile({
  index,
  choice,
  shapeOnly,
  selected,
  className,
  ...props
}: Props) {
  const slot = ANSWER_SLOTS[index % ANSWER_SLOTS.length] ?? ANSWER_SLOTS[0];
  const Icon = slot.icon;
  // The answer's own colour is quiz data, so it is applied inline.
  const color = choice.color ?? defaultAnswerColor(index);

  return (
    <button
      type="button"
      aria-label={choice.answer}
      className={cn(
        'relative flex min-h-[72px] items-center gap-3 rounded-xl px-4 py-3 text-left font-display font-semibold text-xl transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'enabled:active:scale-[0.98] disabled:cursor-not-allowed',
        shapeOnly && 'justify-center',
        selected ? 'ring-4 ring-foreground ring-offset-2 ring-offset-card' : 'disabled:opacity-60',
        className,
      )}
      style={{ backgroundColor: color, color: getForegroundColor(color) }}
      {...props}
    >
      <Icon
        className={cn('shrink-0', shapeOnly ? 'size-16' : 'size-8')}
        strokeWidth={2}
        aria-hidden="true"
      />
      {shapeOnly ? null : <span className="flex-1 break-words">{choice.answer}</span>}
      {selected ? (
        <Check
          className="absolute top-2 right-2 size-7 shrink-0"
          strokeWidth={3}
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}
