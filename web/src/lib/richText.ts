// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import DOMPurify from 'dompurify';

/**
 * The inline tags the backend keeps when it saves a quiz title, description, question or
 * answer (`ALLOWED_TAGS_FOR_QUIZ` in `classquiz/config.py`, applied with bleach). Anything
 * else is stripped on save, so the rich-text field only produces these.
 */
export const RICH_TEXT_TAGS = ['b', 'strong', 'i', 'em', 'small', 'mark', 'del', 'sub', 'sup'];

/**
 * Sanitises stored quiz HTML for rendering. Legacy renders these fields with `{@html}`
 * unfiltered and trusts the backend; we filter again because the HTML comes from other users
 * (public quizzes, imports) and the backend list may change.
 */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: RICH_TEXT_TAGS, ALLOWED_ATTR: [] });
}

/**
 * Plain text of stored quiz HTML, for places that cannot show markup: `title` tooltips,
 * translated sentences, `aria-label`s. Entities such as `&amp;` are decoded.
 */
export function richTextToPlain(html: string): string {
  if (html === '') return '';
  // DOMParser builds an inert document: no scripts run and no images load.
  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
}
