// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { queryOptions } from '@tanstack/react-query';
import { fetchClient } from '@/api/client';

/**
 * One row on the dashboard. Legacy merges quizzes and quiztivities into a single list and
 * tells them apart by a `type` tag; the port keeps that shape.
 *
 * Quiztivities have no description, cover, public flag or counters in the backend model,
 * so those fields are null for them (legacy reads them as `undefined`).
 */
export type DashboardItem = {
  type: 'quiz' | 'quiztivity';
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  public: boolean;
  /**
   * Question texts, for search. Legacy indexed `questions.title`, a field questions do not
   * have (the text is `question`), so it never matched; see "Legacy quirks".
   */
  questionTexts: string[];
  stats: { likes: number; dislikes: number; views: number; plays: number } | null;
};

type Raw = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function toQuiz(raw: Raw): DashboardItem {
  const questions = Array.isArray(raw.questions) ? (raw.questions as Raw[]) : [];
  return {
    type: 'quiz',
    id: asString(raw.id),
    title: asString(raw.title),
    description: typeof raw.description === 'string' ? raw.description : null,
    coverImage:
      typeof raw.cover_image === 'string' && raw.cover_image !== '' ? raw.cover_image : null,
    public: raw.public === true,
    questionTexts: questions.map((q) => asString(q?.question)).filter((title) => title !== ''),
    stats: {
      likes: asNumber(raw.likes),
      dislikes: asNumber(raw.dislikes),
      views: asNumber(raw.views),
      plays: asNumber(raw.plays),
    },
  };
}

function toQuiztivity(raw: Raw): DashboardItem {
  return {
    type: 'quiztivity',
    id: asString(raw.id),
    title: asString(raw.title),
    description: null,
    coverImage: null,
    public: false,
    questionTexts: [],
    stats: null,
  };
}

/**
 * Legacy asks for `page_size=100` and shows whatever comes back, so a teacher with more
 * than 100 quizzes silently sees only the 100 most recently updated. Kept for parity and
 * noted under "Legacy quirks".
 */
export const QUIZ_PAGE_SIZE = 100;

export async function fetchDashboardItems(): Promise<DashboardItem[]> {
  const [quizzes, quiztivities] = await Promise.all([
    fetchClient.GET('/api/v1/quiz/list', { params: { query: { page_size: QUIZ_PAGE_SIZE } } }),
    fetchClient.GET('/api/v1/quiztivity/'),
  ]);
  if (!quizzes.response.ok || !Array.isArray(quizzes.data)) {
    throw new Error(`Loading quizzes failed with status ${quizzes.response.status}`);
  }
  if (!quiztivities.response.ok || !Array.isArray(quiztivities.data)) {
    throw new Error(`Loading quiztivities failed with status ${quiztivities.response.status}`);
  }
  return [
    ...(quizzes.data as Raw[]).map(toQuiz),
    ...(quiztivities.data as Raw[]).map(toQuiztivity),
  ];
}

export const dashboardQueries = {
  items: queryOptions({ queryKey: ['dashboard', 'items'], queryFn: fetchDashboardItems }),
};

export async function deleteDashboardItem(item: Pick<DashboardItem, 'id' | 'type'>) {
  const { response } =
    item.type === 'quiz'
      ? await fetchClient.DELETE('/api/v1/quiz/delete/{quiz_id}', {
          params: { path: { quiz_id: item.id } },
        })
      : await fetchClient.DELETE('/api/v1/quiztivity/{uuid}', {
          params: { path: { uuid: item.id } },
        });
  if (!response.ok) {
    throw new Error(`Deleting the ${item.type} failed with status ${response.status}`);
  }
}
