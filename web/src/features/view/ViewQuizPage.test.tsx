// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import '@/i18n';
import { TooltipProvider } from '@/components/ui/tooltip';
import { server } from '@/test/msw';
import fixture from '../../../tests/fixtures/public-quiz.json';
import { ViewQuizPage } from './ViewQuizPage';

// Radix measures tooltips and radio items; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// The slide needs pikaso and a canvas; it is covered by SlideRenderer's own tests.
const WITHOUT_SLIDE = {
  ...fixture,
  questions: fixture.questions.filter((q) => q.type !== 'SLIDE'),
};

function renderPage({
  body = WITHOUT_SLIDE as unknown,
  status = 200,
  signedIn = false,
  autoExpand = false,
  modView = false,
} = {}) {
  let views = 0;
  server.use(
    http.get('http://localhost/api/v1/quiz/get/public/:id', () => {
      views += 1;
      return status === 200 ? HttpResponse.json(body) : new HttpResponse(null, { status });
    }),
    http.get('http://localhost/api/v1/users/check', () =>
      signedIn
        ? HttpResponse.json({ email: 'teacher@school.ch' })
        : new HttpResponse(null, { status: 401 }),
    ),
    http.post('http://localhost/api/v1/community/rate/:id', () => HttpResponse.json({})),
  );
  const rootRoute = createRootRoute();
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <ViewQuizPage
        quizId={fixture.id}
        autoExpand={autoExpand}
        modView={modView}
        autoReturn={false}
      />
    ),
  });
  const stubs = ['/user/$userId', '/practice', '/account/login'].map((path) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: () => <p>{path}</p> }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren([pageRoute, ...stubs]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* biome-ignore lint/suspicious/noExplicitAny: throwaway test router, not the app's tree */}
        <RouterProvider router={router as any} />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), views: () => views };
}

describe('ViewQuizPage', () => {
  it('shows the quiz with its author, stats and collapsed questions', async () => {
    const { views } = renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Irregular verbs' })).toBeVisible();
    expect(screen.getByRole('link', { name: '@devteacher' })).toHaveAttribute(
      'href',
      `/user/${fixture.user_id.id}`,
    );
    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute(
      'href',
      `/practice?quiz_id=${fixture.id}`,
    );
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('59')).toBeInTheDocument();
    // Collapsed: the answers are not shown yet.
    expect(screen.queryByText('went')).toBeNull();
    // The request counts as a view, so it is made only once.
    expect(views()).toBe(1);
  });

  it('disables start, download and rating when signed out', async () => {
    renderPage();
    const start = await screen.findByRole('button', { name: 'Start Game' });
    expect(start).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Download' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    for (const thumb of screen.getAllByRole('button', { name: /logged in to rate/ })) {
      expect(thumb).toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('opens the start-game dialog and rates when signed in', async () => {
    const { user } = renderPage({ signedIn: true });
    await user.click(await screen.findByRole('button', { name: 'Like this quiz!' }));
    expect(await screen.findByText('13')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Like this quiz!' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Start Game' }));
    expect(await screen.findByRole('dialog')).toBeVisible();
  });

  it('expands a question on click and marks the right answers', async () => {
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: /go → past/ }));
    const right = screen.getByText('went').parentElement;
    const wrong = screen.getByText('goed').parentElement;
    expect(right && within(right).getByText('Correct')).toBeInTheDocument();
    expect(wrong && within(wrong).queryByText('Correct')).toBeNull();
    expect(screen.getByText('Time: 20 seconds')).toBeInTheDocument();
  });

  it('opens every question with autoExpand and renders each type', async () => {
    renderPage({ autoExpand: true });
    expect(await screen.findByText('went')).toBeVisible();
    expect(screen.getByText(/All numbers between 20 and 40 are correct/)).toBeVisible();
    expect(screen.getByText('had breakfast')).toBeVisible();
    expect(screen.getByText('Present perfect')).toBeVisible();
    expect(screen.getByText('wrote')).toBeVisible();
  });

  it('shows the moderation panel only with ?mod', async () => {
    renderPage({ modView: true });
    expect(await screen.findByRole('radio', { name: 'Fact checked' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('shows not found for a missing quiz', async () => {
    renderPage({ status: 404 });
    expect(await screen.findByRole('heading', { name: 'Quiz not found' })).toBeVisible();
  });

  it('offers a retry when loading fails', async () => {
    renderPage({ status: 500 });
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't be loaded");
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
