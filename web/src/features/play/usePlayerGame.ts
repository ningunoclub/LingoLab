// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Socket wiring of legacy `routes/play/+page.svelte` and the join half of `lib/play/join.svelte`.
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { connectSocket, getSocket } from '@/realtime/socket';
import { useSocketEvent } from '@/realtime/useSocketEvent';
import { checkGame } from './checkGame';
import { parsePlayerGame } from './playerGame';
import {
  clearJoinedGame,
  isKicked,
  markKicked,
  readJoinedGame,
  saveJoinedGame,
} from './playerSession';
import { usePlayStore } from './playStore';

export type JoinRequest = { gamePin: string; username: string; customField: string | null };

export type PlayerGameControls = {
  /** Emits `join_game`. Returns false when this browser was kicked in the last day. */
  join: (request: JoinRequest) => boolean;
};

/**
 * Connects the player's socket, takes a seat back after a reload (`rejoin_game`) and keeps
 * `usePlayStore` in sync with the server.
 */
export function usePlayerGame(): PlayerGameControls {
  // The join in flight: `joined_game` carries neither the PIN nor the name.
  const pending = useRef<{ gamePin: string; username: string } | null>(null);

  useSocketEvent(
    'time_sync',
    useCallback((data) => getSocket().emit('echo_time_sync', data), []),
  );
  useSocketEvent(
    'joined_game',
    useCallback((data) => {
      const game = parsePlayerGame(data);
      const request = pending.current;
      if (!game || !request) return;
      pending.current = null;
      usePlayStore.getState().joined(game, request.username);
      const sid = getSocket().id;
      if (sid) saveJoinedGame({ sid, username: request.username, game_pin: request.gamePin });
    }, []),
  );
  useSocketEvent(
    'rejoined_game',
    useCallback((data) => {
      const game = parsePlayerGame(data);
      const saved = readJoinedGame();
      if (!game || !saved) return;
      usePlayStore.getState().joined(game, saved.username);
      // The backend now knows this connection's id. Legacy kept the first one in the cookie,
      // so a second reload or dropped connection could no longer rejoin.
      const sid = getSocket().id;
      if (sid) saveJoinedGame({ ...saved, sid });
    }, []),
  );
  useSocketEvent(
    'game_not_found',
    useCallback(() => {
      // Either the PIN was wrong or the saved game is over.
      pending.current = null;
      clearJoinedGame();
      usePlayStore.getState().leave('game_not_found');
    }, []),
  );
  useSocketEvent(
    'username_already_exists',
    useCallback(() => {
      pending.current = null;
      usePlayStore.getState().setNotice('username_taken');
    }, []),
  );
  useSocketEvent(
    'game_already_started',
    useCallback(() => {
      pending.current = null;
      usePlayStore.getState().setNotice('already_started');
    }, []),
  );
  useSocketEvent(
    'kick',
    useCallback(() => {
      markKicked();
      // Legacy kept the rejoin cookie, so the reload it forced put the kicked player straight
      // back into the game (the backend still knows the seat).
      clearJoinedGame();
      usePlayStore.getState().leave('kicked');
    }, []),
  );
  useSocketEvent(
    'start_game',
    useCallback(() => usePlayStore.getState().gameStarted(), []),
  );
  useSocketEvent(
    'set_question_number',
    useCallback((data) => usePlayStore.getState().questionShown(data.question_index), []),
  );
  useSocketEvent(
    'final_results',
    useCallback(() => {
      clearJoinedGame();
      usePlayStore.getState().gameFinished();
    }, []),
  );

  // On every (re)connect, take back a saved seat. This covers both a reload and socket.io's
  // own reconnect after the phone lost its connection.
  useEffect(() => {
    const socket = getSocket();
    const rejoin = () => {
      const saved = readJoinedGame();
      if (!saved) return;
      socket.emit('rejoin_game', {
        old_sid: saved.sid,
        username: saved.username,
        game_pin: saved.game_pin,
      });
      void checkGame(saved.game_pin).then((check) => {
        if (check.status === 'ok') usePlayStore.getState().setGameMode(check.gameMode);
      });
    };
    socket.on('connect', rejoin);
    if (socket.connected) rejoin();
    else connectSocket();
    return () => {
      socket.off('connect', rejoin);
    };
  }, []);

  useEffect(() => () => usePlayStore.getState().reset(), []);

  return useMemo(
    () => ({
      join: ({ gamePin, username, customField }) => {
        if (isKicked()) {
          usePlayStore.getState().setNotice('banned');
          return false;
        }
        usePlayStore.getState().setNotice(null);
        pending.current = { gamePin, username };
        connectSocket().emit('join_game', {
          game_pin: gamePin,
          username,
          custom_field: customField ?? undefined,
        });
        return true;
      },
    }),
    [],
  );
}
