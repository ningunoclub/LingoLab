// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Live host state, ported from the `GameState` class in legacy `routes/admin/+page.svelte`
// and `lib/play/admin/game_state.ts` (lobby and question loop), and the socket handlers of
// `lib/admin.svelte`.
import { create } from 'zustand';
import type { AnswerData, PlayerIdentity } from '@/realtime/events';
import { type GameQuiz, parseGameQuiz, questionSeconds } from './gameQuiz';
import { addScores, type LoopState, parseAnswers, totalScores } from './hostLoop';

export type HostStatus = 'connecting' | 'lobby' | 'started' | 'error';
export type HostError = 'already_registered' | 'invalid_game';

type HostState = {
  status: HostStatus;
  error: HostError | null;
  quiz: GameQuiz | null;
  players: PlayerIdentity[];
  controlVisible: boolean;

  // --- question loop ---
  /** -1 before the first question. */
  questionIndex: number;
  /** Seconds left; 0 when the time is over, null before the first question. */
  timeLeft: number | null;
  answerCount: number;
  /** This question's answers once asked for, otherwise null. */
  questionResults: AnswerData[] | null;
  /** Running points per player, from the results shown so far. */
  scores: Record<string, number>;
  /** `scores` before the current question's points were added: the results screen counts up from it. */
  scoresBefore: Record<string, number>;
  /** Questions whose points are already in `scores`, so asking twice does not count twice. */
  scoredQuestions: number[];
  /** Total points per player once the game is over, otherwise null. */
  finalScores: Record<string, number> | null;
  exportToken: string | null;
  resultsSaved: boolean;

  reset: () => void;
  registered: (game: string | null) => void;
  failed: (error: HostError) => void;
  playerJoined: (player: PlayerIdentity) => void;
  playerKicked: (username: string) => void;
  gameStarted: () => void;
  setControlVisible: (visible: boolean) => void;
  questionShown: (index: number) => void;
  tick: () => void;
  timeUp: () => void;
  answerReceived: () => void;
  questionResultsReceived: (data: unknown) => void;
  finalResultsReceived: (data: unknown) => void;
  exportTokenReceived: (token: string) => void;
  resultsSavedReceived: () => void;
};

const initialState = {
  status: 'connecting' as HostStatus,
  error: null,
  quiz: null,
  players: [],
  controlVisible: true,
  questionIndex: -1,
  timeLeft: null,
  answerCount: 0,
  questionResults: null,
  scores: {},
  scoresBefore: {},
  scoredQuestions: [],
  finalScores: null,
  exportToken: null,
  resultsSaved: false,
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

  // Legacy counted `selected_question + 1` here instead of reading the index the server sent;
  // the two only differ if an event is missed, and the server's index is the truth.
  questionShown: (index) =>
    set((state) => {
      const question = state.quiz?.questions[index];
      if (!question) return state;
      return {
        questionIndex: index,
        timeLeft: questionSeconds(question),
        answerCount: 0,
        questionResults: null,
      };
    }),

  tick: () =>
    set((state) =>
      state.timeLeft !== null && state.timeLeft > 0 ? { timeLeft: state.timeLeft - 1 } : state,
    ),

  // `solutions`, `everyone_answered`, or the host stopping the time.
  timeUp: () => set((state) => (state.timeLeft === null ? state : { timeLeft: 0 })),

  answerReceived: () => set((state) => ({ answerCount: state.answerCount + 1 })),

  questionResultsReceived: (data) =>
    set((state) => {
      const answers = parseAnswers(data);
      const index = state.questionIndex;
      const counted = state.scoredQuestions.includes(index);
      return {
        questionResults: answers,
        timeLeft: 0,
        scoresBefore: counted ? state.scoresBefore : state.scores,
        scores: counted ? state.scores : addScores(state.scores, answers),
        scoredQuestions: counted ? state.scoredQuestions : [...state.scoredQuestions, index],
      };
    }),

  finalResultsReceived: (data) => set({ finalScores: totalScores(data), timeLeft: 0 }),

  exportTokenReceived: (token) => set({ exportToken: token }),

  resultsSavedReceived: () => set({ resultsSaved: true }),
}));

/** The part of the state that decides the next action (see `nextHostAction`). */
export function loopState(state: HostState): LoopState {
  return {
    questionIndex: state.questionIndex,
    timeLeft: state.timeLeft,
    questionResults: state.questionResults,
    finished: state.finalScores !== null,
  };
}

/** Legacy `is_game_ready_to_start`. */
export function canStartGame(state: Pick<HostState, 'status' | 'players'>): boolean {
  return state.status === 'lobby' && state.players.length > 0;
}
