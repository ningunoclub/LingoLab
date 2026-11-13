// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { z } from 'zod';
import { QUESTION_TYPES } from '@/features/editor/types';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * One question as the host receives it. Every field falls back to a harmless default, so one
 * odd question cannot keep the whole game from loading. `answers` stays unknown here and is
 * narrowed per question type by `choiceAnswers` / `slideAnswers`.
 */
const gameQuestionSchema = z.object({
  question: z.string().catch(''),
  // Seconds, as a string in the backend model; a number is accepted too.
  time: z.coerce.string().catch('0'),
  type: z.enum(QUESTION_TYPES).catch('ABCD'),
  image: z.string().nullish().catch(null),
  hide_results: z.boolean().nullish().catch(null),
  answers: z.unknown().optional(),
});

export type GameQuestion = z.infer<typeof gameQuestionSchema>;

/**
 * The quiz as the backend hands it to the host in `registered_as_admin`: the raw `PlayGame`
 * JSON string from Redis (`classquiz/db/models.py`). Only the fields the host screen reads are
 * validated; the rest passes through.
 */
const gameQuizSchema = z
  .object({
    title: z.string(),
    description: z.string().nullish().catch(null),
    cover_image: z.string().nullish().catch(null),
    // Used in a style attribute, so only a plain `#rrggbb` colour is accepted.
    background_color: z.string().regex(HEX_COLOR).nullish().catch(null),
    background_image: z.string().nullish().catch(null),
    questions: z.array(gameQuestionSchema),
  })
  .passthrough();

export type GameQuiz = z.infer<typeof gameQuizSchema>;

/** Parses the `game` field of `registered_as_admin`. Returns null when it is missing or unreadable. */
export function parseGameQuiz(raw: string | null): GameQuiz | null {
  if (!raw) return null;
  try {
    const result = gameQuizSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** An answer of an ABCD, CHECK, VOTING or TEXT question, as far as the host screen needs it. */
export type ChoiceAnswer = { answer: string; right: boolean; color: string | null };

/** The answers of a list-type question; empty for RANGE and SLIDE, or anything unreadable. */
export function choiceAnswers(question: GameQuestion): ChoiceAnswer[] {
  if (!Array.isArray(question.answers)) return [];
  return question.answers.flatMap((raw: unknown) => {
    if (typeof raw !== 'object' || raw === null) return [];
    const a = raw as Record<string, unknown>;
    if (typeof a.answer !== 'string') return [];
    return [
      {
        answer: a.answer,
        right: a.right === true,
        color: typeof a.color === 'string' && HEX_COLOR.test(a.color) ? a.color : null,
      },
    ];
  });
}

/** A SLIDE question's canvas JSON (`''` when there is none), for `SlideRenderer`. */
export function slideAnswers(question: GameQuestion): string {
  return typeof question.answers === 'string' ? question.answers : '';
}

/** The question's time in whole seconds; 0 when unreadable. */
export function questionSeconds(question: GameQuestion): number {
  const seconds = Number.parseInt(question.time, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}
