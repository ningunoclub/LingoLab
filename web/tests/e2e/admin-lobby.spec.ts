// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, type Page, test, type WebSocketRoute } from '@playwright/test';

const PIN = '482913';
const GAME_ID = '11111111-1111-4111-8111-111111111111';
const GAME = JSON.stringify({
  title: 'Irregular verbs',
  questions: [{}],
  background_color: '#fde68a',
});

/**
 * The backend is not running in e2e: a tiny Socket.IO server is played over a routed WebSocket
 * (Engine.IO v4 framing: `0` open, `40` connect, `42[...]` event).
 */
async function fakeSocketServer(page: Page) {
  const received: unknown[][] = [];
  let ws: WebSocketRoute | undefined;
  let resolveReady = () => {};
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  await page.routeWebSocket(/\/socket\.io\//, (route) => {
    ws = route;
    route.send(
      `0${JSON.stringify({ sid: 'eio', upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1e6 })}`,
    );
    route.onMessage((raw) => {
      const message = String(raw);
      if (message === '40') {
        route.send(`40${JSON.stringify({ sid: 'host-sid' })}`);
        return;
      }
      if (message.startsWith('42')) {
        const [event, ...args] = JSON.parse(message.slice(2)) as [string, ...unknown[]];
        received.push([event, ...args]);
        if (event === 'register_as_admin') {
          route.send(
            `42${JSON.stringify(['registered_as_admin', { game_id: GAME_ID, game: GAME }])}`,
          );
          resolveReady();
        }
        if (event === 'start_game') route.send(`42${JSON.stringify(['start_game'])}`);
      }
    });
  });
  const emit = (event: string, data?: unknown) =>
    ws?.send(`42${JSON.stringify(data === undefined ? [event] : [event, data])}`);
  return { received, ready, emit };
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/users/check', (route) =>
    route.fulfill({ json: { email: 'teacher@school.ch' } }),
  );
  // The QR code is drawn by the backend; any SVG will do here.
  await page.route('**/api/v1/utils/qr/*', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
    }),
  );
});

test('hosts the lobby: players join, one is kicked, the game starts', async ({ page }) => {
  const server = await fakeSocketServer(page);
  await page.goto(`/admin?token=${GAME_ID}&pin=${PIN}&connect=1`);
  await server.ready;
  expect(server.received[0]).toEqual(['register_as_admin', { game_pin: PIN, game_id: GAME_ID }]);

  await expect(page.getByTestId('game-pin')).toHaveText(PIN);
  await expect(page.getByText('0 player are waiting')).toBeVisible();
  const start = page.getByRole('button', { name: 'Start game' });
  await expect(start).toBeDisabled();

  server.emit('player_joined', { username: 'Mia', sid: 'a' });
  server.emit('player_joined', { username: 'Leo', sid: 'b' });
  await expect(page.getByText('2 players are waiting')).toBeVisible();

  await page.getByRole('button', { name: 'Remove Leo from the game' }).click();
  await expect(page.getByText('1 player are waiting')).toBeVisible();
  await expect.poll(() => server.received).toContainEqual(['kick_player', { username: 'Leo' }]);

  await page.getByRole('button', { name: 'Show the QR code full screen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');

  await start.click();
  await expect.poll(() => server.received.map(([e]) => e)).toContain('start_game');
  await expect(page.getByTestId('game-pin')).toBeHidden();
});

test('reports a game that already has a host', async ({ page }) => {
  await page.routeWebSocket(/\/socket\.io\//, (route) => {
    route.send(
      `0${JSON.stringify({ sid: 'eio', upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1e6 })}`,
    );
    route.onMessage((raw) => {
      const message = String(raw);
      if (message === '40') route.send(`40${JSON.stringify({ sid: 'x' })}`);
      if (message.includes('register_as_admin')) route.send('42["already_registered_as_admin"]');
    });
  });
  await page.goto(`/admin?token=${GAME_ID}&pin=${PIN}&connect=1`);
  await expect(page.getByRole('alert')).toContainText('There is already an admin registered');
});

test('without a game in the URL it points back to the dashboard', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'No game to host' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
});
