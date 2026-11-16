// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Loading and actions of legacy `routes/view/[quiz_id]` (`+page.server.ts`,
// `lib/view_quiz/RatingComponent.svelte`, `ModComponent.svelte`). The generated schema types the
// public quiz as `unknown`, so it is parsed here.
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { fetchClient } from '@/api/client';
import { QUESTION_TYPES } from '@/features/editor/types';

const questionSchema = z.object({
  question: z.string().catch(''),
  time: z.coerce.string().catch('0'),
  type: z.enum(QUESTION_TYPES).catch('ABCD'),
  image: z.string().nullish().catch(null),
  answers: z.unknown().optional(),
});

export type ViewQuestion = z.infer<typeof questionSchema>;

const count = z.number().int().catch(0);

const viewQuizSchema = z.object({
  id: z.string(),
  title: z.string().catch(''),
  description: z.string().nullish().catch(null),
  cover_image: z.string().nullish().catch(null),
  user_id: z.object({ id: z.string(), username: z.string() }),
  imported_from_kahoot: z.boolean().nullish().catch(null),
  kahoot_id: z.string().nullish().catch(null),
  likes: count,
  dislikes: count,
  views: count,
  plays: count,
  questions: z.array(questionSchema).catch([]),
});

export type ViewQuiz = z.infer<typeof viewQuizSchema>;

export class QuizNotFoundError extends Error {
  constructor() {
    super('Quiz not found');
    this.name = 'QuizNotFoundError';
  }
}

export async function fetchPublicQuiz(quizId: string): Promise<ViewQuiz> {
  const { data, response } = await fetchClient.GET('/api/v1/quiz/get/public/{quiz_id}', {
    params: { path: { quiz_id: quizId } },
  });
  // Legacy answers 400 and 404 with "not found". A malformed id reaches FastAPI's validation
  // first and comes back as 422, which legacy showed as a server error; it is a missing quiz too.
  if (response.status === 404 || response.status === 400 || response.status === 422) {
    throw new QuizNotFoundError();
  }
  if (!response.ok) throw new Error(`Loading the quiz failed with status ${response.status}`);
  const parsed = viewQuizSchema.safeParse(data);
  if (!parsed.success) throw new Error('The quiz could not be read');
  return parsed.data;
}

export const viewQueries = {
  quiz: (quizId: string) =>
    queryOptions({
      queryKey: ['view', quizId],
      queryFn: () => fetchPublicQuiz(quizId),
      // Every request counts as a view on the server, so the page loads the quiz once per
      // visit, as legacy did, and never refetches it on focus or reconnect.
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }),
};

export type RateResult = 'rated' | 'already_rated' | 'failed';

/** Legacy `complete_action`: a like or a dislike. */
export async function rateQuiz(quizId: string, positive: boolean): Promise<RateResult> {
  const { response } = await fetchClient.POST('/api/v1/community/rate/{quiz_id}', {
    params: { path: { quiz_id: quizId } },
    body: { type: positive ? 'LIKE' : 'DISLIKE' },
  });
  if (response.status === 409) return 'already_rated';
  return response.ok ? 'rated' : 'failed';
}

/** Moderation ratings, in legacy's order. `null` is "Not checked". */
export const MOD_RATINGS = [null, 0, 1, 2, 3, 4, 5] as const;
export type ModRating = (typeof MOD_RATINGS)[number];

export async function setModRating(quizId: string, rating: ModRating): Promise<void> {
  const { response } = await fetchClient.POST('/api/v1/moderation/rating/set/{quiz_id}', {
    params: { path: { quiz_id: quizId } },
    body: { rating },
  });
  if (!response.ok) throw new Error(`Setting the rating failed with status ${response.status}`);
}
