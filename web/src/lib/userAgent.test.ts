// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import { formatUserAgent, parseUserAgent } from './userAgent';

// Real user-agent strings. The point of the parser is only to help someone recognise
// their own devices, so these pin the common cases rather than aiming for completeness.
const AGENTS = {
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  firefoxWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  firefoxIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15',
};

describe('formatUserAgent', () => {
  it.each([
    [AGENTS.chromeMac, 'Chrome 140 (macOS)'],
    [AGENTS.safariMac, 'Safari 18 (macOS)'],
    [AGENTS.firefoxWindows, 'Firefox 130 (Windows)'],
    [AGENTS.chromeAndroid, 'Chrome 140 (Android)'],
    [AGENTS.safariIphone, 'Safari 18 (iOS)'],
  ])('formats %#', (agent, expected) => {
    expect(formatUserAgent(agent)).toBe(expected);
  });

  // Every Chromium browser also claims "Chrome", so brand order is what makes these work.
  it('prefers the specific brand over the Chrome it also claims', () => {
    expect(formatUserAgent(AGENTS.edgeWindows)).toBe('Edge 140 (Windows)');
  });

  // iOS Firefox is WebKit and claims Safari too; FxiOS has to win.
  it('recognises Firefox on iOS rather than calling it Safari', () => {
    expect(formatUserAgent(AGENTS.firefoxIos)).toBe('Firefox 130 (iOS)');
  });

  it('returns null when there is nothing to show, so the caller can translate a fallback', () => {
    expect(formatUserAgent(null)).toBeNull();
    expect(formatUserAgent(undefined)).toBeNull();
    expect(formatUserAgent('')).toBeNull();
  });

  // A UA string is attacker-controlled; it must never be echoed into the table raw.
  it('does not fall back to the raw user-agent string', () => {
    expect(formatUserAgent('<script>alert(1)</script>')).toBeNull();
  });

  it('degrades to the OS alone when the browser is unrecognised', () => {
    expect(formatUserAgent('Some crawler (Windows NT 10.0)')).toBe('Windows');
  });
});

describe('parseUserAgent', () => {
  it('reports the major version only', () => {
    expect(parseUserAgent(AGENTS.chromeMac)).toEqual({
      browser: 'Chrome',
      version: '140',
      os: 'macOS',
    });
  });
});
