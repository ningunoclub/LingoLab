// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { z } from 'zod';

/**
 * Registration rules, translated 1:1 from the yup schema in the legacy
 * `account/register/+page.svelte`. Bounds are deliberately unchanged.
 *
 * Messages are i18n *keys*, not sentences: the resolver hands them to `t()` at render
 * time so the errors follow the language switcher like the rest of the UI.
 *
 * `password1`/`password2` keep their legacy names. Only `password1` is ever sent; the
 * backend's `RouteUser` takes a single `password`.
 */
const registerFields = z.object({
  email: z.email({ message: 'register_page.errors.email_invalid' }),
  username: z
    .string()
    .min(3, { message: 'register_page.errors.username_short' })
    .max(20, { message: 'register_page.errors.username_long' }),
  password1: z
    .string()
    .min(8, { message: 'register_page.errors.password_short' })
    .max(100, { message: 'register_page.errors.password_long' }),
  password2: z.string(),
  privacy_accept: z.literal(true, {
    message: 'register_page.errors.privacy_required',
  }),
  tos_accept: z.literal(true, {
    message: 'register_page.errors.tos_required',
  }),
});

/**
 * Mirrors the legacy `test('equal', …)` on password2, and reports on that field.
 *
 * The `when` guard is load-bearing. By default zod skips a refinement once *any* field
 * has failed, so with an empty email the mismatch warning would stay hidden until the
 * rest of the form was already valid - legacy showed it immediately, because each yup
 * field validated on its own. `when` narrows that rule to the two fields this check
 * actually reads, so an unrelated error no longer suppresses it.
 * See https://zod.dev/api#when.
 */
export const registerSchema = registerFields.refine(
  (values) => values.password1 === values.password2,
  {
    message: 'register_page.errors.passwords_differ',
    path: ['password2'],
    when: (payload) =>
      registerFields
        .pick({ password1: true, password2: true })
        .safeParse((payload as { value: unknown }).value).success,
  },
);

export type RegisterFormValues = z.infer<typeof registerSchema>;
