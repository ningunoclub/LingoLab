// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0

/**
 * Minimal user-agent formatting for the session table.
 *
 * Legacy used `ua-parser-js` for a single string, "Browser Version (OS)". Version 2 of
 * that package is AGPL-3.0, which is outside this project's allowed licences, and v1 is
 * an unmaintained major. Since only the browser name, its major version and the OS are
 * ever shown, that is done here instead of adding a dependency.
 *
 * This is deliberately approximate. User-agent strings are not a reliable format and
 * every browser lies in some way about being some other browser, so the goal is only to
 * help someone recognise their own devices in the list. Anything unrecognised falls back
 * to a generic label rather than showing a raw UA string.
 */

type Matcher = { name: string; re: RegExp };

// Order matters: every Chromium browser also claims "Chrome", and everything claims
// "Mozilla", so the more specific brands have to be tested first.
const BROWSERS: Matcher[] = [
  { name: 'Edge', re: /Edg(?:e|A|iOS)?\/(\d+)/ },
  { name: 'Opera', re: /OPR\/(\d+)/ },
  { name: 'Samsung Internet', re: /SamsungBrowser\/(\d+)/ },
  { name: 'Brave', re: /Brave\/(\d+)/ },
  { name: 'Vivaldi', re: /Vivaldi\/(\d+)/ },
  { name: 'Firefox', re: /(?:Firefox|FxiOS)\/(\d+)/ },
  { name: 'Chrome', re: /(?:Chrome|CriOS)\/(\d+)/ },
  { name: 'Safari', re: /Version\/(\d+).*Safari/ },
];

const OPERATING_SYSTEMS: Matcher[] = [
  // iPadOS reports as "Macintosh" in desktop mode, so iOS devices are tested first.
  { name: 'iOS', re: /(?:iPhone|iPad|iPod)/ },
  { name: 'Android', re: /Android/ },
  { name: 'Windows', re: /Windows NT/ },
  { name: 'macOS', re: /Mac OS X|Macintosh/ },
  { name: 'ChromeOS', re: /CrOS/ },
  { name: 'Linux', re: /Linux/ },
];

export type ParsedUserAgent = {
  browser: string | null;
  version: string | null;
  os: string | null;
};

export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  if (!userAgent) return { browser: null, version: null, os: null };

  let browser: string | null = null;
  let version: string | null = null;
  for (const candidate of BROWSERS) {
    const match = candidate.re.exec(userAgent);
    if (match) {
      browser = candidate.name;
      version = match[1] ?? null;
      break;
    }
  }

  const os = OPERATING_SYSTEMS.find((candidate) => candidate.re.test(userAgent))?.name ?? null;
  return { browser, version, os };
}

/**
 * "Chrome 140 (macOS)", degrading to "Chrome (macOS)", "Chrome" or null as parts are
 * missing. Returning null lets the caller show a translated "Unknown device" rather
 * than an empty cell or a raw UA string.
 */
export function formatUserAgent(userAgent: string | null | undefined): string | null {
  const { browser, version, os } = parseUserAgent(userAgent);
  if (!browser) return os;

  const named = version ? `${browser} ${version}` : browser;
  return os ? `${named} (${os})` : named;
}
