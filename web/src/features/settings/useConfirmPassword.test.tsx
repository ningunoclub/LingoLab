// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import '@/i18n';
import { useConfirmPassword } from './useConfirmPassword';

/**
 * Harness that mirrors how the page uses the hook: click an action, await the dialog,
 * record what it resolved to.
 *
 * The contract under test is the one legacy's `prompt()` had - resolve to the password,
 * or to null when the user backs out - because every call site keeps the legacy
 * `if (!password) return;` guard and would otherwise fire a request with no password.
 */
function Harness() {
  const { confirmPassword, dialog } = useConfirmPassword();
  const [result, setResult] = useState<string>('idle');

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const password = await confirmPassword();
          setResult(password === null ? 'cancelled' : `got:${password}`);
        }}
      >
        run action
      </button>
      <output>{result}</output>
      {dialog}
    </>
  );
}

describe('useConfirmPassword', () => {
  it('resolves with the typed password on submit', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'run action' }));
    await user.type(await screen.findByLabelText(/current password/i), 'hunter2');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(await screen.findByText('got:hunter2')).toBeInTheDocument();
  });

  it('resolves with null when cancelled, so the caller makes no request', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'run action' }));
    await screen.findByLabelText(/current password/i);
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(await screen.findByText('cancelled')).toBeInTheDocument();
  });

  it('resolves with null when dismissed with Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'run action' }));
    await screen.findByLabelText(/current password/i);
    await user.keyboard('{Escape}');

    expect(await screen.findByText('cancelled')).toBeInTheDocument();
  });

  it('cannot be submitted empty', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'run action' }));
    await screen.findByLabelText(/current password/i);

    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
  });

  it('does not keep the previous password when reopened', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'run action' }));
    await user.type(await screen.findByLabelText(/current password/i), 'hunter2');
    await user.click(screen.getByRole('button', { name: /confirm/i }));
    await screen.findByText('got:hunter2');

    await user.click(screen.getByRole('button', { name: 'run action' }));
    expect(await screen.findByLabelText(/current password/i)).toHaveValue('');
  });
});
