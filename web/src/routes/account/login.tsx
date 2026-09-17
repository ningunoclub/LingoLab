// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { currentUserQuery } from '@/auth/auth';
import { LoginCard } from '@/features/auth/LoginCard';

/**
 * `verified` is presence-only in the legacy app: `searchParams.get('verified') !== null`,
 * so `?verified` and even `?verified=false` both show the badge. Kept as-is.
 */
const searchSchema = z.object({
  returnTo: z.string().optional(),
  verified: z.union([z.string(), z.boolean()]).optional(),
});

/** Only same-origin paths, so `?returnTo=https://evil.example` cannot redirect off-site. */
function safeReturnTo(value: string | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

function LoginPage() {
  const { returnTo, verified } = Route.useSearch();
  return (
    <div className="flex items-center justify-center px-4 py-12">
      <LoginCard returnTo={safeReturnTo(returnTo)} verified={verified !== undefined} />
    </div>
  );
}

export const Route = createFileRoute('/account/login')({
  validateSearch: searchSchema,
  // Legacy `+page.server.ts`: an already-signed-in visitor never sees this page.
  beforeLoad: async ({ context, search }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery);
    if (user) {
      throw redirect({ to: safeReturnTo(search.returnTo) });
    }
  },
  component: LoginPage,
});
