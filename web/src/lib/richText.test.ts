// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import { richTextToPlain, sanitizeRichText } from './richText';

describe('sanitizeRichText', () => {
  it('keeps the inline tags the backend allows', () => {
    const html = '<strong>H</strong><sub>2</sub>O is <em>water</em>, <del>not</del> x<sup>2</sup>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('drops scripts, handlers and tags outside the allowlist', () => {
    expect(sanitizeRichText('<img src=x onerror="alert(1)">Hi<script>alert(1)</script>')).toBe(
      'Hi',
    );
    expect(sanitizeRichText('<a href="javascript:alert(1)">link</a>')).toBe('link');
    expect(sanitizeRichText('<strong onclick="x()">bold</strong>')).toBe('<strong>bold</strong>');
  });
});

describe('richTextToPlain', () => {
  it('removes markup and decodes entities', () => {
    expect(richTextToPlain('<strong>Tom &amp; Jerry</strong> &lt;3')).toBe('Tom & Jerry <3');
  });

  it('returns an empty string for empty input', () => {
    expect(richTextToPlain('')).toBe('');
  });
});
