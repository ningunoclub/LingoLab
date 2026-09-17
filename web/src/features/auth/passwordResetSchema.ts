// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { z } from 'zod';

/**
 * The email that receives the reset link.
 *
 * Legacy only disabled the button on `email === ''` and left the rest to the `type="email"`
 * input. We validate the address properly instead: the request is silent by design, so a
 * typo would otherwise look exactly like a mail that never arrives.
 */
export const requestResetSchema = z.object({
  email: z.email({ message: 'register_page.errors.email_invalid' }),
});

export type RequestResetFormValues = z.infer<typeof requestResetSchema>;

/**
 * The new password, translated from the legacy `$derived`:
 *
 *   password1 === password2 && password1.length >= 8
 *
 * Same bounds, reported per field instead of silently disabling the button. Note there is
 * deliberately **no** upper bound: legacy had none here, and register's 100-character cap
 * already limits what can be chosen in the first place.
 */
const resetFields = z.object({
  password1: z.string().min(8, { message: 'register_page.errors.password_short' }),
  password2: z.string(),
});

/**
 * "Passwords must match", reported on the confirmation field.
 *
 * The `when` guard is load-bearing for the same reason as in `registerSchema`: zod skips a
 * refinement once any other field has failed, which would hide the mismatch until the rest
 * of the form was already valid. Legacy's single `$derived` showed both problems at once,
 * so the guard restores that.
 *
 * Unlike `registerSchema`, it checks only that both values are *strings* rather than
 * reusing `resetFields`. This form has just two fields and the `min(8)` rule lives on one
 * of them, so guarding on "the picked fields are valid" would make a too-short password
 * suppress the mismatch warning - the very thing the guard exists to prevent. A unit test
 * pins this. See https://zod.dev/api#when.
 */
const bothArePresent = z.object({ password1: z.string(), password2: z.string() });

export const resetPasswordSchema = resetFields.refine(
  (values) => values.password1 === values.password2,
  {
    message: 'register_page.errors.passwords_differ',
    path: ['password2'],
    when: (payload) => bothArePresent.safeParse((payload as { value: unknown }).value).success,
  },
);

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
