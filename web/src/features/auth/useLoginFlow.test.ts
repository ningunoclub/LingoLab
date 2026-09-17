// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LoginSession } from './loginApi';
import { useLoginFlow } from './useLoginFlow';

function session(overrides: Partial<LoginSession> = {}): LoginSession {
  return { session_id: 's', step_1: [], step_2: [], webauthn_data: null, ...overrides };
}

describe('useLoginFlow', () => {
  it('starts on the email step', () => {
    const { result } = renderHook(() => useLoginFlow());
    expect(result.current.step).toBe(0);
    expect(result.current.selectedMethod).toBeNull();
  });

  it('auto-selects the method when only one is offered, skipping the picker', () => {
    const { result } = renderHook(() => useLoginFlow());
    act(() => result.current.beginSession(session({ step_1: ['PASSWORD'] })));

    expect(result.current.step).toBe(1);
    expect(result.current.selectedMethod).toBe('PASSWORD');
  });

  it('shows the picker when several supported methods are offered', () => {
    const { result } = renderHook(() => useLoginFlow());
    // PASSKEY is not supported in this build, so only PASSWORD survives - but the
    // filtering is what makes this a single-method case, which is the point.
    act(() => result.current.beginSession(session({ step_1: ['PASSWORD', 'PASSKEY'] })));

    expect(result.current.availableMethods).toEqual(['PASSWORD']);
    expect(result.current.selectedMethod).toBe('PASSWORD');
  });

  it('flags a session that offers only methods this build cannot complete', () => {
    const { result } = renderHook(() => useLoginFlow());
    act(() => result.current.beginSession(session({ step_1: ['PASSKEY'] })));

    expect(result.current.availableMethods).toEqual([]);
    expect(result.current.hasUnsupportedOnly).toBe(true);
    expect(result.current.selectedMethod).toBeNull();
  });

  it('moves to step 2 and re-runs auto-selection for the second factor', () => {
    const { result } = renderHook(() => useLoginFlow());
    act(() => result.current.beginSession(session({ step_1: ['PASSWORD'], step_2: ['PASSWORD'] })));
    act(() => result.current.advanceToSecondFactor());

    expect(result.current.step).toBe(2);
    expect(result.current.selectedMethod).toBe('PASSWORD');
  });

  it('clears the session on reset', () => {
    const { result } = renderHook(() => useLoginFlow());
    act(() => result.current.beginSession(session({ step_1: ['PASSWORD'] })));
    act(() => result.current.reset());

    expect(result.current.step).toBe(0);
    expect(result.current.session).toBeNull();
    expect(result.current.selectedMethod).toBeNull();
  });
});
