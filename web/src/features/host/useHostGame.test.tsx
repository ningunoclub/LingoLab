// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHostStore } from './hostStore';
import { useHostGame } from './useHostGame';

type Handler = (...args: unknown[]) => void;

// A stand-in for the socket.io client: records emits, lets the test play the server.
const fake = vi.hoisted(() => {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();
  const socket = {
    emit: vi.fn(),
    on: (event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)?.add(handler);
    },
    off: (event: string, handler: (...args: unknown[]) => void) => {
      handlers.get(event)?.delete(handler);
    },
  };
  return { socket, handlers };
});

vi.mock('@/realtime/socket', () => ({
  getSocket: () => fake.socket,
  connectSocket: () => fake.socket,
}));

function serverSends(event: string, ...args: unknown[]) {
  act(() => {
    for (const handler of fake.handlers.get(event) ?? []) (handler as Handler)(...args);
  });
}

const GAME = JSON.stringify({ title: 'Quiz', questions: [] });

describe('useHostGame', () => {
  beforeEach(() => {
    fake.socket.emit.mockClear();
    fake.handlers.clear();
    useHostStore.getState().reset();
  });

  it('registers as host exactly once, even under StrictMode', () => {
    renderHook(() => useHostGame('123456', 'game-id', true), { wrapper: StrictMode });
    const registers = fake.socket.emit.mock.calls.filter(([e]) => e === 'register_as_admin');
    expect(registers).toEqual([['register_as_admin', { game_pin: '123456', game_id: 'game-id' }]]);
  });

  it('does not connect without the connect flag', () => {
    renderHook(() => useHostGame('', '', false));
    expect(fake.socket.emit).not.toHaveBeenCalled();
  });

  it('follows the lobby through the server events', () => {
    const { result } = renderHook(() => useHostGame('123456', 'game-id', true));
    serverSends('registered_as_admin', { game_id: 'game-id', game: GAME });
    expect(useHostStore.getState().status).toBe('lobby');

    serverSends('player_joined', { username: 'Mia', sid: 'a' });
    serverSends('player_joined', { username: 'Leo', sid: 'b' });
    expect(useHostStore.getState().players).toHaveLength(2);

    act(() => result.current.kickPlayer('Mia'));
    expect(fake.socket.emit).toHaveBeenCalledWith('kick_player', { username: 'Mia' });
    expect(useHostStore.getState().players.map((p) => p.username)).toEqual(['Leo']);

    act(() => result.current.startGame());
    expect(fake.socket.emit).toHaveBeenCalledWith('start_game', {});
    serverSends('start_game');
    expect(useHostStore.getState().status).toBe('started');
  });

  it('shows the already-registered error', () => {
    renderHook(() => useHostGame('123456', 'game-id', true));
    serverSends('already_registered_as_admin');
    expect(useHostStore.getState()).toMatchObject({ status: 'error', error: 'already_registered' });
  });

  describe('question loop', () => {
    const LOOP_GAME = JSON.stringify({
      title: 'Quiz',
      questions: [
        { question: 'One', time: '3', type: 'ABCD', answers: [] },
        { question: 'Two', time: '5', type: 'ABCD', answers: [], hide_results: true },
      ],
    });
    const answer = (username: string, score: number) => ({
      username,
      answer: 'x',
      right: score > 0,
      time_taken: 1000,
      score,
    });

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    function startedGame() {
      const hook = renderHook(() => useHostGame('123456', 'game-id', true));
      serverSends('registered_as_admin', { game_id: 'game-id', game: LOOP_GAME });
      serverSends('start_game');
      return hook;
    }

    it('counts down, counts answers and adds the points once', () => {
      const { result } = startedGame();
      act(() => result.current.run({ kind: 'next', question: 0 }));
      expect(fake.socket.emit).toHaveBeenCalledWith('set_question_number', '0');

      serverSends('set_question_number', { question_index: 0 });
      expect(useHostStore.getState()).toMatchObject({ questionIndex: 0, timeLeft: 3 });
      act(() => vi.advanceTimersByTime(1000));
      expect(useHostStore.getState().timeLeft).toBe(2);
      serverSends('player_answer', {});
      expect(useHostStore.getState().answerCount).toBe(1);
      serverSends('everyone_answered', {});
      expect(useHostStore.getState().timeLeft).toBe(0);
      act(() => vi.advanceTimersByTime(3000));
      expect(useHostStore.getState().timeLeft).toBe(0);

      act(() => result.current.run({ kind: 'results' }));
      expect(fake.socket.emit).toHaveBeenCalledWith('get_question_results', {
        game_id: 'game-id',
        question_number: 0,
      });
      const results = [answer('Mia', 800), answer('Leo', 0)];
      serverSends('question_results', results);
      serverSends('question_results', results);
      expect(useHostStore.getState().scores).toEqual({ Mia: 800, Leo: 0 });
      expect(useHostStore.getState().scoresBefore).toEqual({});
    });

    it('stopping the time emits show_solutions', () => {
      const { result } = startedGame();
      serverSends('set_question_number', { question_index: 0 });
      act(() => result.current.run({ kind: 'solutions' }));
      expect(fake.socket.emit).toHaveBeenCalledWith('show_solutions', {});
      expect(useHostStore.getState().timeLeft).toBe(0);
    });

    it('skips hidden results and moves on after a short pause', () => {
      const { result } = startedGame();
      serverSends('set_question_number', { question_index: 1 });
      act(() => result.current.run({ kind: 'skip_results', after: 'final' }));
      expect(fake.socket.emit).toHaveBeenCalledWith('get_question_results', {
        game_id: 'game-id',
        question_number: 1,
      });
      expect(fake.socket.emit).not.toHaveBeenCalledWith('get_final_results', {});
      act(() => vi.advanceTimersByTime(200));
      expect(fake.socket.emit).toHaveBeenCalledWith('get_final_results', {});
    });

    it('ends with the final scores, the export link and the saved state', () => {
      const { result } = startedGame();
      serverSends('final_results', { '0': [answer('Mia', 800)], '1': [answer('Mia', 100)] });
      expect(useHostStore.getState().finalScores).toEqual({ Mia: 900 });

      act(() => result.current.requestExport());
      expect(fake.socket.emit).toHaveBeenCalledWith('get_export_token');
      serverSends('export_token', 'tok');
      expect(useHostStore.getState().exportToken).toBe('tok');

      act(() => result.current.saveResults());
      expect(fake.socket.emit).toHaveBeenCalledWith('save_quiz');
      serverSends('results_saved_successfully');
      expect(useHostStore.getState().resultsSaved).toBe(true);
    });
  });
});
