// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Socket wiring of legacy `routes/admin/+page.svelte` (connect + listeners),
// `lib/admin.svelte` (question loop listeners and the timer) and
// `lib/play/admin/socket_game_controls.ts` (the emits).
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { connectSocket, getSocket } from '@/realtime/socket';
import { useSocketEvent } from '@/realtime/useSocketEvent';
import type { HostAction } from './hostLoop';
import { useHostStore } from './hostStore';

export type HostGameControls = {
  startGame: () => void;
  kickPlayer: (username: string) => void;
  /** Carries out the action of the control button (see `nextHostAction`). */
  run: (action: HostAction) => void;
  requestExport: () => void;
  saveResults: () => void;
};

/** Legacy waits this long between the silent results request and the next question. */
const SKIP_RESULTS_DELAY_MS = 200;

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
  useSocketEvent(
    'set_question_number',
    useCallback((data) => useHostStore.getState().questionShown(data.question_index), []),
  );
  useSocketEvent(
    'player_answer',
    useCallback(() => useHostStore.getState().answerReceived(), []),
  );
  useSocketEvent(
    'everyone_answered',
    useCallback(() => useHostStore.getState().timeUp(), []),
  );
  useSocketEvent(
    'solutions',
    useCallback(() => useHostStore.getState().timeUp(), []),
  );
  useSocketEvent(
    'question_results',
    useCallback((data) => useHostStore.getState().questionResultsReceived(data), []),
  );
  useSocketEvent(
    'final_results',
    useCallback((data) => useHostStore.getState().finalResultsReceived(data), []),
  );
  useSocketEvent(
    'export_token',
    useCallback((token) => useHostStore.getState().exportTokenReceived(token), []),
  );
  useSocketEvent(
    'results_saved_successfully',
    useCallback(() => useHostStore.getState().resultsSavedReceived(), []),
  );

  // The countdown runs locally, one tick per second, as in legacy; the server only says when
  // a question starts and when everyone has answered.
  const questionIndex = useHostStore((s) => s.questionIndex);
  const running = useHostStore((s) => s.timeLeft !== null && s.timeLeft > 0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: questionIndex restarts the interval on a new question.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => useHostStore.getState().tick(), 1000);
    return () => clearInterval(id);
  }, [running, questionIndex]);

  // The silent results request of `skip_results` schedules the next step; leaving the page
  // cancels it.
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(pending.current), []);

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
      run: (action: HostAction) => {
        const socket = getSocket();
        const questionResults = () =>
          socket.emit('get_question_results', {
            game_id: gameId,
            question_number: useHostStore.getState().questionIndex,
          });
        switch (action.kind) {
          case 'next':
            socket.emit('set_question_number', String(action.question));
            return;
          case 'solutions':
            socket.emit('show_solutions', {});
            useHostStore.getState().timeUp();
            return;
          case 'results':
            questionResults();
            return;
          case 'skip_results': {
            questionResults();
            const next = useHostStore.getState().questionIndex + 1;
            clearTimeout(pending.current);
            pending.current = setTimeout(() => {
              if (action.after === 'final') socket.emit('get_final_results', {});
              else socket.emit('set_question_number', String(next));
            }, SKIP_RESULTS_DELAY_MS);
            return;
          }
          case 'final':
            socket.emit('get_final_results', {});
            return;
        }
      },
      requestExport: () => getSocket().emit('get_export_token'),
      saveResults: () => getSocket().emit('save_quiz'),
    }),
    [gameId],
  );
}
