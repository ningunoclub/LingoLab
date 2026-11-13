// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0

/**
 * What a player learns about the game on `joined_game` / `rejoined_game`
 * (`PlayGame.to_player_data()` in the backend: the game without its questions). Only the
 * fields the player screens use are kept.
 */
export type PlayerGame = {
  title: string;
  description: string;
  coverImage: string | null;
  backgroundColor: string | null;
  started: boolean;
  questionCount: number;
};

function str(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/** Narrows the socket payload; returns null when it is not a game at all. */
export function parsePlayerGame(data: unknown): PlayerGame | null {
  if (typeof data !== 'object' || data === null) return null;
  const raw = data as Record<string, unknown>;
  if (typeof raw.title !== 'string') return null;
  return {
    title: raw.title,
    description: typeof raw.description === 'string' ? raw.description : '',
    coverImage: str(raw.cover_image),
    backgroundColor: str(raw.background_color),
    started: raw.started === true,
    questionCount: typeof raw.question_count === 'number' ? raw.question_count : 0,
  };
}
