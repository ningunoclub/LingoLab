// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { ErrorState } from '@/components/ErrorState';
import { NotFound } from '@/components/NotFound';
import { routeTree } from './routeTree.gen';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Auth failures and 404s are not worth retrying; they won't fix themselves.
      retry: (failureCount, error) => {
        if (error instanceof Error && /\b(401|403|404)\b/.test(error.message)) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultErrorComponent: ({ error }) => <ErrorState error={error} />,
  defaultNotFoundComponent: () => <NotFound />,
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
