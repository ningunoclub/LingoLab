// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import fixture from '../../../tests/fixtures/game-result.json';
import { fetchGameResult, fetchResultList, ResultNotFoundError } from './resultsApi';

const BASE = 'http://localhost/api/v1/results';

describe('fetchResultList', () => {
  it('counts the players with a score and drops an empty note', async () => {
    server.use(
      http.get(`${BASE}/list`, () =>
        HttpResponse.json([
          fixture,
          { ...fixture, id: 'other', note: 'Class 3b', player_scores: {} },
        ]),
      ),
    );
    expect(await fetchResultList()).toEqual([
      {
        id: fixture.id,
        title: 'Irregular verbs',
        timestamp: fixture.timestamp,
        playerCount: 3,
        note: null,
      },
      {
        id: 'other',
        title: 'Irregular verbs',
        timestamp: fixture.timestamp,
        playerCount: 0,
        note: 'Class 3b',
      },
    ]);
  });

  it('fails instead of showing an empty list when the request fails', async () => {
    server.use(http.get(`${BASE}/list`, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchResultList()).rejects.toThrow('500');
  });
});

describe('fetchGameResult', () => {
  it('parses the stored strings and nested answer lists', async () => {
    server.use(http.get(`${BASE}/:id`, () => HttpResponse.json(fixture)));
    const result = await fetchGameResult(fixture.id);
    expect(result.playerScores).toEqual({ Ben: 500, Anna: 1700, Cleo: 0 });
    expect(result.customFields).toEqual({ Anna: '3b', Ben: '3a' });
    expect(result.questions.map((q) => q.type)).toEqual([
      'ABCD',
      'CHECK',
      'VOTING',
      'SLIDE',
      'ORDER',
    ]);
    expect(result.answers.map((a) => a.length)).toEqual([2, 2, 2, 0, 1]);
  });

  it('gives every question an answer list, even when fewer were stored', async () => {
    server.use(
      http.get(`${BASE}/:id`, () =>
        HttpResponse.json({
          ...fixture,
          answers: null,
          player_scores: null,
          custom_field_data: null,
        }),
      ),
    );
    const result = await fetchGameResult(fixture.id);
    expect(result.answers).toEqual([[], [], [], [], []]);
    expect(result.playerScores).toEqual({});
    expect(result.customFields).toEqual({});
  });

  it.each([404, 422])('reports %i as not found', async (status) => {
    server.use(http.get(`${BASE}/:id`, () => new HttpResponse(null, { status })));
    await expect(fetchGameResult('x')).rejects.toBeInstanceOf(ResultNotFoundError);
  });

  it('reports other failures as errors', async () => {
    server.use(http.get(`${BASE}/:id`, () => new HttpResponse(null, { status: 500 })));
    const error = await fetchGameResult('x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ResultNotFoundError);
  });
});
