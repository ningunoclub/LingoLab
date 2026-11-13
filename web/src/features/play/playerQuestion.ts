// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { QUESTION_TYPES, type QuizQuestionType as QuestionType } from '@/features/editor/types';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** An answer option as a player sees it: the backend leaves out which one is right. */
export type PlayerChoice = {
  /** Position in the order the server sent; stable while an ORDER list is rearranged. */
  id: number;
  answer: string;
  color: string | null;
};

/**
 * One question as the backend sends it to players in `set_question_number`
 * (`ReturnQuestion` in `classquiz/socket_server/models.py`). SLIDE questions only go to the
 * host, so players never get one.
 */
export type PlayerQuestion = {
  index: number;
  question: string;
  type: QuestionType;
  /** Whole seconds; 0 when unreadable. */
  seconds: number;
  image: string | null;
  /** ABCD, CHECK, VOTING and ORDER options (ORDER already shuffled by the server). */
  choices: PlayerChoice[];
  /** RANGE only: the numbers a player can choose from. */
  range: { min: number; max: number } | null;
};

function parseChoices(answers: unknown): PlayerChoice[] {
  if (!Array.isArray(answers)) return [];
  return answers.flatMap((raw: unknown, id) => {
    if (typeof raw !== 'object' || raw === null) return [];
    const a = raw as Record<string, unknown>;
    if (typeof a.answer !== 'string') return [];
    const color = typeof a.color === 'string' && HEX_COLOR.test(a.color) ? a.color : null;
    return [{ id, answer: a.answer, color }];
  });
}

function parseRange(answers: unknown): PlayerQuestion['range'] {
  if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) return null;
  const a = answers as Record<string, unknown>;
  if (typeof a.min !== 'number' || typeof a.max !== 'number' || a.max < a.min) return null;
  return { min: a.min, max: a.max };
}

/** Narrows the `question` of `set_question_number`; null when there is nothing to answer. */
export function parsePlayerQuestion(index: number, data: unknown): PlayerQuestion | null {
  if (typeof data !== 'object' || data === null) return null;
  const raw = data as Record<string, unknown>;
  // Legacy treats a missing type as ABCD.
  const type = (QUESTION_TYPES as readonly unknown[]).includes(raw.type)
    ? (raw.type as QuestionType)
    : 'ABCD';
  if (type === 'SLIDE') return null;
  const seconds = Number.parseInt(String(raw.time ?? ''), 10);
  return {
    index,
    question: typeof raw.question === 'string' ? raw.question : '',
    type,
    seconds: Number.isFinite(seconds) && seconds > 0 ? seconds : 0,
    image: typeof raw.image === 'string' && raw.image !== '' ? raw.image : null,
    // TEXT answers are not parsed: the backend sends the accepted answers along (a legacy
    // leak), and the player screen must not use them.
    choices: type === 'RANGE' || type === 'TEXT' ? [] : parseChoices(raw.answers),
    range: type === 'RANGE' ? parseRange(raw.answers) : null,
  };
}

/** Legacy start value of the RANGE slider: the middle, rounded to a whole number. */
export function rangeStart(range: { min: number; max: number }): number {
  return Math.round((range.max - range.min) / 2 + range.min);
}

/** A CHECK answer is the indices of the chosen options, in order (`"02"` for the 1st and 3rd). */
export function checkAnswer(selected: readonly boolean[]): string {
  return selected.flatMap((on, i) => (on ? [String(i)] : [])).join('');
}

/** Swaps two neighbours of an ORDER list; out-of-range moves return the list unchanged. */
export function moveChoice<T>(list: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from < 0 || from >= list.length) return [...list];
  const next = [...list];
  const a = next[from] as T;
  next[from] = next[to] as T;
  next[to] = a;
  return next;
}
