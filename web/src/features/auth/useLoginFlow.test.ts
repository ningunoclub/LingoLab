// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LoginSession } from './loginApi';
import { useLoginFlow } from './useLoginFlow';

function session(overrides: Partial<LoginSession> = {}): LoginSession {
  return { session_id: 's', step_1: [], step_2: [], webauthn_data: null, ...overrides };
}

function renderFlow(webAuthnSupported = true) {
  return renderHook(() => useLoginFlow({ webAuthnSupported }));
}

describe('useLoginFlow', () => {
  it('starts on the email step', () => {
    const { result } = renderFlow();
    expect(result.current.step).toBe(0);
    expect(result.current.selectedMethod).toBeNull();
  });

  it('auto-selects the method when only one is offered, skipping the picker', () => {
    const { result } = renderFlow();
    act(() => result.current.beginSession(session({ step_1: ['TOTP'] })));

    expect(result.current.step).toBe(1);
    expect(result.current.selectedMethod).toBe('TOTP');
  });

  it('shows the picker when several methods are offered', () => {
    const { result } = renderFlow();
    act(() => result.current.beginSession(session({ step_1: ['PASSWORD', 'PASSKEY', 'TOTP'] })));

    expect(result.current.availableMethods).toEqual(['PASSWORD', 'PASSKEY', 'TOTP']);
    expect(result.current.selectedMethod).toBeNull();
  });

  it('drops PASSKEY when the browser has no WebAuthn, then auto-selects what is left', () => {
    const { result } = renderFlow(false);
    act(() => result.current.beginSession(session({ step_1: ['PASSWORD', 'PASSKEY'] })));

    expect(result.current.availableMethods).toEqual(['PASSWORD']);
    expect(result.current.selectedMethod).toBe('PASSWORD');
  });

  it('flags a passkey-only session in a browser without WebAuthn', () => {
    const { result } = renderFlow(false);
    act(() => result.current.beginSession(session({ step_1: ['PASSKEY'] })));

    expect(result.current.availableMethods).toEqual([]);
    expect(result.current.hasUnsupportedOnly).toBe(true);
    expect(result.current.selectedMethod).toBeNull();
  });

  it('moves to step 2 and re-runs auto-selection for the second factor', () => {
    const { result } = renderFlow();
    act(() => result.current.beginSession(session({ step_1: ['PASSWORD'], step_2: ['TOTP'] })));
    act(() => result.current.advanceToSecondFactor());

    expect(result.current.step).toBe(2);
    expect(result.current.selectedMethod).toBe('TOTP');
  });

  it('offers the picker at step 2 when both second factors are enrolled', () => {
    const { result } = renderFlow();
    act(() =>
      result.current.beginSession(session({ step_1: ['PASSWORD'], step_2: ['PASSKEY', 'TOTP'] })),
    );
    act(() => result.current.advanceToSecondFactor());

    expect(result.current.availableMethods).toEqual(['PASSKEY', 'TOTP']);
    expect(result.current.selectedMethod).toBeNull();
  });

  it('clears the session on reset', () => {
    const { result } = renderFlow();
    act(() => result.current.beginSession(session({ step_1: ['PASSWORD'] })));
    act(() => result.current.reset());

    expect(result.current.step).toBe(0);
    expect(result.current.session).toBeNull();
    expect(result.current.selectedMethod).toBeNull();
  });
});
