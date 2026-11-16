// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Live player state, the `let … = $state()` block of legacy `routes/play/+page.svelte`, plus
// the timer of `lib/play/question.svelte` and the score keeping of `lib/play/results_kahoot.svelte`.
import { create } from 'zustand';
import { addScores, parseAnswers, totalScores } from '@/features/host/hostLoop';
import type { AnswerData } from '@/realtime/events';
import type { PlayerGame } from './playerGame';
import { type PlayerQuestion, parsePlayerQuestion } from './playerQuestion';

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

/** This question's results: the answers, or `none` when the server sent `null` (legacy "No answers!"). */
export type PlayerResults = AnswerData[] | 'none';

type PlayState = {
  /** Set once `joined_game` / `rejoined_game` arrives; null while on the join form. */
  game: PlayerGame | null;
  username: string;
  /** `kahoot` or `normal`, from `check_captcha`. Kahoot mode shows shapes only on the tiles. */
  gameMode: string | null;
  started: boolean;
  /** Index of the current question; null until the host shows the first one. */
  questionIndex: number | null;
  /** The current question; null before the first one or when it could not be read. */
  question: PlayerQuestion | null;
  /** Seconds left on the current question; 0 once the time is over. */
  timeLeft: number;
  /** Whether this player's answer to the current question went out. */
  answered: boolean;
  /** The current question's results once the host shows them, otherwise null. */
  results: PlayerResults | null;
  /** Running points per player from the results shown so far (legacy `scores`). */
  scores: Record<string, number>;
  /** Questions whose points are already in `scores`. */
  scoredQuestions: number[];
  finished: boolean;
  /** Total points per player from `final_results`, once the game is over. */
  finalScores: Record<string, number> | null;
  notice: JoinNotice | null;

  joined: (game: PlayerGame, username: string) => void;
  setGameMode: (mode: string | null) => void;
  gameStarted: () => void;
  questionShown: (index: number, question: unknown) => void;
  tick: () => void;
  /** `everyone_answered` or `solutions`: the answer screen closes. */
  timeUp: () => void;
  answerSent: () => void;
  resultsReceived: (data: unknown) => void;
  gameFinished: (data?: unknown) => void;
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
  question: null,
  timeLeft: 0,
  answered: false,
  results: null,
  scores: {},
  scoredQuestions: [],
  finished: false,
  finalScores: null,
  notice: null,
} satisfies Partial<PlayState>;

export const usePlayStore = create<PlayState>((set) => ({
  ...initial,
  joined: (game, username) =>
    set((s) => ({ game, username, notice: null, started: s.started || game.started })),
  setGameMode: (gameMode) => set({ gameMode }),
  gameStarted: () => set({ started: true }),
  questionShown: (questionIndex, data) => {
    const question = parsePlayerQuestion(questionIndex, data);
    set({
      questionIndex,
      question,
      // A player only sees a question once the host showed it, so the game has started even
      // if `start_game` was missed (legacy left such a player on the title screen).
      started: true,
      timeLeft: question?.seconds ?? 0,
      answered: false,
      results: null,
    });
  },
  tick: () => set((s) => (s.timeLeft > 0 ? { timeLeft: s.timeLeft - 1 } : s)),
  timeUp: () => set({ timeLeft: 0 }),
  answerSent: () => set({ answered: true }),
  resultsReceived: (data) =>
    set((s) => {
      if (data === null) return { results: 'none', timeLeft: 0 };
      const answers = parseAnswers(data);
      const index = s.questionIndex ?? -1;
      const counted = s.scoredQuestions.includes(index);
      return {
        results: answers,
        timeLeft: 0,
        scores: counted ? s.scores : addScores(s.scores, answers),
        scoredQuestions: counted ? s.scoredQuestions : [...s.scoredQuestions, index],
      };
    }),
  gameFinished: (data) =>
    set((s) => ({
      finished: true,
      timeLeft: 0,
      // The server's totals, so every phone shows the same ranking as the projector. Legacy
      // ranked by the points this phone had seen, which missed questions after a rejoin.
      finalScores: data === undefined ? s.scores : totalScores(data),
    })),
  setNotice: (notice) => set({ notice }),
  leave: (notice) => set({ ...initial, notice }),
  reset: () => set(initial),
}));
