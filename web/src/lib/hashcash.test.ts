// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import { mint } from './hashcash';

const sha1Hex = async (input: string): Promise<string> => {
  const buffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

describe('hashcash mint', () => {
  it('produces a stamp in the upstream 1:bits:date:resource:ext:salt:counter format', async () => {
    const stamp = await mint('test@example.com');
    const parts = stamp.split(':');

    expect(parts).toHaveLength(7);
    expect(parts[0]).toBe('1');
    expect(parts[1]).toBe('8');
    expect(parts[2]).toMatch(/^\d{6}$/);
    expect(parts[3]).toBe('test@example.com');
    expect(parts[4]).toBe('');
    expect(parts[5]).toHaveLength(8);
  });

  it('yields a digest with the required leading zeros (the proof of work)', async () => {
    const stamp = await mint('resource');
    // bits=8 -> ceil(8/4) = 2 leading hex zeros.
    expect(await sha1Hex(stamp)).toMatch(/^00/);
  });

  it('uses a per-call random salt, so two stamps differ', async () => {
    const [a, b] = await Promise.all([mint('same'), mint('same')]);
    expect(a).not.toBe(b);
  });

  it('includes seconds in the timestamp when asked', async () => {
    const stamp = await mint('resource', 8, '', 8, true);
    expect(stamp.split(':')[2]).toMatch(/^\d{12}$/);
  });

  it('ignores the bits argument, matching upstream behaviour', async () => {
    const stamp = await mint('resource', 20);
    expect(stamp.split(':')[1]).toBe('8');
  });
});
