// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, type Page, test, type WebSocketRoute } from '@playwright/test';

const PIN = '482913';
const GAME = {
  title: 'Irregular verbs',
  description: 'Past simple',
  started: false,
  background_color: null,
  question_count: 2,
};

/**
 * A fake Socket.IO server over a routed WebSocket (Engine.IO v4: `0` open, `40` connect,
 * `42[...]` event), as in `play-join.spec.ts`. Await this before `goto`.
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
        if (event === 'join_game') route.send(`42${JSON.stringify(['joined_game', GAME])}`);
      }
    });
  });
  const emit = (event: string, data?: unknown) =>
    ws?.send(`42${JSON.stringify(data === undefined ? [event] : [event, data])}`);
  return { received, emit };
}

const result = (username: string, answer: string, score: number) => ({
  username,
  answer,
  right: score > 0,
  time_taken: 2000,
  score,
});

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/users/me', (route) => route.fulfill({ status: 401, json: {} }));
  await page.route(`**/api/v1/quiz/play/check_captcha/${PIN}`, (route) =>
    route.fulfill({ json: { enabled: false, game_mode: 'normal', custom_field: null } }),
  );
});

test('a student answers two questions, sees their points and the final ranking', async ({
  page,
}) => {
  const server = await fakeSocketServer(page);
  await page.goto('/play');
  await page.getByLabel('Game PIN').fill(PIN);
  await page.getByLabel('Username').fill('Leah');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByRole('heading', { name: 'Irregular verbs' })).toBeVisible();

  // Question 1: ABCD.
  server.emit('start_game');
  server.emit('set_question_number', {
    question_index: 0,
    question: {
      question: 'The past of <b>go</b>?',
      time: '20',
      type: 'ABCD',
      image: null,
      answers: [
        { answer: 'went', color: null },
        { answer: 'goed', color: null },
        { answer: 'gone', color: null },
        { answer: 'go', color: null },
      ],
    },
  });
  await expect(page.getByRole('heading', { name: 'The past of go?' })).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByRole('button', { name: 'went' }).click();
  await expect
    .poll(() => server.received)
    .toContainEqual(['submit_answer', { question_index: 0, answer: 'went' }]);
  await expect(page.getByRole('button', { name: 'gone' })).toBeDisabled();

  server.emit('everyone_answered', {});
  await expect(page.getByText('Time is up')).toBeVisible();
  server.emit('question_results', [result('Leah', 'went', 850), result('Tom', 'gone', 0)]);
  await expect(page.getByText('+850')).toBeVisible();
  await expect(page.getByText('Your score: 850')).toBeVisible();

  // Question 2: TEXT.
  server.emit('set_question_number', {
    question_index: 1,
    question: { question: 'Past of see', time: '30', type: 'TEXT', image: null, answers: [] },
  });
  await page.getByLabel('Enter your answer').fill('saw');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect
    .poll(() => server.received)
    .toContainEqual(['submit_answer', { question_index: 1, answer: 'saw' }]);

  server.emit('final_results', {
    '0': [result('Leah', 'went', 850), result('Tom', 'gone', 0)],
    '1': [result('Leah', 'saw', 700), result('Tom', 'saw', 900)],
  });
  const ranking = page.getByRole('list', { name: 'Final ranking' });
  await expect(ranking.getByRole('listitem').first()).toHaveText('1: Leah with 1550 points');
  await expect(page.getByText('Your score: 1550')).toBeVisible();
  await expect(page.getByText("You're on place 1!")).toBeVisible();
});
