// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import type { ComponentProps } from 'react';
import { sanitizeRichText } from '@/lib/richText';

type Props = Omit<ComponentProps<'span'>, 'children' | 'dangerouslySetInnerHTML'> & {
  html: string;
};

/**
 * Shows a stored quiz title or question with its inline formatting (bold, italic, sub- and
 * superscript, …). Replaces legacy `{@html …}`; the HTML is sanitised first.
 */
export function RichText({ html, ...props }: Props) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitised to an inline-tag allowlist with DOMPurify.
  return <span {...props} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />;
}
