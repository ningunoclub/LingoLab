// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import type Pikaso from 'pikaso';
import type { Konva, ShapeModel } from 'pikaso';
import { mediaUrl } from '@/lib/media';
import { SLIDE_DEFAULT_FILL, type SlideElement } from '@/lib/slide';

export type SlideShapeModel = ShapeModel<Konva.Shape | Konva.Group, Konva.ShapeConfig>;

/** Where new elements appear, as in legacy `add_text_field`. */
const ORIGIN = { x: 40, y: 40 };

/** i18n keys of the element menu. Legacy hardcoded the circle's name and description. */
export const ELEMENT_KEYS: Record<SlideElement, { name: string; description: string }> = {
  HEADLINE: { name: 'editor.slide.headline', description: 'editor.slide.headline_description' },
  TEXT: { name: 'editor.slide.text', description: 'editor.slide.text_description' },
  RECTANGLE: {
    name: 'editor.slide.rectangle',
    description: 'editor.slide.rectangle_description',
  },
  CIRCLE: { name: 'editor.slide.circle', description: 'editor.slide.circle_description' },
  IMAGE: { name: 'editor.slide.image', description: 'editor.slide.image_description' },
};

/** What the colour and font-size controls can change on a shape (legacy `set_available_modifiers`). */
export function modifiersOf(shape: SlideShapeModel | null): {
  color: 'text' | 'fill' | null;
  fontSize: boolean;
} {
  switch (shape?.type) {
    case 'label':
      return { color: 'text', fontSize: true };
    case 'circle':
    case 'rect':
      return { color: 'fill', fontSize: false };
    default:
      return { color: null, fontSize: false };
  }
}

/**
 * Adds a headline, text, rectangle or circle, with legacy's sizes. The placeholder words
 * are translated (legacy: English "Headline" and "Text").
 */
export function insertShape(
  canvas: Pikaso,
  type: Exclude<SlideElement, 'IMAGE'>,
  t: (key: string) => string,
): SlideShapeModel {
  switch (type) {
    case 'HEADLINE':
      return canvas.shapes.label.insert({
        container: { ...ORIGIN },
        text: { text: t('editor.slide.headline'), fontSize: 35 },
      });
    case 'TEXT':
      return canvas.shapes.label.insert({
        container: { ...ORIGIN },
        text: { text: t('editor.slide.text'), fontSize: 20 },
      });
    case 'CIRCLE':
      return canvas.shapes.circle.insert({ ...ORIGIN, radius: 50, fill: SLIDE_DEFAULT_FILL });
    case 'RECTANGLE':
      return canvas.shapes.rect.insert({
        ...ORIGIN,
        width: 50,
        height: 50,
        fill: SLIDE_DEFAULT_FILL,
      });
  }
}

/** Size that fits an image into half the stage, keeping its aspect ratio; never enlarges. */
export function fitImage(
  image: { width: number; height: number },
  stage: { width: number; height: number },
): { width: number; height: number } {
  if (image.width <= 0 || image.height <= 0) return image;
  const scale = Math.min(1, stage.width / 2 / image.width, stage.height / 2 / image.height);
  return { width: Math.round(image.width * scale), height: Math.round(image.height * scale) };
}

/** Adds an uploaded or picked image by its storage id. New: legacy had no image element. */
export async function insertImage(canvas: Pikaso, id: string): Promise<SlideShapeModel> {
  const shape = await canvas.shapes.image.insert(mediaUrl(id), { ...ORIGIN });
  const stage = canvas.board.stage;
  shape.update(
    fitImage(
      { width: shape.width(), height: shape.height() },
      { width: stage.width(), height: stage.height() },
    ),
  );
  return shape;
}
