// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import { registerSchema } from './registerSchema';

const VALID = {
  email: 'teacher@school.ch',
  username: 'teacher',
  password1: 'a-good-password',
  password2: 'a-good-password',
  privacy_accept: true,
  tos_accept: true,
} as const;

/** The i18n keys reported for a given input, by field. */
function errorKeys(input: Record<string, unknown>): Record<string, string> {
  const result = registerSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0] ?? ''), issue.message]),
  );
}

describe('registerSchema', () => {
  it('accepts a complete, consistent form', () => {
    expect(registerSchema.safeParse(VALID).success).toBe(true);
  });

  it('rejects a malformed email', () => {
    expect(errorKeys({ ...VALID, email: 'not-an-email' })).toMatchObject({
      email: 'register_page.errors.email_invalid',
    });
  });

  // Legacy bounds: username 3-20, password 8-100. Checked at the boundaries so a later
  // refactor cannot quietly move them.
  it.each([
    ['ab', 'register_page.errors.username_short'],
    ['a'.repeat(21), 'register_page.errors.username_long'],
  ])('rejects username %s', (username, key) => {
    expect(errorKeys({ ...VALID, username })).toMatchObject({ username: key });
  });

  it.each([
    ['abc', 'register_page.errors.username_short'],
    ['a'.repeat(20), 'register_page.errors.username_long'],
  ])('accepts username at the boundary %s', (username) => {
    expect(errorKeys({ ...VALID, username })).not.toHaveProperty('username');
  });

  it.each([
    ['short', 'register_page.errors.password_short'],
    ['a'.repeat(101), 'register_page.errors.password_long'],
  ])('rejects password %s', (password, key) => {
    expect(errorKeys({ ...VALID, password1: password, password2: password })).toMatchObject({
      password1: key,
    });
  });

  it('reports mismatched passwords on the confirmation field', () => {
    expect(errorKeys({ ...VALID, password2: 'something-else' })).toMatchObject({
      password2: 'register_page.errors.passwords_differ',
    });
  });

  // Regression guard for the `when` option in registerSchema: zod skips a refinement once
  // any other field has failed, which would hide the mismatch behind an empty email.
  it('reports mismatched passwords even while other fields are still invalid', () => {
    expect(
      errorKeys({
        ...VALID,
        email: '',
        username: '',
        privacy_accept: false,
        password2: 'something-else',
      }),
    ).toMatchObject({
      email: 'register_page.errors.email_invalid',
      password2: 'register_page.errors.passwords_differ',
    });
  });

  it.each([
    ['privacy_accept', 'register_page.errors.privacy_required'],
    ['tos_accept', 'register_page.errors.tos_required'],
  ])('requires %s to be accepted', (field, key) => {
    expect(errorKeys({ ...VALID, [field]: false })).toMatchObject({ [field]: key });
  });
});
