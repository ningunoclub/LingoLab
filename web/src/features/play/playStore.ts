// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Live player state, the `let … = $state()` block of legacy `routes/play/+page.svelte`.
// PR 9 adds the question, solutions, results and scores.
import { create } from 'zustand';
import type { PlayerGame } from './playerGame';

/**
 * Why the join form shows a message. Legacy used `window.alert` for most of them and showed
 * nothing at all for `already_started` and `banned`.
 */
export type JoinNotice =
  | 'game_not_found'
  | 'username_taken'
  | 'already_started'
  | 'kicked'
  | 'banned'
  | 'error';

type PlayState = {
  /** Set once `joined_game` / `rejoined_game` arrives; null while on the join form. */
  game: PlayerGame | null;
  username: string;
  /** `kahoot` or `normal`, from `check_captcha`; the question screens (PR 9) need it. */
  gameMode: string | null;
  started: boolean;
  /** Index of the current question; null until the host shows the first one. */
  questionIndex: number | null;
  finished: boolean;
  notice: JoinNotice | null;

  joined: (game: PlayerGame, username: string) => void;
  setGameMode: (mode: string | null) => void;
  gameStarted: () => void;
  questionShown: (index: number) => void;
  gameFinished: () => void;
  setNotice: (notice: JoinNotice | null) => void;
  /** Back to an empty join form, keeping only the notice that explains why. */
  leave: (notice: JoinNotice | null) => void;
  reset: () => void;
};

const initial = {
  game: null,
  username: '',
  gameMode: null,
  started: false,
  questionIndex: null,
  finished: false,
  notice: null,
} satisfies Partial<PlayState>;

export const usePlayStore = create<PlayState>((set) => ({
  ...initial,
  joined: (game, username) =>
    set((s) => ({ game, username, notice: null, started: s.started || game.started })),
  setGameMode: (gameMode) => set({ gameMode }),
  gameStarted: () => set({ started: true }),
  questionShown: (questionIndex) => set({ questionIndex }),
  gameFinished: () => set({ finished: true }),
  setNotice: (notice) => set({ notice }),
  leave: (notice) => set({ ...initial, notice }),
  reset: () => set(initial),
}));
