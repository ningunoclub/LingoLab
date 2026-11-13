// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { act, renderHook } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw';
import { clearJoinedGame, isKicked, readJoinedGame, saveJoinedGame } from './playerSession';
import { usePlayStore } from './playStore';
import { usePlayerGame } from './usePlayerGame';

type Handler = (...args: unknown[]) => void;

// A stand-in for the socket.io client: records emits, lets the test play the server.
const fake = vi.hoisted(() => {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();
  const socket = {
    id: 'sid-1',
    connected: false,
    emit: vi.fn(),
    connect: vi.fn(),
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

const GAME = { title: 'Irregular verbs', description: '', started: false, question_count: 3 };

function clearKicked() {
  // biome-ignore lint/suspicious/noDocumentCookie: test cleanup.
  document.cookie = 'kicked=; max-age=0; path=/';
}

describe('usePlayerGame', () => {
  beforeEach(() => {
    fake.socket.emit.mockClear();
    fake.socket.id = 'sid-1';
    fake.handlers.clear();
    usePlayStore.getState().reset();
    server.use(
      http.get('*/api/v1/quiz/play/check_captcha/:pin', () =>
        HttpResponse.json({ enabled: false, game_mode: 'kahoot', custom_field: null }),
      ),
    );
  });
  afterEach(() => {
    clearJoinedGame();
    clearKicked();
  });

  it('joins, remembers the seat and shows the game', () => {
    const { result } = renderHook(() => usePlayerGame());
    act(() => {
      result.current.join({ gamePin: '482913', username: 'Lena', customField: 'Class 2b' });
    });
    expect(fake.socket.emit).toHaveBeenCalledWith('join_game', {
      game_pin: '482913',
      username: 'Lena',
      custom_field: 'Class 2b',
    });
    serverSends('joined_game', GAME);
    expect(usePlayStore.getState().game?.title).toBe('Irregular verbs');
    expect(usePlayStore.getState().username).toBe('Lena');
    expect(readJoinedGame()).toEqual({ sid: 'sid-1', username: 'Lena', game_pin: '482913' });
  });

  it('answers the time sync', () => {
    renderHook(() => usePlayerGame());
    serverSends('time_sync', 'encrypted');
    expect(fake.socket.emit).toHaveBeenCalledWith('echo_time_sync', 'encrypted');
  });

  it('rejoins on connect and keeps the new connection id for the next rejoin', () => {
    saveJoinedGame({ sid: 'old-sid', username: 'Lena', game_pin: '482913' });
    renderHook(() => usePlayerGame());
    fake.socket.id = 'sid-2';
    serverSends('connect');
    expect(fake.socket.emit).toHaveBeenCalledWith('rejoin_game', {
      old_sid: 'old-sid',
      username: 'Lena',
      game_pin: '482913',
    });
    serverSends('rejoined_game', { ...GAME, started: true });
    expect(usePlayStore.getState().started).toBe(true);
    expect(readJoinedGame()?.sid).toBe('sid-2');
  });

  it('forgets a saved game that no longer exists', () => {
    saveJoinedGame({ sid: 'old-sid', username: 'Lena', game_pin: '482913' });
    renderHook(() => usePlayerGame());
    serverSends('connect');
    serverSends('game_not_found');
    expect(readJoinedGame()).toBeNull();
    expect(usePlayStore.getState().notice).toBe('game_not_found');
  });

  it('shows why a join was refused', () => {
    const { result } = renderHook(() => usePlayerGame());
    act(() => {
      result.current.join({ gamePin: '482913', username: 'Lena', customField: null });
    });
    serverSends('username_already_exists');
    expect(usePlayStore.getState().notice).toBe('username_taken');
    serverSends('game_already_started');
    expect(usePlayStore.getState().notice).toBe('already_started');
  });

  it('a kick drops the seat and blocks joining for a day', () => {
    const { result } = renderHook(() => usePlayerGame());
    act(() => {
      result.current.join({ gamePin: '482913', username: 'Lena', customField: null });
    });
    serverSends('joined_game', GAME);
    serverSends('kick');
    expect(usePlayStore.getState().game).toBeNull();
    expect(usePlayStore.getState().notice).toBe('kicked');
    expect(readJoinedGame()).toBeNull();
    expect(isKicked()).toBe(true);

    fake.socket.emit.mockClear();
    let joined = true;
    act(() => {
      joined = result.current.join({ gamePin: '482913', username: 'Lena', customField: null });
    });
    expect(joined).toBe(false);
    expect(fake.socket.emit).not.toHaveBeenCalled();
    expect(usePlayStore.getState().notice).toBe('banned');
  });

  it('follows the game until the end', () => {
    const { result } = renderHook(() => usePlayerGame());
    act(() => {
      result.current.join({ gamePin: '482913', username: 'Lena', customField: null });
    });
    serverSends('joined_game', GAME);
    serverSends('start_game');
    serverSends('set_question_number', { question_index: 0, question: {} });
    expect(usePlayStore.getState().questionIndex).toBe(0);
    serverSends('final_results', {});
    expect(usePlayStore.getState().finished).toBe(true);
    expect(readJoinedGame()).toBeNull();
  });
});
