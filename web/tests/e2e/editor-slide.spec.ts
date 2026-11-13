// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';

const USER = { email: 'teacher@school.ch' };
const QUIZ_ID = '00000000-0000-4000-8000-000000000002';
const LIBRARY_ID = '22222222-2222-4222-8222-222222222222';
// A 1×1 PNG, so image elements have something real to load.
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
/** Saved by the legacy editor (pikaso 2.9): its stage has the size of the teacher's window. */
const LEGACY_SLIDE = readFileSync(
  new URL('../fixtures/legacy-slide.json', import.meta.url),
  'utf8',
);

type SlideJson = {
  stage: { attrs: { width: number; height: number } };
  shapes: {
    className: string;
    attrs: Record<string, unknown>;
    children?: { className: string; attrs: Record<string, unknown> }[];
  }[];
};

/** The backend is not running in e2e, so the editor and storage endpoints are faked. */
async function mockBackend(page: Page) {
  const saved: Record<string, unknown>[] = [];
  const json = (body: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
  await page.route('**/api/v1/users/check', (route) => route.fulfill(json(USER)));
  await page.route('**/api/v1/editor/start*', (route) => route.fulfill(json({ token: 'abcd' })));
  await page.route('**/api/v1/editor/finish*', (route) => {
    saved.push(route.request().postDataJSON());
    return route.fulfill(json({}));
  });
  await page.route(`**/api/v1/quiz/get/${QUIZ_ID}`, (route) =>
    route.fulfill(
      json({
        id: QUIZ_ID,
        user_id: '00000000-0000-4000-8000-0000000000ff',
        title: 'Legacy slide',
        description: 'Made in the legacy editor',
        public: false,
        cover_image: null,
        background_color: null,
        background_image: null,
        likes: 0,
        questions: [{ type: 'SLIDE', question: 'Slide', time: '120', answers: LEGACY_SLIDE }],
      }),
    ),
  );
  await page.route('**/api/v1/quiz/list*', (route) => route.fulfill(json([])));
  await page.route('**/api/v1/quiztivity/', (route) => route.fulfill(json([])));
  await page.route('**/api/v1/storage/list/last*', (route) =>
    route.fulfill(
      json([
        {
          id: LIBRARY_ID,
          uploaded_at: '2026-11-01T10:00:00',
          mime_type: 'image/png',
          size: PIXEL_PNG.length,
          filename: 'map.png',
          alt_text: null,
          imported: false,
          quizzes: [],
          quiztivities: [],
        },
      ]),
    ),
  );
  await page.route('**/api/v1/storage/info/*', (route) =>
    route.fulfill({ status: 200, headers: { 'Content-Type': 'image/png' }, body: '' }),
  );
  await page.route('**/api/v1/storage/download/*', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG }),
  );
  return { saved };
}

const status = (page: Page) => page.locator('header').getByRole('status');
const canvas = (page: Page) => page.getByTestId('slide-canvas');

/** Picks an element from the add menu by its one-key shortcut. */
async function addByShortcut(page: Page, key: string) {
  await page.getByRole('button', { name: 'Add element' }).click();
  await expect(page.getByRole('menu', { name: 'Add element' })).toBeVisible();
  await page.keyboard.press(key);
  await expect(page.getByRole('menu')).toBeHidden();
}

/** Clicks a point of the stage, given in stage coordinates (pikaso scales the stage with CSS). */
async function clickStage(page: Page, x: number, y: number) {
  const box = await canvas(page).locator('.pikaso').boundingBox();
  const stageWidth = await page.evaluate(() => {
    const konva = (window as unknown as { Konva: { stages: { width(): number }[] } }).Konva;
    return konva.stages[0]?.width() ?? 1;
  });
  if (box === null) throw new Error('no stage');
  const scale = box.width / stageWidth;
  await page.mouse.click(box.x + x * scale, box.y + y * scale);
}

function savedSlide(saved: Record<string, unknown>[]): SlideJson {
  const questions = saved[0]?.questions as { answers: string }[];
  return JSON.parse(questions[0]?.answers ?? '') as SlideJson;
}

test('builds a slide with every element and saves it', async ({ page }) => {
  const backend = await mockBackend(page);
  await page.goto('/create');
  await page.getByLabel('Title').fill('Past simple');
  await page.getByLabel('Description').fill('Introduction');

  // Legacy's separate "Slide" button: two minutes, titled "Slide", nothing on it yet.
  await page.getByRole('button', { name: 'Add slide' }).click();
  await expect(page.getByLabel('Question', { exact: true })).toHaveText('Slide');
  await expect(page.getByLabel('Time in seconds')).toHaveValue('120');
  await expect(status(page)).toHaveText("Question 1: The slide mustn't be empty");
  // No question image: the slide holds its own images.
  await expect(page.getByRole('button', { name: 'Add Media: Question 1' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete element' })).toBeDisabled();

  await addByShortcut(page, 'h');
  await expect(status(page)).toHaveText('Past simple');
  // The new headline is selected and the canvas has focus: the text tools apply to it.
  await expect(canvas(page)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Font size' })).toBeEnabled();
  await page.getByRole('button', { name: 'Font size' }).click();
  await page.getByRole('slider', { name: 'Font size' }).press('PageUp');
  await page.keyboard.press('Escape');

  // A rectangle from the menu by mouse, moved by keyboard and recoloured.
  await page.getByRole('button', { name: 'Add element' }).click();
  await page.getByRole('menuitem', { name: /Rectangle/ }).click();
  await expect(canvas(page)).toBeFocused();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.getByRole('button', { name: 'Colour' }).click();
  await page.locator('input[type="color"]').fill('#009e73');
  await page.keyboard.press('Escape');

  // A circle, then deleted again by keyboard and brought back with Ctrl+Z.
  await addByShortcut(page, 'c');
  await canvas(page).press('Delete');
  await canvas(page).press('ControlOrMeta+z');

  // An image from the library, through the same uploader as the question images.
  await addByShortcut(page, 'i');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Question 1')).toBeVisible();
  await dialog.getByRole('button', { name: 'Library' }).click();
  await dialog.getByRole('button', { name: 'Select' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(backend.saved[0]).toMatchObject({
    questions: [{ type: 'SLIDE', question: 'Slide', time: '120' }],
  });
  const slide = savedSlide(backend.saved);
  expect(slide.stage.attrs).toMatchObject({ width: 1280, height: 720 });
  const byClass = (name: string) => slide.shapes.filter((shape) => shape.className === name);
  const headline = byClass('Label')[0]?.children?.find((child) => child.className === 'Text');
  expect(headline?.attrs).toMatchObject({ text: 'Headline', fontSize: 45 });
  expect(byClass('Rect')[0]?.attrs).toMatchObject({ x: 60, y: 45, fill: '#009e73' });
  expect(byClass('Circle')).toHaveLength(1);
  // Stored as a path on our own server, not as the absolute URL the browser reports.
  expect(byClass('Image')[0]?.attrs.url).toBe(`/api/v1/storage/download/${LIBRARY_ID}`);
});

test('opens a slide saved by the legacy editor and edits it', async ({ page }) => {
  const backend = await mockBackend(page);
  await page.goto(`/edit?quiz_id=${QUIZ_ID}`);
  await page
    .getByRole('navigation', { name: 'Questions' })
    .getByRole('button', { name: /^1 Slide/ })
    .click();
  await expect(canvas(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add element' })).toBeEnabled();

  // The legacy stage keeps its size (920×786) and is scaled into the frame.
  const stage = await page.evaluate(() => {
    const konva = (
      window as unknown as { Konva: { stages: { width(): number; height(): number }[] } }
    ).Konva;
    return [konva.stages[0]?.width(), konva.stages[0]?.height()];
  });
  expect(stage).toEqual([920, 786]);

  // Select the headline (right of the circle that overlaps its start) and delete it.
  await clickStage(page, 150, 57);
  await expect(page.getByRole('button', { name: 'Edit text' })).toBeEnabled();
  await canvas(page).press('Backspace');
  await expect(page.getByRole('button', { name: 'Edit text' })).toBeDisabled();

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const slide = savedSlide(backend.saved);
  expect(slide.stage.attrs).toMatchObject({ width: 920, height: 786 });
  const texts = slide.shapes.flatMap((shape) =>
    (shape.children ?? [])
      .filter((child) => child.className === 'Text')
      .map((child) => child.attrs.text),
  );
  expect(texts).toEqual(['Text']);
  expect(slide.shapes.find((shape) => shape.className === 'Circle')?.attrs.fill).toBe('#ff000d');
});

test('the read-only renderer shows a slide as a sharp picture', async ({ page }) => {
  await page.goto('/styleguide');
  const picture = page.getByRole('img', { name: 'Past simple. We use it for finished actions.' });
  await expect(picture).toBeVisible();
  // Exported at twice the stage size (1280×720) for projectors.
  expect(await picture.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(2560);
});
