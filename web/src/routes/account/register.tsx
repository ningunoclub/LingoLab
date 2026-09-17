// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute, redirect } from '@tanstack/react-router';
import { currentUserQuery } from '@/auth/auth';
import { RegisterCard } from '@/features/auth/RegisterCard';

function RegisterPage() {
  return (
    <div className="flex items-center justify-center px-4 py-12">
      <RegisterCard />
    </div>
  );
}

export const Route = createFileRoute('/account/register')({
  // Legacy `+page.server.ts`: a signed-in visitor is redirected to the dashboard.
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery);
    if (user) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: RegisterPage,
});
