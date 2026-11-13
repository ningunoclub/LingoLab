// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `lib/play/question.svelte`: the running question on a player's phone.
import { Hourglass } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CountdownRing } from '@/components/CountdownRing';
import { MediaComponent } from '@/components/MediaComponent';
import { RichText } from '@/components/RichText';
import { PlayerChoiceAnswers } from './PlayerChoiceAnswers';
import { PlayerOrderAnswer } from './PlayerOrderAnswer';
import { PlayerRangeAnswer } from './PlayerRangeAnswer';
import { PlayerTextAnswer } from './PlayerTextAnswer';
import { type PlayerQuestion, rangeStart } from './playerQuestion';
import type { AnswerRequest } from './usePlayerGame';

type Props = {
  question: PlayerQuestion;
  timeLeft: number;
  answered: boolean;
  /** Kahoot mode: the question is read from the projector, the phone shows only the answers. */
  kahoot: boolean;
  onSubmit: (request: AnswerRequest) => void;
};

/** Mount with `key={question.index}`, so every question starts with fresh inputs. */
export function PlayerQuestionScreen({ question, timeLeft, answered, kahoot, onSubmit }: Props) {
  const { t } = useTranslation();
  const timeOver = timeLeft === 0;
  const range = question.range;
  const [rangeValue, setRangeValue] = useState(() => (range ? rangeStart(range) : 0));

  // Legacy sends the slider's value when the time runs out without an answer.
  useEffect(() => {
    if (timeOver && range && !answered) onSubmit({ answer: String(rangeValue) });
  }, [timeOver, range, answered, rangeValue, onSubmit]);

  let answers: React.ReactNode = null;
  if (timeOver) {
    // Legacy showed an empty screen here until the results came.
    answers = (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Hourglass className="size-12" strokeWidth={1.75} aria-hidden="true" />
        <p className="font-display font-semibold text-2xl" role="status">
          {t('play_page.loop.time_up')}
        </p>
      </div>
    );
  } else if (question.type === 'ABCD' || question.type === 'VOTING' || question.type === 'CHECK') {
    answers = (
      <PlayerChoiceAnswers
        question={question}
        shapeOnly={kahoot}
        answered={answered}
        onSubmit={onSubmit}
      />
    );
  } else if (question.type === 'RANGE' && range) {
    answers = (
      <PlayerRangeAnswer
        range={range}
        value={rangeValue}
        onChange={setRangeValue}
        answered={answered}
        onSubmit={() => onSubmit({ answer: String(rangeValue) })}
      />
    );
  } else if (question.type === 'TEXT') {
    answers = <PlayerTextAnswer answered={answered} onSubmit={(answer) => onSubmit({ answer })} />;
  } else if (question.type === 'ORDER') {
    answers = (
      <PlayerOrderAnswer choices={question.choices} answered={answered} onSubmit={onSubmit} />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-4 text-card-foreground">
        {timeOver ? null : (
          <CountdownRing
            secondsLeft={timeLeft}
            totalSeconds={question.seconds}
            className="size-20"
          />
        )}
        {kahoot ? null : (
          <>
            <h1 className="text-balance break-words text-center font-display font-semibold text-2xl lg:text-3xl">
              <RichText html={question.question} />
            </h1>
            {question.image ? (
              <MediaComponent
                src={question.image}
                className="max-h-[25vh] w-auto max-w-full rounded-lg object-contain"
              />
            ) : null}
          </>
        )}
        {answered && !timeOver ? (
          <p className="text-lg" role="status">
            {t('play_page.loop.answer_sent')}
          </p>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col rounded-xl border bg-card p-4 text-card-foreground">
        {answers}
      </div>
    </div>
  );
}
