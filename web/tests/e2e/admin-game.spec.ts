// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, type Page, test } from '@playwright/test';

const PIN = '482913';
const GAME_ID = '11111111-1111-4111-8111-111111111111';
const GAME = JSON.stringify({
  title: 'Irregular verbs',
  description: 'Past simple',
  questions: [
    {
      question: 'Past of <b>go</b>?',
      time: '30',
      type: 'ABCD',
      answers: [
        { answer: 'went', right: true, color: null },
        { answer: 'goed', right: false, color: null },
      ],
    },
    {
      question: 'Pick a verb',
      time: '20',
      type: 'ABCD',
      answers: [{ answer: 'see', right: true }],
      hide_results: true,
    },
  ],
});

const answers = [
  { username: 'Mia', answer: 'went', right: true, time_taken: 2000, score: 930 },
  { username: 'Leo', answer: 'goed', right: false, time_taken: 4000, score: 0 },
];

/**
 * A fake Socket.IO server over a routed WebSocket (Engine.IO v4 framing, see admin-lobby.spec.ts)
 * that answers the host's emits the way the backend does.
 */
async function fakeSocketServer(page: Page) {
  const received: unknown[][] = [];
  await page.routeWebSocket(/\/socket\.io\//, (route) => {
    const send = (...event: unknown[]) => route.send(`42${JSON.stringify(event)}`);
    route.send(
      `0${JSON.stringify({ sid: 'eio', upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1e6 })}`,
    );
    route.onMessage((raw) => {
      const message = String(raw);
      if (message === '40') {
        route.send(`40${JSON.stringify({ sid: 'host-sid' })}`);
        return;
      }
      if (!message.startsWith('42')) return;
      const [event, ...args] = JSON.parse(message.slice(2)) as [string, ...unknown[]];
      received.push([event, ...args]);
      switch (event) {
        case 'register_as_admin':
          send('registered_as_admin', { game_id: GAME_ID, game: GAME });
          send('player_joined', { username: 'Mia', sid: 'a' });
          send('player_joined', { username: 'Leo', sid: 'b' });
          break;
        case 'start_game':
          send('start_game');
          break;
        case 'set_question_number':
          send('set_question_number', { question_index: Number(args[0]), question: {} });
          break;
        case 'show_solutions':
          send('solutions', {});
          break;
        case 'get_question_results':
          send(
            'question_results',
            (args[0] as { question_number: number }).question_number === 0 ? answers : [],
          );
          break;
        case 'get_final_results':
          send('final_results', { '0': answers });
          break;
        case 'get_export_token':
          send('export_token', 'tok123');
          break;
        case 'save_quiz':
          send('results_saved_successfully');
          break;
      }
    });
  });
  return { received, events: () => received.map(([e]) => e) };
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/users/check', (route) =>
    route.fulfill({ json: { email: 'teacher@school.ch' } }),
  );
  await page.route('**/api/v1/utils/qr/*', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
    }),
  );
});

test('runs a game from the first question to the final ranking', async ({ page }) => {
  const server = await fakeSocketServer(page);
  await page.goto(`/admin?token=${GAME_ID}&pin=${PIN}&connect=1`);

  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('heading', { name: 'Irregular verbs' })).toBeVisible();
  await expect(page.getByText('0 / 2')).toBeVisible();

  // Enter does what the control button says.
  await page.locator('body').press('Enter');
  await expect.poll(server.events).toContain('set_question_number');
  await expect(page.getByRole('heading', { name: 'Past of go?' })).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByText('went')).toBeVisible();

  await page.getByRole('button', { name: /Stop time and show solutions/ }).click();
  await expect.poll(server.events).toContain('show_solutions');
  await expect(page.getByText('Correct answer')).toBeAttached();

  await page.getByRole('button', { name: /Show results/ }).click();
  const scoreboard = page.getByRole('table', { name: 'Scoreboard' });
  await expect(scoreboard).toBeVisible();
  await expect(scoreboard.getByRole('row').nth(1)).toContainText('Mia');
  await expect(scoreboard).toContainText('+930');
  await expect(scoreboard.getByRole('row').nth(1)).toContainText('930');

  // The second question hides its results: the button fetches them and moves straight on.
  await page.getByRole('button', { name: /Next Question \(2\)/ }).click();
  await expect(page.getByRole('heading', { name: 'Pick a verb' })).toBeVisible();
  await page.getByRole('button', { name: /Stop time and show solutions/ }).click();
  await page.getByRole('button', { name: /Get final results/ }).click();
  await expect.poll(server.events).toContain('get_final_results');
  expect(server.received).toContainEqual([
    'get_question_results',
    { game_id: GAME_ID, question_number: 1 },
  ]);

  await expect(page.getByText('1: Mia with 930 points')).toBeVisible();
  await expect(page.getByText('2: Leo with 0 points')).toBeVisible();

  await page.getByRole('button', { name: 'Request result download' }).click();
  await expect(page.getByRole('link', { name: 'Download results' })).toHaveAttribute(
    'href',
    new RegExp(`/api/v1/quiz/export_data/tok123\\?ts=\\d+&game_pin=${PIN}`),
  );

  await page.getByRole('button', { name: 'Save results' }).click();
  await expect(page.getByRole('button', { name: 'Results saved' })).toBeDisabled();
});
