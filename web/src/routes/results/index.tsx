// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/auth/auth';
import { ResultsListPage } from '@/features/results/ResultsListPage';
import { resultsQueries } from '@/features/results/resultsApi';

export const Route = createFileRoute('/results/')({
  // Legacy had no guard and showed "no results" to signed-out visitors; see Legacy quirks.
  beforeLoad: ({ context }) => requireAuth(context.queryClient, '/results'),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(resultsQueries.list);
  },
  component: ResultsListPage,
});
