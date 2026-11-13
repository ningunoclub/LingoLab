// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import legacySlide from '../../tests/fixtures/legacy-slide.json';
import {
  isAllowedSlideImage,
  parseSlide,
  type SlideJson,
  serializeSlide,
  slideText,
  withoutForeignImages,
} from './slide';
import { SAMPLE_SLIDE } from './slideSample';

const ORIGIN = 'https://lingolab.example';

function slide(shapes: SlideJson['shapes'], background: unknown = {}): SlideJson {
  return {
    stage: { attrs: { width: 1280, height: 720 }, className: 'Stage' },
    layer: { attrs: {}, className: 'Layer' },
    background,
    shapes,
  };
}

const label = (text: string, y: number, visible?: boolean) => ({
  className: 'Label',
  attrs: { x: 40, y, ...(visible === undefined ? {} : { visible }) },
  children: [
    { className: 'Tag', attrs: {} },
    { className: 'Text', attrs: { text } },
  ],
});

describe('parseSlide', () => {
  it('reads an empty slide as null', () => {
    expect(parseSlide('')).toBeNull();
    expect(parseSlide(null)).toBeNull();
    expect(parseSlide(undefined)).toBeNull();
  });

  it('reads a slide saved by the legacy editor (pikaso 2.9)', () => {
    const json = parseSlide(JSON.stringify(legacySlide));
    expect(json?.stage.attrs).toMatchObject({ width: 920, height: 786 });
    expect(json?.shapes.map((shape) => shape.className)).toEqual([
      'Label',
      'Circle',
      'Rect',
      'Label',
    ]);
  });

  it('throws for anything that is not pikaso JSON', () => {
    expect(() => parseSlide('{not json')).toThrow();
    expect(() => parseSlide('{"elements":[]}')).toThrow();
    expect(() => parseSlide(JSON.stringify({ stage: {}, layer: {}, shapes: [1] }))).toThrow();
    expect(() => parseSlide([])).toThrow();
  });
});

describe('serializeSlide', () => {
  it('stores images on our own server as a path', () => {
    const json = slide([
      { className: 'Image', attrs: { url: `${ORIGIN}/api/v1/storage/download/abc`, x: 1 } },
      { className: 'Image', attrs: { url: '/api/v1/storage/download/def' } },
      { className: 'Image', attrs: { url: 'https://elsewhere.example/a.png' } },
    ]);
    const stored = JSON.parse(serializeSlide(json, ORIGIN)) as SlideJson;
    expect(stored.shapes.map((shape) => shape.attrs.url)).toEqual([
      '/api/v1/storage/download/abc',
      '/api/v1/storage/download/def',
      'https://elsewhere.example/a.png',
    ]);
    expect(stored.shapes[0]?.attrs.x).toBe(1);
  });

  it('leaves other shapes alone', () => {
    const json = slide([label('Hello', 0)]);
    expect(JSON.parse(serializeSlide(json, ORIGIN))).toEqual(json);
  });
});

describe('slideText', () => {
  it('lists the visible words from top to bottom', () => {
    const json = slide([
      label('second', 200),
      label('hidden', 0, false),
      { className: 'Rect', attrs: { y: 0 } },
      label('  first  ', 50),
      label('   ', 100),
    ]);
    expect(slideText(json)).toBe('first. second');
  });

  it('reads the sample slide', () => {
    const json = parseSlide(SAMPLE_SLIDE);
    expect(json && slideText(json)).toBe('Past simple. We use it for finished actions.');
  });
});

describe('slide images', () => {
  it('only allows images from our own server', () => {
    expect(isAllowedSlideImage('/api/v1/storage/download/a', ORIGIN)).toBe(true);
    expect(isAllowedSlideImage(`${ORIGIN}/api/v1/storage/download/a`, ORIGIN)).toBe(true);
    expect(isAllowedSlideImage('//tracker.example/pixel.png', ORIGIN)).toBe(false);
    expect(isAllowedSlideImage('https://tracker.example/pixel.png', ORIGIN)).toBe(false);
    expect(isAllowedSlideImage(`${ORIGIN}.evil.example/a.png`, ORIGIN)).toBe(false);
    expect(isAllowedSlideImage(undefined, ORIGIN)).toBe(false);
  });

  it('drops images and a background from other servers before drawing', () => {
    const json = slide(
      [
        { className: 'Image', attrs: { url: 'https://tracker.example/pixel.png' } },
        { className: 'Image', attrs: { url: '/api/v1/storage/download/a' } },
        label('kept', 0),
      ],
      {
        image: { attrs: { x: 0, url: 'https://tracker.example/bg.png' }, className: 'Image' },
        overlay: { attrs: {}, className: 'Rect' },
      },
    );
    const safe = withoutForeignImages(json, ORIGIN);
    expect(safe.shapes.map((shape) => shape.attrs.url ?? shape.className)).toEqual([
      '/api/v1/storage/download/a',
      'Label',
    ]);
    expect(safe.background).toEqual({
      image: { attrs: { x: 0 }, className: 'Image' },
      overlay: { attrs: {}, className: 'Rect' },
    });
  });

  it('keeps a background without an image as it is', () => {
    const json = parseSlide(JSON.stringify(legacySlide));
    if (json === null) throw new Error('fixture');
    expect(withoutForeignImages(json, ORIGIN)).toEqual(json);
  });
});
