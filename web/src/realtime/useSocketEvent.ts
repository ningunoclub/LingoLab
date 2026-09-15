// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useEffect } from 'react';
import type { ServerToClientEvents } from './events';
import { getSocket } from './socket';

/** Subscribes to one typed server event for the lifetime of the component. */
export function useSocketEvent<E extends keyof ServerToClientEvents>(
  event: E,
  handler: ServerToClientEvents[E],
): void {
  useEffect(() => {
    const socket = getSocket();
    // socket.io's generic listener signature can't see through the generic E here;
    // the public signature above is what keeps call sites type-safe.
    socket.on(event, handler as never);
    return () => {
      socket.off(event, handler as never);
    };
  }, [event, handler]);
}
