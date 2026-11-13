// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// `set_game_pin()` of legacy `lib/play/join.svelte`.
import { fetchClient } from '@/api/client';

export type GameCheck =
  | { status: 'ok'; captcha: boolean; gameMode: string | null; customField: string | null }
  | { status: 'not_found' }
  | { status: 'error' };

/** Asks whether a PIN belongs to a running game, and what the join form must ask for. */
export async function checkGame(gamePin: string): Promise<GameCheck> {
  try {
    const { data, response } = await fetchClient.GET('/api/v1/quiz/play/check_captcha/{game_pin}', {
      params: { path: { game_pin: gamePin } },
    });
    if (response.status === 404) return { status: 'not_found' };
    if (!response.ok || !data) return { status: 'error' };
    return {
      status: 'ok',
      captcha: data.enabled,
      gameMode: data.game_mode ?? null,
      // The backend stores an empty label as null, but be safe about "".
      customField: data.custom_field ? data.custom_field : null,
    };
  } catch {
    return { status: 'error' };
  }
}
