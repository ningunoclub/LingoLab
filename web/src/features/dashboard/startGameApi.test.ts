// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import {
  loadCustomField,
  NotSignedInError,
  type StartGameOptions,
  saveCustomField,
  startGame,
} from './startGameApi';

const START = 'http://localhost/api/v1/quiz/start/:quizId';

const OPTIONS: StartGameOptions = {
  gameMode: 'normal',
  customField: 'Name & class',
  randomizeAnswers: true,
};

function captureStart(response: () => Response) {
  const seen: { quizId?: string; params?: URLSearchParams } = {};
  server.use(
    http.post(START, ({ request, params }) => {
      seen.quizId = String(params.quizId);
      seen.params = new URL(request.url).searchParams;
      return response();
    }),
  );
  return seen;
}

describe('startGame', () => {
  it('always switches the player captcha off, since the backend defaults it on', async () => {
    const seen = captureStart(() => HttpResponse.json({ game_id: 'g-1', game_pin: '123456' }));
    await startGame('quiz-1', OPTIONS);
    expect(seen.params?.get('captcha_enabled')).toBe('false');
    expect(seen.params?.has('cqcs_enabled')).toBe(false);
  });

  it('sends the mode, the encoded custom field and randomize_answers', async () => {
    const seen = captureStart(() => HttpResponse.json({ game_id: 'g-1', game_pin: '123456' }));
    await startGame('quiz-1', OPTIONS);
    expect(seen.quizId).toBe('quiz-1');
    expect(seen.params?.get('game_mode')).toBe('normal');
    // Legacy interpolated the label raw, so "&" split it into a bogus parameter.
    expect(seen.params?.get('custom_field')).toBe('Name & class');
    expect(seen.params?.get('randomize_answers')).toBe('true');
  });

  it('returns the game id and pin, as strings', async () => {
    captureStart(() => HttpResponse.json({ game_id: 'g-1', game_pin: 654321 }));
    await expect(startGame('quiz-1', OPTIONS)).resolves.toEqual({
      gameId: 'g-1',
      gamePin: '654321',
    });
  });

  it('reports an expired session as NotSignedInError', async () => {
    captureStart(() => new HttpResponse(null, { status: 401 }));
    await expect(startGame('quiz-1', OPTIONS)).rejects.toBeInstanceOf(NotSignedInError);
  });

  it('reports other failures as a plain error, not as signed out', async () => {
    captureStart(() => HttpResponse.json({ detail: 'quiz not found' }, { status: 404 }));
    const failure = startGame('quiz-1', OPTIONS);
    await expect(failure).rejects.toThrow();
    await expect(failure).rejects.not.toBeInstanceOf(NotSignedInError);
  });
});

describe('custom field memory', () => {
  afterEach(() => localStorage.clear());

  it('starts empty and remembers the last label under the legacy key', () => {
    expect(loadCustomField()).toBe('');
    saveCustomField('Class');
    expect(localStorage.getItem('custom_field')).toBe('Class');
    expect(loadCustomField()).toBe('Class');
  });
});
