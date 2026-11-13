// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { server } from '@/test/msw';
import { JoinGame } from './JoinGame';
import { usePlayStore } from './playStore';

function renderJoin(initialPin = '') {
  const onJoin = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  render(<JoinGame initialPin={initialPin} onJoin={onJoin} />, { wrapper });
  return { onJoin };
}

function checkAnswers(body: unknown, status = 200) {
  server.use(
    http.get('*/api/v1/quiz/play/check_captcha/:pin', () => HttpResponse.json(body, { status })),
    http.get('*/api/v1/users/me', () => HttpResponse.json({ detail: 'nope' }, { status: 401 })),
  );
}

describe('JoinGame', () => {
  beforeEach(() => usePlayStore.getState().reset());

  it('checks the PIN at six digits, then asks for the name and the extra field', async () => {
    checkAnswers({ enabled: false, game_mode: 'kahoot', custom_field: 'Class' });
    const user = userEvent.setup();
    const { onJoin } = renderJoin();

    // Letters are dropped, like legacy's digit filter.
    await user.type(screen.getByLabelText('Game PIN'), '48a2913');
    const name = await screen.findByLabelText('Username');
    const submit = screen.getByRole('button', { name: 'Submit' });

    await user.type(name, 'Lea');
    expect(submit).toBeDisabled();
    await user.type(name, 'h');
    await user.type(screen.getByLabelText('Class'), '2b');
    await user.click(submit);

    expect(onJoin).toHaveBeenCalledWith({ gamePin: '482913', username: 'Leah', customField: '2b' });
    expect(usePlayStore.getState().gameMode).toBe('kahoot');
  });

  it('takes the PIN from the URL', async () => {
    checkAnswers({ enabled: false, game_mode: 'normal', custom_field: null });
    renderJoin('482913');
    expect(await screen.findByLabelText('Username')).toBeInTheDocument();
    expect(screen.queryByLabelText('Class')).not.toBeInTheDocument();
  });

  it('clears an unknown PIN and says so', async () => {
    checkAnswers({ detail: 'game not found' }, 404);
    const user = userEvent.setup();
    renderJoin();
    await user.type(screen.getByLabelText('Game PIN'), '111111');
    expect(await screen.findByRole('alert')).toHaveTextContent(/can't find a game/);
    expect(screen.getByLabelText('Game PIN')).toHaveValue('');
  });

  it('refuses a captcha game without loading any captcha script', async () => {
    checkAnswers({ enabled: true, game_mode: 'kahoot', custom_field: null });
    const user = userEvent.setup();
    renderJoin('482913');
    expect(await screen.findByRole('alert')).toHaveTextContent(/can't join this game here/);
    expect(document.querySelector('script[src*="captcha"]')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Enter another PIN' }));
    expect(screen.getByLabelText('Game PIN')).toHaveValue('');
  });

  it("pre-fills a signed-in user's name", async () => {
    server.use(
      http.get('*/api/v1/quiz/play/check_captcha/:pin', () =>
        HttpResponse.json({ enabled: false, game_mode: 'kahoot', custom_field: null }),
      ),
      http.get('*/api/v1/users/me', () => HttpResponse.json({ username: 'teacher_mia' })),
    );
    renderJoin('482913');
    expect(await screen.findByDisplayValue('teacher_mia')).toBeInTheDocument();
  });
});
