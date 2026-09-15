// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Ported from frontend/src/lib/hashcash.ts.
// Two deliberate changes from upstream:
//  1. The plausible() telemetry call is removed (privacy rules: no third-party analytics).
//     It also threw outside the legacy app, where the global was injected by a script tag.
//  2. luxon is replaced with a small date formatter, to avoid a dependency for one call.

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const genSalt = (length: number): string => {
  const values = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (const value of values) {
    result += CHARS.charAt(value % CHARS.length);
  }
  return result;
};

const pad = (value: number): string => value.toString().padStart(2, '0');

/** Upstream's luxon formats: "yyMMdd" and "yyMMddHHmmss", in local time. */
const stampNow = (withSeconds: boolean): string => {
  const now = new Date();
  const date = `${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  if (!withSeconds) return date;
  return `${date}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

/**
 * Mints a hashcash stamp: the proof-of-work captcha the backend requires on
 * register and login. Finds a counter whose SHA-1 digest starts with `bits/4` zeros.
 *
 * Note: upstream hardcodes bits to 8, ignoring the argument. That behaviour is kept
 * so the stamps stay acceptable to the unchanged backend.
 */
export const mint = async (
  resource: string,
  bits = 8,
  ext = '',
  saltChars = 8,
  stampSeconds = false,
): Promise<string> => {
  // Upstream overrides the parameter; the backend validates against 8 bits.
  const effectiveBits = 8;
  void bits;

  const version = '1';
  const hexDigits = Math.ceil(effectiveBits / 4);
  const zeros = '0'.repeat(hexDigits);
  const challenge = `${version}:${effectiveBits}:${stampNow(stampSeconds)}:${resource}:${ext}:${genSalt(saltChars)}`;

  let counter = 0;
  for (;;) {
    const data = new TextEncoder().encode(`${challenge}:${counter.toString(16)}`);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const digest = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    if (digest.slice(0, hexDigits) === zeros) {
      return `${challenge}:${counter.toString(16)}`;
    }
    counter += 1;
  }
};
