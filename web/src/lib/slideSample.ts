// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0

/**
 * A slide as pikaso exports it (copied from the editor): a headline, a text, a circle and a
 * rectangle on the 1280×720 stage. Used by the style guide and the tests.
 */
export const SAMPLE_SLIDE = JSON.stringify({
  stage: { attrs: { width: 1280, height: 720, x: 0, y: 0 }, filters: [], className: 'Stage' },
  layer: { attrs: { x: 0, y: 0, width: 1280, height: 720 }, filters: [], className: 'Layer' },
  background: {
    image: { attrs: { x: 0, y: 0 }, filters: [], className: 'Image', zIndex: 0 },
    overlay: {
      attrs: { className: 'Rect', x: 0, y: 0 },
      filters: [],
      className: 'Rect',
      zIndex: 1,
    },
  },
  shapes: [
    {
      attrs: { x: 80, y: 60, width: 520, height: 80 },
      filters: [],
      className: 'Label',
      zIndex: 3,
      children: [
        { attrs: { width: 520, height: 80 }, className: 'Tag' },
        { attrs: { text: 'Past simple', fontSize: 80, fill: '#1C1B22' }, className: 'Text' },
      ],
    },
    {
      attrs: { x: 80, y: 200, width: 700, height: 40 },
      filters: [],
      className: 'Label',
      zIndex: 4,
      children: [
        { attrs: { width: 700, height: 40 }, className: 'Tag' },
        {
          attrs: { text: 'We use it for finished actions.', fontSize: 40, fill: '#1C1B22' },
          className: 'Text',
        },
      ],
    },
    {
      attrs: { x: 1040, y: 480, radius: 120, fill: '#E69F00', width: 240, height: 240 },
      filters: [],
      className: 'Circle',
      zIndex: 5,
    },
    {
      attrs: { x: 80, y: 560, width: 600, height: 40, fill: '#56B4E9' },
      filters: [],
      className: 'Rect',
      zIndex: 6,
    },
  ],
});
