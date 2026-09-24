// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { fetchClient } from '@/api/client';

/**
 * The two game modes, by their backend names. Legacy labels them the other way round:
 * `kahoot` is shown as "Normal" (answers only on the host screen), `normal` as
 * "Old-School" (questions on every player's screen).
 */
export type GameMode = 'kahoot' | 'normal';

export type StartGameOptions = {
  gameMode: GameMode;
  customField: string;
  randomizeAnswers: boolean;
};

export type StartedGame = { gameId: string; gamePin: string };

/** Raised on 401, so the caller can send the teacher to the login page. */
export class NotSignedInError extends Error {
  constructor() {
    super('not signed in');
    this.name = 'NotSignedInError';
  }
}

/**
 * Starts a live game from a quiz.
 *
 * `captcha_enabled` is always sent as false: the player captcha loads Google reCAPTCHA in
 * every player's browser, which the privacy rules forbid, and the backend defaults the
 * flag to *true* when it is omitted. The ClassQuizControllers option (`cqcs_enabled`) is
 * not offered; its backend default is false.
 *
 * Unlike legacy, `custom_field` travels as an encoded query parameter, so a label such as
 * "Name & class" arrives intact.
 */
export async function startGame(quizId: string, options: StartGameOptions): Promise<StartedGame> {
  const { data, response } = await fetchClient.POST('/api/v1/quiz/start/{quiz_id}', {
    params: {
      path: { quiz_id: quizId },
      query: {
        game_mode: options.gameMode,
        captcha_enabled: false,
        custom_field: options.customField,
        randomize_answers: options.randomizeAnswers,
      },
    },
  });
  if (response.status === 401) throw new NotSignedInError();
  if (!response.ok || !data) {
    throw new Error(`Starting the game failed with status ${response.status}`);
  }
  const raw = data as Record<string, unknown>;
  const gameId = typeof raw.game_id === 'string' ? raw.game_id : '';
  const gamePin = typeof raw.game_pin === 'string' ? raw.game_pin : String(raw.game_pin ?? '');
  if (!gameId || !gamePin) throw new Error('Starting the game returned no game id or pin');
  return { gameId, gamePin };
}

/** Legacy remembers the custom-field label between games under this key. */
export const CUSTOM_FIELD_STORAGE_KEY = 'custom_field';

export function loadCustomField(): string {
  try {
    return localStorage.getItem(CUSTOM_FIELD_STORAGE_KEY) ?? '';
  } catch {
    // localStorage can throw in private mode; start empty like a first visit.
    return '';
  }
}

export function saveCustomField(value: string): void {
  try {
    localStorage.setItem(CUSTOM_FIELD_STORAGE_KEY, value);
  } catch {
    // Not remembering the label is harmless.
  }
}
