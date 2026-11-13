// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Live host state, ported from the `GameState` class in legacy `routes/admin/+page.svelte`
// and `lib/play/admin/game_state.ts`. This PR covers the lobby half; the question loop
// (selected question, timer, results, final scores) is added with PR 8.
import { create } from 'zustand';
import type { PlayerIdentity } from '@/realtime/events';
import { type GameQuiz, parseGameQuiz } from './gameQuiz';

export type HostStatus = 'connecting' | 'lobby' | 'started' | 'error';
export type HostError = 'already_registered' | 'invalid_game';

type HostState = {
  status: HostStatus;
  error: HostError | null;
  quiz: GameQuiz | null;
  players: PlayerIdentity[];
  controlVisible: boolean;

  reset: () => void;
  registered: (game: string | null) => void;
  failed: (error: HostError) => void;
  playerJoined: (player: PlayerIdentity) => void;
  playerKicked: (username: string) => void;
  gameStarted: () => void;
  setControlVisible: (visible: boolean) => void;
};

const initialState = {
  status: 'connecting' as HostStatus,
  error: null,
  quiz: null,
  players: [],
  controlVisible: true,
};

export const useHostStore = create<HostState>((set) => ({
  ...initialState,

  reset: () => set(initialState),

  registered: (game) => {
    const quiz = parseGameQuiz(game);
    set(quiz ? { status: 'lobby', quiz } : { status: 'error', error: 'invalid_game' });
  },

  failed: (error) => set({ status: 'error', error }),

  // Appended as-is, like legacy: the backend refuses a name that is already taken.
  playerJoined: (player) => set((state) => ({ players: [...state.players, player] })),

  // Legacy `kick_player` drops the first player with that name from its own list; the
  // backend sends no confirmation.
  playerKicked: (username) =>
    set((state) => {
      const index = state.players.findIndex((p) => p.username === username);
      if (index === -1) return state;
      return { players: state.players.toSpliced(index, 1) };
    }),

  gameStarted: () => set({ status: 'started' }),

  setControlVisible: (visible) => set({ controlVisible: visible }),
}));

/** Legacy `is_game_ready_to_start`. */
export function canStartGame(state: Pick<HostState, 'status' | 'players'>): boolean {
  return state.status === 'lobby' && state.players.length > 0;
}
