// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import { formatDateTime } from './formatDate';

describe('formatDateTime', () => {
  // The backend sends naive timestamps with no zone. Reading them as local time would
  // shift every session by the viewer's offset, which is the bug this guards.
  it('reads a zoneless timestamp as UTC', () => {
    const naive = formatDateTime('2026-09-17T13:30:00', 'en-GB');
    const explicit = formatDateTime('2026-09-17T13:30:00Z', 'en-GB');
    expect(naive).toBe(explicit);
  });

  it('respects a timestamp that already carries a zone', () => {
    const utc = formatDateTime('2026-09-17T13:30:00Z', 'en-GB');
    const offset = formatDateTime('2026-09-17T15:30:00+02:00', 'en-GB');
    expect(offset).toBe(utc);
  });

  it('formats for the active language', () => {
    const en = formatDateTime('2026-09-17T13:30:00Z', 'en-GB');
    const de = formatDateTime('2026-09-17T13:30:00Z', 'de-DE');
    expect(en).not.toBe(de);
    expect(en).toContain('2026');
    expect(de).toContain('2026');
  });

  it('returns null for missing or unparseable input', () => {
    expect(formatDateTime(null, 'en-GB')).toBeNull();
    expect(formatDateTime(undefined, 'en-GB')).toBeNull();
    expect(formatDateTime('', 'en-GB')).toBeNull();
    expect(formatDateTime('not a date', 'en-GB')).toBeNull();
  });
});
