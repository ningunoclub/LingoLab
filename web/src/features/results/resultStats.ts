// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// The sums and counts of legacy `routes/results/[result_id]/*.svelte`, as pure functions.
import { choiceAnswers } from '@/features/host/gameQuiz';
import type { AnswerData } from '@/realtime/events';
import type { ResultQuestion } from './resultsApi';

/** Mean of the values, or null when there are none (legacy printed "NaN"). */
function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Average final score of the game (`general_overview.svelte`). */
export function averageFinalScore(scores: Record<string, number>): number | null {
  return mean(Object.values(scores));
}

/** Average points scored on one question (`question_overview.svelte`). */
export function averageScore(answers: AnswerData[]): number | null {
  return mean(answers.map((a) => a.score));
}

export function correctCount(answers: AnswerData[]): number {
  return answers.filter((a) => a.right).length;
}

/** Player names, best final score first. Ties keep their order (stable sort, as legacy). */
export function playersByScore(scores: Record<string, number>): string[] {
  return Object.keys(scores).sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
}

/**
 * Right answers per player over all questions (`player_overview.svelte`). Every player with a
 * score gets an entry, so someone who never answered shows 0 (legacy showed nothing).
 */
export function correctAnswersPerPlayer(
  scores: Record<string, number>,
  answers: AnswerData[][],
): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(
    Object.keys(scores).map((name) => [name, 0]),
  );
  for (const question of answers) {
    for (const a of question) {
      counts[a.username] = (counts[a.username] ?? 0) + (a.right ? 1 : 0);
    }
  }
  return counts;
}

/**
 * The answer indices a CHECK answer holds. The player sends the ticked indices as one string
 * (`"02"` = first and third), so every character is one index.
 */
function checkedIndices(answer: string): number[] {
  return [...answer].map(Number).filter(Number.isInteger);
}

/** One bar of a question's answer chart (`question_tab_dropdown.svelte`). */
export type AnswerBar = { answer: string; right: boolean; count: number };

/**
 * How many players chose each answer, in the question's answer order. Empty for question types
 * legacy shows no chart for (ORDER, RANGE) and for SLIDE.
 */
export function answerBars(question: ResultQuestion, answers: AnswerData[]): AnswerBar[] {
  if (question.type === 'ORDER' || question.type === 'RANGE' || question.type === 'SLIDE') {
    return [];
  }
  const options = choiceAnswers(question);
  return options.map((option, i) => ({
    answer: option.answer,
    right: option.right,
    count:
      question.type === 'CHECK'
        ? answers.filter((a) => checkedIndices(a.answer).includes(i)).length
        : answers.filter((a) => a.answer === option.answer).length,
  }));
}

/**
 * The answer as the teacher reads it. A CHECK answer is stored as indices (`"02"`), which legacy
 * printed as is; here they become the answer texts.
 */
export function displayAnswer(question: ResultQuestion, answer: string): string {
  if (question.type !== 'CHECK') return answer;
  const options = choiceAnswers(question);
  const texts = checkedIndices(answer).map((i) => options[i]?.answer);
  return texts.every((text) => text !== undefined) ? texts.join(', ') : answer;
}
