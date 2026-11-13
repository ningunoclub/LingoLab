// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Helpers for SLIDE questions. A slide stores its canvas as the JSON string that pikaso's
// `export.toJson()` produces, in the question's `answers` field (legacy `editor/slide.svelte`).

/** The parts of pikaso's `JsonData` these helpers read. Everything else is passed through. */
export type SlideJson = {
  stage: { attrs: Record<string, unknown>; className: string };
  layer: { attrs: Record<string, unknown>; className: string };
  background: unknown;
  shapes: SlideShape[];
};

export type SlideShape = {
  className: string;
  attrs: Record<string, unknown>;
  children?: { className: string; attrs: Record<string, unknown> }[];
  group?: string | null;
  [key: string]: unknown;
};

/**
 * The size new slides get, in canvas pixels. Legacy sized the canvas after the editor's
 * container, so a slide's layout depended on the teacher's window. A fixed 16:9 stage
 * keeps it the same on every screen; pikaso scales it to fit its container with CSS.
 * Stored slides keep the size they were saved with.
 */
export const SLIDE_SIZE = { width: 1280, height: 720 } as const;

/** Default fill of new shapes: answer colour 1 of the design system (legacy: `#ff000d`). */
export const SLIDE_DEFAULT_FILL = '#E69F00';

/**
 * Colour of the selection frame. pikaso draws it white by default and legacy switched to
 * black or white with the theme; the slide is always white here, so Lingo Teal (the light
 * theme's primary) is always visible. Canvas drawing cannot read CSS variables.
 */
export const SLIDE_SELECTION_COLOR = '#0F766E';

/** Font size limits of legacy's range input in `slides/edit_menu.svelte`. */
export const SLIDE_FONT_SIZE = { min: 10, max: 250 } as const;

/** The element types of legacy `ElementTypes`, plus IMAGE (legacy had it commented out). */
export const SLIDE_ELEMENTS = ['HEADLINE', 'TEXT', 'RECTANGLE', 'CIRCLE', 'IMAGE'] as const;
export type SlideElement = (typeof SLIDE_ELEMENTS)[number];

/** Keyboard shortcuts of legacy `slides/element_selection.svelte`, plus `i` for images. */
export const SLIDE_SHORTCUTS: Record<string, SlideElement> = {
  h: 'HEADLINE',
  t: 'TEXT',
  r: 'RECTANGLE',
  c: 'CIRCLE',
  i: 'IMAGE',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads a stored slide. Returns null for an empty slide (a new SLIDE question stores `''`)
 * and throws for anything that is not pikaso JSON, so callers can show an error.
 */
export function parseSlide(answers: unknown): SlideJson | null {
  if (answers === '' || answers === null || answers === undefined) return null;
  if (typeof answers !== 'string') throw new Error('slide answers must be a string');
  const data: unknown = JSON.parse(answers);
  if (
    !isRecord(data) ||
    !isRecord(data.stage) ||
    !isRecord(data.layer) ||
    !Array.isArray(data.shapes) ||
    !data.shapes.every((shape) => isRecord(shape) && typeof shape.className === 'string')
  ) {
    throw new Error('not a slide');
  }
  return data as SlideJson;
}

/**
 * Turns pikaso's export into the string that is stored. pikaso records an image's URL as
 * `HTMLImageElement.src`, which the browser makes absolute (`http://host/api/...`). Images
 * on our own server are stored as a path instead, so a slide keeps working when the quiz
 * is opened under another host name (dev proxy, tunnel, export/import).
 */
export function serializeSlide(json: SlideJson, origin = window.location.origin): string {
  const shapes = json.shapes.map((shape) => {
    const url = shape.attrs.url;
    if (shape.className !== 'Image' || typeof url !== 'string') return shape;
    if (!url.startsWith(`${origin}/`)) return shape;
    return { ...shape, attrs: { ...shape.attrs, url: url.slice(origin.length) } };
  });
  return JSON.stringify({ ...json, shapes });
}

/**
 * The words on a slide, top to bottom, for the renderer's alt text. Legacy's image alt was
 * the fixed text "Slide image".
 */
export function slideText(json: SlideJson): string {
  const texts: { y: number; text: string }[] = [];
  for (const shape of json.shapes) {
    if (shape.attrs.visible === false) continue;
    const y = typeof shape.attrs.y === 'number' ? shape.attrs.y : 0;
    if (shape.className === 'Text' && typeof shape.attrs.text === 'string') {
      texts.push({ y, text: shape.attrs.text });
    }
    if (shape.className === 'Label') {
      for (const child of shape.children ?? []) {
        if (child.className === 'Text' && typeof child.attrs.text === 'string') {
          texts.push({ y, text: child.attrs.text });
        }
      }
    }
  }
  return texts
    .sort((a, b) => a.y - b.y)
    .map((entry) => entry.text.trim())
    .filter((text) => text !== '')
    .join('. ');
}

/**
 * Image URLs a slide may load. Stored slides come from other users (public quizzes,
 * imports), and the privacy rules forbid the browser from calling third-party servers, so
 * only images on our own server are drawn.
 */
export function isAllowedSlideImage(url: unknown, origin = window.location.origin): boolean {
  if (typeof url !== 'string') return false;
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  return url.startsWith(`${origin}/`);
}

/** A copy of the slide without images from other servers (see `isAllowedSlideImage`). */
export function withoutForeignImages(json: SlideJson, origin = window.location.origin): SlideJson {
  const shapes = json.shapes.filter(
    (shape) => shape.className !== 'Image' || isAllowedSlideImage(shape.attrs.url, origin),
  );
  const background = json.background;
  if (isRecord(background) && isRecord(background.image) && isRecord(background.image.attrs)) {
    const url = background.image.attrs.url;
    if (url !== undefined && url !== null && url !== '' && !isAllowedSlideImage(url, origin)) {
      const { url: _url, ...attrs } = background.image.attrs;
      return {
        ...json,
        shapes,
        background: { ...background, image: { ...background.image, attrs } },
      };
    }
  }
  return { ...json, shapes };
}
