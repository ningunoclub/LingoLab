// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/auth/auth';
import { ResultPage } from '@/features/results/ResultPage';
import { resultsQueries } from '@/features/results/resultsApi';

export const Route = createFileRoute('/results/$resultId')({
  beforeLoad: ({ context, params }) =>
    requireAuth(context.queryClient, `/results/${params.resultId}`),
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(resultsQueries.one(params.resultId));
  },
  component: function ResultRoute() {
    const { resultId } = Route.useParams();
    return <ResultPage resultId={resultId} />;
  },
});
