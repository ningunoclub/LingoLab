// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Loading of legacy `routes/results/+page.ts` and `routes/results/[result_id]/+page.ts`.
// The generated schema types the interesting fields as `unknown`, so they are parsed here.
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { fetchClient } from '@/api/client';
import { QUESTION_TYPES } from '@/features/editor/types';
import { parseAnswers } from '@/features/host/hostLoop';
import type { AnswerData } from '@/realtime/events';

/** One row of `/results`. */
export type ResultSummary = {
  id: string;
  title: string;
  timestamp: string;
  playerCount: number;
  note: string | null;
};

const questionSchema = z.object({
  question: z.string().catch(''),
  type: z.enum(QUESTION_TYPES).catch('ABCD'),
  answers: z.unknown().optional(),
});

export type ResultQuestion = z.infer<typeof questionSchema>;

/** One saved game, as `/results/$resultId` shows it. */
export type GameResult = {
  id: string;
  title: string;
  timestamp: string;
  questions: ResultQuestion[];
  /** One list per question, in question order (always as long as `questions`). */
  answers: AnswerData[][];
  /** Final score per player. The backend stores them as strings. */
  playerScores: Record<string, number>;
  /** The custom join field per player; empty when the game had none. */
  customFields: Record<string, string>;
};

export class ResultNotFoundError extends Error {
  constructor() {
    super('Game result not found');
    this.name = 'ResultNotFoundError';
  }
}

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Legacy reads the stored strings with `parseInt` / `parseFloat`; unreadable ones count as 0. */
function parseScores(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([name, score]) => {
      const n = typeof score === 'number' ? score : Number.parseFloat(String(score));
      return [name, Number.isFinite(n) ? n : 0];
    }),
  );
}

function parseCustomFields(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([name, field]) =>
      typeof field === 'string' && field !== '' ? [[name, field]] : [],
    ),
  );
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toSummary(raw: Raw): ResultSummary {
  return {
    id: asString(raw.id),
    title: asString(raw.title),
    timestamp: asString(raw.timestamp),
    // Legacy counts the players with a score, not the stored `player_count`.
    playerCount: isRecord(raw.player_scores) ? Object.keys(raw.player_scores).length : 0,
    note: typeof raw.note === 'string' && raw.note !== '' ? raw.note : null,
  };
}

export function parseGameResult(raw: Raw): GameResult {
  const questions = Array.isArray(raw.questions)
    ? raw.questions.map((q: unknown) => questionSchema.parse(isRecord(q) ? q : {}))
    : [];
  // The backend model declares a flat list, but the save helper writes one list per question.
  const stored = Array.isArray(raw.answers) ? raw.answers : [];
  return {
    id: asString(raw.id),
    title: asString(raw.title),
    timestamp: asString(raw.timestamp),
    questions,
    answers: questions.map((_, i) => parseAnswers(stored[i])),
    playerScores: parseScores(raw.player_scores),
    customFields: parseCustomFields(raw.custom_field_data),
  };
}

export async function fetchResultList(): Promise<ResultSummary[]> {
  const { data, response } = await fetchClient.GET('/api/v1/results/list');
  if (!response.ok || !Array.isArray(data)) {
    throw new Error(`Loading results failed with status ${response.status}`);
  }
  return (data as unknown[]).filter(isRecord).map(toSummary);
}

export async function fetchGameResult(id: string): Promise<GameResult> {
  const { data, response } = await fetchClient.GET('/api/v1/results/{game_id}', {
    params: { path: { game_id: id } },
  });
  // 422 is what the backend answers for an id that is not a UUID.
  if (response.status === 404 || response.status === 422) throw new ResultNotFoundError();
  if (!response.ok || !isRecord(data)) {
    throw new Error(`Loading the result failed with status ${response.status}`);
  }
  return parseGameResult(data);
}

export const resultsQueries = {
  list: queryOptions({ queryKey: ['results', 'list'], queryFn: fetchResultList }),
  one: (id: string) =>
    queryOptions({
      queryKey: ['results', 'one', id],
      queryFn: () => fetchGameResult(id),
      retry: (count, error) => !(error instanceof ResultNotFoundError) && count < 3,
    }),
};
