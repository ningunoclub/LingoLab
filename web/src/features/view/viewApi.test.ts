// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import fixture from '../../../tests/fixtures/public-quiz.json';
import { rangeOf } from './QuestionPreview';
import { countsAfterRating } from './QuizRating';
import { fetchPublicQuiz, QuizNotFoundError, rateQuiz, setModRating } from './viewApi';

const URL = 'http://localhost/api/v1';

function respond(status: number, body: unknown = null) {
  server.use(
    http.get(`${URL}/quiz/get/public/:id`, () =>
      status === 200 ? HttpResponse.json(body) : new HttpResponse(null, { status }),
    ),
  );
}

describe('fetchPublicQuiz', () => {
  it('parses the real backend response', async () => {
    respond(200, fixture);
    const quiz = await fetchPublicQuiz(fixture.id);
    expect(quiz.user_id.username).toBe('devteacher');
    expect(quiz.questions.map((q) => q.type)).toEqual([
      'ABCD',
      'CHECK',
      'RANGE',
      'ORDER',
      'VOTING',
      'TEXT',
      'SLIDE',
    ]);
    expect(quiz.likes).toBe(12);
  });

  it('reads a question without a type as ABCD, as legacy did', async () => {
    const { type: _, ...untyped } = fixture.questions[0] as Record<string, unknown>;
    respond(200, { ...fixture, questions: [untyped] });
    const quiz = await fetchPublicQuiz(fixture.id);
    expect(quiz.questions[0]?.type).toBe('ABCD');
  });

  it.each([404, 400, 422])('treats %i as a missing quiz', async (status) => {
    respond(status);
    await expect(fetchPublicQuiz('nope')).rejects.toBeInstanceOf(QuizNotFoundError);
  });

  it('treats a server error as a load failure', async () => {
    respond(500);
    const error = await fetchPublicQuiz(fixture.id).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(QuizNotFoundError);
  });
});

describe('rateQuiz', () => {
  it('sends LIKE / DISLIKE and maps 409 to already rated', async () => {
    const bodies: unknown[] = [];
    let status = 200;
    server.use(
      http.post(`${URL}/community/rate/:id`, async ({ request }) => {
        bodies.push(await request.json());
        return new HttpResponse(null, { status });
      }),
    );
    expect(await rateQuiz(fixture.id, true)).toBe('rated');
    status = 409;
    expect(await rateQuiz(fixture.id, false)).toBe('already_rated');
    status = 401;
    expect(await rateQuiz(fixture.id, false)).toBe('failed');
    expect(bodies).toEqual([{ type: 'LIKE' }, { type: 'DISLIKE' }, { type: 'DISLIKE' }]);
  });
});

describe('setModRating', () => {
  it('sends null for "Not checked" and throws on failure', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${URL}/moderation/rating/set/:id`, async ({ request }) => {
        bodies.push(await request.json());
        return bodies.length === 1
          ? HttpResponse.json({})
          : new HttpResponse(null, { status: 403 });
      }),
    );
    await setModRating(fixture.id, null);
    await expect(setModRating(fixture.id, 3)).rejects.toThrow();
    expect(bodies).toEqual([{ rating: null }, { rating: 3 }]);
  });
});

describe('countsAfterRating', () => {
  it('adds the new rating', () => {
    expect(countsAfterRating({ likes: 1, dislikes: 1 }, true, null)).toEqual({
      likes: 2,
      dislikes: 1,
    });
  });

  it('takes back an opposite rating given on this page', () => {
    expect(countsAfterRating({ likes: 2, dislikes: 1 }, false, true)).toEqual({
      likes: 1,
      dislikes: 2,
    });
  });
});

describe('rangeOf', () => {
  it('reads the four numbers or gives null', () => {
    expect(rangeOf(fixture.questions[2]?.answers)).toEqual({
      min: 0,
      max: 100,
      min_correct: 20,
      max_correct: 40,
    });
    expect(rangeOf([])).toBeNull();
    expect(rangeOf({ min: 1 })).toBeNull();
  });
});
