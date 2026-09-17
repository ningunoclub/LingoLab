// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { Circle, Diamond, Hexagon, Square, Star, Triangle } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Stage answer tile. Colour is never the only signal: every slot carries a distinct
 * shape as well, so the tiles stay distinguishable for colour-blind players
 * (palette is Okabe-Ito). Minimum height 72px on phones per the design system.
 */
export const ANSWER_SLOTS = [
  { slot: 1, icon: Circle, bg: 'bg-answer-1', fg: 'text-answer-1-foreground', name: 'circle' },
  { slot: 2, icon: Square, bg: 'bg-answer-2', fg: 'text-answer-2-foreground', name: 'square' },
  { slot: 3, icon: Triangle, bg: 'bg-answer-3', fg: 'text-answer-3-foreground', name: 'triangle' },
  { slot: 4, icon: Star, bg: 'bg-answer-4', fg: 'text-answer-4-foreground', name: 'star' },
  { slot: 5, icon: Hexagon, bg: 'bg-answer-5', fg: 'text-answer-5-foreground', name: 'hexagon' },
  { slot: 6, icon: Diamond, bg: 'bg-answer-6', fg: 'text-answer-6-foreground', name: 'diamond' },
] as const;

export type AnswerSlot = (typeof ANSWER_SLOTS)[number]['slot'];

// `slot` is a native HTML attribute, so the prop is named answerSlot to avoid the clash.
interface AnswerTileProps extends ComponentPropsWithoutRef<'button'> {
  answerSlot: AnswerSlot;
  label: string;
}

export function AnswerTile({ answerSlot, label, className, ...props }: AnswerTileProps) {
  const config = ANSWER_SLOTS.find((s) => s.slot === answerSlot) ?? ANSWER_SLOTS[0];
  const Icon = config.icon;

  return (
    <button
      type="button"
      className={cn(
        'flex min-h-[72px] w-full items-center gap-3 rounded-lg px-4 py-3 text-left',
        'font-display text-lg font-semibold transition-transform',
        'hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'active:scale-[0.99] disabled:opacity-60 disabled:hover:scale-100',
        config.bg,
        config.fg,
        className,
      )}
      {...props}
    >
      <Icon className="size-7 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
