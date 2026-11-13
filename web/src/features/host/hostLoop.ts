// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// The decisions of the host's question loop, ported from the button logic in legacy
// `lib/play/admin/controls.svelte`, `next_action` in `routes/admin/+page.svelte` and the
// score handling in `lib/play/admin/results.svelte` / `final_results.svelte`.
import type { AnswerData } from '@/realtime/events';
import type { GameQuiz } from './gameQuiz';

/**
 * What the single control button (and Enter / Space) does next.
 * - `next`: show the next question.
 * - `solutions`: stop the time and show the solutions.
 * - `results`: show this question's results.
 * - `skip_results`: the question hides its results: fetch them silently, then move on.
 * - `final`: show the final ranking.
 */
export type HostAction =
  | { kind: 'next'; question: number }
  | { kind: 'solutions' }
  | { kind: 'results' }
  | { kind: 'skip_results'; after: 'next' | 'final' }
  | { kind: 'final' };

export type LoopState = {
  /** -1 before the first question. */
  questionIndex: number;
  /** Seconds left; 0 when the time is over, null before the first question. */
  timeLeft: number | null;
  /** This question's results, or null while they have not been asked for. */
  questionResults: AnswerData[] | null;
  finished: boolean;
};

export function nextHostAction(quiz: GameQuiz, state: LoopState): HostAction | null {
  const { questionIndex, timeLeft, questionResults, finished } = state;
  const count = quiz.questions.length;
  if (finished || count === 0) return null;
  if (questionIndex === -1) return { kind: 'next', question: 0 };

  const question = quiz.questions[questionIndex];
  if (!question) return null;
  const isLast = questionIndex + 1 >= count;
  const isSlide = question.type === 'SLIDE';
  const timeOver = timeLeft === 0;
  const next: HostAction = isLast
    ? { kind: 'final' }
    : { kind: 'next', question: questionIndex + 1 };

  // A slide has nothing to answer: it can always be left.
  if (isSlide) return next;
  if (!timeOver) return { kind: 'solutions' };
  if (questionResults !== null) return next;
  if (question.hide_results === true) {
    return { kind: 'skip_results', after: isLast ? 'final' : 'next' };
  }
  return { kind: 'results' };
}

/** Parses `question_results`; anything that is not a list of answers counts as no answers. */
export function parseAnswers(data: unknown): AnswerData[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw: unknown) => {
    if (typeof raw !== 'object' || raw === null) return [];
    const a = raw as Record<string, unknown>;
    if (typeof a.username !== 'string') return [];
    return [
      {
        username: a.username,
        answer: typeof a.answer === 'string' ? a.answer : String(a.answer ?? ''),
        right: a.right === true,
        time_taken: typeof a.time_taken === 'number' ? a.time_taken : 0,
        score: typeof a.score === 'number' && Number.isFinite(a.score) ? a.score : 0,
      },
    ];
  });
}

/** Adds one question's points to the running scores. Every player who answered gets an entry. */
export function addScores(
  scores: Record<string, number>,
  answers: AnswerData[],
): Record<string, number> {
  const next = { ...scores };
  for (const a of answers) next[a.username] = (next[a.username] ?? 0) + a.score;
  return next;
}

/** Points per player in one question's answers. */
export function scoresOf(answers: AnswerData[]): Record<string, number> {
  return addScores({}, answers);
}

/** Total points per player from `final_results` (`{ "<question index>": AnswerData[] }`). */
export function totalScores(finalResults: unknown): Record<string, number> {
  if (typeof finalResults !== 'object' || finalResults === null || Array.isArray(finalResults)) {
    return {};
  }
  let totals: Record<string, number> = {};
  for (const answers of Object.values(finalResults)) {
    totals = addScores(totals, parseAnswers(answers));
  }
  return totals;
}

/** Player names, best score first. Ties keep their order, as legacy's stable sort did. */
export function ranking(scores: Record<string, number>): string[] {
  return Object.keys(scores).sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
}

/** How many players chose each answer, in the question's answer order. */
export function countVotes(options: string[], answers: AnswerData[]): number[] {
  return options.map((option) => answers.filter((a) => a.answer === option).length);
}
