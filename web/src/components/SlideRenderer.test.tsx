// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { SAMPLE_SLIDE } from '@/lib/slideSample';
import { SlideRenderer } from './SlideRenderer';

// jsdom has no canvas, so pikaso is replaced by a recorder.
const pikaso = vi.hoisted(() => ({
  imported: [] as unknown[],
  settings: [] as unknown[],
  destroyed: 0,
  fail: false,
}));

vi.mock('pikaso', () => ({
  default: class {
    board = { stage: { destroy: () => pikaso.destroyed++ } };
    import = {
      json: async (json: unknown) => {
        if (pikaso.fail) throw new Error('broken');
        pikaso.imported.push(json);
      },
    };
    export = { toImage: () => 'data:image/png;base64,AAAA' };
    constructor(settings: unknown) {
      pikaso.settings.push(settings);
    }
  },
}));

beforeEach(() => {
  pikaso.imported = [];
  pikaso.settings = [];
  pikaso.destroyed = 0;
  pikaso.fail = false;
});

describe('SlideRenderer', () => {
  it('shows the slide as a picture named by its words', async () => {
    const { unmount } = render(<SlideRenderer slide={SAMPLE_SLIDE} />);
    const picture = await screen.findByRole('img', {
      name: 'Past simple. We use it for finished actions.',
    });
    expect(picture).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    // Read-only: nothing on the canvas can be selected.
    expect(pikaso.settings[0]).toMatchObject({ selection: { interactive: false } });
    unmount();
    expect(pikaso.destroyed).toBe(1);
  });

  it('falls back to "Slide" when the slide has no words', async () => {
    const shapes = JSON.parse(SAMPLE_SLIDE);
    shapes.shapes = shapes.shapes.filter(
      (shape: { className: string }) => shape.className !== 'Label',
    );
    render(<SlideRenderer slide={JSON.stringify(shapes)} />);
    expect(await screen.findByRole('img', { name: 'Slide' })).toBeInTheDocument();
  });

  it('never loads images from other servers', async () => {
    const json = JSON.parse(SAMPLE_SLIDE);
    json.shapes.push({ className: 'Image', attrs: { url: 'https://tracker.example/p.png' } });
    render(<SlideRenderer slide={JSON.stringify(json)} />);
    await screen.findByRole('img', { name: /Past simple/ });
    const drawn = pikaso.imported[0] as { shapes: { className: string }[] };
    expect(drawn.shapes.some((shape) => shape.className === 'Image')).toBe(false);
  });

  it('shows an empty slide without loading pikaso', async () => {
    render(<SlideRenderer slide="" />);
    expect(await screen.findByRole('img', { name: 'This slide is empty' })).toBeInTheDocument();
    expect(pikaso.settings).toHaveLength(0);
  });

  it('says so when a slide cannot be read', async () => {
    render(<SlideRenderer slide="{broken" />);
    expect(await screen.findByRole('img', { name: "This slide can't be shown" })).toBeVisible();
  });

  it('says so when pikaso cannot draw the slide', async () => {
    pikaso.fail = true;
    render(<SlideRenderer slide={SAMPLE_SLIDE} />);
    expect(await screen.findByRole('img', { name: "This slide can't be shown" })).toBeVisible();
  });
});
