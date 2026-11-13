// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// The two cookies legacy `routes/play/+page.svelte` and `lib/play/join.svelte` set with
// js-cookie, written with `document.cookie` instead (no dependency needed for two cookies).
// Neither holds a credential of the account: `joined_game` only lets this browser take its
// own seat back after a reload or a dropped connection.

/** What `rejoin_game` needs to reclaim the seat. */
export type JoinedGame = { sid: string; username: string; game_pin: string };

const JOINED = 'joined_game';
const KICKED = 'kicked';
/** The backend forgets a player's seat after two hours (`ex=7200`). */
const JOINED_MAX_AGE = 2 * 60 * 60;
/** Legacy: `Cookies.set('kicked', …, { expires: 1 })`, one day. */
const KICKED_MAX_AGE = 24 * 60 * 60;

function readCookie(name: string): string | null {
  for (const part of document.cookie.split('; ')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

function writeCookie(name: string, value: string, maxAge: number): void {
  // biome-ignore lint/suspicious/noDocumentCookie: two plain cookies; the Cookie Store API is not in Safari yet.
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; samesite=lax`;
}

export function readJoinedGame(): JoinedGame | null {
  const raw = readCookie(JOINED);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof data.sid === 'string' &&
      typeof data.username === 'string' &&
      typeof data.game_pin === 'string'
    ) {
      return { sid: data.sid, username: data.username, game_pin: data.game_pin };
    }
  } catch {
    // A damaged cookie is treated as absent.
  }
  return null;
}

export function saveJoinedGame(game: JoinedGame): void {
  writeCookie(JOINED, JSON.stringify(game), JOINED_MAX_AGE);
}

export function clearJoinedGame(): void {
  writeCookie(JOINED, '', 0);
}

export function isKicked(): boolean {
  return readCookie(KICKED) !== null;
}

export function markKicked(): void {
  writeCookie(KICKED, 'value', KICKED_MAX_AGE);
}
