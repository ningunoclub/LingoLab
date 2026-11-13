// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, type Page, test, type WebSocketRoute } from '@playwright/test';

const PIN = '482913';
const GAME = {
  title: 'Irregular <b>verbs</b>',
  description: 'Past simple',
  started: false,
  background_color: '#fde68a',
  question_count: 3,
};

/**
 * The backend is not running in e2e: a tiny Socket.IO server is played over a routed WebSocket
 * (Engine.IO v4 framing: `0` open, `40` connect, `42[...]` event). Await this before `goto`.
 */
async function fakeSocketServer(page: Page) {
  const received: unknown[][] = [];
  let ws: WebSocketRoute | undefined;
  await page.routeWebSocket(/\/socket\.io\//, (route) => {
    ws = route;
    route.send(
      `0${JSON.stringify({ sid: 'eio', upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1e6 })}`,
    );
    route.onMessage((raw) => {
      const message = String(raw);
      if (message === '40') {
        route.send(`40${JSON.stringify({ sid: 'player-sid' })}`);
        return;
      }
      if (message.startsWith('42')) {
        const [event, ...args] = JSON.parse(message.slice(2)) as [string, ...unknown[]];
        received.push([event, ...args]);
        if (event === 'join_game') {
          route.send(`42${JSON.stringify(['joined_game', GAME])}`);
          route.send(`42${JSON.stringify(['time_sync', 'encrypted-now'])}`);
        }
      }
    });
  });
  const emit = (event: string, data?: unknown) =>
    ws?.send(`42${JSON.stringify(data === undefined ? [event] : [event, data])}`);
  return { received, emit };
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/users/me', (route) => route.fulfill({ status: 401, json: {} }));
  await page.route(`**/api/v1/quiz/play/check_captcha/${PIN}`, (route) =>
    route.fulfill({ json: { enabled: false, game_mode: 'kahoot', custom_field: 'Class' } }),
  );
});

test('a student joins with PIN, name and class, sees the title, and is kicked', async ({
  page,
}) => {
  const server = await fakeSocketServer(page);
  await page.goto('/play');

  await page.getByLabel('Game PIN').fill(PIN);
  await page.getByLabel('Username').fill('Leah');
  await page.getByLabel('Class').fill('2b');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByRole('heading', { name: 'Irregular verbs' })).toBeVisible();
  await expect(page.getByText('Past simple')).toBeVisible();
  expect(server.received).toContainEqual([
    'join_game',
    { game_pin: PIN, username: 'Leah', custom_field: '2b' },
  ]);
  await expect.poll(() => server.received).toContainEqual(['echo_time_sync', 'encrypted-now']);
  const cookie = (await page.context().cookies()).find((c) => c.name === 'joined_game');
  expect(JSON.parse(decodeURIComponent(cookie?.value ?? '{}'))).toMatchObject({
    username: 'Leah',
    game_pin: PIN,
  });

  server.emit('kick');
  await expect(page.getByRole('alert')).toHaveText(/removed you from the game/);
  await expect(page.getByLabel('Game PIN')).toHaveValue('');
});

test('the QR link fills in the PIN', async ({ page }) => {
  await fakeSocketServer(page);
  await page.goto(`/play?pin=${PIN}&ref=Qr`);
  await expect(page.getByLabel('Username')).toBeVisible();
});
