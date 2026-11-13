// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Socket wiring of legacy `routes/admin/+page.svelte` (connect + listeners) and
// `lib/play/admin/socket_game_controls.ts` (start, kick).
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { connectSocket, getSocket } from '@/realtime/socket';
import { useSocketEvent } from '@/realtime/useSocketEvent';
import { useHostStore } from './hostStore';

export type HostGameControls = {
  startGame: () => void;
  kickPlayer: (username: string) => void;
};

/**
 * Registers this tab as the host of the game and keeps `useHostStore` in sync with the socket.
 * `enabled` is legacy's `auto_connect`: only true when the URL has `token`, `pin` and `connect`.
 */
export function useHostGame(gamePin: string, gameId: string, enabled: boolean): HostGameControls {
  // Listeners first: their effects run before the registering effect below.
  useSocketEvent(
    'registered_as_admin',
    useCallback((data) => useHostStore.getState().registered(data.game), []),
  );
  useSocketEvent(
    'already_registered_as_admin',
    useCallback(() => useHostStore.getState().failed('already_registered'), []),
  );
  useSocketEvent(
    'player_joined',
    useCallback((player) => useHostStore.getState().playerJoined(player), []),
  );
  useSocketEvent(
    'start_game',
    useCallback(() => useHostStore.getState().gameStarted(), []),
  );
  useSocketEvent(
    'control_visibility',
    useCallback((data) => useHostStore.getState().setControlVisible(data.visible), []),
  );

  // Registering twice for one game is refused by the backend (`already_registered_as_admin`),
  // so the emit must survive React's dev double-mount: the ref outlives it, the effect does not.
  const registeredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const key = `${gamePin}:${gameId}`;
    if (registeredFor.current === key) return;
    registeredFor.current = key;
    useHostStore.getState().reset();
    // The socket stays open when the host leaves the page, as in legacy: the backend ties
    // the host role to this connection, and a reconnect could not reclaim it.
    connectSocket().emit('register_as_admin', { game_pin: gamePin, game_id: gameId });
  }, [enabled, gamePin, gameId]);

  // A later visit starts from a clean slate instead of flashing the previous game.
  useEffect(() => () => useHostStore.getState().reset(), []);

  return useMemo(
    () => ({
      startGame: () => getSocket().emit('start_game', {}),
      kickPlayer: (username: string) => {
        getSocket().emit('kick_player', { username });
        useHostStore.getState().playerKicked(username);
      },
    }),
    [],
  );
}
