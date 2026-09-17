// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the viewer asked for reduced motion.
 *
 * `index.css` already flattens animation and transition *durations* globally, but that
 * cannot help with motion expressed in JS or with staged *delays*: a control that only
 * appears after 3.5s is still unreachable for 3.5s. Components that gate content on an
 * animation finishing use this to skip the wait entirely.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    // `matchMedia` is missing in some test environments; assume motion is fine there.
    return globalThis.matchMedia?.(QUERY).matches ?? false;
  });

  useEffect(() => {
    const list = globalThis.matchMedia?.(QUERY);
    if (!list) return;
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    list.addEventListener('change', onChange);
    setReduced(list.matches);
    return () => list.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
