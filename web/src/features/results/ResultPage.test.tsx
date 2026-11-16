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
import en from '@/locales/en.json';
import { server } from '@/test/msw';
import fixture from '../../../tests/fixtures/game-result.json';
import { ResultPage } from './ResultPage';

function renderPage(body: unknown, status = 200) {
  server.use(
    http.get('http://localhost/api/v1/results/:id', () =>
      status === 200 ? HttpResponse.json(body) : new HttpResponse(null, { status }),
    ),
  );
  const rootRoute = createRootRoute();
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <ResultPage resultId={fixture.id} />,
  });
  const listRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/results',
    component: () => <p>list</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([pageRoute, listRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      {/* biome-ignore lint/suspicious/noExplicitAny: throwaway test router, not the app's tree */}
      <RouterProvider router={router as any} />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe('ResultPage', () => {
  it('starts on the overview sentence, with the values as plain text', async () => {
    const title = '<i>Tricky</i> & verbs';
    renderPage({ ...fixture, title });
    const sentence = await screen.findByText(/played on/);
    expect(sentence).toHaveTextContent(`The quiz "${title}"`);
    expect(sentence).toHaveTextContent('had 3 players with an average score of 733.');
    expect(sentence.querySelector('i')).toBeNull();
    expect(sentence.querySelectorAll('strong')).toHaveLength(4);
  });

  it('lists the players by score, with correct answers and the custom field', async () => {
    const user = renderPage(fixture);
    await user.click(await screen.findByRole('tab', { name: en.words.player_plural }));
    const rows = screen.getAllByRole('row').slice(1);
    expect(
      rows.map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((c) => c.textContent),
      ),
    ).toEqual([
      ['Anna', '2', '1700', '3b'],
      ['Ben', '1', '500', '3a'],
      ['Cleo', '0', '0', ''],
    ]);
  });

  it('opens one question at a time, with readable CHECK answers', async () => {
    const user = renderPage(fixture);
    await user.click(await screen.findByRole('tab', { name: en.words.question_plural }));

    expect(screen.getByText('Average score: 450')).toBeInTheDocument();
    expect(screen.getAllByText('1 correct answer')).toHaveLength(3);

    const checkButton = screen.getByRole('button', { name: /Which are past forms/ });
    await user.click(checkButton);
    expect(checkButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('cell', { name: 'saw, took' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '3.000s' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /go → \?/ }));
    expect(checkButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('cell', { name: 'saw, took' })).toBeNull();
  });

  it('shows a slide without figures and nothing to open', async () => {
    const user = renderPage(fixture);
    await user.click(await screen.findByRole('tab', { name: en.words.question_plural }));
    expect(screen.getByText('Well done!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Well done/ })).toBeNull();
  });

  it('says when a result does not exist', async () => {
    renderPage(null, 404);
    expect(await screen.findByRole('heading', { name: en.results_page.not_found })).toBeVisible();
    expect(screen.getByRole('link', { name: en.results_page.back_to_list })).toBeVisible();
  });
});
