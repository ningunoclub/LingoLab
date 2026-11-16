// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// The ORDER part of legacy `lib/play/question.svelte`: up/down buttons per item, then submit.
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { defaultAnswerColor } from '@/features/editor/editorData';
import { getForegroundColor } from '@/lib/color';
import { moveChoice, type PlayerChoice } from './playerQuestion';
import type { AnswerRequest } from './usePlayerGame';

type Props = {
  choices: PlayerChoice[];
  answered: boolean;
  onSubmit: (request: AnswerRequest) => void;
};

export function PlayerOrderAnswer({ choices, answered, onSubmit }: Props) {
  const { t } = useTranslation();
  const [list, setList] = useState(choices);

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {list.map((choice, i) => {
          // Legacy gives every uncoloured ORDER item the same default: its second answer colour.
          const color = choice.color ?? defaultAnswerColor(1);
          const fg = getForegroundColor(color);
          return (
            <li
              key={choice.id}
              className="flex items-center gap-2 rounded-xl p-2"
              style={{ backgroundColor: color, color: fg }}
            >
              <span className="w-8 text-center font-display font-semibold text-xl tabular-nums">
                {i + 1}
              </span>
              <span className="flex-1 break-words font-display font-semibold text-xl">
                {choice.answer}
              </span>
              <Button
                variant="secondary"
                size="icon"
                className="size-12"
                aria-label={`${choice.answer}: ${t('editor.move_up')}`}
                disabled={answered || i === 0}
                onClick={() => setList((l) => moveChoice(l, i, i - 1))}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="size-12"
                aria-label={`${choice.answer}: ${t('editor.move_down')}`}
                disabled={answered || i === list.length - 1}
                onClick={() => setList((l) => moveChoice(l, i, i + 1))}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
            </li>
          );
        })}
      </ol>
      <Button
        size="lg"
        className="mt-2 h-14 text-lg"
        disabled={answered}
        // The backend checks the list; `answer` only has to be present (legacy sends "a").
        onClick={() =>
          onSubmit({ answer: 'a', complexAnswer: list.map((c) => ({ answer: c.answer })) })
        }
      >
        {t('words.submit')}
      </Button>
    </div>
  );
}
