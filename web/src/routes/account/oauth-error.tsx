// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { OAuthErrorCard } from '@/features/auth/OAuthErrorCard';

/**
 * `?error` is set by the backend's GitHub handler (classquiz/oauth/github.py), which
 * redirects here in exactly two cases:
 *
 *   - `/account/oauth-error`              the OAuth exchange itself failed
 *   - `/account/oauth-error?error=email`  GitHub returned no email address
 *
 * Any other value is treated as the generic case, so an unexpected `?error` can never
 * blank the page.
 */
const searchSchema = z.object({
  error: z.string().optional(),
});

function OAuthErrorPage() {
  const { error } = Route.useSearch();
  return (
    <div className="flex items-center justify-center px-4 py-12">
      <OAuthErrorCard reason={error === 'email' ? 'email' : 'generic'} />
    </div>
  );
}

export const Route = createFileRoute('/account/oauth-error')({
  validateSearch: searchSchema,
  component: OAuthErrorPage,
});
