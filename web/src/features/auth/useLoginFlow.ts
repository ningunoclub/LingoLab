// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { useCallback, useMemo, useState } from 'react';
import type { AuthMethod, LoginSession } from './loginApi';

/** Which stage of the two-step flow the user is in. */
export type LoginStep = 0 | 1 | 2;

/**
 * Methods this browser can complete. Legacy `check_auto` drops PASSKEY when
 * `browserSupportsWebAuthn()` is false; everything else is always usable.
 */
export function usableMethods(offered: AuthMethod[], webAuthnSupported: boolean): AuthMethod[] {
  return offered.filter((method) => method !== 'PASSKEY' || webAuthnSupported);
}

type Options = {
  /** Injected in tests; defaults to feature detection. */
  webAuthnSupported?: boolean;
};

/**
 * Ports the `step` / `selected_method` / `session_data` state machine from the legacy
 * `+page.svelte`, including its `check_auto` auto-selection: when only one method is
 * available for a step, skip the picker and go straight to that challenge.
 *
 * Legacy `check_auto` removed unsupported methods with a `splice` inside an
 * index-based loop, which can skip an element when two unsupported entries are
 * adjacent. This uses a non-mutating filter; for a set of at most four distinct
 * members the observable result is the same.
 *
 * BACKUP never appears in `step_1`/`step_2`: the backend accepts it at step 1 for any
 * session, and the method screens reach it through their "Use backup-code" link.
 */
export function useLoginFlow({ webAuthnSupported = browserSupportsWebAuthn() }: Options = {}) {
  const [step, setStep] = useState<LoginStep>(0);
  const [session, setSession] = useState<LoginSession | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod | null>(null);

  const offeredMethods = useMemo<AuthMethod[]>(() => {
    if (!session || step === 0) return [];
    return step === 1 ? session.step_1 : session.step_2;
  }, [session, step]);

  const availableMethods = useMemo(
    () => usableMethods(offeredMethods, webAuthnSupported),
    [offeredMethods, webAuthnSupported],
  );

  /**
   * True when every offered method needs WebAuthn and this browser has none. Legacy
   * rendered an empty picker here; the card explains it and offers the backup code.
   */
  const hasUnsupportedOnly = offeredMethods.length > 0 && availableMethods.length === 0;

  const autoSelect = useCallback(
    (offered: AuthMethod[]) => {
      const usable = usableMethods(offered, webAuthnSupported);
      setSelectedMethod(usable.length === 1 ? usable[0] : null);
    },
    [webAuthnSupported],
  );

  /** Move from the email form into step 1, auto-selecting a lone method. */
  const beginSession = useCallback(
    (next: LoginSession) => {
      setSession(next);
      setStep(1);
      autoSelect(next.step_1);
    },
    [autoSelect],
  );

  /** A factor passed but the backend wants a second one (HTTP 202). */
  const advanceToSecondFactor = useCallback(() => {
    setStep(2);
    if (session) autoSelect(session.step_2);
  }, [session, autoSelect]);

  /** Back to the email form, discarding the session (legacy had no such affordance). */
  const reset = useCallback(() => {
    setStep(0);
    setSession(null);
    setSelectedMethod(null);
  }, []);

  return {
    step,
    session,
    selectedMethod,
    availableMethods,
    hasUnsupportedOnly,
    selectMethod: setSelectedMethod,
    beginSession,
    advanceToSecondFactor,
    reset,
  };
}
