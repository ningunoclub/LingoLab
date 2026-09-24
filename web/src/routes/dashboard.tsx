// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/auth/auth';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { dashboardQueries } from '@/features/dashboard/dashboardApi';

export const Route = createFileRoute('/dashboard')({
  // Legacy `+page.server.ts`: signed-out visitors go to the login page and come back here.
  beforeLoad: ({ context }) => requireAuth(context.queryClient, '/dashboard'),
  // Legacy `+page.ts` fetches before rendering. Prefetching (rather than awaiting) keeps
  // a failed request inside the page, where it gets an error state and a retry button.
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(dashboardQueries.items);
  },
  component: DashboardPage,
});
