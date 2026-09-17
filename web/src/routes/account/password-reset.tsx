// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { SetPasswordCard } from '@/features/auth/SetPasswordCard';

/**
 * The token from the reset mail (`forgotten_password.jinja2` links here with `?token=`).
 *
 * Legacy's `+page.server.ts` read it with `url.searchParams.get('token')`, which yields
 * `null` when absent - kept, so the card can show its missing-token state rather than a
 * form that cannot be submitted.
 */
const searchSchema = z.object({
  token: z.string().optional(),
});

function SetPasswordPage() {
  const { token } = Route.useSearch();
  return (
    <div className="flex items-center justify-center px-4 py-12">
      <SetPasswordCard token={token ?? null} />
    </div>
  );
}

export const Route = createFileRoute('/account/password-reset')({
  validateSearch: searchSchema,
  // No auth guard, matching legacy: this page has none. Following a reset link while still
  // signed in elsewhere is legitimate, and the backend signs every session out on success.
  component: SetPasswordPage,
});
