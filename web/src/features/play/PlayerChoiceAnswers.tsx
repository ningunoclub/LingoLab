// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// The tile grid of legacy `lib/play/question.svelte` (ABCD, VOTING) and `questions/check.svelte` (CHECK).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PlayerChoiceTile } from './PlayerChoiceTile';
import { checkAnswer, type PlayerQuestion } from './playerQuestion';
import type { AnswerRequest } from './usePlayerGame';

type Props = {
  question: PlayerQuestion;
  shapeOnly: boolean;
  answered: boolean;
  onSubmit: (request: AnswerRequest) => void;
};

export function PlayerChoiceAnswers({ question, shapeOnly, answered, onSubmit }: Props) {
  const { t } = useTranslation();
  const multiple = question.type === 'CHECK';
  // ABCD / VOTING: the tapped answer. CHECK: which tiles are switched on.
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState<boolean[]>(() => question.choices.map(() => false));

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Two rows filled column by column, as legacy laid them out. */}
      <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-3">
        {question.choices.map((choice, i) => (
          <PlayerChoiceTile
            key={choice.id}
            index={i}
            choice={choice}
            shapeOnly={shapeOnly}
            selected={multiple ? checked[i] === true : picked === i}
            aria-pressed={multiple ? checked[i] === true : undefined}
            disabled={answered}
            onClick={() => {
              if (multiple) {
                setChecked((list) => list.map((on, j) => (j === i ? !on : on)));
                return;
              }
              setPicked(i);
              onSubmit({ answer: choice.answer });
            }}
          />
        ))}
      </div>
      {multiple ? (
        <Button
          size="lg"
          className="h-14 text-lg"
          // Legacy let an empty choice through once a tile had been switched off again.
          disabled={answered || !checked.includes(true)}
          onClick={() => onSubmit({ answer: checkAnswer(checked) })}
        >
          {t('words.submit')}
        </Button>
      ) : null}
    </div>
  );
}
