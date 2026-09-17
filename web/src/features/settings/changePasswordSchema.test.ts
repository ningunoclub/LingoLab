// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import { changePasswordSchema } from './changePasswordSchema';

const VALID = {
  oldPassword: 'current-password',
  newPassword: 'a-new-password',
  newPasswordConfirm: 'a-new-password',
} as const;

function errorKeys(input: Record<string, unknown>): Record<string, string> {
  const result = changePasswordSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [String(i.path[0] ?? ''), i.message]));
}

/**
 * These four conditions are legacy's `passwordChangeDataValid`, which only ever disabled
 * the submit button. They are pinned here so the rules cannot drift, now that each one
 * also produces a message.
 */
describe('changePasswordSchema', () => {
  it('accepts a valid change', () => {
    expect(changePasswordSchema.safeParse(VALID).success).toBe(true);
  });

  it('requires the current password', () => {
    expect(errorKeys({ ...VALID, oldPassword: '' })).toMatchObject({
      oldPassword: 'settings_page.errors.old_password_required',
    });
  });

  it('requires at least 8 characters, matching the backend', () => {
    expect(
      errorKeys({ ...VALID, newPassword: 'short', newPasswordConfirm: 'short' }),
    ).toMatchObject({ newPassword: 'settings_page.errors.new_password_short' });
  });

  it('accepts exactly 8 characters', () => {
    const eight = '12345678';
    expect(
      changePasswordSchema.safeParse({
        ...VALID,
        newPassword: eight,
        newPasswordConfirm: eight,
      }).success,
    ).toBe(true);
  });

  it('rejects a mismatched confirmation', () => {
    expect(errorKeys({ ...VALID, newPasswordConfirm: 'something-else' })).toMatchObject({
      newPasswordConfirm: 'settings_page.errors.passwords_differ',
    });
  });

  it('rejects reusing the current password', () => {
    expect(
      errorKeys({
        oldPassword: 'same-password',
        newPassword: 'same-password',
        newPasswordConfirm: 'same-password',
      }),
    ).toMatchObject({ newPassword: 'settings_page.errors.password_unchanged' });
  });
});
