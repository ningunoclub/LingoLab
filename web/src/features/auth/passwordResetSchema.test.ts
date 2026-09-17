// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import { requestResetSchema, resetPasswordSchema } from './passwordResetSchema';

/** The i18n keys reported for a given input, by field. */
function errorKeys(
  schema: typeof resetPasswordSchema | typeof requestResetSchema,
  input: Record<string, unknown>,
): Record<string, string> {
  const result = schema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0] ?? ''), issue.message]),
  );
}

describe('requestResetSchema', () => {
  it('accepts a valid address', () => {
    expect(requestResetSchema.safeParse({ email: 'teacher@school.ch' }).success).toBe(true);
  });

  it.each(['', 'not-an-email'])('rejects %o', (email) => {
    expect(errorKeys(requestResetSchema, { email })).toMatchObject({
      email: 'register_page.errors.email_invalid',
    });
  });
});

describe('resetPasswordSchema', () => {
  const VALID = { password1: 'a-good-password', password2: 'a-good-password' } as const;

  it('accepts a matching pair', () => {
    expect(resetPasswordSchema.safeParse(VALID).success).toBe(true);
  });

  it('rejects a password under the legacy 8-character floor', () => {
    expect(
      errorKeys(resetPasswordSchema, { password1: 'short12', password2: 'short12' }),
    ).toMatchObject({ password1: 'register_page.errors.password_short' });
  });

  it('accepts exactly 8 characters', () => {
    expect(
      resetPasswordSchema.safeParse({ password1: '12345678', password2: '12345678' }).success,
    ).toBe(true);
  });

  // Legacy had no upper bound on this form, unlike register. Pinned so the asymmetry is a
  // decision rather than an oversight - see the schema's comment.
  it('has no upper bound, matching legacy', () => {
    const long = 'a'.repeat(200);
    expect(resetPasswordSchema.safeParse({ password1: long, password2: long }).success).toBe(true);
  });

  it('reports a mismatch on the confirmation field', () => {
    expect(errorKeys(resetPasswordSchema, { ...VALID, password2: 'something-else' })).toMatchObject(
      {
        password2: 'register_page.errors.passwords_differ',
      },
    );
  });

  // Regression guard for the `when` option: without it, zod would skip the mismatch check
  // while the first password is still too short, so the user would fix the length only to
  // be told about the mismatch afterwards.
  it('reports a mismatch even while the first password is still too short', () => {
    expect(
      errorKeys(resetPasswordSchema, { password1: 'short', password2: 'other' }),
    ).toMatchObject({
      password1: 'register_page.errors.password_short',
      password2: 'register_page.errors.passwords_differ',
    });
  });
});
