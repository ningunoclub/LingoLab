// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from './events';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * One socket for the whole app. The backend runs a single worker with game state in
 * Redis, so there is never a reason to open more than one connection per tab.
 *
 * Same-origin path: Vite proxies /socket.io to :8000 in dev, and in production the
 * SPA is served from the same origin as the API.
 */
let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      // Connect explicitly, so a route that never plays a game opens no socket.
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): GameSocket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect();
}

/** Drops the instance entirely. Used by tests to isolate cases. */
export function resetSocket(): void {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}
