// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useCallback, useMemo, useState } from 'react';
import type { AuthMethod, LoginSession } from './loginApi';

/**
 * Methods this PR can actually complete. The backend may also offer PASSKEY, TOTP and
 * BACKUP; those components land with the 2FA/passkeys PR (see MIGRATION.md Phase 1).
 */
export const SUPPORTED_METHODS: readonly AuthMethod[] = ['PASSWORD'];

/** Which stage of the two-step flow the user is in. */
export type LoginStep = 0 | 1 | 2;

export type LoginFlowState = {
  step: LoginStep;
  session: LoginSession | null;
  selectedMethod: AuthMethod | null;
  /** Methods offered for the current step, minus the ones this build cannot handle. */
  availableMethods: AuthMethod[];
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
 */
export function useLoginFlow() {
  const [step, setStep] = useState<LoginStep>(0);
  const [session, setSession] = useState<LoginSession | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod | null>(null);

  const offeredMethods = useMemo<AuthMethod[]>(() => {
    if (!session || step === 0) return [];
    return step === 1 ? session.step_1 : session.step_2;
  }, [session, step]);

  const availableMethods = useMemo(
    () => offeredMethods.filter((method) => SUPPORTED_METHODS.includes(method)),
    [offeredMethods],
  );

  /** True when the backend offered only methods this build cannot complete yet. */
  const hasUnsupportedOnly = offeredMethods.length > 0 && availableMethods.length === 0;

  /** Move from the email form into step 1, auto-selecting a lone method. */
  const beginSession = useCallback((next: LoginSession) => {
    setSession(next);
    setStep(1);
    const supported = next.step_1.filter((method) => SUPPORTED_METHODS.includes(method));
    setSelectedMethod(supported.length === 1 ? supported[0] : null);
  }, []);

  /** A factor passed but the backend wants a second one (HTTP 202). */
  const advanceToSecondFactor = useCallback(() => {
    setStep(2);
    setSession((current) => {
      if (current) {
        const supported = current.step_2.filter((method) => SUPPORTED_METHODS.includes(method));
        setSelectedMethod(supported.length === 1 ? supported[0] : null);
      }
      return current;
    });
  }, []);

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
