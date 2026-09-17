// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { z } from 'zod';

/**
 * Legacy `passwordChangeDataValid` as a schema. It gates the submit button on four
 * conditions, all kept here:
 *
 *   newPassword === newPasswordConfirm
 *   newPassword.length >= 8
 *   oldPassword !== newPassword
 *   oldPassword !== ''
 *
 * Legacy shows no message for any of them - the button is simply disabled - so the
 * messages are new, and each one names the condition that is failing.
 */
export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'settings_page.errors.old_password_required'),
    newPassword: z.string().min(8, 'settings_page.errors.new_password_short'),
    newPasswordConfirm: z.string(),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    path: ['newPasswordConfirm'],
    message: 'settings_page.errors.passwords_differ',
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'settings_page.errors.password_unchanged',
  });

export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
