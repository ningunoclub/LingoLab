// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import { deleteDashboardItem, fetchDashboardItems, QUIZ_PAGE_SIZE } from './dashboardApi';

const BASE = 'http://localhost/api/v1';

const QUIZ = {
  id: 'quiz-1',
  title: 'Irregular verbs',
  description: 'Past simple',
  public: true,
  cover_image: 'cover--file',
  questions: [{ question: 'go → ?' }, { question: 'see → ?' }],
  likes: 3,
  dislikes: 1,
  views: 20,
  plays: 7,
};

const QUIZTIVITY = { id: 'qt-1', title: 'Flashcards', created_at: '2026-01-01', pages: [] };

function mockLists(quizzes: unknown = [QUIZ], quiztivities: unknown = [QUIZTIVITY]) {
  server.use(
    http.get(`${BASE}/quiz/list`, () => HttpResponse.json(quizzes)),
    http.get(`${BASE}/quiztivity/`, () => HttpResponse.json(quiztivities)),
  );
}

describe('fetchDashboardItems', () => {
  it('lists quizzes first, then quiztivities, like legacy', async () => {
    mockLists();
    const items = await fetchDashboardItems();
    expect(items.map((item) => [item.type, item.id])).toEqual([
      ['quiz', 'quiz-1'],
      ['quiztivity', 'qt-1'],
    ]);
  });

  it('keeps what a quiz card and its analytics need', async () => {
    mockLists();
    const [quiz] = await fetchDashboardItems();
    expect(quiz).toEqual({
      type: 'quiz',
      id: 'quiz-1',
      title: 'Irregular verbs',
      description: 'Past simple',
      coverImage: 'cover--file',
      public: true,
      questionTexts: ['go → ?', 'see → ?'],
      stats: { likes: 3, dislikes: 1, views: 20, plays: 7 },
    });
  });

  it('gives quiztivities no stats, cover or public flag (the backend has none)', async () => {
    mockLists();
    const [, quiztivity] = await fetchDashboardItems();
    expect(quiztivity).toMatchObject({
      description: null,
      coverImage: null,
      public: false,
      stats: null,
    });
  });

  it('asks for the same page size as legacy', async () => {
    let pageSize: string | null = null;
    server.use(
      http.get(`${BASE}/quiz/list`, ({ request }) => {
        pageSize = new URL(request.url).searchParams.get('page_size');
        return HttpResponse.json([]);
      }),
      http.get(`${BASE}/quiztivity/`, () => HttpResponse.json([])),
    );
    await fetchDashboardItems();
    expect(pageSize).toBe(String(QUIZ_PAGE_SIZE));
  });

  it('fails when either list fails, instead of showing half a dashboard', async () => {
    server.use(
      http.get(`${BASE}/quiz/list`, () => HttpResponse.json([QUIZ])),
      http.get(`${BASE}/quiztivity/`, () => new HttpResponse(null, { status: 500 })),
    );
    await expect(fetchDashboardItems()).rejects.toThrow();
  });
});

describe('deleteDashboardItem', () => {
  it('deletes a quiz through the quiz endpoint', async () => {
    let seen: string | null = null;
    server.use(
      http.delete(`${BASE}/quiz/delete/:id`, ({ params }) => {
        seen = String(params.id);
        return HttpResponse.json({});
      }),
    );
    await deleteDashboardItem({ type: 'quiz', id: 'quiz-1' });
    expect(seen).toBe('quiz-1');
  });

  it('deletes a quiztivity through the quiztivity endpoint', async () => {
    let seen: string | null = null;
    server.use(
      http.delete(`${BASE}/quiztivity/:id`, ({ params }) => {
        seen = String(params.id);
        return HttpResponse.json({});
      }),
    );
    await deleteDashboardItem({ type: 'quiztivity', id: 'qt-1' });
    expect(seen).toBe('qt-1');
  });

  it('reports a failed delete (legacy ignored it and reloaded)', async () => {
    server.use(
      http.delete(`${BASE}/quiz/delete/:id`, () => new HttpResponse(null, { status: 404 })),
    );
    await expect(deleteDashboardItem({ type: 'quiz', id: 'gone' })).rejects.toThrow();
  });
});
