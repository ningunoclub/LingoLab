// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
});
