// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import { parseGameQuiz } from './gameQuiz';
import { canStartGame, useHostStore } from './hostStore';

const GAME = JSON.stringify({
  title: 'Irregular verbs',
  background_color: '#fde68a',
  background_image: 'abc123',
  questions: [{ question: 'go → ?' }],
  game_pin: '123456',
});

describe('parseGameQuiz', () => {
  it('reads the fields the host screen uses and keeps the rest', () => {
    const quiz = parseGameQuiz(GAME);
    expect(quiz).toMatchObject({ title: 'Irregular verbs', background_color: '#fde68a' });
    expect(quiz?.questions).toHaveLength(1);
    expect(quiz).toHaveProperty('game_pin', '123456');
  });

  it('drops a background colour that is not a plain hex value', () => {
    const quiz = parseGameQuiz(
      JSON.stringify({ title: 'x', questions: [], background_color: 'red;background:url(x)' }),
    );
    expect(quiz?.background_color).toBeNull();
  });

  it.each([null, '', 'not json', '{"title":1}'])('returns null for %j', (raw) => {
    expect(parseGameQuiz(raw)).toBeNull();
  });
});

describe('useHostStore', () => {
  beforeEach(() => useHostStore.getState().reset());

  it('enters the lobby once registered', () => {
    useHostStore.getState().registered(GAME);
    expect(useHostStore.getState().status).toBe('lobby');
  });

  it('reports unreadable game data as an error', () => {
    useHostStore.getState().registered(null);
    expect(useHostStore.getState()).toMatchObject({ status: 'error', error: 'invalid_game' });
  });

  it('can start only in the lobby with at least one player', () => {
    const s = useHostStore.getState;
    expect(canStartGame(s())).toBe(false);
    s().registered(GAME);
    expect(canStartGame(s())).toBe(false);
    s().playerJoined({ username: 'Mia', sid: 'a' });
    expect(canStartGame(s())).toBe(true);
    s().gameStarted();
    expect(canStartGame(s())).toBe(false);
  });

  it('removes only the first player with the kicked name, as legacy does', () => {
    const s = useHostStore.getState;
    s().playerJoined({ username: 'Mia', sid: 'a' });
    s().playerJoined({ username: 'Mia', sid: 'b' });
    s().playerJoined({ username: 'Leo', sid: 'c' });
    s().playerKicked('Mia');
    expect(s().players.map((p) => p.sid)).toEqual(['b', 'c']);
    s().playerKicked('nobody');
    expect(s().players).toHaveLength(2);
  });
});
