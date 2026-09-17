// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute, redirect } from '@tanstack/react-router';
import { currentUserQuery } from '@/auth/auth';
import { RequestResetCard } from '@/features/auth/RequestResetCard';

/**
 * Despite its name, this is where a user *asks* for a reset mail. The link in that mail
 * points at `/account/password-reset`. Both names are upstream's and are kept: they are
 * already in sent emails. See MIGRATION.md.
 */
function RequestResetPage() {
  return (
    <div className="flex items-center justify-center px-4 py-12">
      <RequestResetCard />
    </div>
  );
}

export const Route = createFileRoute('/account/reset-password')({
  // Legacy `+page.server.ts`: a signed-in visitor is redirected to the dashboard.
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery);
    if (user) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: RequestResetPage,
});
