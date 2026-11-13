// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import type Pikaso from 'pikaso';
import { describe, expect, it, vi } from 'vitest';
import { SLIDE_DEFAULT_FILL } from '@/lib/slide';
import {
  fitImage,
  insertImage,
  insertShape,
  modifiersOf,
  type SlideShapeModel,
} from './slideElements';

/** A stand-in for pikaso: jsdom has no canvas, and only the calls matter here. */
function fakeCanvas() {
  const shape = (type: string) => ({ type }) as SlideShapeModel;
  const image = {
    type: 'image',
    width: () => 2000,
    height: () => 1000,
    update: vi.fn(),
  };
  const canvas = {
    shapes: {
      label: { insert: vi.fn(() => shape('label')) },
      circle: { insert: vi.fn(() => shape('circle')) },
      rect: { insert: vi.fn(() => shape('rect')) },
      image: { insert: vi.fn(async () => image) },
    },
    board: { stage: { width: () => 1280, height: () => 720 } },
  };
  return { canvas, pikaso: canvas as unknown as Pikaso, image };
}

const t = (key: string) => `t(${key})`;

describe('insertShape', () => {
  it("adds headlines and texts with legacy's sizes and translated words", () => {
    const { canvas, pikaso } = fakeCanvas();
    insertShape(pikaso, 'HEADLINE', t);
    insertShape(pikaso, 'TEXT', t);
    expect(canvas.shapes.label.insert).toHaveBeenNthCalledWith(1, {
      container: { x: 40, y: 40 },
      text: { text: 't(editor.slide.headline)', fontSize: 35 },
    });
    expect(canvas.shapes.label.insert).toHaveBeenNthCalledWith(2, {
      container: { x: 40, y: 40 },
      text: { text: 't(editor.slide.text)', fontSize: 20 },
    });
  });

  it('adds circles and rectangles in answer colour 1', () => {
    const { canvas, pikaso } = fakeCanvas();
    insertShape(pikaso, 'CIRCLE', t);
    insertShape(pikaso, 'RECTANGLE', t);
    expect(canvas.shapes.circle.insert).toHaveBeenCalledWith({
      x: 40,
      y: 40,
      radius: 50,
      fill: SLIDE_DEFAULT_FILL,
    });
    expect(canvas.shapes.rect.insert).toHaveBeenCalledWith({
      x: 40,
      y: 40,
      width: 50,
      height: 50,
      fill: SLIDE_DEFAULT_FILL,
    });
  });
});

describe('insertImage', () => {
  it('loads the stored file and fits it into half the stage', async () => {
    const { canvas, pikaso, image } = fakeCanvas();
    await insertImage(pikaso, 'abc');
    expect(canvas.shapes.image.insert).toHaveBeenCalledWith('/api/v1/storage/download/abc', {
      x: 40,
      y: 40,
    });
    expect(image.update).toHaveBeenCalledWith({ width: 640, height: 320 });
  });
});

describe('fitImage', () => {
  const stage = { width: 1280, height: 720 };

  it('shrinks large images to half the stage, keeping the aspect ratio', () => {
    expect(fitImage({ width: 4000, height: 3000 }, stage)).toEqual({ width: 480, height: 360 });
    expect(fitImage({ width: 3000, height: 500 }, stage)).toEqual({ width: 640, height: 107 });
  });

  it('never enlarges small images', () => {
    expect(fitImage({ width: 100, height: 50 }, stage)).toEqual({ width: 100, height: 50 });
  });

  it('leaves an image without a size alone', () => {
    expect(fitImage({ width: 0, height: 0 }, stage)).toEqual({ width: 0, height: 0 });
  });
});

describe('modifiersOf', () => {
  it("offers what legacy's edit menu offered per element", () => {
    const shape = (type: string) => ({ type }) as SlideShapeModel;
    expect(modifiersOf(shape('label'))).toEqual({ color: 'text', fontSize: true });
    expect(modifiersOf(shape('circle'))).toEqual({ color: 'fill', fontSize: false });
    expect(modifiersOf(shape('rect'))).toEqual({ color: 'fill', fontSize: false });
    expect(modifiersOf(shape('image'))).toEqual({ color: null, fontSize: false });
    expect(modifiersOf(null)).toEqual({ color: null, fontSize: false });
  });
});
